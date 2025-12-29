package main

import (
	cryptoRand "crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

var (
	googleClientID     string
	googleClientSecret string
	githubClientID     string
	githubClientSecret string
	oauthRedirectBase  string
)

func initOAuth() {
	googleClientID = os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	githubClientID = os.Getenv("GITHUB_CLIENT_ID")
	githubClientSecret = os.Getenv("GITHUB_CLIENT_SECRET")
	oauthRedirectBase = os.Getenv("OAUTH_REDIRECT_BASE")
	if oauthRedirectBase == "" {
		oauthRedirectBase = "http://localhost:5173"
	}

	if googleClientID != "" {
		fmt.Println("[+] Google OAuth configured")
	}
	if githubClientID != "" {
		fmt.Println("[+] GitHub OAuth configured")
	}
}

// Google OAuth
func handleGoogleAuthURL(w http.ResponseWriter, r *http.Request) {
	if googleClientID == "" {
		httpError(w, "Google OAuth not configured", 501)
		return
	}

	state := generateSecureToken(32)

	// Store state in a short-lived way (in production, use Redis or DB)
	otpMutex.Lock()
	otpStore["oauth_state_"+state] = &OtpSession{Code: state}
	otpMutex.Unlock()

	redirectURI := fmt.Sprintf("%s/api/auth/google/callback", getServerBaseURL())
	authURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid%%20email%%20profile&state=%s&access_type=offline",
		url.QueryEscape(googleClientID),
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	jsonResponse(w, map[string]string{"url": authURL})
}

func handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	// Verify state
	otpMutex.Lock()
	_, ok := otpStore["oauth_state_"+state]
	if ok {
		delete(otpStore, "oauth_state_"+state)
	}
	otpMutex.Unlock()

	if !ok {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=invalid_state", http.StatusTemporaryRedirect)
		return
	}

	// Exchange code for tokens
	redirectURI := fmt.Sprintf("%s/api/auth/google/callback", getServerBaseURL())
	tokenResp, err := http.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {googleClientID},
		"client_secret": {googleClientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=token_exchange_failed", http.StatusTemporaryRedirect)
		return
	}
	defer tokenResp.Body.Close()

	var tokenData struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
	}
	if json.NewDecoder(tokenResp.Body).Decode(&tokenData) != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=token_parse_failed", http.StatusTemporaryRedirect)
		return
	}

	// Get user info
	userResp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + tokenData.AccessToken)
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=user_info_failed", http.StatusTemporaryRedirect)
		return
	}
	defer userResp.Body.Close()

	var googleUser struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if json.NewDecoder(userResp.Body).Decode(&googleUser) != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=user_parse_failed", http.StatusTemporaryRedirect)
		return
	}

	// Find or create user
	token, err := findOrCreateOAuthUser("google", googleUser.ID, googleUser.Email, googleUser.Name)
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error="+url.QueryEscape(err.Error()), http.StatusTemporaryRedirect)
		return
	}

	http.Redirect(w, r, oauthRedirectBase+"/auth/callback?token="+token, http.StatusTemporaryRedirect)
}

// GitHub OAuth
func handleGitHubAuthURL(w http.ResponseWriter, r *http.Request) {
	if githubClientID == "" {
		httpError(w, "GitHub OAuth not configured", 501)
		return
	}

	state := generateSecureToken(32)

	otpMutex.Lock()
	otpStore["oauth_state_"+state] = &OtpSession{Code: state}
	otpMutex.Unlock()

	redirectURI := fmt.Sprintf("%s/api/auth/github/callback", getServerBaseURL())
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=user:email&state=%s",
		url.QueryEscape(githubClientID),
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	jsonResponse(w, map[string]string{"url": authURL})
}

func handleGitHubCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	// Verify state
	otpMutex.Lock()
	_, ok := otpStore["oauth_state_"+state]
	if ok {
		delete(otpStore, "oauth_state_"+state)
	}
	otpMutex.Unlock()

	if !ok {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=invalid_state", http.StatusTemporaryRedirect)
		return
	}

	// Exchange code for token
	redirectURI := fmt.Sprintf("%s/api/auth/github/callback", getServerBaseURL())

	reqBody := url.Values{
		"code":          {code},
		"client_id":     {githubClientID},
		"client_secret": {githubClientSecret},
		"redirect_uri":  {redirectURI},
	}

	req, _ := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(reqBody.Encode()))
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	tokenResp, err := client.Do(req)
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=token_exchange_failed", http.StatusTemporaryRedirect)
		return
	}
	defer tokenResp.Body.Close()

	var tokenData struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}
	if json.NewDecoder(tokenResp.Body).Decode(&tokenData) != nil || tokenData.AccessToken == "" {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=token_parse_failed", http.StatusTemporaryRedirect)
		return
	}

	// Get user info
	userReq, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	userReq.Header.Set("Authorization", "Bearer "+tokenData.AccessToken)
	userReq.Header.Set("Accept", "application/vnd.github.v3+json")

	userResp, err := client.Do(userReq)
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=user_info_failed", http.StatusTemporaryRedirect)
		return
	}
	defer userResp.Body.Close()

	var githubUser struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if json.NewDecoder(userResp.Body).Decode(&githubUser) != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error=user_parse_failed", http.StatusTemporaryRedirect)
		return
	}

	// If email is private, fetch from emails endpoint
	if githubUser.Email == "" {
		emailReq, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		emailReq.Header.Set("Authorization", "Bearer "+tokenData.AccessToken)
		emailReq.Header.Set("Accept", "application/vnd.github.v3+json")

		emailResp, err := client.Do(emailReq)
		if err == nil {
			defer emailResp.Body.Close()
			body, _ := io.ReadAll(emailResp.Body)
			var emails []struct {
				Email    string `json:"email"`
				Primary  bool   `json:"primary"`
				Verified bool   `json:"verified"`
			}
			if json.Unmarshal(body, &emails) == nil {
				for _, e := range emails {
					if e.Primary && e.Verified {
						githubUser.Email = e.Email
						break
					}
				}
			}
		}
	}

	displayName := githubUser.Name
	if displayName == "" {
		displayName = githubUser.Login
	}

	// Find or create user
	token, err := findOrCreateOAuthUser("github", fmt.Sprintf("%d", githubUser.ID), githubUser.Email, displayName)
	if err != nil {
		http.Redirect(w, r, oauthRedirectBase+"/auth?error="+url.QueryEscape(err.Error()), http.StatusTemporaryRedirect)
		return
	}

	http.Redirect(w, r, oauthRedirectBase+"/auth/callback?token="+token, http.StatusTemporaryRedirect)
}

// Helper functions
func findOrCreateOAuthUser(provider, providerID, email, name string) (string, error) {
	// First, check if user exists by OAuth provider + ID
	var id int
	var username string
	err := db.QueryRow(`SELECT id, username FROM users WHERE oauth_provider = ? AND oauth_id = ?`, provider, providerID).Scan(&id, &username)
	if err == nil {
		return makeToken(id, username), nil
	}

	// Check if user exists by email (linking accounts)
	if email != "" {
		err = db.QueryRow(`SELECT id, username FROM users WHERE email = ?`, email).Scan(&id, &username)
		if err == nil {
			// Update existing user with OAuth info
			_, err = db.Exec(`UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?`, provider, providerID, id)
			if err != nil {
				return "", fmt.Errorf("failed to link account")
			}
			return makeToken(id, username), nil
		}
	}

	// Create new user
	if name == "" {
		name = "User"
	}

	result, err := db.Exec(`INSERT INTO users (username, email, oauth_provider, oauth_id, password) VALUES (?, ?, ?, ?, '')`, name, email, provider, providerID)
	if err != nil {
		return "", fmt.Errorf("failed to create user")
	}

	newID, _ := result.LastInsertId()
	return makeToken(int(newID), name), nil
}

func generateSecureToken(length int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = chars[secureRandInt(len(chars))]
	}
	return string(result)
}

func secureRandInt(max int) int {
	// Use crypto/rand for secure random
	var b [1]byte
	_, _ = io.ReadFull(cryptoRand.Reader, b[:])
	return int(b[0]) % max
}

func getServerBaseURL() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}
	return fmt.Sprintf("http://localhost:%s", port)
}

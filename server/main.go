package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/generative-ai-go/genai"
	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/option"
)

var (
	jwtSecret []byte
	db        *sql.DB
	bot       *tgbotapi.BotAPI
	gemini    *genai.GenerativeModel
	otpStore = make(map[string]*OtpSession)
	otpMutex sync.Mutex
)

type OtpSession struct {
	Code      string
	Attempts  int
	Type      string
	TempUser  *RegisterData
	UserID    int
	Username  string
	ExpiresAt time.Time
}

type RegisterData struct {
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	TelegramID string `json:"telegramId"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("[!] .env file not found (using system env)")
	}

	initDB()
	initTelegram()
	initGemini()

	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("secret")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/auth/register-init", handleRegisterInit)
	mux.HandleFunc("/api/auth/login-init", handleLoginInit)
	mux.HandleFunc("/api/auth/verify", handleVerify)
	mux.HandleFunc("/api/analyze", authMiddleware(handleAnalyze))
	mux.HandleFunc("/api/companion/chat", authMiddleware(handleCompanion))
	mux.HandleFunc("/api/history", authMiddleware(handleHistory))

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	fmt.Printf("[*] Server running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(mux)))
}

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./orato.db")
	if err != nil {
		log.Fatal("[!] DB Connection Error:", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT,
		email TEXT UNIQUE,
		password TEXT,
		telegram_chat_id TEXT
	);
	CREATE TABLE IF NOT EXISTS speeches (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		transcript TEXT,
		clarity_score INTEGER,
		pace_wpm INTEGER,
		filler_words TEXT,
		feedback TEXT,
		tip TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("[!] DB Init Error:", err)
	}
}

func initTelegram() {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		log.Println("[!] WARNING: TELEGRAM_BOT_TOKEN is missing")
		return
	}
	var err error
	bot, err = tgbotapi.NewBotAPI(token)
	if err != nil {
		log.Println("[!] Telegram Auth Failed:", err)
	} else {
		fmt.Printf("[+] Telegram Bot started: %s\n", bot.Self.UserName)
		go func() {
			u := tgbotapi.NewUpdate(0)
			u.Timeout = 60
			updates := bot.GetUpdatesChan(u)
			for update := range updates {
				if update.Message != nil && update.Message.Text == "/start" {
					chatId := update.Message.Chat.ID
					msg := tgbotapi.NewMessage(chatId, fmt.Sprintf("ID: %d", chatId))
					bot.Send(msg)
					fmt.Printf("[*] User interaction: %d\n", chatId)
				}
			}
		}()
	}
}

func initGemini() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("[!] GEMINI_API_KEY is missing")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Fatal("[!] Gemini Client Error:", err)
	}

	fmt.Println("[*] Scanning available models...")
	iter := client.ListModels(ctx)

	var bestModel string
	priorities := []string{"gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"}

	for {
		m, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Fatal(err)
		}

		supportsContent := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				supportsContent = true
				break
			}
		}

		if supportsContent {
			name := strings.TrimPrefix(m.Name, "models/")
			for _, p := range priorities {
				if strings.Contains(name, p) {
					bestModel = name
					if strings.Contains(name, "flash") {
						break
					}
				}
			}
		}
		if bestModel != "" && strings.Contains(bestModel, "flash") {
			break
		}
	}

	if bestModel == "" {
		fmt.Println("[!] No preferred model found. Defaulting to 'gemini-pro'.")
		bestModel = "gemini-pro"
	}

	fmt.Printf("[+] Connected to model: %s\n", bestModel)
	gemini = client.GenerativeModel(bestModel)

	gemini.SafetySettings = []*genai.SafetySetting{
		{Category: genai.HarmCategoryHarassment, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryHateSpeech, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategorySexuallyExplicit, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryDangerousContent, Threshold: genai.HarmBlockNone},
	}
	gemini.SetTemperature(0.4)
}

func handleRegisterInit(w http.ResponseWriter, r *http.Request) {
	var req RegisterData
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		httpError(w, "Invalid JSON", 400)
		return
	}

	var dummy int
	if db.QueryRow("SELECT 1 FROM users WHERE email = ?", req.Email).Scan(&dummy) == nil {
		httpError(w, "Email already exists", 400)
		return
	}

	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	chatID, err := strconv.ParseInt(req.TelegramID, 10, 64)
	if err != nil || chatID == 0 {
		httpError(w, "Invalid Telegram ID", 400)
		return
	}

	if !sendTg(chatID, "Auth Code: "+code) {
		fmt.Printf("[!] Failed to send code to TG: %d\n", chatID)
		httpError(w, "Bot failed to send message", 400)
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	req.Password = string(hash)

	otpMutex.Lock()
	otpStore[req.Email] = &OtpSession{
		Code:      code,
		Type:      "REGISTER",
		TempUser:  &req,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	otpMutex.Unlock()

	jsonResponse(w, map[string]string{"message": "Code sent", "step": "VERIFY"})
}

func handleLoginInit(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Password string }
	json.NewDecoder(r.Body).Decode(&req)

	var id int
	var userHash, username, tgIDStr string

	err := db.QueryRow("SELECT id, username, password, telegram_chat_id FROM users WHERE email = ?", req.Email).
		Scan(&id, &username, &userHash, &tgIDStr)

	if err != nil || bcrypt.CompareHashAndPassword([]byte(userHash), []byte(req.Password)) != nil {
		httpError(w, "Invalid credentials", 400)
		return
	}

	if tgIDStr == "" {
		token := makeToken(id, username)
		jsonResponse(w, map[string]string{"token": token})
		return
	}

	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	chatID, _ := strconv.ParseInt(tgIDStr, 10, 64)

	if !sendTg(chatID, "Auth Code: "+code) {
		fmt.Printf("[!] Failed to send code to TG: %d\n", chatID)
		httpError(w, "Telegram Error", 500)
		return
	}

	otpMutex.Lock()
	otpStore[req.Email] = &OtpSession{
		Code:      code,
		Type:      "LOGIN",
		UserID:    id,
		Username:  username,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	otpMutex.Unlock()

	jsonResponse(w, map[string]string{"message": "Code sent", "step": "VERIFY"})
}

func handleVerify(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Code string }
	json.NewDecoder(r.Body).Decode(&req)

	otpMutex.Lock()
	session, ok := otpStore[req.Email]
	if !ok {
		otpMutex.Unlock()
		httpError(w, "Session not found", 400)
		return
	}

	if time.Now().After(session.ExpiresAt) || session.Code != req.Code {
		session.Attempts++
		if session.Attempts > 3 {
			delete(otpStore, req.Email)
		}
		otpMutex.Unlock()
		httpError(w, "Invalid code", 400)
		return
	}
	delete(otpStore, req.Email)
	otpMutex.Unlock()

	if session.Type == "REGISTER" {
		u := session.TempUser
		db.Exec("INSERT INTO users (username, email, password, telegram_chat_id) VALUES (?, ?, ?, ?)",
			u.Username, u.Email, u.Password, u.TelegramID)
		jsonResponse(w, map[string]string{"message": "Success"})
	} else {
		token := makeToken(session.UserID, session.Username)
		jsonResponse(w, map[string]string{"token": token})
	}
}

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Transcript string  `json:"transcript"`
		Duration   float64 `json:"durationSeconds"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	userID := r.Context().Value("userID").(int)

	if len(strings.TrimSpace(req.Transcript)) < 1 {
		httpError(w, "Empty transcript", 400)
		return
	}

	prompt := fmt.Sprintf(`
	Analyze this Russian speech: "%s"
	Return raw JSON only:
	{
		"clarityScore": (0-100),
		"fillerWords": ["list"],
		"feedback": "string",
		"tip": "string"
	}`, req.Transcript)

	ctx := context.Background()
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		fmt.Println("[!] Gemini API Error:", err)
		httpError(w, "AI Error", 500)
		return
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		part := resp.Candidates[0].Content.Parts[0]
		text := fmt.Sprintf("%s", part)

		start := strings.Index(text, "{")
		end := strings.LastIndex(text, "}")

		if start != -1 && end != -1 {
			cleanJson := text[start : end+1]

			var result map[string]interface{}
			if json.Unmarshal([]byte(cleanJson), &result) == nil {

				if req.Duration <= 0 {
					req.Duration = 1
				}
				wpm := int(math.Round(float64(len(strings.Fields(req.Transcript))) / req.Duration * 60))

				clarity := int(result["clarityScore"].(float64))
				fillers, _ := json.Marshal(result["fillerWords"])
				feedback := result["feedback"].(string)
				tip := result["tip"].(string)

				db.Exec(`INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip) VALUES (?, ?, ?, ?, ?, ?, ?)`,
					userID, req.Transcript, clarity, wpm, string(fillers), feedback, tip)

				result["pace"] = wpm
				jsonResponse(w, result)
				return
			}
		}
	}
	httpError(w, "AI parsing failed", 500)
}

func handleCompanion(w http.ResponseWriter, r *http.Request) {
	var req struct{ Message string `json:"message"` }
	json.NewDecoder(r.Body).Decode(&req)

	ctx := context.Background()
	prompt := fmt.Sprintf("Role: Anime girl Ai. Reply cute & short in Russian. User: \"%s\"", req.Message)

	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	if err == nil && len(resp.Candidates) > 0 {
		txt := fmt.Sprintf("%s", resp.Candidates[0].Content.Parts[0])
		jsonResponse(w, map[string]string{"reply": txt})
		return
	}
	httpError(w, "AI Error", 500)
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("userID").(int)
	rows, _ := db.Query("SELECT id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, created_at FROM speeches WHERE user_id = ? ORDER BY created_at DESC", uid)
	defer rows.Close()

	res := []map[string]interface{}{}
	for rows.Next() {
		var id, cl, pm int
		var tr, fw, fb, tp string
		var dt time.Time
		rows.Scan(&id, &tr, &cl, &pm, &fw, &fb, &tp, &dt)
		var fwArr []string
		json.Unmarshal([]byte(fw), &fwArr)
		res = append(res, map[string]interface{}{
			"id": id, "transcript": tr, "clarityScore": cl, "pace": pm,
			"fillerWords": fwArr, "feedback": fb, "tip": tp, "date": dt,
		})
	}
	jsonResponse(w, res)
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			httpError(w, "No token", 401)
			return
		}
		token, err := jwt.Parse(strings.TrimPrefix(h, "Bearer "), func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid && err == nil {
			ctx := context.WithValue(r.Context(), "userID", int(claims["id"].(float64)))
			next(w, r.WithContext(ctx))
		} else {
			httpError(w, "Forbidden", 403)
		}
	}
}

func makeToken(id int, name string) string {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       id,
		"username": name,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})
	s, _ := t.SignedString(jwtSecret)
	return s
}

func sendTg(chatID int64, text string) bool {
	if bot == nil {
		return false
	}
	_, err := bot.Send(tgbotapi.NewMessage(chatID, text))
	return err == nil
}

func jsonResponse(w http.ResponseWriter, d interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d)
}

func httpError(w http.ResponseWriter, e string, c int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(c)
	json.NewEncoder(w).Encode(map[string]string{"error": e})
}
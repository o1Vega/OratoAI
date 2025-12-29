package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("[!] .env file not found (using system env)")
	}

	initDB()
	initTelegram()
	initGemini()
	initOAuth()

	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) < 32 {
		log.Println("[!] WARNING: JWT_SECRET should be at least 32 characters for security")
		if len(jwtSecret) == 0 {
			jwtSecret = []byte("orato-ai-default-secret-change-me-in-production")
		}
	}

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/api/auth/register-init", handleRegisterInit)
	mux.HandleFunc("/api/auth/login-init", handleLoginInit)
	mux.HandleFunc("/api/auth/verify", handleVerify)

	// OAuth routes
	mux.HandleFunc("/api/auth/google", handleGoogleAuthURL)
	mux.HandleFunc("/api/auth/google/callback", handleGoogleCallback)
	mux.HandleFunc("/api/auth/github", handleGitHubAuthURL)
	mux.HandleFunc("/api/auth/github/callback", handleGitHubCallback)

	// Protected routes
	mux.HandleFunc("/api/analyze", authMiddleware(handleAnalyze))
	mux.HandleFunc("/api/companion/chat", authMiddleware(handleCompanion))
	mux.HandleFunc("/api/history", authMiddleware(handleHistory))
	mux.HandleFunc("/api/profile", authMiddleware(handleGetProfile))
	mux.HandleFunc("/api/topics/random", authMiddleware(handleGetTopic))

	// CORS - more secure configuration
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
	}
	// Add production origin from env if set
	if prodOrigin := os.Getenv("CORS_ORIGIN"); prodOrigin != "" {
		allowedOrigins = append(allowedOrigins, prodOrigin)
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
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

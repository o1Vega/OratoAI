package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/golang-jwt/jwt/v5"
)

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		token, err := jwt.Parse(strings.TrimPrefix(h, "Bearer "), func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid && err == nil {
			ctx := context.WithValue(r.Context(), "userID", int(claims["id"].(float64)))
			next(w, r.WithContext(ctx))
		} else {
			w.WriteHeader(http.StatusForbidden)
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

func sendTg(chatID int64, code, actionRu string) bool {
	if bot == nil {
		return false
	}

	var actionEn string
	switch actionRu {
	case "регистрации":
		actionEn = "registration"
	case "входа":
		actionEn = "login"
	default:
		actionEn = "action"
	}

	txt := fmt.Sprintf("🔐 <b>Orato AI</b>\n\nYour code for %s: <code>%s</code>\nВаш код для %s: <code>%s</code>\n\nDo not share this / Никому не сообщайте.", actionEn, code, actionRu, code)
	msg := tgbotapi.NewMessage(chatID, txt)
	msg.ParseMode = "HTML"
	_, err := bot.Send(msg)
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

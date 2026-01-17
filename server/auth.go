package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func handleRegisterInit(w http.ResponseWriter, r *http.Request) {
	var req RegisterData
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		httpError(w, "Invalid JSON", 400)
		return
	}

	var dummy int
	if db.QueryRow("SELECT 1 FROM users WHERE email = ?", req.Email).Scan(&dummy) == nil {
		httpError(w, "Email уже занят", 400)
		return
	}

	code := fmt.Sprintf("%d", 100000+rand.Intn(900000))

	chatID, err := strconv.ParseInt(req.TelegramID, 10, 64)
	if err != nil || chatID == 0 {
		httpError(w, "Invalid Telegram ID", 400)
		return
	}

	if !sendTg(chatID, code, "регистрации") {
		fmt.Printf("[!] Failed to send code to TG: %d\n", chatID)
		httpError(w, "Бот не смог отправить сообщение. Напишите /start боту!", 400)
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

	jsonResponse(w, map[string]string{"message": "Код отправлен в Telegram", "step": "VERIFY"})
}

func handleLoginInit(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Password string }
	json.NewDecoder(r.Body).Decode(&req)

	var id int
	var userHash, username, tgIDStr string

	err := db.QueryRow("SELECT id, username, password, telegram_chat_id FROM users WHERE email = ?", req.Email).
		Scan(&id, &username, &userHash, &tgIDStr)

	if err != nil || bcrypt.CompareHashAndPassword([]byte(userHash), []byte(req.Password)) != nil {
		httpError(w, "Неверный логин или пароль", 400)
		return
	}

	if tgIDStr == "" {
		token := makeToken(id, username)
		jsonResponse(w, map[string]string{"token": token})
		return
	}

	code := fmt.Sprintf("%d", 100000+rand.Intn(900000))
	chatID, _ := strconv.ParseInt(tgIDStr, 10, 64)

	if !sendTg(chatID, code, "входа") {
		fmt.Printf("[!] Failed to send code to TG: %d\n", chatID)
		httpError(w, "Ошибка связи с Telegram", 500)
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

	jsonResponse(w, map[string]string{"message": "Код отправлен", "step": "VERIFY"})
}

func handleVerify(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Code string }
	json.NewDecoder(r.Body).Decode(&req)

	otpMutex.Lock()
	session, ok := otpStore[req.Email]
	if !ok {
		otpMutex.Unlock()
		httpError(w, "Код истек", 400)
		return
	}

	if time.Now().After(session.ExpiresAt) || session.Code != req.Code {
		session.Attempts++
		if session.Attempts > 3 {
			delete(otpStore, req.Email)
			otpMutex.Unlock()
			httpError(w, "Много попыток. Повторите вход.", 400)
			return
		}
		otpMutex.Unlock()
		httpError(w, "Неверный код", 400)
		return
	}
	delete(otpStore, req.Email)
	otpMutex.Unlock()

	if session.Type == "REGISTER" {
		u := session.TempUser
		db.Exec("INSERT INTO users (username, email, password, telegram_chat_id) VALUES (?, ?, ?, ?)",
			u.Username, u.Email, u.Password, u.TelegramID)
		jsonResponse(w, map[string]string{"message": "Регистрация успешна"})
	} else {
		token := makeToken(session.UserID, session.Username)
		jsonResponse(w, map[string]string{"token": token})
	}
}
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"regexp"

	"github.com/google/generative-ai-go/genai"
)

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Transcript string  `json:"transcript"`
		Duration   float64 `json:"durationSeconds"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	userID := r.Context().Value("userID").(int)

	if len(strings.TrimSpace(req.Transcript)) < 2 {
		httpError(w, "Нет текста", 400)
		return
	}

	if req.Duration <= 0 {
		req.Duration = 1
	}
	wpm := int(math.Round(float64(len(strings.Fields(req.Transcript))) / req.Duration * 60))

	prompt := fmt.Sprintf(`
        Роль: Тренер по ораторскому искусству. Язык: Русский.
        Текст: "%s"
        Задача: Верни валидный JSON (без markdown):
        {
            "clarityScore": (0-100),
            "fillerWords": ["слово1", "слово2"],
            "feedback": "Похвала (1-2 предложение)",
            "tip": "Совет (1-2 предложение)"
        }`, req.Transcript)

	ctx := context.Background()
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		fmt.Println("[!] Gemini API Error:", err)
		httpError(w, "Ошибка ИИ", 500)
		return
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		part := resp.Candidates[0].Content.Parts[0]
		text := fmt.Sprintf("%s", part)

		re := regexp.MustCompile("```json|```")
		cleanJson := re.ReplaceAllString(text, "")
		cleanJson = strings.TrimSpace(cleanJson)

		var result map[string]interface{}
		if json.Unmarshal([]byte(cleanJson), &result) == nil {
			clarity := 0
			if val, ok := result["clarityScore"].(float64); ok {
				clarity = int(val)
			}

			fillersData := result["fillerWords"]
			fillers, _ := json.Marshal(fillersData)

			feedback, _ := result["feedback"].(string)
			tip, _ := result["tip"].(string)

			db.Exec(`INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				userID, req.Transcript, clarity, wpm, string(fillers), feedback, tip)

			result["pace"] = wpm
			jsonResponse(w, result)
			return
		}
	}
	httpError(w, "Ошибка ИИ", 500)
}

func handleCompanion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
		Mode    string `json:"mode"` // ВАЖНО: Поле должно совпадать с тем, что шлет TS
	}
	
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		httpError(w, "Invalid JSON", 400)
		return
	}

	ctx := context.Background()
	var rolePrompt string
	var temp float32

	switch req.Mode {
	case "interview":
		rolePrompt = `Роль: Строгий HR-менеджер.
		Тон: Холодный, профессиональный, критичный.
		Задача: Проводи собеседование. Задавай сложные вопросы. Указывай на слабые места кандидата.`
		temp = 0.3 
	case "debate":
		rolePrompt = `Роль: Оппонент в жестких дебатах.
		Тон: Напористый, логичный, провокационный.
		Задача: Категорически не соглашайся с пользователем. Найди ошибку в его логике и разбей его аргументы. Твоя цель — победить в споре любой ценой.`
		temp = 0.9
	default: 
		rolePrompt = `Роль: Дружелюбный наставник.
		Тон: Теплый, мягкий, поддерживающий.
		Задача: Поддерживай беседу, хвали пользователя, помогай ему раскрыться.`
		temp = 0.7
	}

	prompt := fmt.Sprintf(`
		%s
		
		Язык: Русский.
		Входные данные: Пользователь сказал: "%s"
		
		Твоя инструкция: 
		1. Дай краткий ответ (максимум 2-3 предложения), исходя из своей роли.
		2. Не используй markdown (*, #), эмодзи или списки. Нужен чистый текст для озвучки.
		3. В конце задай короткий вопрос, чтобы продолжить диалог.`, rolePrompt, req.Message)

	gemini.SetTemperature(temp)
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	
	if err == nil && len(resp.Candidates) > 0 {
		if part, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			txt := string(part)
			txt = strings.ReplaceAll(txt, "*", "")
			jsonResponse(w, map[string]string{"reply": txt})
			return
		}
	}
	httpError(w, "AI Error", 500)
}
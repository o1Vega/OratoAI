package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeRequest
	json.NewDecoder(r.Body).Decode(&req)

	uidVal := r.Context().Value(userIDKey)
	if uidVal == nil {
		httpError(w, "Unauthorized", 401)
		return
	}
	uid := uidVal.(int)

	if len(strings.TrimSpace(req.Transcript)) < 2 {
		httpError(w, "Нет текста", 400)
		return
	}

	lang := req.Language
	if lang == "" {
		lang = "ru"
	}

	var prompt string
	if lang == "ru" {
		prompt = fmt.Sprintf(`
		Роль: Судья по ораторскому мастерству. Язык: Русский.
		Текст выступления: "%s"
		
		Задача: Оцени речь и верни СТРОГИЙ JSON (без Markdown).
		
		Структура JSON:
		{
			"clarityScore": (0-100, общая оценка),
			"metrics": {
				"confidence": (0-100, уверенность),
				"vocabulary": (0-100, богатство языка),
				"structure": (0-100, логика),
				"empathy": (0-100, эмоциональность),
				"conciseness": (0-100, краткость)
			},
			"fillerWords": ["слово1", "слово2"],
			"feedback": "Похвала (1-2 предл., русский)",
			"tip": "Совет (1-2 предл., русский)"
		}`, req.Transcript)
	} else {
		prompt = fmt.Sprintf(`
		Role: Public Speaking Coach. Language: English.
		Speech text: "%s"
		
		Task: Evaluate the speech and return STRICT JSON (no Markdown).
		
		JSON Structure:
		{
			"clarityScore": (0-100, overall score),
			"metrics": {
				"confidence": (0-100),
				"vocabulary": (0-100),
				"structure": (0-100),
				"empathy": (0-100),
				"conciseness": (0-100)
			},
			"fillerWords": ["word1", "word2"],
			"feedback": "Praise (1-2 sentences, English)",
			"tip": "Tip (1-2 sentences, English)"
		}`, req.Transcript)
	}

	ctx := context.Background()
	gemini.SetTemperature(0.5)
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))

	if err != nil {
		log.Println("[!] Gemini Error:", err)
		httpError(w, "Ошибка ИИ", 500)
		return
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		part := resp.Candidates[0].Content.Parts[0]
		txt := fmt.Sprintf("%s", part)

		s, e := strings.Index(txt, "{"), strings.LastIndex(txt, "}")
		if s != -1 && e != -1 {
			cleanJson := txt[s : e+1]

			var result map[string]interface{}
			if json.Unmarshal([]byte(cleanJson), &result) == nil {

				if req.Duration <= 0 {
					req.Duration = 1
				}
				wpm := int(math.Round(float64(len(strings.Fields(req.Transcript))) / req.Duration * 60))

				clarity := 0
				if v, ok := result["clarityScore"].(float64); ok {
					clarity = int(v)
				}

				fwBytes, _ := json.Marshal(result["fillerWords"])
				metricsBytes, _ := json.Marshal(result["metrics"])

				fb, _ := result["feedback"].(string)
				tp, _ := result["tip"].(string)

				_, err := db.Exec(`INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, metrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					uid, req.Transcript, clarity, wpm, string(fwBytes), fb, tp, string(metricsBytes))

				if err != nil {
					log.Println("[!] DB Save Error:", err)
				}

				go processGamification(uid, clarity, wpm)

				result["pace"] = wpm
				jsonResponse(w, result)
				return
			}
		}
	}
	httpError(w, "Format Error", 500)
}

func handleCompanion(w http.ResponseWriter, r *http.Request) {
	var req CompanionRequest

	if json.NewDecoder(r.Body).Decode(&req) != nil {
		httpError(w, "Invalid JSON", 400)
		return
	}

	lang := req.Language
	if lang == "" {
		lang = "ru"
	}

	ctx := context.Background()
	var rolePrompt string
	var temp float32

	if lang == "ru" {
		switch req.Mode {
		case "interview":
			rolePrompt = `Роль: Строгий HR-менеджер. Тон: Холодный. Задача: Проводи собеседование.`
			temp = 0.3
		case "debate":
			rolePrompt = `Роль: Оппонент в дебатах. Тон: Напористый. Задача: Спорь и опровергай.`
			temp = 0.9
		default:
			rolePrompt = `Роль: Дружелюбный наставник. Тон: Теплый. Задача: Поддерживай беседу.`
			temp = 0.7
		}
		rolePrompt += " Язык: Русский."
	} else {
		switch req.Mode {
		case "interview":
			rolePrompt = `Role: Strict HR Manager. Tone: Cold. Task: Conduct an interview.`
			temp = 0.3
		case "debate":
			rolePrompt = `Role: Debate Opponent. Tone: Assertive. Task: Argue and refute.`
			temp = 0.9
		default:
			rolePrompt = `Role: Friendly Mentor. Tone: Warm. Task: Keep the conversation going.`
			temp = 0.7
		}
		rolePrompt += " Language: English."
	}

	prompt := fmt.Sprintf(`%s Reply briefly (1-3 sentences). User: "%s"`, rolePrompt, req.Message)

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

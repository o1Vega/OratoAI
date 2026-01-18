package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"sync"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	_ "modernc.org/sqlite"
)

var (
	jwtSecret []byte
	db        *sql.DB
	bot       *tgbotapi.BotAPI
	gemini    *genai.GenerativeModel
	otpStore  = make(map[string]*OtpSession)
	otpMutex  sync.Mutex
)

func initDB() {
	var err error
	db, err = sql.Open("sqlite", "./orato.db")
	if err != nil {
		log.Fatal("[!] DB Connection Error:", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT,
		email TEXT UNIQUE,
		password TEXT,
		telegram_chat_id TEXT,
		oauth_provider TEXT,
		oauth_id TEXT,
		-- Геймификация --
		xp INTEGER DEFAULT 0,
		level INTEGER DEFAULT 1,
		streak INTEGER DEFAULT 0,
		last_active DATE,         -- Дата последней тренировки
		badges TEXT DEFAULT '[]'  -- Храним JSON массив: ["streak_5", "expert"]
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
		metrics TEXT DEFAULT '{}',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	CREATE TABLE IF NOT EXISTS topics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text_ru TEXT,
		text_en TEXT
	);`

	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("[!] DB Init Error:", err)
	}

	// Seeding topics
	var count int
	db.QueryRow("SELECT COUNT(*) FROM topics").Scan(&count)
	if count == 0 {
		fmt.Println("[*] Seeding database with topics...")
		seedTopics := []struct{ ru, en string }{
			{"Расскажи о своем хобби так, чтобы я захотел им заняться.", "Tell me about your hobby so that I want to do it."},
			{"Если бы у тебя был миллион долларов, как бы ты его потратил за 24 часа?", "If you had a million dollars, how would you spend it in 24 hours?"},
			{"Искусственный интеллект: угроза или спасение? Твое мнение.", "Artificial Intelligence: Threat or Salvation? Your opinion."},
			{"Лучший совет, который тебе когда-либо давали.", "The best advice you've ever been given."},
			{"Расскажи смешную историю из детства.", "Tell a funny story from your childhood."},
			{"Почему дисциплина важнее мотивации?", "Why is discipline more important than motivation?"},
			{"Три книги (или фильма), которые изменили твое мировоззрение.", "Three books (or movies) that changed your worldview."},
			{"Продай мне эту ручку 🖊️", "Sell me this pen 🖊️"},
			{"Каким будет мир через 50 лет?", "What will the world be like in 50 years?"},
			{"Почему неудачи важны для успеха?", "Why is failure important for success?"},
			{"Твое идеальное утро: опиши его.", "Your ideal morning: describe it."},
			{"Если бы ты мог поужинать с любым историческим персонажем, кто бы это был?", "If you could have dinner with any historical figure, who would it be?"},
			{"Удаленная работа или офис: что лучше?", "Remote work or office: which is better?"},
			{"Твой самый большой страх и как ты с ним борешься.", "Your biggest fear and how you deal with it."},
			{"Объясни пятилетнему ребенку, как работает интернет.", "Explain to a five-year-old how the internet works."},
			{"Что важнее: талант или упорный труд?", "What is more important: talent or hard work?"},
			{"Как технологии меняют общение между людьми?", "How are technologies changing communication between people?"},
			{"Твой любимый город и почему.", "Your favorite city and why."},
			{"Если бы ты мог выучить любой навык за час, что бы это было?", "If you could learn any skill in an hour, what would it be?"},
			{"Какую суперспособность ты бы выбрал и почему?", "Which super power would you choose and why?"},
		}
		for _, t := range seedTopics {
			_, err := db.Exec("INSERT INTO topics (text_ru, text_en) VALUES (?, ?)", t.ru, t.en)
			if err != nil {
				log.Println("[!] Seed Error:", err)
			}
		}
	}

	fmt.Println("[+] Database initialized successfully (Orato v2)")
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
					firstName := update.Message.From.FirstName
					text := fmt.Sprintf("👋 Привет, %s!\n\nТвой Telegram Chat ID: %d\n\nСкопируй эти цифры и вставь их при регистрации на сайте Orato AI.", firstName, chatId)
					msg := tgbotapi.NewMessage(chatId, text)
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

	modelName := "gemini-2.5-flash"
	fmt.Printf("[+] Connected to model: %s\n", modelName)
	gemini = client.GenerativeModel(modelName)

	gemini.SafetySettings = []*genai.SafetySetting{
		{Category: genai.HarmCategoryHarassment, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryHateSpeech, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategorySexuallyExplicit, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryDangerousContent, Threshold: genai.HarmBlockNone},
	}
	gemini.SetTemperature(0.7)
}

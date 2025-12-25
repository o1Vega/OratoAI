package main

import (
	"encoding/json"
	"net/http"
)

type Topic struct {
	ID   int    `json:"id"`
	Text string `json:"text"`
}

func handleGetTopic(w http.ResponseWriter, r *http.Request) {
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "ru" // Default
	}

	var textColumn string
	if lang == "ru" {
		textColumn = "text_ru"
	} else {
		textColumn = "text_en"
	}

	// SQLite RANDOM() for random row
	query := "SELECT id, " + textColumn + " FROM topics ORDER BY RANDOM() LIMIT 1"

	var topic Topic
	err := db.QueryRow(query).Scan(&topic.ID, &topic.Text)
	if err != nil {
		http.Error(w, "Error fetching topic", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topic)
}

package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func handleHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	if r.Method == "DELETE" {
		_, err := db.Exec("DELETE FROM speeches WHERE user_id = ?", userID)
		if err != nil {
			httpError(w, "DB Error", 500)
			return
		}
		jsonResponse(w, map[string]string{"msg": "Deleted"})
		return
	}

	rows, err := db.Query("SELECT id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, created_at FROM speeches WHERE user_id = ? ORDER BY created_at DESC", userID)
	if err != nil {
		httpError(w, "DB Error", 500)
		return
	}
	defer rows.Close()

	res := []map[string]interface{}{}
	for rows.Next() {
		var id, cl, pm int
		var tr, fw, fb, tp string
		var dt time.Time
		rows.Scan(&id, &tr, &cl, &pm, &fw, &fb, &tp, &dt)
		var fwArr []string
		if err := json.Unmarshal([]byte(fw), &fwArr); err != nil {
			fwArr = []string{}
		}
		
		res = append(res, map[string]interface{}{
			"id":           id,
			"transcript":   tr,
			"clarityScore": cl,
			"pace":         pm,
			"fillerWords":  fwArr,
			"feedback":     fb,
			"tip":          tp,
			"date":         dt,
		})
	}
	jsonResponse(w, res)
}
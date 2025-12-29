package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func handleHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	if r.Method == "DELETE" {
		_, err := db.Exec("DELETE FROM speeches WHERE user_id = ?", userID)
		if err != nil {
			httpError(w, "Failed to delete history", 500)
			return
		}
		jsonResponse(w, map[string]string{"msg": "History cleared"})
		return
	}

	rows, err := db.Query(`
		SELECT id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, metrics, created_at 
		FROM speeches 
		WHERE user_id = ? 
		ORDER BY created_at DESC`, userID)

	if err != nil {
		httpError(w, "DB Query Error", 500)
		return
	}
	defer rows.Close()

	res := []map[string]interface{}{}

	for rows.Next() {
		var id, cl, pm int
		var tr, fw, fb, tp, metStr string
		var dt time.Time

		if err := rows.Scan(&id, &tr, &cl, &pm, &fw, &fb, &tp, &metStr, &dt); err != nil {
			continue
		}

		var fwArr []string
		if fw == "" {
			fw = "[]"
		}
		_ = json.Unmarshal([]byte(fw), &fwArr)

		var metricsObj map[string]interface{}
		if metStr == "" {
			metStr = "{}"
		}
		_ = json.Unmarshal([]byte(metStr), &metricsObj)

		res = append(res, map[string]interface{}{
			"id":           id,
			"transcript":   tr,
			"clarityScore": cl,
			"pace":         pm,
			"fillerWords":  fwArr,
			"feedback":     fb,
			"tip":          tp,
			"metrics":      metricsObj,
			"date":         dt,
		})
	}

	if res == nil {
		res = []map[string]interface{}{}
	}

	jsonResponse(w, res)
}

func handleGetProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	var u UserProfile
	var badgesStr string

	err := db.QueryRow(`SELECT username, xp, level, streak, badges FROM users WHERE id=?`, userID).
		Scan(&u.Username, &u.XP, &u.Level, &u.Streak, &badgesStr)

	if err != nil {
		httpError(w, "User stats not found", 404)
		return
	}

	if badgesStr == "" {
		badgesStr = "[]"
	}
	json.Unmarshal([]byte(badgesStr), &u.Badges)

	u.NextLvlXP = u.Level * 1000
	u.Title = getTitleByLevel(u.Level)

	jsonResponse(w, u)
}

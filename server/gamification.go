package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"time"
)

func processGamification(userID, clarity, wpm int) {
	earnedXP := 50 + (clarity / 2)
	if wpm > 90 && wpm < 150 {
		earnedXP += 20
	}

	var currentXP, currentLevel, currentStreak int
	var lastActive sql.NullString
	var badgesJSON string

	err := db.QueryRow(`SELECT xp, level, streak, last_active, badges FROM users WHERE id = ?`, userID).
		Scan(&currentXP, &currentLevel, &currentStreak, &lastActive, &badgesJSON)
	if err != nil {
		log.Println("[!] Gamification Read Error:", err)
		return
	}

	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	
	newStreak := currentStreak

	if !lastActive.Valid {
		newStreak = 1
	} else if lastActive.String != today {
		if lastActive.String == yesterday {
			newStreak++
		} else {
			newStreak = 1
		}
	}

	newXP := currentXP + earnedXP
	newLevel := currentLevel
	
	reqXP := currentLevel * 1000
	if newXP >= reqXP {
		newLevel++
	}

	var badges []string
	if badgesJSON == "" { badgesJSON = "[]" }
	json.Unmarshal([]byte(badgesJSON), &badges)

	hasBadge := func(b string) bool {
		for _, val := range badges { if val == b { return true } }
		return false
	}

	if newLevel >= 2 && !hasBadge("level_2") { badges = append(badges, "level_2") }
	if newLevel >= 5 && !hasBadge("level_5") { badges = append(badges, "level_5") }
	if clarity >= 95 && !hasBadge("clean_speaker") { badges = append(badges, "clean_speaker") }
	if newStreak >= 3 && !hasBadge("streak_3") { badges = append(badges, "streak_3") }
	if newStreak >= 7 && !hasBadge("streak_7") { badges = append(badges, "streak_7") }

	newBadgesBytes, _ := json.Marshal(badges)

	_, err = db.Exec(`UPDATE users SET xp=?, level=?, streak=?, last_active=?, badges=? WHERE id=?`,
		newXP, newLevel, newStreak, today, string(newBadgesBytes), userID)
	
	if err != nil {
		log.Println("[!] Gamification Save Error:", err)
	}
}

func getTitleByLevel(lvl int) string {
	if lvl < 2 { return "Новичок" }
	if lvl < 5 { return "Любитель" }
	if lvl < 10 { return "Оратор" }
	if lvl < 20 { return "Мастер Слова" }
	return "Легенда Риторики"
}
# 🎤 Orato AI — Революция в обучении ораторскому мастерству
![React](https://img.shields.io/badge/Frontend-React_19-blue?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-purple?style=for-the-badge&logo=google)
![Security](https://img.shields.io/badge/Security-Telegram_2FA-blue?style=for-the-badge&logo=telegram)

Orato AI — это платформа, которая превращает ваш браузер в персонального тренера по публичным выступлениям.  
Web Speech API + Google Gemini = мгновенный, честный и безопасный анализ вашей речи.

---

## 📖 О проекте

### 🚩 Проблема  
Страх публичных выступлений (глоссофобия) затрагивает **75% людей**.  
Студенты, менеджеры и стартаперы теряют возможности из-за отсутствия навыков уверенной коммуникации.  
Коучинг дорогой, а самостоятельные тренировки — не дают объективной обратной связи.

### 💡 Решение  
**Orato AI** превращает браузер в персонального тренера по речи.  
Комбинация Web Speech API и Google Gemini позволяет:

- анализировать речь алгоритмически (темп, паузы, слова в минуту),
- оценивать эмоциональность, структуру и словарную чистоту текста,
- выдавать мгновенную и мотивирующую обратную связь.

---

## 🔥 Уникальные особенности (USP)

### 🔹 Гибридный анализ  
Система объединяет машинный алгоритм (скорость речи) + генеративный ИИ (структура и эмоции).

### 🔹 Безопасность уровня Enterprise  
Собственная **2FA-система** через Telegram-бота:  
никаких SMS, никаких фейковых аккаунтов.

### 🔹 Геймификация  
Каждая тренировка оценивается по шкале **0–100**, стимулируя улучшать результат.

### 🔹 Сильный визуальный стиль  
Deep Glass (стекломорфизм + неон), ощущение интерфейса будущего.

---

## 🛠️ Технический стек

### **Frontend**
- React 19  
- Vite (SWC)  
- Tailwind-like CSS  
- React Hot Toast  

### **Backend**
- Node.js  
- Express  

### **AI Engine**
- Google Gemini 1.5 Flash (через @google/generative-ai)

### **Database**
- SQLite  

### **Security**
- node-telegram-bot-api (2FA)  
- bcrypt (хеширование)  
- jsonwebtoken (JWT)

---

## 🚀 Как запустить проект

### 📌 Предварительно установи:
- Node.js 16+
- Telegram-аккаунт
- Ключ Google AI Studio  
  https://aistudio.google.com

---

## 🔷 Шаг 1: Настройка Telegram-бота

1. Открой Telegram → **@BotFather**  
2. Напиши `/newbot`  
3. Укажи имя (например: `Orato AI Test`)  
4. Укажи юзернейм (например: `Orato_Test_Bot`)  
5. Скопируй **HTTP API Token**

---

## 🔷 Шаг 2: Установка и запуск Backend

Перейди в папку сервера:

```bash
cd server
npm install

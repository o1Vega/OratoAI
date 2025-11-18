# 🎤 Orato AI (AITUCAP HACKATOON Project)

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Badge"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite Badge"/>
  <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini Badge"/>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License Badge"/>
</div>

**Orato AI** — это ваш персональный умный тренер по ораторскому мастерству. Приложение слушает вашу речь, транскрибирует её в реальном времени и использует искусственный интеллект (Google Gemini) для глубокого анализа.

Оно находит слова-паразиты, измеряет темп речи, оценивает ясность и дает конкретные советы по улучшению, сохраняя историю вашего прогресса.

---

## ✨ Основные возможности

*   🎙️ **Запись и транскрипция:** Преобразование голоса в текст прямо в браузере (Web Speech API).
*   🤖 **AI Анализ:** Мгновенная оценка выступления с помощью Google Gemini.
*   📊 **Метрики:**
    *   Подсчет слов-паразитов (э, ну, типа, короче).
    *   Измерение темпа речи (слов в минуту).
    *   Оценка ясности (Clarity Score).
*   💡 **Умные советы:** ИИ выделяет сильные стороны и дает зоны роста.
*   📈 **История:** Сохранение всех выступлений для отслеживания прогресса.
*   🔐 **Безопасность:** Авторизация пользователей (JWT) и личный кабинет.
*   🌗 **UI/UX:** Современный темный интерфейс с неоновыми акцентами.

---

## 🛠️ Технологический стек

### Frontend (Клиент)
*   **React + Vite** (Быстрая сборка и реактивность)
*   **Axios** (Запросы к API)
*   **Lucide React** (Красивые иконки)
*   **CSS3** (Кастомные стили и анимации)

### Backend (Сервер)
*   **Node.js + Express** (REST API)
*   **SQLite** (Легкая реляционная база данных)
*   **Google Generative AI SDK** (Интеграция с Gemini)
*   **JWT & Bcrypt** (Аутентификация и хеширование паролей)

---

## 🚀 Установка и запуск

Для работы приложения требуется установленный [Node.js](https://nodejs.org/).

### 1. Настройка Сервера (Backend)

Откройте терминал, зайдите в папку сервера и установите зависимости:

```bash
cd server
npm install

# :microphone2: Orato AI

![Go](https://img.shields.io/badge/Backend-Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![TypeScript](https://img.shields.io/badge/Frontend-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/Library-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

**Orato AI** — это Ваш персональный цифровой тренер по ораторскому искусству, построенный на высокопроизводительном стеке технологий.

---

## :face_with_monocle: Проблема и Решение

### Проблема
Публичные выступления — один из самых распространенных страхов. Студентам и профессионалам сложно практиковаться в одиночку: нет объективной обратной связи, услуги живых коучей дороги, а запись себя на видео не дает структурного анализа ошибок.

### Решение
**Orato AI** решает эту проблему, превращая Ваш браузер в умную студию звукозаписи.
1.  **Мгновенный анализ:** Вы говорите — система слушает.
2.  **Искусственный интеллект:** Google Gemini анализирует смысл, структуру и эмоциональный фон.
3.  **Метрики:** Алгоритмы Go мгновенно подсчитывают темп речи и слова-паразиты.
4.  **Безопасность:** Ваша учетная запись защищена через Telegram, исключая взломы и ботов.

---

## :tools: Технологический стек

### Frontend (Клиент)
*   **Язык:** TypeScript.
*   **Фреймворк:** React 19 + Vite.
*   **Стилизация:** CSS Modules / Glassmorphism UI.
*   **Уведомления:** React Hot Toast.

### Backend (Сервер)
*   **Язык:** Go (Golang).
*   **Веб-сервер:** Gin / Standard Library (net/http).
*   **База данных:** SQLite (GORM / SQLx).
*   **AI:** Google Generative AI SDK for Go.
*   **Integrations:** Telegram Bot API.

---

## :rocket: Инструкция по запуску

Для работы проекта Вам понадобятся: **Go** (версия 1.21+), **Node.js** и ключи API.

### 1. Настройка Сервера (Backend на Go)

1.  Откройте терминал и перейдите в папку сервера:
    ```bash
    cd server
    ```

2.  Установите зависимости Go:
    ```bash
    go mod tidy
    ```

3.  **Важно:** Создайте файл `.env` в папке `server` со следующими переменными:
    ```env
    PORT=8080
    JWT_SECRET=Ваш_Секретный_Ключ
    GEMINI_API_KEY=Ваш_Ключ_Google_AI
    TELEGRAM_BOT_TOKEN=Ваш_Токен_От_BotFather
    ```

4.  Запустите сервер:
    ```bash
    go run main.go
    ```
    *(Сервер запустится на порту 8080 и автоматически создаст файл базы данных `orato.db`).*

### 2. Настройка Клиента (Frontend на TypeScript)

1.  Откройте новый терминал и перейдите в папку клиента:
    ```bash
    cd client
    ```

2.  Установите зависимости:
    ```bash
    npm install
    ```

3.  Запустите режим разработки:
    ```bash
    npm run dev
    ```

4.  Откройте ссылку в браузере (обычно `http://localhost:5173`).

---

## :robot: Безопасность: Telegram 2FA

Вход в систему защищен двухфакторной аутентификацией через Telegram.

1.  Найдите Вашего бота в Telegram и нажмите **START** (`/start`).
2.  Бот пришлет Вам **Chat ID**. Скопируйте его.
3.  При регистрации на сайте введите этот ID.
4.  Код подтверждения для завершения регистрации (и последующих входов) будет приходить Вам в Telegram.

---

**Разработано с использованием строгой типизации и высокой производительности.**

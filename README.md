# 🎙️ Orato AI (demo: https://youtu.be/vkTHBMEFTvY?si=1z_CWnftEoEpQ5NG)

![Go](https://img.shields.io/badge/Backend-Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![TypeScript](https://img.shields.io/badge/Frontend-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/Library-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

**Orato AI** — это Ваш персональный цифровой тренер по ораторскому искусству. Высокопроизводительный сервис, объединяющий мощь Go и Google Gemini для анализа Вашей речи.

---

## 🧐 Проблема и Решение

### Проблема
Страх публичных выступлений мешает карьере и учебе. Практиковаться в одиночку сложно: зеркало не даст объективной оценки, а нанимать живого тренера — дорого и долго.

### Решение
**Orato AI** превращает браузер в умную лабораторию речи:
1.  **Мгновенная запись:** Вы говорите — система слушает и переводит голос в текст.
2.  **ИИ-Анализ:** Google Gemini оценивает структуру, чистоту и смысл речи.
3.  **Метрики:** Сервер на Go мгновенно считает темп речи (WPM) и слова-паразиты.
4.  **Безопасность:** Вход защищен через Telegram, что исключает фейковые регистрации.

---

## 🛠️ Технологический стек

*   **Frontend:** TypeScript, React 19, Vite, CSS Modules (Deep Glass UI).
*   **Backend:** Go (Golang), Gin/Fiber (или net/http), SQLite.
*   **AI:** Google Generative AI SDK.
*   **Security:** Telegram 2FA, JWT.

---

## 🔑 Получение ключей (Важно!)

Перед запуском Вам нужно получить два ключа. Это бесплатно и займет 2 минуты.

### 1. Настройка Telegram Бота (для входа на сайт)
1.  Откройте Telegram и найдите бота **@BotFather**.
2.  Напишите ему команду `/newbot`.
3.  Придумайте имя боту (например, `OratoAuth`) и юзернейм (обязательно должен заканчиваться на `bot`, например `Orato_Test_Bot`).
4.  BotFather пришлет Вам **HTTP API Token**. Скопируйте его.

### 2. Настройка Google Gemini (для анализа речи)
1.  Перейдите на сайт [Google AI Studio](https://aistudio.google.com/).
2.  Нажмите **"Get API Key"** -> **"Create API key"**.
3.  Скопируйте полученный ключ (начинается на `AIza...`).

---

## 🚀 Инструкция по запуску

### 1. Настройка Сервера (Backend на Go)

1.  Откройте терминал и перейдите в папку сервера:
    ```bash
    cd server
    ```

2.  Создайте файл `.env` (без названия, просто `.env`) и вставьте туда Ваши данные:
    ```env
    PORT=5000
    JWT_SECRET=придумайте_любой_сложный_пароль
    GEMINI_API_KEY=ВСТАВЬТЕ_СЮДА_КЛЮЧ_GOOGLE
    TELEGRAM_BOT_TOKEN=ВСТАВЬТЕ_СЮДА_ТОКЕН_ТЕЛЕГРАМА
    ```

3.  Установите зависимости и запустите сервер:
    ```bash
    go mod tidy
    go run main.go
    ```
    *(Сервер запустится на порту **5000** и создаст базу данных).*

### 2. Настройка Клиента (Frontend на TypeScript)

1.  Откройте второй терминал и перейдите в папку клиента:
    ```bash
    cd client
    ```

2.  Установите зависимости:
    ```bash
    npm install
    ```

3.  Запустите проект:
    ```bash
    npm run dev
    ```

4.  Откройте ссылку в браузере (обычно `http://localhost:5173`).

---

## 🤖 Как войти в систему (Telegram 2FA)

Система использует защиту от ботов.

1.  Найдите Вашего созданного бота в Telegram.
2.  Нажмите кнопку **START** (`/start`).
3.  Бот пришлет Ваш **Chat ID** (цифры).
4.  На сайте введите эти цифры в поле "Telegram Chat ID".
5.  Код подтверждения придет Вам в личные сообщения в Telegram.

---

**Разработано на Go + TypeScript для максимальной скорости и надежности.**

# 🏥 Реєстр медичних записів (Веб-версія)
### React + Node.js + SQLite | Криптографічний захист | RBAC | Аудит-лог

---

## 🚀 Швидкий старт

### Вимоги
- **Node.js** 20.x (LTS) — [nodejs.org](https://nodejs.org)
- **npm** 10.x+
- Браузер Chrome 90+ / Firefox 88+ / Edge 90+

---

### Крок 1 — Встановити залежності

```bash
# Бекенд
cd server
npm install

# Фронтенд (в іншому терміналі)
cd client
npm install
```

---

### Крок 2 — Запустити бекенд

```bash
cd server
npm run dev
```

Сервер запуститься на **http://localhost:5000**

> При першому запуску автоматично:
> - Створюється база даних `server/data/medical_registry.db`
> - Створиляються тестові користувачі
> - Додаються демо медичні записи

---

### Крок 3 — Запустити фронтенд

```bash
cd client
npm start
```

Відкриється **http://localhost:3000**

---

## 👤 Тестові облікові записи

| Логін | Пароль | Роль | Доступ |
|-------|--------|------|--------|
| `admin` | `Admin@123` | Адміністратор | Повний |
| `doctor1` | `Doctor@123` | Лікар | Записи пацієнтів |
| `doctor2` | `Doctor@123` | Лікар | Записи пацієнтів |
| `patient1` | `Patient@123` | Пацієнт | Власні записи |
| `patient2` | `Patient@123` | Пацієнт | Власні записи |

---

## 🔐 Архітектура безпеки

### Шифрування даних (AES-256-CBC)
- Поля: діагноз, лікування, препарати, нотатки
- Унікальний IV (16 байт) для кожного поля
- Ключ через PBKDF2-SHA256 (100 000 ітерацій)
- Формат збереження: `Base64(IV[16] + Ciphertext)`

### Цілісність записів (HMAC-SHA256)
- Кожен запис підписується при збереженні
- Перевіряється при кожному читанні
- Константно-часове порівняння (timing-safe)

### Паролі (bcrypt)
- Cost-фактор 12
- Вбудована сіль запобігає rainbow-table атакам

### JWT аутентифікація
- Access token: HS256, TTL 15 хвилин
- Refresh token: HS256, TTL 7 днів, HttpOnly Cookie
- Auto-refresh через axios interceptor

### Захист від атак
- Rate limiting: 100 req/хв на IP, 20 спроб входу/15хв
- Блокування акаунту: 5 невдалих спроб → 15 хвилин
- CORS обмежений на CLIENT_URL
- Helmet.js — HTTP security headers
- Валідація всіх вхідних даних (express-validator)

---

## 📁 Структура проекту

```
project/
├── server/                  # Node.js + Express API
│   ├── config/database.js   # Sequelize + SQLite
│   ├── models/              # User, MedicalRecord, AuditLog
│   ├── services/
│   │   ├── CryptoService.js # AES-256, HMAC, bcrypt, PBKDF2
│   │   └── AuditService.js  # Журнал аудиту
│   ├── middleware/auth.js   # JWT verify + RBAC
│   ├── routes/
│   │   ├── auth.js          # Login, refresh, logout
│   │   ├── records.js       # CRUD медичних записів
│   │   ├── users.js         # Управління користувачами
│   │   └── audit.js         # Журнал аудиту
│   ├── .env                 # Секрети (не комітити!)
│   └── index.js             # Точка входу
│
└── client/                  # React SPA
    └── src/
        ├── api/             # Axios + API методи
        ├── context/         # AuthContext (JWT стан)
        ├── components/      # Layout, CSS
        └── pages/
            ├── LoginPage    # Форма входу
            ├── DashboardPage # Дашборд зі статистикою
            ├── PatientsPage  # Список пацієнтів
            ├── RecordsPage   # Медичні записи
            ├── RecordDetailPage # Деталі + редагування
            ├── AddRecordPage # Новий запис
            ├── UsersPage     # Управління користувачами
            ├── AuditPage     # Журнал аудиту
            └── ProfilePage   # Профіль + зміна пароля
```

---

## 🌐 REST API

| Метод | Ендпоінт | Опис | Ролі |
|-------|----------|------|------|
| POST | `/api/auth/login` | Вхід | Публічний |
| POST | `/api/auth/refresh` | Оновлення токена | Cookie |
| POST | `/api/auth/logout` | Вихід | Авторизований |
| GET  | `/api/auth/me` | Профіль | Авторизований |
| GET  | `/api/records` | Список записів | Всі |
| POST | `/api/records` | Новий запис | Admin, Doctor |
| PUT  | `/api/records/:id` | Редагування | Admin, Doctor |
| PATCH| `/api/records/:id/status` | Статус | Admin, Doctor |
| DELETE| `/api/records/:id` | Видалення | Admin |
| GET  | `/api/users` | Список користувачів | Admin |
| GET  | `/api/users/patients` | Список пацієнтів | Admin, Doctor |
| POST | `/api/users` | Новий користувач | Admin |
| GET  | `/api/audit` | Журнал аудиту | Admin |
| GET  | `/api/audit/stats` | Статистика | Admin |

---

## ⚠️ Важливо для виробництва

1. Замінити всі значення в `.env` на надійні випадкові ключі
2. Увімкнути HTTPS (TLS 1.2+)
3. Перейти з SQLite на PostgreSQL/MySQL
4. Налаштувати `NODE_ENV=production`
5. Ніколи не комітити `.env` у репозиторій!

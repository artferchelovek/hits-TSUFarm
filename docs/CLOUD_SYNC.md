# Облачная синхронизация сохранений

## Архитектура

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │──────▶│   API (Express)  │──────▶│  PostgreSQL  │
│  (Vite/React)│  HTTP │  :3001 / :443  │  SQL  │  :5432       │
└──────────────┘       └──────────────┘       └──────────────┘
       │                                              │
       │     localStorage:                             │
       │     - JWT token                              │
       │     - локальные .json файлы                   │
       │     (работают как раньше)                     │
```

- **Авторизация:** JWT (Bearer token) → localStorage
- **Сохранения:** 5 фиксированных слотов на пользователя
- **Автосохранение:** каждый игровой день (~100 сек реального времени) в слот 1
- **Автосохранение при закрытии:** при скрытии вкладки — в `localStorage`, при следующем запуске подхватывается
- **Название фермы:** задаётся в MainMenu перед стартом, отображается в слотах сохранений

---

## 1. Локальная разработка

### 1.1 Быстрый старт (Весь бэкенд в Docker)

```bash
# Создать .env из примера
cp .env.example .env          # отредактировать JWT_SECRET

# Поднять PostgreSQL + API (Express с hot-reload через tsx watch)
docker compose --profile dev up -d

# Доступны:
#   - API:       http://localhost:3001
#   - PostgreSQL: localhost:5432

# В другом терминале — фронтенд (из корня)
npm run dev
# Фронтенд: http://localhost:8000
```

### 1.2 Быстрый старт (Только БД в Docker, API локально)

```bash
# 1. Поднять только PostgreSQL
docker compose up db -d

# 2. Запустить сервер локально
cd server
JWT_SECRET=dev-secret \
DATABASE_URL=postgres://tsufarm:tsufarm_pass@localhost:5432/tsufarm \
npm run dev

# 3. В другом терминале — фронтенд (из корня)
npm run dev
```

### 1.3 Переменные окружения для разработки

Файл `.env` в корне проекта (должен содержать хотя бы `JWT_SECRET`):
```env
JWT_SECRET=dev-secret-key
```

Опционально (для запуска API локально, без Docker):
```env
DATABASE_URL=postgres://tsufarm:tsufarm_pass@localhost:5432/tsufarm
```

Для фронтенда (создать `.env` в корне, если не используется dev compose):
```env
VITE_API_URL=http://localhost:3001/api
```

### 1.4 Команды

| Команда | Что делает |
|---|---|
| `docker compose --profile dev up -d` | PostgreSQL + API (hot-reload, только бэкенд) |
| `docker compose --profile prod up -d --build` | PostgreSQL + API (production) + Frontend |
| `docker compose up db -d` | Только PostgreSQL |
| `docker compose down` | Остановить всё |
| `npx drizzle-kit generate` | Сгенерировать миграцию (из `server/`) |
| `npx drizzle-kit migrate` | Применить миграции (из `server/`) |
| `npm run dev` (в `server/`) | Запустить API локально (hot reload) |
| `npm run dev` (в корне) | Запустить фронтенд (Vite) |

---

## 2. Деплой новой версии на сервер

### 2.1 Полный деплой (все сервисы)

```bash
# На локальной машине — запушить ветку
git push origin feat/cloud-sync

# На сервере — зайти и выполнить
cd /path/to/project
git pull origin feat/cloud-sync

# Пересобрать и перезапустить (profile prod = api + frontend)
docker compose down
docker compose --profile prod up -d --build
```

### 2.2 Что происходит при деплое

1. `docker compose down` — останавливает старые контейнеры
2. `docker compose --profile prod up -d --build` — собирает и запускает только сервисы с профилем `prod`:
   - **db** — PostgreSQL (без профиля, запускается всегда). Если `pgdata` volume не удалён, **все данные БД сохраняются**
   - **api** — Node.js сервер. При запуске выполняет:
     ```typescript
     await migrate(db, { migrationsFolder: "./drizzle" });
     ```
     Это накатывает новые миграции поверх существующих таблиц (добавляет колонки, индексы и т.д.)
   - **frontend** — nginx со свежей сборкой

---

## 3. Совместимость сохранений

### 3.1 Что будет со старыми сохранениями при обновлении

**Короткий ответ: они останутся в БД и продолжат работать.**

**Как это работает:**

- В таблице `saves` есть колонки `game_state` (JSONB) и `world_data` (TEXT)
- У каждого сохранения есть поле `version` внутри `game_state` (сейчас `"0.0.1"`)
- Drizzle миграции только **добавляют** новые колонки/таблицы, но **не трогают** существующие строки
- Если структура `GameState` (в `Types.ts`) поменяется, старые сохранения загрузятся, но у них будут отсутствовать новые поля — React просто использует значения по умолчанию

### 3.2 Если структура GameState сильно изменилась

Придётся написать миграцию данных. Два варианта:

**Вариант А — ручная SQL миграция (проще):**
```sql
UPDATE saves
SET game_state = jsonb_set(game_state, '{meta,version}', '"0.0.2"')
WHERE game_state->'meta'->>'version' = '0.0.1';
```

**Вариант Б — на уровне приложения (безопаснее):**
При загрузке сохранения проверяешь `version` и преобразуешь данные:

```typescript
// В SaveManager.ts
export function applySave(save: SaveFile) {
  const migrated = migrateSaveFormat(save);  // ← новая функция
  const world = WorldMap.deserialize(migrated.worldData);
  return { gameState: migrated.gameState, world };
}

function migrateSaveFormat(save: SaveFile): SaveFile {
  switch (save.version) {
    case "0.0.1":
      return {
        ...save,
        gameState: {
          ...save.gameState,
          // добавить новые поля со значениями по умолчанию
          newFeature: {},
        },
        version: "0.0.2",
      };
    default:
      return save;
  }
}
```

**Рекомендация:** пока проект на ранней стадии — используй вариант А или даже ничего не делай (отсутствующие поля будут `undefined`, что в большинстве случаев не ломает игру).

---

## 4. Структура БД

```sql
users (
  id            serial PRIMARY KEY
  username      varchar(32) UNIQUE NOT NULL
  email         varchar(255) UNIQUE NOT NULL
  password_hash text NOT NULL
  created_at    timestamp DEFAULT now()
)

saves (
  id            serial PRIMARY KEY
  user_id       integer REFERENCES users(id) NOT NULL
  slot          integer NOT NULL CHECK (slot BETWEEN 1 AND 5)
  name          varchar(64)
  game_state    jsonb NOT NULL
  world_data    text NOT NULL
  timestamp     bigint NOT NULL
  created_at    timestamp DEFAULT now()
  updated_at    timestamp DEFAULT now()
  UNIQUE(user_id, slot)
)
```

---

## 5. API endpoints

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| `GET` | `/api/health` | — | Проверка сервера |
| `POST` | `/api/auth/register` | — | `{ username, email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/saves` | ✔ | Список 5 слотов (метаданные) |
| `PUT` | `/api/saves/:slot` | ✔ | Сохранить (upsert) |
| `GET` | `/api/saves/:slot` | ✔ | Загрузить |
| `DELETE` | `/api/saves/:slot` | ✔ | Удалить |

---

## 6. Частые вопросы

**Q: Я обновил Types.ts — как быть со старыми сохранениями?**
A: Ничего не делать. Старые сохранения загрузятся, отсутствующие поля будут `undefined`. Если игра падает — напиши `migrateSaveFormat` (см. раздел 3.2).

**Q: Можно не запускать БД в Docker, а использовать установленный PostgreSQL?**
A: Да. Просто убери `docker compose up db -d`, убедись что у тебя работает PostgreSQL на `localhost:5432`, и задай правильную `DATABASE_URL`.

**Q: Как сбросить БД локально и начать с нуля?**
A: `docker compose down -v` (флаг `-v` удалит volume с данными). Потом снова `docker compose up db -d` + `npx drizzle-kit migrate`.

**Q: Почему 5 слотов, а не бесконечно?**  
A: Так договорились. Если понадобится больше — в БД достаточно снять ограничение `BETWEEN 1 AND 5` и обновить валидацию в `saves.ts`.

---

## 7. Порядок деплоя первой версии

```bash
# На сервере, первый раз:
git pull origin feat/cloud-sync
cp .env.example .env        # отредактировать JWT_SECRET!
docker compose --profile prod up -d --build

# API сам накатит миграции при старте
# Готово — проверь: curl https://lilv2dim.ru/api/health
```

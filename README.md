# BandSheet

即時共編和弦進行譜與歌詞譜 — Real-time collaborative chord sheet editor for bands.

## 🆕 第一次接觸這個專案?(React / Java 新手看這裡)

請從保姆級新手文件開始:**[`docs/onboarding/`](./docs/onboarding/README.md)**
—— 從裝環境、把網站跑起來,到看懂前後端架構、動手做第一個功能,一步步帶你上手。

## Quick Start(全部跑在 Docker)

```bash
docker compose up -d --build
# → http://localhost:5173(前端,nginx 代理 /api 與 /ws 到後端)
# → http://localhost:8090/api/health(後端直連)
```

## 本機開發(前後端熱重載)

```bash
# Start DB only
docker compose up -d db

# Backend (requires Java 21; local dev listens on :8090)
cd backend && ./gradlew bootRun

# Frontend (new terminal)
cd frontend && npm run dev
# → http://localhost:5173
```

## Structure

```
/backend        Spring Boot 3 + Gradle (Java 21)
/frontend       React 18 + Vite + TypeScript
/docker-compose.yml
/docs           Spec documents (source of truth)
```

## Development Commands

```bash
# Backend tests
cd backend && ./gradlew test

# Frontend tests
cd frontend && npm run test

# Full stack via Docker
docker compose up -d --build
```

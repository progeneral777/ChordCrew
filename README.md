# BandSheet

即時共編和弦進行譜與歌詞譜 — Real-time collaborative chord sheet editor for bands.

## Quick Start

```bash
# Start DB
docker compose up -d db

# Backend (requires Java 21)
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

# Full stack via Docker (after building images)
docker compose --profile full up
```

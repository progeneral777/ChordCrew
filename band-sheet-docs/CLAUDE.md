# CLAUDE.md — BandSheet 專案指引

## 專案簡介
BandSheet 是一個讓樂團成員「即時共編和弦進行譜與歌詞譜」的網站。
核心價值:多人同時編輯同一份譜、和弦與歌詞對齊顯示、支援移調、版本歷史。

## 技術棧(不可任意更換)
- 後端:Java 21 + Spring Boot 3.x、Spring Security(JWT)、Spring WebSocket(STOMP)、Spring Data JPA
- 資料庫:PostgreSQL 16(開發環境可用 Docker Compose)
- 前端:React 18 + TypeScript + Vite、Zustand(狀態管理)、TailwindCSS
- 即時協作:WebSocket(STOMP over SockJS),衝突處理採「段落級鎖 + 樂觀更新」(v1 不做 CRDT/OT,見 ARCHITECTURE.md)
- 測試:後端 JUnit 5 + Testcontainers;前端 Vitest + React Testing Library

## Monorepo 結構
```
/backend        Spring Boot 專案 (Gradle)
/frontend       React + Vite 專案
/docker-compose.yml
/docs           規格文件(本資料夾內文件為唯一需求來源)
```

## 開發規則
1. 先讀 docs/PRD.md、docs/ARCHITECTURE.md、docs/DATA_MODEL.md、docs/API_SPEC.md 再動工。
2. 依 docs/TASKS.md 的順序逐階段實作,每完成一個階段要能編譯、測試通過。
3. 後端所有 API 依 API_SPEC.md,回傳格式統一為 `{ "data": ..., "error": null }`。
4. 和弦解析/移調邏輯必須有單元測試(這是核心邏輯,見 docs/CHORD_SPEC.md)。
5. 譜的儲存格式使用 ChordPro 變體(定義在 CHORD_SPEC.md),前後端共用同一份解析規則。
6. 不要引入未列出的大型框架;小型工具函式庫可自行判斷。
7. Git commit 使用 conventional commits(feat:/fix:/chore:)。

## 常用指令
```bash
# 啟動資料庫
docker compose up -d db

# 後端
cd backend && ./gradlew bootRun
cd backend && ./gradlew test

# 前端
cd frontend && npm run dev
cd frontend && npm run test
```

## 驗收基準(v1 完成的定義)
- 使用者可註冊/登入、建立樂團、邀請成員
- 可建立歌曲譜,以 ChordPro 格式編輯,即時預覽和弦+歌詞對齊
- 兩個瀏覽器視窗同時開同一首歌,一方編輯,另一方 1 秒內看到更新
- 一鍵移調(±半音),所有和弦正確轉換
- 每次儲存產生版本,可檢視並還原歷史版本

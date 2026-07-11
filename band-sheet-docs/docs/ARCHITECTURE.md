# ARCHITECTURE — 系統架構

## 1. 總覽
```
[React SPA] --REST(JSON)--> [Spring Boot API]
     |                            |
     +----WebSocket(STOMP)--------+
                                  |
                            [PostgreSQL]
```
- REST 負責 CRUD、認證、版本歷史
- WebSocket 負責:段落鎖、段落內容廣播、presence

## 2. 後端結構(package by feature)
```
com.bandsheet
├── auth/          註冊、登入、JWT filter
├── band/          樂團、成員、邀請
├── song/          歌曲 CRUD、移調 API(可選,移調主要在前端做)
├── sheet/         譜內容、版本
├── collab/        WebSocket handler、段落鎖、presence
├── common/        統一回應格式、例外處理、audit 欄位
└── config/        Security、WebSocket、CORS
```

### 認證
- POST /api/auth/login 回傳 access token(JWT,2 小時)+ refresh token(HTTP-only cookie,14 天)
- WebSocket 握手時以 query param 或 STOMP CONNECT header 帶 JWT 驗證

### 授權
- 每個資源操作都要檢查:該 user 是否為該 band 成員、角色是否足夠
- 用一個 `@BandRole(Role.EDITOR)` 之類的 AOP annotation 或在 service 層統一檢查

## 3. 即時協作設計(v1:段落鎖,非 CRDT)

### 為什麼不做 CRDT
v1 需求是「樂團成員偶爾同時改譜」,不是 Google Docs 等級的字元級協作。段落鎖實作成本低、行為好理解、不易出錯。資料模型不因此受限,v2 可換 CRDT。

### 譜的段落模型
譜全文為 ChordPro 文字,但前端把它切成段落(以 [Section] 標記或空行分隔)。鎖與廣播的單位是段落 index。

### STOMP 頻道設計
```
訂閱:
/topic/songs/{songId}/presence     在線名單變動
/topic/songs/{songId}/locks        鎖的取得/釋放
/topic/songs/{songId}/content      段落內容更新

發送:
/app/songs/{songId}/join           進入歌曲頁
/app/songs/{songId}/lock           { sectionIndex }
/app/songs/{songId}/unlock         { sectionIndex }
/app/songs/{songId}/update         { sectionIndex, content, baseRevision }
```

### 鎖規則
- 鎖存在記憶體(ConcurrentHashMap),不進 DB;server 重啟即全部釋放
- 鎖 TTL 60 秒,前端每 20 秒對持有中的鎖 heartbeat 續期
- 使用者斷線(WebSocket session closed)即釋放其所有鎖
- 搶鎖失敗回傳目前持有者,前端顯示「XX 編輯中」

### 更新與衝突
- 每首歌譜有 `revision`(整數,每次成功更新 +1)
- update 需帶 `baseRevision`;若不等於目前 revision,拒絕並回傳最新全文,前端重套用(有鎖保護,實務上很少發生)
- 「儲存版本」是另一個明確動作(REST),與即時廣播分開

## 4. 前端結構
```
src/
├── api/            axios instance、各 feature API
├── stores/         Zustand:auth、band、song、collabStore
├── lib/chord/      ★ 和弦解析、移調、ChordPro 解析(純函式,重點測試)
├── features/
│   ├── auth/
│   ├── bands/
│   ├── songs/       列表、metadata 編輯
│   ├── editor/      分割檢視編輯器、段落鎖 UI
│   └── viewer/      練團檢視模式(全螢幕、自動捲動)
├── components/     共用 UI
└── ws/             STOMP client 封裝、重連邏輯
```

### WebSocket 前端行為
- 進入編輯頁建立連線;斷線後指數退避重連(1s/2s/4s...最多 30s),重連後重新 join 並拉取最新全文
- 收到 content 更新:若該段落非自己持鎖中,直接套用

## 5. 移調在哪裡做
- 移調是「顯示層」操作:前端用 lib/chord 直接轉,不改原文
- 「永久移調」(改寫原文)才呼叫後端 PATCH,後端用同一套規則的 Java 實作轉換後存檔
- 兩邊實作必須通過 CHORD_SPEC.md 附的同一組測試案例

## 6. 部署(開發用)
- docker-compose:db(postgres:16)、backend、frontend(dev 時前端直接 vite dev server,proxy /api 與 /ws 到後端 8080)
- 環境變數:DB_URL、DB_USER、DB_PASSWORD、JWT_SECRET、CORS_ALLOWED_ORIGINS

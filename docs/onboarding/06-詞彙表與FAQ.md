# 06 · 詞彙表與 FAQ

看到不懂的名詞就回來查。這裡用白話解釋這個專案會遇到的詞。

---

## 通用 / 網頁

| 名詞 | 白話解釋 |
|---|---|
| **前端 (frontend)** | 使用者在瀏覽器看到、點的部分。這裡是 React。 |
| **後端 (backend)** | 跑在伺服器、處理資料與邏輯的部分。這裡是 Java/Spring Boot。 |
| **API** | 前端跟後端溝通的「窗口」。例如 `GET /api/me/songs`。 |
| **HTTP 方法** | `GET` 取資料、`POST` 新增、`PUT/PATCH` 修改、`DELETE` 刪除。 |
| **JSON** | 前後端傳資料的文字格式,像 `{ "title": "小情歌" }`。 |
| **port(埠)** | 電腦上服務的「門牌號」。前端 5173、後端 8090、資料庫 5432。 |
| **proxy(代理)** | 前端把 `/api/...` 轉發給後端,見 `vite.config.ts`。 |
| **環境變數 (env)** | 給程式的設定值(如資料庫密碼),不寫死在程式碼裡。見 `docker-compose.yml`。 |

## 登入 / 安全

| 名詞 | 白話解釋 |
|---|---|
| **JWT** | 一張加密的「通行證」字串。登入後拿到,之後每個請求都帶著它證明身分。 |
| **access token** | 短效通行證(本專案 2 小時)。放在瀏覽器 localStorage。 |
| **refresh token** | 長效憑證,放在 HTTP-only cookie。access token 過期時用它換新的。 |
| **Bearer** | 帶 token 的標準寫法:`Authorization: Bearer <token>`。 |
| **Spring Security** | Spring 的安全框架,負責「驗身分、擋權限」。 |
| **role(角色)** | 樂團成員的權限等級:OWNER > EDITOR > VIEWER。 |

## 後端 / Java / Spring

| 名詞 | 白話解釋 |
|---|---|
| **class / interface** | Java 的「類別 / 介面」。程式碼的基本組織單位。 |
| **annotation `@`** | 貼在 class/方法上的標籤,叫框架幫忙做事(如 `@Service`)。 |
| **依賴注入 (DI)** | 你在建構子宣告「需要什麼」,Spring 自動塞給你,不用自己 new。 |
| **Controller** | 收 HTTP 請求、回 JSON 的那層。 |
| **Service** | 商業邏輯、權限、交易那層。 |
| **Repository** | 跟資料庫溝通那層(多半是介面,Spring 自動實作)。 |
| **Entity** | 對應資料庫一張表的 Java 物件(`@Entity`)。 |
| **DTO** | 進出 API 的資料形狀,用 `record` 寫。跟 Entity 分開。 |
| **record** | Java 的精簡唯讀資料類別,一行定義好欄位。 |
| **JPA / Hibernate** | 幫你把「Java 物件 ↔ 資料表列」自動互轉,少寫 SQL。 |
| **JPQL** | 像 SQL 但操作 Java 物件的查詢語言,寫在 `@Query`。 |
| **transaction(交易)** | 一組資料庫操作「全成功或全失敗」。`@Transactional`。 |
| **Flyway / migration** | 用一支支 SQL 檔(V1、V2…)管理資料表演進。 |
| **Gradle** | 後端的建置工具。`./gradlew bootRun`、`./gradlew test`。 |
| **JUnit** | 後端的測試框架。 |
| **MockMvc** | 測試時「假裝打 API」而不用真的開伺服器。 |
| **H2** | 測試用的記憶體資料庫,跑完即丟。 |

## 前端 / React

| 名詞 | 白話解釋 |
|---|---|
| **component(元件)** | 回傳畫面的函式,React 的積木。 |
| **JSX / TSX** | 在 JS/TS 裡寫的「類 HTML」語法。 |
| **props** | 傳給元件的參數。 |
| **state(狀態)** | 元件內會變動的資料(`useState`)。改它 → 畫面自動重繪。 |
| **hook** | 以 `use` 開頭的函式,給元件加能力:`useState`、`useEffect`、`useMemo`。 |
| **useEffect** | 在元件出現或某資料變動時做事(如載入 API)。 |
| **樂觀更新** | 先改畫面讓體驗順,再打後端;失敗才還原。 |
| **Zustand** | 輕量的全域狀態工具(存登入者等跨頁面資料)。 |
| **react-router** | 前端路由,決定「網址 → 哪個頁面」。 |
| **Vite** | 前端開發伺服器 + 打包工具,支援熱重載。 |
| **TailwindCSS** | 用小 class 直接排版(`px-4`、`flex`…)。 |
| **TypeScript** | 加了型別的 JavaScript,編譯期抓錯。 |
| **Vitest** | 前端測試框架。 |
| **oxlint** | 前端程式碼風格檢查工具。 |

## 即時協作

| 名詞 | 白話解釋 |
|---|---|
| **WebSocket** | 一種「連線持續開著、雙向即時」的通訊。HTTP 做不到「伺服器主動推」,這個可以。 |
| **STOMP** | 跑在 WebSocket 上的訊息協定,有「訂閱 topic / 發訊息」的概念。 |
| **SockJS** | WebSocket 的相容層(環境不支援時退而求其次)。 |
| **段落鎖 (section lock)** | 某人正在編輯某段落時鎖住它,避免兩人同時改同一段。 |
| **revision** | 內容的版本號,用來偵測「你改的是不是最新版」(樂觀鎖)。 |

## ChordPro / 領域

| 名詞 | 白話解釋 |
|---|---|
| **ChordPro** | 一種把和弦標在歌詞裡的文字格式,如 `夜色[C]慢慢亮起`。 |
| **移調 (transpose)** | 把整首歌的和弦一起升/降幾個半音。核心邏輯在 `lib/chord`。 |
| **capo(移調夾)** | 顯示用的移調,不改譜面內容。 |
| **setlist / 歌單** | 把歌排成一份有序清單,練團/演出用。 |

---

## FAQ / 常見問題

**Q：我完全沒寫過 Java(或 React),能參與嗎?**
可以。挑你熟一點的那邊開始(只會網頁就從 React、想學後端就從 Java),照
[05 的練習清單](./05-動手做第一個功能.md#part-d-給你的練習清單由易到難)由易到難做。

**Q：我該從哪個檔案開始讀?**
挑一個你在畫面上看得到的功能(例如「我的歌曲」),打開 `features/songs/MySongsPage.tsx`,
一路往後追到 `api/songs.ts` → 後端 `SongController` → `SongService`。追一遍勝過空讀十遍。

**Q：後端改了沒反應?**
`./gradlew bootRun` 不會自動重載 Java 變更,改完要重啟。或用 `docker compose up -d --build backend`。
(前端 `npm run dev` 則會自動熱重載。)

**Q：我改了資料表,結果後端起不來?**
Entity 和實際資料表結構要一致。改結構一定要透過**新的 migration 檔**(V6、V7…),
不要手動改資料庫,也不要改已經上線的舊 V 檔。

**Q：怎麼看後端到底回了什麼?**
瀏覽器 → 開發者工具(F12)→ Network 分頁 → 點那個請求 → 看 Response。
或看後端日誌:`docker compose logs -f backend`。

**Q：測試一定要寫嗎?**
核心邏輯(尤其 `lib/chord` 的和弦/移調)一定要有測試。其他功能盡量補。
送 PR 前 `./gradlew test` 和 `npm run test / lint / build` 都要綠燈。

**Q：我把東西弄壞了想重來?**
還沒 commit:`git checkout .`(丟棄變更)。想看改了什麼:`git status`、`git diff`。

---

回到 [新手文件首頁](./README.md)。有看不懂的地方,直接問團隊 —— 問問題是最快的學習方式。

# Google 登入設定指南(Sign in with Google)

本文說明如何為 BandSheet 啟用「使用 Google 帳號登入」。照著做即可,不需要先懂 OAuth。

> 沒有設定也沒關係:只要沒填 client id,登入/註冊頁**不會出現** Google 按鈕,原本的 email/密碼登入照常運作。

---

## 0. 運作原理(30 秒看懂)

```
使用者按「使用 Google 繼續」
   → Google 跳出選帳號視窗,回傳一段 ID token(credential,一個 JWT)給前端
   → 前端把 credential POST 到後端 /api/auth/google
   → 後端用 Google 公鑰驗證這段 token(檢查簽章、有效期、audience=我方 client id)
   → 依 google_sub → email 找使用者,找不到就自動建立一個帳號
   → 後端發自己的 accessToken + refreshToken(和一般登入完全一樣)
```

重點:**密碼永遠不會經過我們的伺服器**;我們只信任 Google 簽名過的 ID token。

---

## 1. 到 Google Cloud Console 建立 OAuth 憑證

1. 開啟 <https://console.cloud.google.com/>,用你的 Google 帳號登入。
2. 左上角**選擇專案 → 新增專案**(例:`BandSheet`),建立後切換到該專案。
3. 左側選單 → **API 和服務 → OAuth 同意畫面(OAuth consent screen)**
   - User Type 選 **External(外部)**,按建立。
   - 填 App name(例:`BandSheet`)、User support email、Developer contact email,其餘可留空,一路**儲存並繼續**。
   - Scopes 不用加(預設的 email / profile / openid 就夠)。
   - **Test users**:開發階段 App 會處於「測試中」狀態,只有這裡加入的 Google 帳號能登入。把你自己和團員的 gmail 加進去。
4. 左側選單 → **API 和服務 → 憑證(Credentials)**
   - 上方 **建立憑證 → OAuth 用戶端 ID(OAuth client ID)**。
   - Application type 選 **Web application(網頁應用程式)**。
   - **Authorized JavaScript origins(已授權的 JavaScript 來源)** 加入前端網址,**不要**結尾斜線:
     - `http://localhost:5173`(本機開發)
     - 之後正式上線再加你的網域,例:`https://bandsheet.example.com`
   - **Authorized redirect URIs**:本專案用的是 Google Identity Services 按鈕流程,**不需要**填 redirect URI,可留空。
   - 建立後會拿到一組 **Client ID**(長得像 `1234567890-abcdef.apps.googleusercontent.com`)。Client secret 本專案用不到。

> 之後要上線給所有人用,再回 OAuth 同意畫面按 **發布應用程式(Publish app)**,脫離「測試中」狀態。

---

## 2. 把 Client ID 填進專案

同一個 Client ID 要給**前端和後端各一份**(前端拿來畫按鈕、後端拿來驗 token 的 audience)。

### 本機開發(不透過 Docker)

**前端** — 在 `frontend/` 建立 `.env.local`(可參考 `frontend/.env.example`):

```bash
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

**後端** — 啟動前設定環境變數:

```bash
export GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
cd backend && ./gradlew bootRun
```

改完 `.env.local` 後,前端 `npm run dev` 要**重新啟動**才會讀到。

### 用 Docker Compose

`VITE_GOOGLE_CLIENT_ID` 是 Vite 的**建置期**變數,已在 `docker-compose.yml` 用 build arg 帶入;後端則用環境變數。兩者都來自同一個 host 變數 `GOOGLE_CLIENT_ID`。

在專案根目錄建立 `.env`(Compose 會自動讀取):

```bash
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

然後**重新建置**(因為前端是編譯進靜態檔的,一定要 `--build`):

```bash
docker compose up -d --build
```

---

## 3. 驗證

1. 打開 <http://localhost:5173/login>,應該在「登入」按鈕下方看到「使用 Google 繼續」按鈕。
2. 按下去 → 選一個**已加入 Test users** 的 Google 帳號 → 應該直接登入並導向首頁。
3. 第一次登入會自動建立帳號;之後同一個 Google 帳號會對應到同一個使用者。

後端快速檢查(沒設 client id 時應回 503):

```bash
curl -i -X POST http://localhost:8090/api/auth/google \
  -H 'Content-Type: application/json' -d '{"credential":"x"}'
# 未設定 → 503 GOOGLE_LOGIN_DISABLED
# 有設定但 token 亂填 → 401 GOOGLE_TOKEN_INVALID
```

---

## 4. 帳號如何對應(重要行為)

後端 `AuthService.loginWithGoogle` 的比對順序:

1. 先用 Google 的 `sub`(帳號唯一碼)找 → 找到就是同一人。
2. 沒有的話,用 **email** 找既有帳號 → 找到就把該帳號**綁定** `google_sub`(於是原本用 email/密碼註冊的人,日後也能改用 Google 登入,仍是同一個帳號、同一批歌曲樂團)。
3. 都沒有 → **自動建立**新帳號(顯示名稱取自 Google 的 name,沒有就取 email 的 `@` 前段)。

另外,只接受 **email 已驗證** 的 Google 帳號(`email_verified = true`),否則回 401 `GOOGLE_EMAIL_UNVERIFIED`。

---

## 5. 常見問題

| 現象 | 原因 / 解法 |
| --- | --- |
| 登入頁沒有 Google 按鈕 | 前端沒讀到 `VITE_GOOGLE_CLIENT_ID`。確認 `.env.local` 有值、且 dev server 已重啟(Docker 則要 `--build`)。 |
| 按鈕出現但點了沒反應 / console 報 `origin is not allowed` | Google Console 的 **Authorized JavaScript origins** 沒有加對網址(注意 http/https、port、結尾不要有斜線)。 |
| 選完帳號後 403 / `access_denied` | App 還在「測試中」,而你的帳號不在 **Test users**。把帳號加進去,或發布應用程式。 |
| 後端回 503 `GOOGLE_LOGIN_DISABLED` | 後端沒讀到 `GOOGLE_CLIENT_ID`。 |
| 後端回 401 `GOOGLE_TOKEN_INVALID` | 前後端的 client id 不一致(audience 對不上),或 token 過期。確認兩邊是**同一個** client id。 |

---

## 6. 相關檔案一覽

**後端**
- `auth/GoogleTokenVerifier.java` — 驗證 Google ID token(用 `google-api-client` 的 `GoogleIdTokenVerifier`)。
- `auth/AuthService.java#loginWithGoogle` — 驗證後找/建立帳號並發 token。
- `auth/AuthController.java` — `POST /api/auth/google`。
- `config/SecurityConfig.java` — 放行 `/api/auth/google`。
- `db/migration/V6__google_login.sql` — `password_hash` 改為可空、新增 `google_sub`。
- `application.yml` — `app.google.client-id`。

**前端**
- `features/auth/GoogleSignInButton.tsx` — 渲染官方按鈕、拿到 credential 後呼叫後端。
- `stores/authStore.ts#loginWithGoogle`、`api/auth.ts#googleLogin`。
- `index.html` — 載入 `https://accounts.google.com/gsi/client`。
- `.env.example` — `VITE_GOOGLE_CLIENT_ID`。

**部署**
- `docker-compose.yml`、`frontend/Dockerfile` — 以 `GOOGLE_CLIENT_ID` 帶入前後端。

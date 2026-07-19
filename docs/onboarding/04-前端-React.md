# 04 · 前端:React + TypeScript

這一章帶你看懂前端。React 新手也能跟上,我們邊解釋概念邊看真實頁面。

---

## 1. 先懂幾個 React/TypeScript 概念

### 元件(Component)= 一個回傳畫面的函式
React 的畫面由「元件」組成。一個元件就是一個 **回傳 JSX(長得像 HTML 的東西)的函式**:
```tsx
function Hello() {
  return <p className="text-lg">你好</p>
}
```
- `className` 就是 HTML 的 `class`(React 用 `className`)。
- 大寫開頭的 `<Hello />` 就是「用這個元件」。

### Props = 傳給元件的參數
```tsx
function Song({ title }: { title: string }) {
  return <p>{title}</p>       // {} 裡可放 JS 變數
}
// 使用:<Song title="小情歌" />
```

### Hooks = 讓元件「有狀態、有生命週期」的函式(以 `use` 開頭)
- **`useState`**:元件內會變動的資料。
  ```tsx
  const [count, setCount] = useState(0)   // count 是值,setCount 改它
  // 按鈕:onClick={() => setCount(count + 1)}
  ```
  改了 state,React 會**自動重繪**這個元件。
- **`useEffect`**:在「元件出現時 / 某資料變動時」做事(例如載入 API)。
  ```tsx
  useEffect(() => {
    songsApi.listMine().then(...)   // 元件一出現就抓資料
  }, [])   // [] = 只在第一次執行
  ```
- **`useMemo`**:計算衍生資料(例如過濾後的清單),避免每次重繪都重算。

### TypeScript
就是「加了型別」的 JavaScript。你會看到 `interface`(定義資料形狀)、`: string`(標型別)。
好處:打錯欄位名、型別不對,編輯器/`npm run build` 會馬上抓出來。

---

## 2. 前端資料夾各自負責什麼

```
src/
├── features/     各頁面/功能(每個檔案通常是一個頁面元件)
│   ├── auth/         登入、註冊
│   ├── bands/        樂團列表、樂團詳情
│   ├── songs/        我的歌曲(MySongsPage)、樂團歌曲面板(SongsPanel)
│   ├── playlists/    我的歌單、歌單詳情
│   ├── editor/       歌曲編輯器(即時共編)
│   └── viewer/       檢視模式(練團捲動)
├── api/          呼叫後端的函式(songs.ts、playlists.ts…),一個檔對應一組後端 API
├── stores/       全域狀態(Zustand):authStore(登入者)、collabStore(協作)
├── components/   共用元件(AppLayout 外框、Pagination 分頁、RequireAuth 登入守衛)
├── lib/chord/    和弦解析/移調的純邏輯(和後端同一套規則)
└── ws/           WebSocket 客戶端(即時協作用)
```

進入點:`src/main.tsx` → 掛載 `App.tsx`。`App.tsx` 用 **react-router** 定義「哪個網址對應哪個頁面」。

---

## 3. 實戰:追一個頁面從頭到尾(我的歌曲)

開著這兩個檔案:`features/songs/MySongsPage.tsx`、`api/songs.ts`。

### 第 1 站:api 檔 —— `api/songs.ts`
每個「跟後端要資料」的動作,都先在這裡包成一個函式:
```ts
export const songsApi = {
  listMine: (params = {}) =>
    client.get<{ data: { songs: SongSummary[] } }>(`/me/songs`, { params }),
  createPersonal: (input) =>
    client.post<{ data: { song: SongDetail } }>(`/me/songs`, input),
  favorite: (id) => client.post(`/songs/${id}/favorite`),
  // ...
}
```
- `client` 是設定好的 HTTP 工具(見第 5 節),`baseURL` 是 `/api`,所以 `/me/songs` = `GET /api/me/songs`。
- `<{ data: { songs: SongSummary[] } }>` 是 TypeScript 在說「後端會回這個形狀」。
- `SongSummary` 這個型別也定義在同檔,和後端的 DTO 對應。

### 第 2 站:頁面元件 —— `MySongsPage.tsx`
```tsx
export default function MySongsPage() {
  const [songs, setSongs] = useState<SongSummary[]>([])   // 歌曲清單(狀態)
  const [loading, setLoading] = useState(true)

  // 元件一出現 → 抓「我的歌曲」和「我的樂團」
  useEffect(() => {
    Promise.all([songsApi.listMine(), bandsApi.list()])
      .then(([s, b]) => {
        setSongs(s.data.data.songs)   // 拿到資料 → 更新狀態 → 畫面自動重繪
        setBands(b.data.data.bands)
      })
      .catch((err) => setError(apiErrorMessage(err, '無法載入我的歌曲')))
      .finally(() => setLoading(false))
  }, [])

  // 衍生資料:依搜尋/分類/最愛過濾
  const filtered = useMemo(() => songs.filter(/* ...條件... */), [songs, query, tag, onlyFav])

  return (
    <AppLayout>
      {/* ...搜尋框、分類下拉... */}
      {loading ? <p>載入中…</p> : (
        <ul>
          {pageItems.map((song) => (        // 用 .map() 把每筆資料變成一列畫面
            <li key={song.id}>{song.title}</li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}
```
**核心心法(整個前端都這樣)**:
> 「狀態(state)」決定「畫面」。事件(點擊、輸入)去改狀態,React 就自動把畫面重畫。
> 你不用手動去改 DOM,只要管好狀態。

### 第 3 站:互動 → 改後端 → 更新狀態
例如按最愛星星(樂觀更新:先改畫面,失敗再還原):
```tsx
const toggleFav = async (song) => {
  const next = !song.favorite
  setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, favorite: next } : s)) // 先改畫面
  try {
    await (next ? songsApi.favorite(song.id) : songsApi.unfavorite(song.id))            // 再打後端
  } catch {
    setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, favorite: !next } : s)) // 失敗還原
  }
}
```

---

## 4. 路由與「登入守衛」

`App.tsx` 定義網址對應頁面:
```tsx
<Route path="/my-songs" element={<RequireAuth><MySongsPage /></RequireAuth>} />
<Route path="/playlists/:id" element={<RequireAuth><PlaylistDetailPage /></RequireAuth>} />
```
- `:id` 是「網址參數」,頁面裡用 `useParams()` 取得。
- `<RequireAuth>`(在 `components/`)是「守衛」:沒登入就導去登入頁。
- 換頁用 `useNavigate()`:`navigate('/playlists/123')`;連結用 `<Link to="...">`。

---

## 5. HTTP 客戶端與登入 token —— `api/client.ts`
```ts
const client = axios.create({ baseURL: '/api', withCredentials: true })

// 每個請求自動加上登入 token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```
還有一段「**遇到 401 自動用 cookie 換新 token 再重試一次**」的邏輯(silent refresh),
讓 token 過期時使用者不會突然被登出。你平常呼叫 `songsApi.xxx()` 時,這些都自動發生。

---

## 6. 全域狀態:Zustand —— `stores/authStore.ts`

有些資料要跨很多頁面共用(例如「目前登入者是誰」)。放在 Zustand store:
```ts
export const useAuthStore = create((set, get) => ({
  user: null,
  login: async (email, password) => { /* 呼叫 authApi、存 token、set({ user }) */ },
  logout: async () => { /* 清 token、set({ user: null }) */ },
}))
```
任何元件都能讀:
```tsx
const user = useAuthStore((s) => s.user)   // user 變動時,這個元件自動重繪
```

---

## 7. 樣式:TailwindCSS

不寫獨立 CSS 檔,直接在 `className` 用小工具 class:
```tsx
<button className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">儲存</button>
//                 背景藍       白字     圓角   左右padding 上下  滑鼠移上去變深藍
```
`text-sm`=小字、`flex items-center gap-2`=橫向排列置中間距、`mb-4`=下方margin。
好處:改樣式不用切檔案,一看 class 就知道長怎樣。

---

## 8. 我要加一個新頁面,該碰哪些檔案?(清單)
1. `api/xxx.ts` — 加呼叫後端的函式與型別。
2. `features/xxx/XxxPage.tsx` — 寫頁面元件(用 useState/useEffect 抓資料、render)。
3. `App.tsx` — 加一條 `<Route path=... element={<XxxPage/>} />`。
4. `components/AppLayout.tsx` — 需要的話在導覽列加連結。
5. `src/**/*.test.ts(x)` — 純邏輯(像 `lib/chord`)請加測試。

實際手把手範例見 [05-動手做第一個功能](./05-動手做第一個功能.md)。

---

## 9. 前端常用指令
```bash
cd frontend
npm run dev      # 開發伺服器(邊改邊看)
npm run test     # 單元測試(Vitest)
npm run lint     # 程式碼檢查(oxlint)
npm run build    # 型別檢查 + 打包(送出前一定要過)
```

下一章:[05-動手做第一個功能](./05-動手做第一個功能.md) —— 把前後端串起來,實作一個小功能。

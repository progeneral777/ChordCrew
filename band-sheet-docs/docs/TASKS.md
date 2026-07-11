# TASKS — 開發階段拆解(依序執行)

每個階段結束條件:編譯通過、測試通過、有可手動驗證的成果。完成後 commit。

## Phase 0 — 專案骨架
- [ ] Monorepo 結構、docker-compose(postgres)、README
- [ ] backend:Spring Boot 3 + Gradle + Flyway + 統一回應格式 + 全域例外處理 + health endpoint
- [ ] frontend:Vite + React + TS + Tailwind + router + axios instance
- 驗證:`/api/health` 回 200;前端首頁可開

## Phase 1 — 認證
- [ ] users 表、註冊/登入/refresh/me、JWT filter、BCrypt
- [ ] 前端:註冊/登入頁、auth store、token 自動刷新、路由守衛
- 驗證:註冊→登入→重整頁面仍保持登入

## Phase 2 — 樂團與成員
- [ ] bands、band_members、band_invites 全套 API 與授權檢查
- [ ] 前端:樂團列表/建立、成員管理、邀請連結產生與接受頁
- 驗證:兩個帳號透過邀請連結加入同一樂團

## Phase 3 — 和弦核心函式庫(先做,獨立於 UI)
- [ ] frontend `lib/chord/`:parseChord、transposeChord、parseChordPro(切段落、切 token)
- [ ] backend `song/chord/`:Java 版 parse + transpose
- [ ] CHORD_SPEC.md 第 4 節全部測試案例通過(兩邊)
- 驗證:`npm run test` 與 `./gradlew test` 全綠

## Phase 4 — 歌曲 CRUD 與編輯器(單人)
- [ ] songs 表與 API(含 PUT content 樂觀鎖、transpose、軟刪除)
- [ ] 前端:歌曲列表(搜尋/標籤/排序)、metadata 表單
- [ ] 編輯器頁:左文字/右預覽分割檢視,ChordPro 即時渲染(和弦在歌詞上方)
- [ ] 顯示層移調(±半音、選調、capo)
- 驗證:輸入範例譜正確渲染;移調正確;重整不掉資料

## Phase 5 — 版本歷史
- [ ] song_versions API、儲存快照、檢視、還原
- [ ] 前端版本側欄:列表、預覽 diff(簡單全文對照即可)、還原
- 驗證:改譜→存版本→還原到舊版

## Phase 6 — 即時共編
- [ ] WebSocket/STOMP 設定、JWT 握手驗證
- [ ] presence、段落鎖(TTL+heartbeat+斷線釋放)、SECTION_UPDATED 廣播、revision 檢查
- [ ] 前端:STOMP client、重連、在線頭像列、段落鎖 UI(他人編輯中顯示灰底+名字)
- 驗證:兩個視窗同開一首歌,A 編輯 Verse 時 B 該段唯讀;A 完成後 B 於 1 秒內看到更新
- 後端整合測試:用兩個 WebSocket client 模擬搶鎖

## Phase 7 — 練團檢視模式與收尾
- [ ] 全螢幕檢視:字級調整、深色模式、自動捲動(速度可調)
- [ ] RWD:檢視模式在手機上可用
- [ ] 錯誤處理與 loading 態盤點、空狀態頁
- 驗證:手機瀏覽器開檢視模式,自動捲動順暢

## 給 Claude Code 的執行提示
- 一次只做一個 Phase;開始前重讀相關 spec 文件
- 每個 Phase 內先寫測試會更穩(至少 Phase 3、6 必須)
- 有 spec 未定義的細節,選最簡單合理的做法並在 commit message 註記

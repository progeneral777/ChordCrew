# BandSheet 開發文件包

把這整個資料夾放到你的新專案根目錄,然後啟動 Claude Code。

## 文件一覽
- `CLAUDE.md` — Claude Code 自動讀取的專案指引(技術棧、規則、驗收基準)
- `docs/PRD.md` — 產品需求
- `docs/ARCHITECTURE.md` — 架構、即時協作設計
- `docs/DATA_MODEL.md` — 資料庫 schema
- `docs/API_SPEC.md` — REST 與 WebSocket 規格
- `docs/CHORD_SPEC.md` — 譜格式、和弦文法、移調規則(含必過測試案例)
- `docs/TASKS.md` — 分 8 個 Phase 的執行順序

## 建議起手 prompt(貼給 Claude Code)
```
請先閱讀 CLAUDE.md 與 docs/ 下所有文件,然後執行 docs/TASKS.md 的 Phase 0。
完成後停下來,列出你做了什麼、如何驗證,等我確認再進下一個 Phase。
```

之後每次就說:
```
繼續執行 Phase N,完成後停下並說明驗證方式。
```

## 小建議
- Phase 3(和弦函式庫)是整個產品的核心,測試全綠再往下
- Phase 6(即時共編)最複雜,建議獨立一個 session 專心做
- 中途想改需求,先改 spec 文件再叫 Claude Code 重讀,不要只口頭說

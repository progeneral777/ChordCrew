# CHORD_SPEC — 譜格式與和弦邏輯(核心規格,前後端共用)

## 1. 譜格式:ChordPro 變體

```
{title: 小情歌}
{key: C}
{bpm: 72}

[Intro]
| C | G/B | Am | F |

[Verse 1]
這是一首[C]簡單的小情歌 唱著[G/B]人們心腸的曲折
我想我很[Am]快樂 當有你的[F]溫熱 腳邊的空[G]氣轉了

[Chorus]
你知道 就算大[C]雨讓這座[G]城市顛[Am]倒
我會給你懷[F]抱
```

規則:
- `{key}` 等 metadata 行:與 DB 欄位同步,解析時以 DB 為準,匯出時寫回
- `[SectionName]` 獨佔一行 = 段落標題;段落 = 從段落標題到下一個段落標題前
- 歌詞行內 `[Chord]` = 和弦錨點,渲染時顯示在其後文字正上方
- `|` 開頭的行 = 純和弦進行行(instrumental),依 `|` 分小節渲染
- 段落標題行以外的 `[...]` 一律視為和弦;無法解析為和弦則原樣顯示並在編輯器標紅

## 2. 和弦文法
```
Chord      := Root Quality? Extension* ('/' BassNote)?
Root       := [A-G] ('#' | 'b')?
Quality    := 'm' | 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | '+' | '°'
Extension  := '5'|'6'|'7'|'9'|'11'|'13'|'add9'|'maj7'|'m7'|'7sus4'|'6/9'|
              'b5'|'#5'|'b9'|'#9'|'#11'|'b13' (可組合,如 m7b5)
BassNote   := [A-G] ('#' | 'b')?
```
合法例:`C`、`F#m`、`Bb7`、`Gmaj7`、`Am7b5`、`Dsus4`、`C/E`、`E7#9`
渲染時 `#`→`♯`、`b`→`♭`(僅顯示,儲存仍用 ASCII)。

## 3. 移調規則
- 半音表(升記號向):C C# D D# E F F# G G# A A# B
- 移調 n 半音:Root 與 BassNote 各 +n(mod 12),Quality/Extension 不變
- 升降記號選擇:依「目標調的調號」決定用 ♯ 或 ♭
  - ♯ 調:G, D, A, E, B, F#, C#(及其關係小調)
  - ♭ 調:F, Bb, Eb, Ab, Db, Gb(及其關係小調)
  - C/Am:預設用 ♯
- 目標調 = 原 key 移同樣半音數;歌曲無 key 時預設用 ♯
- Capo 顯示:capo n 時顯示和弦 = 原和弦移調 -n

## 4. 必過測試案例(前端 TS 與後端 Java 都要過)
| 輸入 | 半音 | 目標key | 輸出 |
|---|---|---|---|
| C | +2 | D | D |
| F#m7 | +1 | (key G→Ab) | Gm7 |
| Bb | +2 | C | C |
| C/E | +2 | D | D/F# |
| Am7b5 | +3 | Cm | Cm7b5 |
| E7#9 | -4 | C | C7#9 |
| G | +5 | C | C |
| B | +1 | (key C→Db) | C |
| F | -1 | E | E |
| Dsus4 | +7 | A | Asus4 |

解析失敗案例:`H`、`Cx`、`[Verse]`(段落行不是和弦)→ 應回 null/錯誤,不 throw 到 UI。

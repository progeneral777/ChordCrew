# DATA_MODEL — 資料庫設計(PostgreSQL)

所有表共通欄位:`id (UUID, PK)`、`created_at`、`updated_at`。

## users
| 欄位 | 型別 | 說明 |
|------|------|------|
| email | varchar(255) unique not null | |
| password_hash | varchar(100) nullable | BCrypt;Google 登入使用者為 null(見 GOOGLE_LOGIN_SETUP.md) |
| display_name | varchar(50) not null | |
| google_sub | varchar(255) unique nullable | Google 帳號唯一碼(id token 的 sub);非 Google 使用者為 null |

## bands
| 欄位 | 型別 | 說明 |
|------|------|------|
| name | varchar(100) not null | |
| owner_id | UUID FK→users | |

## band_members
| 欄位 | 型別 | 說明 |
|------|------|------|
| band_id | UUID FK→bands | |
| user_id | UUID FK→users | |
| role | varchar(10) | OWNER / EDITOR / VIEWER |
unique(band_id, user_id)

## band_invites
| 欄位 | 型別 | 說明 |
|------|------|------|
| band_id | UUID FK | |
| token | varchar(64) unique | 隨機 |
| role | varchar(10) | 加入後的角色 |
| expires_at | timestamptz | 建立 +7 天 |
| created_by | UUID FK→users | |

## songs
| 欄位 | 型別 | 說明 |
|------|------|------|
| owner_id | UUID FK→users not null | 建立者;決定「我的歌曲」歸屬 |
| title | varchar(200) not null | |
| artist | varchar(200) | |
| original_key | varchar(5) | 例 "C", "F#m" |
| bpm | int nullable | |
| time_signature | varchar(10) | 例 "4/4" |
| tags | text[] | |
| content | text | ChordPro 全文(目前版本) |
| revision | int default 0 | 即時協作用 |
| is_public | boolean not null default false | 公開歌曲:任何登入者可檢視(唯讀);僅 owner 能切換 |
| deleted_at | timestamptz nullable | 軟刪除 |

歌曲屬於「建立者(owner)」;是否分享、分享到哪些樂團,記錄在 `song_bands`(見下)。
個人歌曲 = 在 `song_bands` 沒有任何列。

索引:`(owner_id, updated_at desc)`、title 目前用 `ILIKE`(以 `cast(:q as text)` 避免 null 被推斷成 bytea)。

> 演進:v1 曾用 `songs.band_id`(單一樂團)。V2 加入 `owner_id`、band_id 可為空;
> V4 改為多對多(移除 `band_id`,改用 `song_bands`),一首歌可同時分享到多個樂團。

## song_bands
歌曲分享到樂團的關聯(多對多)。分享 = 新增一列;取消分享 = 刪除一列。
| 欄位 | 型別 | 說明 |
|------|------|------|
| song_id | UUID FK→songs (on delete cascade) | |
| band_id | UUID FK→bands (on delete cascade) | 刪除樂團只解除分享,不刪歌曲 |
unique(song_id, band_id)

索引:`(band_id)`、`(song_id)`

## song_favorites
使用者的「我的最愛」(個人層級,跨樂團)。
| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | UUID FK→users (on delete cascade) | |
| song_id | UUID FK→songs (on delete cascade) | |
unique(user_id, song_id)

索引:`(user_id)`

## song_versions
| 欄位 | 型別 | 說明 |
|------|------|------|
| song_id | UUID FK | |
| content | text | 快照全文 |
| note | varchar(200) nullable | |
| created_by | UUID FK→users | |

索引:`(song_id, created_at desc)`

## refresh_tokens
| 欄位 | 型別 | 說明 |
|------|------|------|
| user_id | UUID FK | |
| token_hash | varchar(100) | |
| expires_at | timestamptz | |

## 備註
- 使用 Flyway 管理 migration:V1 init、V2 個人歌曲(owner_id)、V3 我的最愛、V4 多團分享(song_bands)
- 段落鎖與 presence 不進 DB(記憶體)

# DATA_MODEL — 資料庫設計(PostgreSQL)

所有表共通欄位:`id (UUID, PK)`、`created_at`、`updated_at`。

## users
| 欄位 | 型別 | 說明 |
|------|------|------|
| email | varchar(255) unique not null | |
| password_hash | varchar(100) not null | BCrypt |
| display_name | varchar(50) not null | |

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
| band_id | UUID FK | |
| title | varchar(200) not null | |
| artist | varchar(200) | |
| original_key | varchar(5) | 例 "C", "F#m" |
| bpm | int nullable | |
| time_signature | varchar(10) | 例 "4/4" |
| tags | text[] | |
| content | text | ChordPro 全文(目前版本) |
| revision | int default 0 | 即時協作用 |
| deleted_at | timestamptz nullable | 軟刪除 |

索引:`(band_id, updated_at desc)`、title 用 `gin (to_tsvector(...))` 或先簡單 `ILIKE`。

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
- 使用 Flyway 管理 migration(V1__init.sql 起)
- 段落鎖與 presence 不進 DB(記憶體)

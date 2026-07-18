# API_SPEC — REST API 規格

Base URL: `/api`
統一回應:成功 `{ "data": ..., "error": null }`;失敗 `{ "data": null, "error": { "code": "SONG_NOT_FOUND", "message": "..." } }`
除 auth 相關外皆需 `Authorization: Bearer <jwt>`。

## Auth
| Method | Path | Body | 回應 |
|---|---|---|---|
| POST | /auth/register | { email, password, displayName } | { user } |
| POST | /auth/login | { email, password } | { accessToken, user } + refresh cookie |
| POST | /auth/refresh | (cookie) | { accessToken } |
| POST | /auth/logout | | 204 |
| GET | /auth/me | | { user } |

密碼規則:至少 8 字元。register email 重複回 409 `EMAIL_TAKEN`。

## Bands
| Method | Path | 說明 |
|---|---|---|
| GET | /bands | 我所屬的樂團列表(含我的 role) |
| POST | /bands | { name } → 建立,建立者為 OWNER |
| GET | /bands/{id} | 樂團詳情 + 成員列表 |
| PATCH | /bands/{id} | { name } (OWNER) |
| DELETE | /bands/{id} | (OWNER) |
| POST | /bands/{id}/invites | { role } → { inviteUrl, token, expiresAt } (OWNER) |
| POST | /invites/{token}/accept | 目前登入者加入樂團 |
| DELETE | /bands/{id}/members/{userId} | 移除成員 (OWNER) |
| PATCH | /bands/{id}/members/{userId} | { role } (OWNER) |

## Songs
歌曲屬於建立者(owner),可分享到零到多個樂團(見 DATA_MODEL 的 `song_bands`)。
`SongSummary`/`SongDetail` 皆帶 `bandIds`(已分享樂團,可多個;空 = 個人歌曲)、
`favorite`(目前使用者是否加入最愛);`SongDetail` 另含 `ownerId`。
存取權:歌曲屬於某樂團時沿用樂團角色;個人歌曲(未分享)僅建立者可存取。

| Method | Path | 說明 |
|---|---|---|
| GET | /bands/{bandId}/songs?query=&tag=&sort=updated | 某樂團的歌曲列表(不含 content) |
| POST | /bands/{bandId}/songs | 在樂團建立歌曲,建立者為 owner 並直接分享到該團 (EDITOR+) |
| GET | /me/songs?query=&tag=&sort=updated | 我的歌曲庫(owner 為我,含已分享出去的) |
| POST | /me/songs | 建立個人歌曲(尚未分享到任何樂團) |
| GET | /songs/{id} | 詳情含 content、revision、bandIds、favorite、ownerId |
| PATCH | /songs/{id} | metadata 更新 (EDITOR+) |
| PUT | /songs/{id}/content | { content, baseRevision } → 409 REVISION_CONFLICT 時回最新 { content, revision } |
| POST | /songs/{id}/transpose | { semitones } 永久移調,改寫 content (EDITOR+) |
| DELETE | /songs/{id} | 軟刪除 (EDITOR+) |
| POST | /songs/{id}/share | { bandId } 分享到一個樂團(可累加多團;僅 owner,且需為該團 EDITOR+) |
| POST | /songs/{id}/unshare | { bandId } 取消分享某個樂團(僅 owner) |
| POST | /songs/{id}/favorite | 加入我的最愛(需可讀該歌)→ 204 |
| DELETE | /songs/{id}/favorite | 取消我的最愛 → 204 |

## Versions
| Method | Path | 說明 |
|---|---|---|
| GET | /songs/{id}/versions | 列表(不含 content) |
| POST | /songs/{id}/versions | { note? } 以目前 content 建立快照 |
| GET | /songs/{id}/versions/{versionId} | 含 content |
| POST | /songs/{id}/versions/{versionId}/restore | 還原(先自動快照目前內容) |

## WebSocket(STOMP)
- Endpoint:`/ws`(SockJS),CONNECT header `Authorization: Bearer <jwt>`
- 頻道與訊息格式見 ARCHITECTURE.md 第 3 節

訊息 payload 定義:
```json
// /topic/songs/{id}/presence
{ "type": "PRESENCE", "users": [{ "userId": "...", "displayName": "..." }] }

// /topic/songs/{id}/locks
{ "type": "LOCKED", "sectionIndex": 2, "userId": "...", "displayName": "..." }
{ "type": "UNLOCKED", "sectionIndex": 2 }

// /topic/songs/{id}/content
{ "type": "SECTION_UPDATED", "sectionIndex": 2, "content": "...", "revision": 15, "userId": "..." }
```

## 錯誤碼
UNAUTHORIZED(401)、FORBIDDEN(403)、NOT_FOUND(404)、EMAIL_TAKEN(409)、REVISION_CONFLICT(409)、INVITE_EXPIRED(410)、VALIDATION_ERROR(400,附 fieldErrors)

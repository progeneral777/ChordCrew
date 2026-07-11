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
| Method | Path | 說明 |
|---|---|---|
| GET | /bands/{bandId}/songs?query=&tag=&sort=updated | 列表(不含 content) |
| POST | /bands/{bandId}/songs | { title, artist?, originalKey?, bpm?, timeSignature?, tags? } (EDITOR+) |
| GET | /songs/{id} | 詳情含 content 與 revision |
| PATCH | /songs/{id} | metadata 更新 (EDITOR+) |
| PUT | /songs/{id}/content | { content, baseRevision } → 409 REVISION_CONFLICT 時回最新 { content, revision } |
| POST | /songs/{id}/transpose | { semitones } 永久移調,改寫 content (EDITOR+) |
| DELETE | /songs/{id} | 軟刪除 (EDITOR+) |

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

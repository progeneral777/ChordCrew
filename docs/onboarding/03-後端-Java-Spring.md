# 03 · 後端:Java + Spring Boot

這一章帶你看懂後端。就算你沒寫過 Java 也沒關係,我們會邊解釋概念邊看真實程式碼。

---

## 1. 先懂幾個 Java/Spring 概念

### Java 長怎樣
Java 的程式都放在 **class(類別)** 裡,每個 `.java` 檔一個 class。方法(function)長這樣:
```java
public List<SongSummary> list(UUID bandId, UUID userId) { ... }
//     ↑回傳型別        ↑方法名  ↑參數(型別 + 名字)
```
Java 是「靜態型別」語言:每個變數都要寫型別(`UUID`、`String`、`List<...>`),編譯時就會抓錯。

### `@註解(Annotation)`是什麼
你會看到很多 `@` 開頭的東西,例如 `@Service`、`@GetMapping`。
它們是「貼在 class 或方法上的標籤」,告訴 **Spring 框架**「請幫我處理這件事」。例如:
- `@RestController`:這個 class 負責處理 HTTP 請求。
- `@GetMapping("/me/songs")`:這個方法對應 `GET /api/me/songs`。
- `@Service`:這是一個「服務」(商業邏輯)元件。

### 依賴注入(Dependency Injection,DI)—— Spring 的核心魔法
你會看到 class 的建構子(constructor)長這樣:
```java
public SongController(SongService songService, FavoriteService favoriteService) {
    this.songService = songService;
    this.favoriteService = favoriteService;
}
```
你**不用自己 new 出 `SongService`**。Spring 啟動時會自動建立這些元件,並在需要時「注入(塞進來)」。
你只要在建構子「宣告我需要什麼」,Spring 就會給你。這讓元件容易替換、容易測試。

> 心法:後端就是一堆 `@Component / @Service / @RestController / @Repository`,
> 靠建構子互相「要來用」。Spring 負責把它們兜在一起。

---

## 2. 分層架構(每一層的責任)

後端一個功能通常分四層,由上到下:

```
Controller  ← 收 HTTP 請求、驗參數、回 JSON。不寫商業邏輯。
    │  呼叫
Service     ← 商業邏輯、權限檢查、交易(transaction)。核心都在這。
    │  呼叫
Repository  ← 跟資料庫溝通(下 SQL / 查詢)。多半是「介面」,Spring 自動實作。
    │  對應
Entity      ← 對應資料庫一張表的 Java 物件(@Entity)。
```

外加:
- **DTO**(Data Transfer Object):進出 API 的資料形狀,用 Java `record` 寫。
- **共用**:`ApiResponse`(統一回傳格式)、`AppException`(自訂錯誤)、`BaseEntity`(共通欄位)。

---

## 3. 實戰:追一個 API 從頭到尾(GET /me/songs)

我們追「列出我建立的歌曲」這條 API。開著這些檔案對照:
`song/SongController.java`、`song/SongService.java`、`song/SongRepository.java`、`song/Song.java`。

### 第 1 站:Controller —— `SongController.java`
```java
@RestController
@RequestMapping("/api")          // 這個 class 所有路由都以 /api 開頭
public class SongController {

    private final SongService songService;   // 由 Spring 注入(見上面 DI)

    @GetMapping("/me/songs")     // → GET /api/me/songs
    public ApiResponse<Map<String, List<SongSummary>>> listMine(
            @AuthenticationPrincipal AuthUser me,     // 目前登入者(誰在打這支 API)
            @RequestParam(required = false) String query,   // 網址上的 ?query=...
            @RequestParam(required = false) String tag,
            @RequestParam(required = false, defaultValue = "updated") String sort) {
        return ApiResponse.ok(Map.of("songs", songService.listMine(me.id(), query, tag, sort)));
    }
}
```
重點:
- Controller 只做「接參數 → 呼叫 Service → 包成 `ApiResponse` 回去」。
- `@AuthenticationPrincipal AuthUser me`:Spring 已經幫你把「目前登入者」準備好(見第 5 節 JWT)。
- `ApiResponse.ok(...)` 產生 `{ "data": {...}, "error": null }`。

### 第 2 站:Service —— `SongService.java`
```java
@Service
public class SongService {

    @Transactional(readOnly = true)     // 這個方法在一個資料庫交易裡執行
    public List<SongSummary> listMine(UUID userId, String query, String tag, String sort) {
        // 交給 Repository 查「我建立的、標題含關鍵字的」歌
        return toSummaries(songRepository.searchByOwner(userId, blankToNull(query)), userId, tag, sort);
    }
}
```
Service 是商業邏輯的家:過濾分類、排序、加上「是否為我的最愛」旗標、組成要回傳的 DTO,都在這。

### 第 3 站:Repository —— `SongRepository.java`
```java
public interface SongRepository extends JpaRepository<Song, UUID> {

    @Query("""
        select s from Song s
        where s.ownerId = :ownerId and s.deletedAt is null
          and (:q is null or lower(s.title) like lower(concat('%', cast(:q as string), '%')))
        """)
    List<Song> searchByOwner(@Param("ownerId") UUID ownerId, @Param("q") String q);
}
```
重點:
- 它是**介面(interface)**,你沒寫任何實作 —— Spring Data JPA 會自動幫你生出來!
- 繼承 `JpaRepository<Song, UUID>` 就免費得到 `findById`、`save`、`delete`… 等方法。
- 需要自訂查詢時,用 `@Query` 寫 JPQL(很像 SQL,但操作的是 Java 物件)。
- 也可以用「方法命名慣例」讓 Spring 自動生查詢,例如 `findByOwnerIdOrderByUpdatedAtDesc(...)`
  (見 `playlist/PlaylistRepository.java`)—— 名字照規則寫,實作自動生成。

### 第 4 站:Entity —— `Song.java`
```java
@Entity
@Table(name = "songs")                 // 對應資料庫的 songs 表
public class Song extends BaseEntity {  // BaseEntity 提供 id / createdAt / updatedAt

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 200)
    private String title;
    // ... 其他欄位、getter/setter
}
```
一個 `Song` 物件 = `songs` 表的一列。JPA(Hibernate)負責把「Java 物件 ↔ 資料表列」互相轉換,
所以你多半不用自己寫 `INSERT / SELECT`。

### 回程
Repository 回一串 `Song` → Service 轉成 `SongSummary`(DTO)並加旗標 → Controller 包成 `ApiResponse`
→ Spring 自動轉成 JSON → 前端收到。**這就是一條完整的後端請求。**

---

## 4. DTO 與統一回傳格式

**DTO** 用 Java `record`(超精簡的資料類別)。看 `song/dto/SongDtos.java`:
```java
public record SongSummary(
    UUID id, List<UUID> bandIds, String title, String artist, String originalKey,
    Integer bpm, String timeSignature, List<String> tags, boolean favorite, Instant updatedAt) {}
```
一行就定義好一個「唯讀資料袋」,自動有建構子與 getter。

**為什麼要 DTO 而不是直接回 Entity?**
Entity 是資料庫的樣子(可能有敏感欄位、關聯);DTO 是「我想給前端看的樣子」。分開比較安全、彈性。

**統一回傳** 由 `common/dto/ApiResponse.java` 負責,永遠是 `{ data, error }`。
出錯時,`common/exception/` 裡的 `GlobalExceptionHandler` 會把例外轉成漂亮的錯誤 JSON
(例如丟 `AppException.notFound("SONG_NOT_FOUND", "找不到歌曲")` → 回 404 + 對應 JSON)。

---

## 5. 登入與權限:JWT 怎麼運作

HTTP 每個請求都是「無記憶」的,伺服器怎麼知道「你是誰」?靠 **JWT(JSON Web Token)**。

1. 你登入成功後(`auth/AuthController` + `AuthService`),後端發一張 **access token**(一段加密字串)。
2. 前端把它存起來,之後每個請求都在標頭帶上 `Authorization: Bearer <token>`。
3. 後端的 **`auth/JwtAuthFilter.java`**(一個「攔截器」)會在每個請求進來時:
   - 讀出 token → 用 `JwtService` 驗證 → 認出使用者 → 放進 Spring Security 的「目前登入者」。
4. 於是 Controller 裡 `@AuthenticationPrincipal AuthUser me` 就拿得到你是誰。

哪些網址不用登入?看 **`config/SecurityConfig.java`**:`/api/auth/**`、`/ws/**` 放行,其餘都要登入。

**樂團層級的權限**(誰能編輯某樂團的歌)由 `band/BandAccess.java` 負責:
- `requireMember(bandId, userId)` → 不是成員就回 404
- `requireRole(bandId, userId, Role.EDITOR)` → 權限不夠回 403

歌曲層級(個人歌 vs 已分享)由 `song/SongAccess.java` 統一判斷,歌曲相關的三個服務共用它。

---

## 6. 資料庫遷移(Flyway)—— 改資料表的正確方式

你**不能**手動去改資料庫的表結構。要改,就在
`backend/src/main/resources/db/migration/` 新增一支 SQL,檔名照順序:`V6__說明.sql`。

已有的:
| 檔案 | 做了什麼 |
|---|---|
| `V1__init.sql` | 建最初的表(users、bands、songs、song_versions…) |
| `V2__personal_songs.sql` | songs 加 owner_id、band_id 可為空 |
| `V3__song_favorites.sql` | 我的最愛表 |
| `V4__song_multi_band.sql` | 改多對多分享(song_bands),移除 songs.band_id |
| `V5__playlists.sql` | 歌單表 |

後端啟動時,Flyway 會自動「把還沒跑過的 V 檔依序執行」,並記在 `flyway_schema_history` 表。
> 規則:**已經 commit / 上線過的 V 檔不可再改**,要改就開新的一支。

---

## 7. 測試(JUnit)

後端測試在 `backend/src/test/`,用 JUnit。測試時資料庫用 **H2**(記憶體資料庫,跑完即丟),
設定在 `src/test/resources/application-test.yml`。跑法:
```bash
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
cd backend && ./gradlew test
```
你會看到用 `MockMvc` 模擬打 API 的測試(不用真的開伺服器),驗證回傳的 JSON 對不對。

---

## 8. 我要加一條新 API,該碰哪些檔案?(清單)

以「在 xxx 功能加一個端點」為例,通常:
1. `xxx/dto/XxxDtos.java` — 定義請求/回應的 record(需要的話)。
2. `xxx/XxxService.java` — 寫商業邏輯(權限檢查、查詢、組資料)。
3. `xxx/XxxController.java` — 加 `@GetMapping / @PostMapping` 方法,呼叫 Service。
4. 需要新資料表/欄位 → 加 `V6__...sql` 遷移 + 對應 Entity。
5. `backend/src/test/...` — 加測試。
6. 更新 `band-sheet-docs/docs/API_SPEC.md`(讓文件同步)。

實際手把手範例見 [05-動手做第一個功能](./05-動手做第一個功能.md)。

下一章:[04-前端-React](./04-前端-React.md)

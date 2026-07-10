package com.bandsheet.collab;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CollabIntegrationTest {

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper objectMapper;

    private String tokenA;
    private String tokenB;
    private String songId;

    private StompSession sessionA;
    private StompSession sessionB;

    private final BlockingQueue<Map<String, Object>> locksA = new LinkedBlockingQueue<>();
    private final BlockingQueue<Map<String, Object>> locksB = new LinkedBlockingQueue<>();
    private final BlockingQueue<Map<String, Object>> contentB = new LinkedBlockingQueue<>();
    private final BlockingQueue<Map<String, Object>> presenceB = new LinkedBlockingQueue<>();
    private final BlockingQueue<Map<String, Object>> syncA = new LinkedBlockingQueue<>();

    private static final String CONTENT = "[Verse]\n第一段[C]歌詞\n[Chorus]\n第二段[G]歌詞";

    @BeforeAll
    void setup() throws Exception {
        registerAndSetup();

        WebSocketStompClient stompClient = new WebSocketStompClient(new SockJsClient(
                List.of(new WebSocketTransport(new StandardWebSocketClient()))));
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());

        sessionA = connect(stompClient, tokenA);
        sessionB = connect(stompClient, tokenB);

        subscribe(sessionA, "/topic/songs/" + songId + "/locks", locksA);
        subscribe(sessionA, "/user/queue/sync", syncA);
        subscribe(sessionB, "/topic/songs/" + songId + "/locks", locksB);
        subscribe(sessionB, "/topic/songs/" + songId + "/content", contentB);
        subscribe(sessionB, "/topic/songs/" + songId + "/presence", presenceB);
        Thread.sleep(300); // 等訂閱生效

        sessionA.send("/app/songs/" + songId + "/join", Map.of());
        sessionB.send("/app/songs/" + songId + "/join", Map.of());
    }

    @AfterAll
    void teardown() {
        if (sessionB != null && sessionB.isConnected()) sessionB.disconnect();
    }

    @Test
    @Order(1)
    void presenceShowsBothUsers() throws Exception {
        // B join 後的 presence 廣播應包含兩人
        Map<String, Object> msg = awaitMatching(presenceB, m ->
                ((List<?>) m.get("users")).size() == 2);
        assertThat(msg.get("type")).isEqualTo("PRESENCE");
    }

    @Test
    @Order(2)
    void lockContention() throws Exception {
        // A 鎖住段落 0
        sessionA.send("/app/songs/" + songId + "/lock", Map.of("sectionIndex", 0));
        Map<String, Object> lockedForB = awaitMatching(locksB, m ->
                "LOCKED".equals(m.get("type")) && Integer.valueOf(0).equals(m.get("sectionIndex")));
        assertThat(lockedForB.get("displayName")).isEqualTo("CollabA");

        // B 搶同一段落 → 收到的仍是 A 持有
        sessionB.send("/app/songs/" + songId + "/lock", Map.of("sectionIndex", 0));
        Map<String, Object> contested = awaitMatching(locksB, m ->
                "LOCKED".equals(m.get("type")) && Integer.valueOf(0).equals(m.get("sectionIndex")));
        assertThat(contested.get("displayName")).isEqualTo("CollabA");

        // B 鎖段落 1 成功
        sessionB.send("/app/songs/" + songId + "/lock", Map.of("sectionIndex", 1));
        Map<String, Object> lock1 = awaitMatching(locksB, m ->
                "LOCKED".equals(m.get("type")) && Integer.valueOf(1).equals(m.get("sectionIndex")));
        assertThat(lock1.get("displayName")).isEqualTo("CollabB");
    }

    @Test
    @Order(3)
    void sectionUpdateBroadcasts() throws Exception {
        sessionA.send("/app/songs/" + songId + "/update", Map.of(
                "sectionIndex", 0,
                "content", "[Verse]\n改好的[Am]歌詞",
                "baseRevision", 1));

        Map<String, Object> updated = awaitMatching(contentB, m ->
                "SECTION_UPDATED".equals(m.get("type")));
        assertThat(updated.get("sectionIndex")).isEqualTo(0);
        assertThat(updated.get("content")).isEqualTo("[Verse]\n改好的[Am]歌詞");
        assertThat(updated.get("revision")).isEqualTo(2);

        // DB 全文已套用
        JsonNode song = getSong(tokenB);
        assertThat(song.get("content").asText())
                .isEqualTo("[Verse]\n改好的[Am]歌詞\n[Chorus]\n第二段[G]歌詞");
        assertThat(song.get("revision").asInt()).isEqualTo(2);
    }

    @Test
    @Order(4)
    void staleRevisionGetsPrivateSync() throws Exception {
        sessionA.send("/app/songs/" + songId + "/update", Map.of(
                "sectionIndex", 0,
                "content", "過期的內容",
                "baseRevision", 0)); // 已是 revision 2

        Map<String, Object> sync = awaitMatching(syncA, m -> "SYNC".equals(m.get("type")));
        assertThat(sync.get("revision")).isEqualTo(2);
        assertThat((String) sync.get("content")).contains("改好的[Am]歌詞");
    }

    @Test
    @Order(5)
    void disconnectReleasesLocks() throws Exception {
        sessionA.disconnect();

        // B 收到段落 0 的 UNLOCKED(A 斷線釋放)
        Map<String, Object> unlocked = awaitMatching(locksB, m ->
                "UNLOCKED".equals(m.get("type")) && Integer.valueOf(0).equals(m.get("sectionIndex")));
        assertThat(unlocked).isNotNull();

        // presence 只剩 B
        Map<String, Object> presence = awaitMatching(presenceB, m ->
                ((List<?>) m.get("users")).size() == 1);
        assertThat(presence).isNotNull();
    }

    // --- helpers ---

    private void registerAndSetup() throws Exception {
        register("collaba@band.dev", "CollabA");
        register("collabb@band.dev", "CollabB");
        tokenA = login("collaba@band.dev");
        tokenB = login("collabb@band.dev");

        JsonNode band = post("/api/bands", tokenA, "{\"name\":\"共編測試團\"}");
        String bandId = band.get("data").get("band").get("id").asText();

        JsonNode invite = post("/api/bands/" + bandId + "/invites", tokenA, "{\"role\":\"EDITOR\"}");
        post("/api/invites/" + invite.get("data").get("token").asText() + "/accept", tokenB, "{}");

        JsonNode song = post("/api/bands/" + bandId + "/songs", tokenA, "{\"title\":\"共編歌\"}");
        songId = song.get("data").get("song").get("id").asText();

        HttpHeaders headers = authJson(tokenA);
        rest.exchange("/api/songs/" + songId + "/content", org.springframework.http.HttpMethod.PUT,
                new HttpEntity<>(objectMapper.writeValueAsString(
                        Map.of("content", CONTENT, "baseRevision", 0)), headers), String.class);
    }

    private StompSession connect(WebSocketStompClient client, String token) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);
        return client.connectAsync("http://localhost:" + port + "/ws",
                        new org.springframework.web.socket.WebSocketHttpHeaders(), connectHeaders,
                        new StompSessionHandlerAdapter() {})
                .get(10, TimeUnit.SECONDS);
    }

    @SuppressWarnings("unchecked")
    private void subscribe(StompSession session, String destination,
                           BlockingQueue<Map<String, Object>> queue) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((Map<String, Object>) payload);
            }
        });
    }

    /** 從 queue 取訊息直到符合條件(忽略不相關的廣播),最多等 5 秒。 */
    private Map<String, Object> awaitMatching(BlockingQueue<Map<String, Object>> queue,
                                              java.util.function.Predicate<Map<String, Object>> predicate)
            throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            Map<String, Object> msg = queue.poll(deadline - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
            if (msg != null && predicate.test(msg)) return msg;
        }
        throw new AssertionError("等不到符合條件的訊息");
    }

    private void register(String email, String name) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        rest.postForEntity("/api/auth/register", new HttpEntity<>(
                "{\"email\":\"" + email + "\",\"password\":\"password123\",\"displayName\":\"" + name + "\"}",
                headers), String.class);
    }

    private String login(String email) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = rest.postForEntity("/api/auth/login", new HttpEntity<>(
                        "{\"email\":\"" + email + "\",\"password\":\"password123\"}", headers), String.class)
                .getBody();
        return objectMapper.readTree(body).get("data").get("accessToken").asText();
    }

    private JsonNode post(String path, String token, String body) throws Exception {
        String response = rest.postForEntity(path, new HttpEntity<>(body, authJson(token)), String.class)
                .getBody();
        return objectMapper.readTree(response);
    }

    private JsonNode getSong(String token) throws Exception {
        String response = rest.exchange("/api/songs/" + songId, org.springframework.http.HttpMethod.GET,
                new HttpEntity<>(authJson(token)), String.class).getBody();
        return objectMapper.readTree(response).get("data").get("song");
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }
}

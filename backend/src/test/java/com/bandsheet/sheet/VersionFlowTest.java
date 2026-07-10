package com.bandsheet.sheet;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class VersionFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private String editorToken;
    private String viewerToken;
    private String songId;
    private String v1Id;

    private static final String CONTENT_V1 = "[Verse]\\n第一版[C]內容";
    private static final String CONTENT_V2 = "[Verse]\\n第二版[G]內容";

    @BeforeAll
    void setup() throws Exception {
        register("veditor@band.dev", "VEditor");
        register("vviewer@band.dev", "VViewer");
        editorToken = login("veditor@band.dev");
        viewerToken = login("vviewer@band.dev");

        JsonNode band = json(mockMvc.perform(post("/api/bands")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"版本測試團\"}"))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        String bandId = band.get("data").get("band").get("id").asText();

        JsonNode invite = json(mockMvc.perform(post("/api/bands/" + bandId + "/invites")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        mockMvc.perform(post("/api/invites/" + invite.get("data").get("token").asText() + "/accept")
                .header("Authorization", "Bearer " + viewerToken));

        JsonNode song = json(mockMvc.perform(post("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"版本歌\"}"))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        songId = song.get("data").get("song").get("id").asText();

        mockMvc.perform(put("/api/songs/" + songId + "/content")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + CONTENT_V1 + "\",\"baseRevision\":0}"))
                .andExpect(status().isOk());
    }

    @Test
    @Order(1)
    void snapshotThenEditThenSnapshot() throws Exception {
        JsonNode v1 = json(mockMvc.perform(post("/api/songs/" + songId + "/versions")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"第一版\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version.note").value("第一版"))
                .andExpect(jsonPath("$.data.version.createdBy.displayName").value("VEditor"))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        v1Id = v1.get("data").get("version").get("id").asText();

        mockMvc.perform(put("/api/songs/" + songId + "/content")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + CONTENT_V2 + "\",\"baseRevision\":1}"))
                .andExpect(status().isOk());

        // 不帶 body 也能快照
        mockMvc.perform(post("/api/songs/" + songId + "/versions")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(2)
    void listAndGetVersion() throws Exception {
        mockMvc.perform(get("/api/songs/" + songId + "/versions")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.versions.length()").value(2))
                .andExpect(jsonPath("$.data.versions[0].content").doesNotExist());

        JsonNode detail = json(mockMvc.perform(get("/api/songs/" + songId + "/versions/" + v1Id)
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(detail.get("data").get("version").get("content").asText())
                .contains("第一版[C]內容");
    }

    @Test
    @Order(3)
    void viewerCannotSnapshotOrRestore() throws Exception {
        mockMvc.perform(post("/api/songs/" + songId + "/versions")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"偷存\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/songs/" + songId + "/versions/" + v1Id + "/restore")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(4)
    void restoreBringsBackOldContentAndAutoSnapshots() throws Exception {
        JsonNode restored = json(mockMvc.perform(post("/api/songs/" + songId + "/versions/" + v1Id + "/restore")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.revision").value(3))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(restored.get("data").get("song").get("content").asText())
                .contains("第一版[C]內容");

        // 還原前自動快照 → 共 3 個版本,最新一筆是自動快照(內容為第二版)
        JsonNode list = json(mockMvc.perform(get("/api/songs/" + songId + "/versions")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.versions.length()").value(3))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        JsonNode newest = list.get("data").get("versions").get(0);
        assertThat(newest.get("note").asText()).isEqualTo("還原前自動快照");

        JsonNode newestDetail = json(mockMvc.perform(
                        get("/api/songs/" + songId + "/versions/" + newest.get("id").asText())
                                .header("Authorization", "Bearer " + editorToken))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(newestDetail.get("data").get("version").get("content").asText())
                .contains("第二版[G]內容");
    }

    @Test
    @Order(5)
    void versionOfDifferentSongIs404() throws Exception {
        mockMvc.perform(get("/api/songs/" + java.util.UUID.randomUUID() + "/versions/" + v1Id)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private void register(String email, String name) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"password123","displayName":"%s"}
                        """.formatted(email, name)));
    }

    private String login(String email) throws Exception {
        JsonNode body = json(mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}
                                """.formatted(email)))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        return body.get("data").get("accessToken").asText();
    }

    private JsonNode json(String raw) throws Exception {
        return objectMapper.readTree(raw);
    }
}

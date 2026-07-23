package com.bandsheet.song;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SongFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private String editorToken;
    private String viewerToken;
    private String bandId;
    private String songId;

    @BeforeAll
    void setup() throws Exception {
        register("songowner@band.dev", "SongOwner");
        register("songviewer@band.dev", "SongViewer");
        editorToken = login("songowner@band.dev");
        viewerToken = login("songviewer@band.dev");

        JsonNode band = json(mockMvc.perform(post("/api/bands")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"歌曲測試團\"}"))
                .andReturn().getResponse().getContentAsString());
        bandId = band.get("data").get("band").get("id").asText();

        JsonNode invite = json(mockMvc.perform(post("/api/bands/" + bandId + "/invites")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andReturn().getResponse().getContentAsString());
        mockMvc.perform(post("/api/invites/" + invite.get("data").get("token").asText() + "/accept")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(1)
    void createSong() throws Exception {
        JsonNode body = json(mockMvc.perform(post("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"小情歌","artist":"蘇打綠","originalKey":"C","bpm":72,
                                 "timeSignature":"4/4","tags":["抒情","經典"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.title").value("小情歌"))
                .andExpect(jsonPath("$.data.song.revision").value(0))
                .andExpect(jsonPath("$.data.song.myRole").value("OWNER"))
                .andReturn().getResponse().getContentAsString());
        songId = body.get("data").get("song").get("id").asText();
    }

    @Test
    @Order(2)
    void viewerCannotCreateSong() throws Exception {
        mockMvc.perform(post("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"偷偷寫歌\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    void updateContentWithOptimisticLock() throws Exception {
        String content = "{key: C}\\n[Verse]\\n這是[C]測試[G]歌詞";
        mockMvc.perform(put("/api/songs/" + songId + "/content")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + content + "\",\"baseRevision\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revision").value(1));

        // 舊 baseRevision → 409 並回最新內容
        mockMvc.perform(put("/api/songs/" + songId + "/content")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"stale\",\"baseRevision\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("REVISION_CONFLICT"))
                .andExpect(jsonPath("$.data.revision").value(1))
                .andExpect(jsonPath("$.data.content").isNotEmpty());
    }

    @Test
    @Order(4)
    void viewerCanReadButNotWrite() throws Exception {
        mockMvc.perform(get("/api/songs/" + songId)
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.myRole").value("VIEWER"))
                .andExpect(jsonPath("$.data.song.revision").value(1));

        mockMvc.perform(put("/api/songs/" + songId + "/content")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"hack\",\"baseRevision\":1}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    void transposePermanently() throws Exception {
        mockMvc.perform(post("/api/songs/" + songId + "/transpose")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"semitones\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.originalKey").value("D"))
                .andExpect(jsonPath("$.data.song.revision").value(2));

        JsonNode body = json(mockMvc.perform(get("/api/songs/" + songId)
                        .header("Authorization", "Bearer " + editorToken))
                .andReturn().getResponse().getContentAsString());
        String content = body.get("data").get("song").get("content").asText();
        org.assertj.core.api.Assertions.assertThat(content)
                .contains("{key: D}").contains("[D]").contains("[A]");
    }

    @Test
    @Order(6)
    void updateMetadataAndListFilters() throws Exception {
        mockMvc.perform(patch("/api/songs/" + songId)
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bpm\":80,\"tags\":[\"抒情\",\"練習中\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.bpm").value(80))
                .andExpect(jsonPath("$.data.song.title").value("小情歌"));

        // 建第二首供過濾
        mockMvc.perform(post("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"倔強\",\"tags\":[\"搖滾\"]}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(2));

        mockMvc.perform(get("/api/bands/" + bandId + "/songs?query=小情")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(1))
                .andExpect(jsonPath("$.data.songs[0].title").value("小情歌"));

        mockMvc.perform(get("/api/bands/" + bandId + "/songs?tag=搖滾")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(1))
                .andExpect(jsonPath("$.data.songs[0].title").value("倔強"));

        mockMvc.perform(get("/api/bands/" + bandId + "/songs?sort=title")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(2));
    }

    @Test
    @Order(7)
    void softDeleteHidesSong() throws Exception {
        mockMvc.perform(delete("/api/songs/" + songId)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/songs/" + songId)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("SONG_NOT_FOUND"));

        mockMvc.perform(get("/api/bands/" + bandId + "/songs")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(1));
    }

    @Test
    @Order(8)
    void publicSongIsVisibleToStrangers() throws Exception {
        // 陌生人:非 owner、也不屬於任何分享樂團
        register("stranger@band.dev", "Stranger");
        String strangerToken = login("stranger@band.dev");

        // owner 建立一首個人歌曲(預設非公開)
        JsonNode created = json(mockMvc.perform(post("/api/me/songs")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"公開測試歌\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.isPublic").value(false))
                .andReturn().getResponse().getContentAsString());
        String pubId = created.get("data").get("song").get("id").asText();

        // 尚未公開:陌生人看不到
        mockMvc.perform(get("/api/songs/" + pubId)
                        .header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isNotFound());

        // owner 設為公開
        mockMvc.perform(patch("/api/songs/" + pubId + "/public")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isPublic\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.isPublic").value(true));

        // 陌生人現在可檢視(唯讀 VIEWER),但不能編輯
        mockMvc.perform(get("/api/songs/" + pubId)
                        .header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.song.myRole").value("VIEWER"));

        mockMvc.perform(patch("/api/songs/" + pubId)
                        .header("Authorization", "Bearer " + strangerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bpm\":100}"))
                .andExpect(status().isForbidden());

        // 只有 owner 能改公開狀態
        mockMvc.perform(patch("/api/songs/" + pubId + "/public")
                        .header("Authorization", "Bearer " + strangerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isPublic\":false}"))
                .andExpect(status().isNotFound());

        // 探索列表:陌生人看得到這首公開歌
        mockMvc.perform(get("/api/public/songs?query=公開測試歌")
                        .header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.songs.length()").value(1))
                .andExpect(jsonPath("$.data.songs[0].title").value("公開測試歌"));
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
                .andReturn().getResponse().getContentAsString());
        return body.get("data").get("accessToken").asText();
    }

    private JsonNode json(String raw) throws Exception {
        return objectMapper.readTree(raw);
    }
}

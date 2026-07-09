package com.bandsheet.band;

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

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BandFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BandInviteRepository inviteRepository;

    private String ownerToken;
    private String editorToken;
    private String editorUserId;
    private String bandId;
    private String inviteToken;

    @BeforeAll
    void registerUsers() throws Exception {
        ownerToken = registerAndLogin("owner@band.dev", "Owner");
        JsonNode editor = registerUser("editor@band.dev", "Editor");
        editorUserId = editor.get("data").get("user").get("id").asText();
        editorToken = login("editor@band.dev");
    }

    @Test
    @Order(1)
    void ownerCreatesBand() throws Exception {
        JsonNode body = json(mockMvc.perform(post("/api/bands")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"週五練團\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.band.myRole").value("OWNER"))
                .andExpect(jsonPath("$.data.band.memberCount").value(1))
                .andReturn().getResponse().getContentAsString());
        bandId = body.get("data").get("band").get("id").asText();
    }

    @Test
    @Order(2)
    void nonMemberCannotSeeBand() throws Exception {
        mockMvc.perform(get("/api/bands/" + bandId)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    void ownerCreatesInvite() throws Exception {
        JsonNode body = json(mockMvc.perform(post("/api/bands/" + bandId + "/invites")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"EDITOR\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inviteUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString());
        inviteToken = body.get("data").get("token").asText();
    }

    @Test
    @Order(4)
    void nonOwnerCannotCreateInvite() throws Exception {
        mockMvc.perform(post("/api/bands/" + bandId + "/invites")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andExpect(status().isNotFound()); // not a member yet → hidden
    }

    @Test
    @Order(5)
    void editorAcceptsInvite() throws Exception {
        mockMvc.perform(post("/api/invites/" + inviteToken + "/accept")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.band.id").value(bandId))
                .andExpect(jsonPath("$.data.band.myRole").value("EDITOR"))
                .andExpect(jsonPath("$.data.band.memberCount").value(2));

        // Accepting again is idempotent
        mockMvc.perform(post("/api/invites/" + inviteToken + "/accept")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.band.memberCount").value(2));
    }

    @Test
    @Order(6)
    void bothMembersSeeTheBand() throws Exception {
        mockMvc.perform(get("/api/bands")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bands[0].id").value(bandId))
                .andExpect(jsonPath("$.data.bands[0].myRole").value("EDITOR"));

        mockMvc.perform(get("/api/bands/" + bandId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.band.members.length()").value(2));
    }

    @Test
    @Order(7)
    void memberCannotRenameOrDeleteBand() throws Exception {
        mockMvc.perform(patch("/api/bands/" + bandId)
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"駭客改名\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));

        mockMvc.perform(delete("/api/bands/" + bandId)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    void ownerChangesRoleThenRemovesMember() throws Exception {
        mockMvc.perform(patch("/api/bands/" + bandId + "/members/" + editorUserId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.role").value("VIEWER"));

        mockMvc.perform(delete("/api/bands/" + bandId + "/members/" + editorUserId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/bands/" + bandId)
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(9)
    void expiredInviteReturns410() throws Exception {
        BandInvite expired = inviteRepository.save(new BandInvite(
                UUID.fromString(bandId), "expiredtoken0000", Role.VIEWER,
                Instant.now().minusSeconds(60), UUID.fromString(editorUserId)));

        mockMvc.perform(post("/api/invites/" + expired.getToken() + "/accept")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("INVITE_EXPIRED"));
    }

    @Test
    @Order(10)
    void unknownInviteReturns404() throws Exception {
        mockMvc.perform(post("/api/invites/no-such-token/accept")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private JsonNode registerUser(String email, String name) throws Exception {
        return json(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","displayName":"%s"}
                                """.formatted(email, name)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private String login(String email) throws Exception {
        JsonNode body = json(mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        return body.get("data").get("accessToken").asText();
    }

    private String registerAndLogin(String email, String name) throws Exception {
        registerUser(email, name);
        return login(email);
    }

    private JsonNode json(String raw) throws Exception {
        return objectMapper.readTree(raw);
    }
}

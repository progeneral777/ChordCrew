package com.bandsheet.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.UUID;

/** WebSocket 訊息 payload — 格式見 API_SPEC.md WebSocket 一節。 */
public final class CollabMessages {

    private CollabMessages() {}

    public record UserInfo(UUID userId, String displayName) {}

    public record PresenceMessage(String type, List<UserInfo> users) {
        public static PresenceMessage of(List<UserInfo> users) {
            return new PresenceMessage("PRESENCE", users);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record LockMessage(String type, int sectionIndex, UUID userId, String displayName) {
        public static LockMessage locked(int sectionIndex, UUID userId, String displayName) {
            return new LockMessage("LOCKED", sectionIndex, userId, displayName);
        }
        public static LockMessage unlocked(int sectionIndex) {
            return new LockMessage("UNLOCKED", sectionIndex, null, null);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ContentMessage(String type, Integer sectionIndex, String content,
                                 int revision, UUID userId) {
        public static ContentMessage sectionUpdated(int sectionIndex, String content,
                                                    int revision, UUID userId) {
            return new ContentMessage("SECTION_UPDATED", sectionIndex, content, revision, userId);
        }
        /** 全文同步:revision 衝突的私訊回覆,或 REST 改寫內容後的廣播。 */
        public static ContentMessage sync(String content, int revision) {
            return new ContentMessage("SYNC", null, content, revision, null);
        }
    }
}

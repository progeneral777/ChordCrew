package com.bandsheet.collab;

import com.bandsheet.collab.dto.CollabMessages.UserInfo;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** 在線名單 — 記憶體實作。一個 WebSocket session 同時只在一首歌內。 */
@Component
public class PresenceRegistry {

    private record SessionInfo(UUID songId, UserInfo user) {}

    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    /** 加入歌曲;回傳該 session 先前所在的歌(SPA 內切歌時需更新舊歌的名單),無則 null。 */
    public UUID join(String sessionId, UUID songId, UserInfo user) {
        SessionInfo previous = sessions.put(sessionId, new SessionInfo(songId, user));
        return previous != null && !previous.songId().equals(songId) ? previous.songId() : null;
    }

    /** 離開(斷線);回傳該 session 所在的歌,無則 null。 */
    public UUID leave(String sessionId) {
        SessionInfo info = sessions.remove(sessionId);
        return info != null ? info.songId() : null;
    }

    /** 歌曲目前在線使用者(同一使用者多視窗只列一次)。 */
    public List<UserInfo> usersIn(UUID songId) {
        Map<UUID, UserInfo> distinct = new LinkedHashMap<>();
        sessions.values().stream()
                .filter(s -> s.songId().equals(songId))
                .forEach(s -> distinct.putIfAbsent(s.user().userId(), s.user()));
        return List.copyOf(distinct.values());
    }
}

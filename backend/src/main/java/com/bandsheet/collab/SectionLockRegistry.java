package com.bandsheet.collab;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 段落鎖 — 記憶體實作(ARCHITECTURE 第 3 節):TTL 60 秒、heartbeat 續期、
 * 斷線釋放、server 重啟即全部釋放。鎖以 WebSocket session 為持有單位
 * (同一使用者開兩個視窗時各自持鎖,互不干擾)。
 */
@Component
public class SectionLockRegistry {

    public static final Duration TTL = Duration.ofSeconds(60);

    public record LockHolder(String sessionId, UUID userId, String displayName, Instant expiresAt) {}

    private final Map<UUID, Map<Integer, LockHolder>> locks = new ConcurrentHashMap<>();

    /**
     * 嘗試取鎖(同 session 重複呼叫 = heartbeat 續期)。
     * 回傳目前持有者:sessionId 等於呼叫者即成功。
     */
    public synchronized LockHolder tryAcquire(UUID songId, int sectionIndex,
                                              String sessionId, UUID userId, String displayName) {
        Map<Integer, LockHolder> songLocks = locks.computeIfAbsent(songId, k -> new ConcurrentHashMap<>());
        LockHolder existing = songLocks.get(sectionIndex);
        if (existing != null && existing.expiresAt().isAfter(Instant.now())
                && !existing.sessionId().equals(sessionId)) {
            return existing;
        }
        LockHolder holder = new LockHolder(sessionId, userId, displayName, Instant.now().plus(TTL));
        songLocks.put(sectionIndex, holder);
        return holder;
    }

    /** 釋放鎖;只有持有者本人的 session 能釋放。回傳是否有釋放。 */
    public synchronized boolean release(UUID songId, int sectionIndex, String sessionId) {
        Map<Integer, LockHolder> songLocks = locks.get(songId);
        if (songLocks == null) return false;
        LockHolder holder = songLocks.get(sectionIndex);
        if (holder == null || !holder.sessionId().equals(sessionId)) return false;
        songLocks.remove(sectionIndex);
        return true;
    }

    public boolean isHeldBy(UUID songId, int sectionIndex, String sessionId) {
        Map<Integer, LockHolder> songLocks = locks.get(songId);
        if (songLocks == null) return false;
        LockHolder holder = songLocks.get(sectionIndex);
        return holder != null && holder.sessionId().equals(sessionId)
                && holder.expiresAt().isAfter(Instant.now());
    }

    /** 斷線時釋放該 session 的所有鎖,回傳 songId → 被釋放的段落 index 列表。 */
    public synchronized Map<UUID, List<Integer>> releaseSession(String sessionId) {
        Map<UUID, List<Integer>> released = new HashMap<>();
        locks.forEach((songId, songLocks) ->
                songLocks.entrySet().removeIf(e -> {
                    if (e.getValue().sessionId().equals(sessionId)) {
                        released.computeIfAbsent(songId, k -> new ArrayList<>()).add(e.getKey());
                        return true;
                    }
                    return false;
                }));
        return released;
    }

    /** 目前有效的鎖(順便清掉過期的)。 */
    public synchronized Map<Integer, LockHolder> activeLocks(UUID songId) {
        Map<Integer, LockHolder> songLocks = locks.get(songId);
        if (songLocks == null) return Map.of();
        Instant now = Instant.now();
        songLocks.entrySet().removeIf(e -> !e.getValue().expiresAt().isAfter(now));
        return Map.copyOf(songLocks);
    }

    /** 定期清掃:移除過期鎖並回傳 songId → 段落 index,供廣播 UNLOCKED。 */
    public synchronized Map<UUID, List<Integer>> sweepExpired() {
        Map<UUID, List<Integer>> expired = new HashMap<>();
        Instant now = Instant.now();
        locks.forEach((songId, songLocks) ->
                songLocks.entrySet().removeIf(e -> {
                    if (!e.getValue().expiresAt().isAfter(now)) {
                        expired.computeIfAbsent(songId, k -> new ArrayList<>()).add(e.getKey());
                        return true;
                    }
                    return false;
                }));
        return expired;
    }
}

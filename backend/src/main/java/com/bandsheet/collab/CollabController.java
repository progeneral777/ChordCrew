package com.bandsheet.collab;

import com.bandsheet.auth.AuthUser;
import com.bandsheet.collab.dto.CollabMessages.ContentMessage;
import com.bandsheet.collab.dto.CollabMessages.LockMessage;
import com.bandsheet.collab.dto.CollabMessages.PresenceMessage;
import com.bandsheet.collab.dto.CollabMessages.UserInfo;
import com.bandsheet.common.event.SongContentReplaced;
import com.bandsheet.common.exception.AppException;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Controller
public class CollabController {

    private final CollabService collabService;
    private final SectionLockRegistry lockRegistry;
    private final PresenceRegistry presenceRegistry;
    private final SimpMessagingTemplate messaging;

    public CollabController(CollabService collabService,
                            SectionLockRegistry lockRegistry,
                            PresenceRegistry presenceRegistry,
                            SimpMessagingTemplate messaging) {
        this.collabService = collabService;
        this.lockRegistry = lockRegistry;
        this.presenceRegistry = presenceRegistry;
        this.messaging = messaging;
    }

    public record LockRequest(int sectionIndex) {}
    public record UpdateRequest(int sectionIndex, String content, int baseRevision) {}

    @MessageMapping("/songs/{songId}/join")
    public void join(@DestinationVariable UUID songId,
                     SimpMessageHeaderAccessor accessor, Principal principal) {
        AuthUser user = authUser(principal);
        collabService.requireViewAccess(songId, user.id());

        UUID previousSong = presenceRegistry.join(accessor.getSessionId(), songId,
                new UserInfo(user.id(), user.displayName()));
        if (previousSong != null) broadcastPresence(previousSong);
        broadcastPresence(songId);

        // 讓新加入者看到現有鎖(對其他人是冪等重播)
        lockRegistry.activeLocks(songId).forEach((idx, holder) ->
                messaging.convertAndSend(lockTopic(songId),
                        LockMessage.locked(idx, holder.userId(), holder.displayName())));
    }

    @MessageMapping("/songs/{songId}/lock")
    public void lock(@DestinationVariable UUID songId, @Payload LockRequest req,
                     SimpMessageHeaderAccessor accessor, Principal principal) {
        AuthUser user = authUser(principal);
        collabService.requireEditAccess(songId, user.id());

        SectionLockRegistry.LockHolder holder = lockRegistry.tryAcquire(
                songId, req.sectionIndex(), accessor.getSessionId(), user.id(), user.displayName());
        // 取鎖成功廣播自己;失敗則重播目前持有者(前端顯示「XX 編輯中」)
        messaging.convertAndSend(lockTopic(songId),
                LockMessage.locked(req.sectionIndex(), holder.userId(), holder.displayName()));
    }

    @MessageMapping("/songs/{songId}/unlock")
    public void unlock(@DestinationVariable UUID songId, @Payload LockRequest req,
                       SimpMessageHeaderAccessor accessor) {
        if (lockRegistry.release(songId, req.sectionIndex(), accessor.getSessionId())) {
            messaging.convertAndSend(lockTopic(songId), LockMessage.unlocked(req.sectionIndex()));
        }
    }

    @MessageMapping("/songs/{songId}/update")
    public void update(@DestinationVariable UUID songId, @Payload UpdateRequest req,
                       SimpMessageHeaderAccessor accessor, Principal principal) {
        AuthUser user = authUser(principal);
        collabService.requireEditAccess(songId, user.id());

        // 必須持鎖才能更新該段落
        if (!lockRegistry.isHeldBy(songId, req.sectionIndex(), accessor.getSessionId())) {
            sendSyncToUser(principal, songId);
            return;
        }

        CollabService.UpdateResult result = collabService.applySectionUpdate(
                songId, req.sectionIndex(), req.content(), req.baseRevision());

        switch (result) {
            case CollabService.UpdateResult.Applied applied -> messaging.convertAndSend(
                    contentTopic(songId),
                    ContentMessage.sectionUpdated(req.sectionIndex(), applied.sectionContent(),
                            applied.revision(), user.id()));
            case CollabService.UpdateResult.Rejected rejected -> messaging.convertAndSendToUser(
                    principal.getName(), "/queue/sync",
                    ContentMessage.sync(rejected.fullContent(), rejected.revision()));
        }
    }

    /** REST 途徑改寫全文(儲存/移調/還原)後,廣播 SYNC 給所有連線中的協作者。 */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onContentReplaced(SongContentReplaced event) {
        messaging.convertAndSend(contentTopic(event.songId()),
                ContentMessage.sync(event.content(), event.revision()));
    }

    /** 過期鎖清掃:廣播 UNLOCKED 讓前端解除灰底。 */
    @Scheduled(fixedDelay = 10_000)
    public void sweepExpiredLocks() {
        lockRegistry.sweepExpired().forEach((songId, indexes) ->
                indexes.forEach(idx ->
                        messaging.convertAndSend(lockTopic(songId), LockMessage.unlocked(idx))));
    }

    @MessageExceptionHandler(AppException.class)
    @SendToUser("/queue/errors")
    public Map<String, String> handleAppException(AppException ex) {
        return Map.of("code", ex.getCode(), "message", ex.getMessage());
    }

    private void broadcastPresence(UUID songId) {
        messaging.convertAndSend("/topic/songs/" + songId + "/presence",
                PresenceMessage.of(presenceRegistry.usersIn(songId)));
    }

    private void sendSyncToUser(Principal principal, UUID songId) {
        CollabService.Snapshot latest = collabService.latest(songId);
        messaging.convertAndSendToUser(principal.getName(), "/queue/sync",
                ContentMessage.sync(latest.content(), latest.revision()));
    }

    @EventListener
    public void onDisconnect(org.springframework.web.socket.messaging.SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        lockRegistry.releaseSession(sessionId).forEach((songId, indexes) ->
                indexes.forEach(idx ->
                        messaging.convertAndSend(lockTopic(songId), LockMessage.unlocked(idx))));
        UUID songId = presenceRegistry.leave(sessionId);
        if (songId != null) broadcastPresence(songId);
    }

    private static AuthUser authUser(Principal principal) {
        if (principal instanceof StompPrincipal(AuthUser user)) return user;
        throw new AppException("UNAUTHORIZED", "需要登入", org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    private static String lockTopic(UUID songId) {
        return "/topic/songs/" + songId + "/locks";
    }

    private static String contentTopic(UUID songId) {
        return "/topic/songs/" + songId + "/content";
    }
}

package com.bandsheet.collab;

import com.bandsheet.band.BandAccess;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import com.bandsheet.song.Song;
import com.bandsheet.song.SongRepository;
import com.bandsheet.song.chord.ChordUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CollabService {

    private final SongRepository songRepository;
    private final BandAccess bandAccess;

    public CollabService(SongRepository songRepository, BandAccess bandAccess) {
        this.songRepository = songRepository;
        this.bandAccess = bandAccess;
    }

    /** 檢查使用者可讀這首歌(join 用;VIEWER 可)。 */
    @Transactional(readOnly = true)
    public void requireViewAccess(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        bandAccess.requireMember(song.getBandId(), userId);
    }

    /** 檢查使用者可編輯這首歌(lock/update 用)。 */
    @Transactional(readOnly = true)
    public void requireEditAccess(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
    }

    public sealed interface UpdateResult {
        record Applied(String sectionContent, int revision) implements UpdateResult {}
        record Rejected(String fullContent, int revision) implements UpdateResult {}
    }

    /**
     * 套用段落更新:baseRevision 不符或 index 超出範圍 → 拒絕並回最新全文
     * (段落有鎖保護,實務上很少發生)。
     */
    @Transactional
    public UpdateResult applySectionUpdate(UUID songId, int sectionIndex,
                                           String sectionContent, int baseRevision) {
        Song song = requireSong(songId);
        String current = song.getContent() != null ? song.getContent() : "";

        if (song.getRevision() != baseRevision) {
            return new UpdateResult.Rejected(current, song.getRevision());
        }
        String updated = ChordUtil.applySectionUpdate(current, sectionIndex, sectionContent);
        if (updated == null) {
            return new UpdateResult.Rejected(current, song.getRevision());
        }
        song.setContent(updated);
        song.bumpRevision();
        return new UpdateResult.Applied(sectionContent, song.getRevision());
    }

    public record Snapshot(String content, int revision) {}

    @Transactional(readOnly = true)
    public Snapshot latest(UUID songId) {
        Song song = requireSong(songId);
        return new Snapshot(song.getContent() != null ? song.getContent() : "", song.getRevision());
    }

    private Song requireSong(UUID songId) {
        return songRepository.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
    }
}

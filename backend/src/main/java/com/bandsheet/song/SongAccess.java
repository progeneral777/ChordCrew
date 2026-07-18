package com.bandsheet.song;

import com.bandsheet.band.BandAccess;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * 歌曲層級授權:已分享到樂團的歌曲(band_id 非 null)沿用樂團成員/角色檢查;
 * 個人歌曲(band_id 為 null)只有建立者本人可存取,對其他人一律 404。
 * 回傳呼叫者對這首歌的有效角色(個人歌曲的擁有者視為 OWNER)。
 */
@Service
public class SongAccess {

    private final BandAccess bandAccess;

    public SongAccess(BandAccess bandAccess) {
        this.bandAccess = bandAccess;
    }

    public Role requireView(Song song, UUID userId) {
        if (song.getBandId() != null) {
            return bandAccess.requireMember(song.getBandId(), userId).getRole();
        }
        requireOwner(song, userId);
        return Role.OWNER;
    }

    public Role requireEdit(Song song, UUID userId) {
        if (song.getBandId() != null) {
            return bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR).getRole();
        }
        requireOwner(song, userId);
        return Role.OWNER;
    }

    /** 只有建立者能變更分享設定或存取個人歌曲。 */
    public void requireOwner(Song song, UUID userId) {
        if (!song.getOwnerId().equals(userId)) {
            throw AppException.notFound("SONG_NOT_FOUND", "找不到歌曲");
        }
    }
}

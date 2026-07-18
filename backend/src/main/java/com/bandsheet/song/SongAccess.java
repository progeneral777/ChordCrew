package com.bandsheet.song;

import com.bandsheet.band.BandMember;
import com.bandsheet.band.BandMemberRepository;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * 歌曲層級授權(多對多分享):
 * - 建立者本人一律視為 OWNER。
 * - 否則看歌曲被分享到的樂團中,使用者所屬樂團的最高角色。
 * - 完全不相關(非建立者、也不是任一分享樂團的成員)→ 404。
 */
@Service
public class SongAccess {

    private final SongBandRepository songBands;
    private final BandMemberRepository members;

    public SongAccess(SongBandRepository songBands, BandMemberRepository members) {
        this.songBands = songBands;
        this.members = members;
    }

    public Role requireView(Song song, UUID userId) {
        return effectiveRole(song, userId);
    }

    public Role requireEdit(Song song, UUID userId) {
        Role role = effectiveRole(song, userId);
        if (!role.atLeast(Role.EDITOR)) {
            throw AppException.forbidden("需要編輯權限");
        }
        return role;
    }

    /** 只有建立者能變更分享設定或存取個人歌曲。 */
    public void requireOwner(Song song, UUID userId) {
        if (!song.getOwnerId().equals(userId)) {
            throw AppException.notFound("SONG_NOT_FOUND", "找不到歌曲");
        }
    }

    private Role effectiveRole(Song song, UUID userId) {
        if (song.getOwnerId().equals(userId)) {
            return Role.OWNER;
        }
        List<UUID> bandIds = songBands.findBandIdsBySongId(song.getId());
        Role best = null;
        if (!bandIds.isEmpty()) {
            for (BandMember m : members.findByUserIdAndBandIdIn(userId, bandIds)) {
                if (best == null || m.getRole().atLeast(best)) best = m.getRole();
            }
        }
        if (best == null) {
            throw AppException.notFound("SONG_NOT_FOUND", "找不到歌曲");
        }
        return best;
    }
}

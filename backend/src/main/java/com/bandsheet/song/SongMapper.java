package com.bandsheet.song;

import com.bandsheet.band.Role;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.song.dto.SongDtos.SongSummary;

import java.util.List;
import java.util.UUID;

/** Song entity → DTO 的共用轉換(SongService 與 VersionService 共用)。 */
public final class SongMapper {

    private SongMapper() {}

    public static SongSummary toSummary(Song s, List<UUID> bandIds, boolean favorite) {
        return new SongSummary(s.getId(), bandIds, s.getTitle(), s.getArtist(),
                s.getOriginalKey(), s.getBpm(), s.getTimeSignature(), s.getTags(), favorite, s.getUpdatedAt());
    }

    public static SongDetail toDetail(Song s, List<UUID> bandIds, Role myRole, boolean favorite) {
        return new SongDetail(s.getId(), bandIds, s.getOwnerId(), s.getTitle(), s.getArtist(),
                s.getOriginalKey(), s.getBpm(), s.getTimeSignature(), s.getTags(),
                s.getContent(), s.getRevision(), myRole, favorite, s.getUpdatedAt());
    }
}

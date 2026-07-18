package com.bandsheet.song;

import com.bandsheet.band.Role;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.song.dto.SongDtos.SongSummary;

/** Song entity → DTO 的共用轉換(SongService 與 VersionService 共用)。 */
public final class SongMapper {

    private SongMapper() {}

    public static SongSummary toSummary(Song s) {
        return new SongSummary(s.getId(), s.getBandId(), s.getTitle(), s.getArtist(),
                s.getOriginalKey(), s.getBpm(), s.getTimeSignature(), s.getTags(), s.getUpdatedAt());
    }

    public static SongDetail toDetail(Song s, Role myRole) {
        return new SongDetail(s.getId(), s.getBandId(), s.getOwnerId(), s.getTitle(), s.getArtist(),
                s.getOriginalKey(), s.getBpm(), s.getTimeSignature(), s.getTags(),
                s.getContent(), s.getRevision(), myRole, s.getUpdatedAt());
    }
}

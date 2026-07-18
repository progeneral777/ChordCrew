package com.bandsheet.song;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** 歌曲分享到樂團的關聯(一首歌可分享到多個樂團)。 */
@Entity
@Table(name = "song_bands")
public class SongBand extends BaseEntity {

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    @Column(name = "band_id", nullable = false)
    private UUID bandId;

    protected SongBand() {}

    public SongBand(UUID songId, UUID bandId) {
        this.songId = songId;
        this.bandId = bandId;
    }

    public UUID getSongId() { return songId; }
    public UUID getBandId() { return bandId; }
}

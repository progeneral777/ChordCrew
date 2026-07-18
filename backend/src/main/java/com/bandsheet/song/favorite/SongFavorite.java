package com.bandsheet.song.favorite;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "song_favorites")
public class SongFavorite extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    protected SongFavorite() {}

    public SongFavorite(UUID userId, UUID songId) {
        this.userId = userId;
        this.songId = songId;
    }

    public UUID getUserId() { return userId; }
    public UUID getSongId() { return songId; }
}

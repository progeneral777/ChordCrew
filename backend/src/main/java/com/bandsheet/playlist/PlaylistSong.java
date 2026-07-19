package com.bandsheet.playlist;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** 歌單中的一首歌(含排序 position)。 */
@Entity
@Table(name = "playlist_songs")
public class PlaylistSong extends BaseEntity {

    @Column(name = "playlist_id", nullable = false)
    private UUID playlistId;

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    @Column(nullable = false)
    private int position;

    protected PlaylistSong() {}

    public PlaylistSong(UUID playlistId, UUID songId, int position) {
        this.playlistId = playlistId;
        this.songId = songId;
        this.position = position;
    }

    public UUID getPlaylistId() { return playlistId; }
    public UUID getSongId() { return songId; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}

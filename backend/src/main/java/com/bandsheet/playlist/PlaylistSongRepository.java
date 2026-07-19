package com.bandsheet.playlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, UUID> {
    List<PlaylistSong> findByPlaylistIdOrderByPosition(UUID playlistId);
    List<PlaylistSong> findByPlaylistIdIn(Collection<UUID> playlistIds);
    boolean existsByPlaylistIdAndSongId(UUID playlistId, UUID songId);
    void deleteByPlaylistIdAndSongId(UUID playlistId, UUID songId);
    long countByPlaylistId(UUID playlistId);
}

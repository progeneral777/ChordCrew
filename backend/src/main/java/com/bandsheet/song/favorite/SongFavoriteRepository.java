package com.bandsheet.song.favorite;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SongFavoriteRepository extends JpaRepository<SongFavorite, UUID> {

    boolean existsByUserIdAndSongId(UUID userId, UUID songId);

    void deleteByUserIdAndSongId(UUID userId, UUID songId);

    @Query("select f.songId from SongFavorite f where f.userId = :userId and f.songId in :songIds")
    List<UUID> findFavoriteSongIds(@Param("userId") UUID userId,
                                   @Param("songIds") Collection<UUID> songIds);
}

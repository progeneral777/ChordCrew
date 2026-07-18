package com.bandsheet.song.favorite;

import com.bandsheet.common.exception.AppException;
import com.bandsheet.song.Song;
import com.bandsheet.song.SongAccess;
import com.bandsheet.song.SongRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FavoriteService {

    private final SongFavoriteRepository favorites;
    private final SongRepository songs;
    private final SongAccess songAccess;

    public FavoriteService(SongFavoriteRepository favorites, SongRepository songs, SongAccess songAccess) {
        this.favorites = favorites;
        this.songs = songs;
        this.songAccess = songAccess;
    }

    /** 加入最愛(需能看到這首歌);已在最愛則為 no-op。 */
    @Transactional
    public void add(UUID userId, UUID songId) {
        Song song = songs.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
        songAccess.requireView(song, userId);
        if (!favorites.existsByUserIdAndSongId(userId, songId)) {
            favorites.save(new SongFavorite(userId, songId));
        }
    }

    @Transactional
    public void remove(UUID userId, UUID songId) {
        favorites.deleteByUserIdAndSongId(userId, songId);
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(UUID userId, UUID songId) {
        return favorites.existsByUserIdAndSongId(userId, songId);
    }

    /** 一次查出指定歌曲中,哪些是這個使用者的最愛(供列表標記,避免 N+1)。 */
    @Transactional(readOnly = true)
    public Set<UUID> favoriteIdsAmong(UUID userId, List<Song> list) {
        if (list.isEmpty()) return Set.of();
        List<UUID> ids = list.stream().map(Song::getId).toList();
        return new HashSet<>(favorites.findFavoriteSongIds(userId, ids));
    }
}

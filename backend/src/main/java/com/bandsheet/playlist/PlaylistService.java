package com.bandsheet.playlist;

import com.bandsheet.common.exception.AppException;
import com.bandsheet.playlist.dto.PlaylistDtos.PlaylistDetail;
import com.bandsheet.playlist.dto.PlaylistDtos.PlaylistSongItem;
import com.bandsheet.playlist.dto.PlaylistDtos.PlaylistSummary;
import com.bandsheet.song.Song;
import com.bandsheet.song.SongRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PlaylistService {

    private final PlaylistRepository playlists;
    private final PlaylistSongRepository playlistSongs;
    private final SongRepository songs;

    public PlaylistService(PlaylistRepository playlists, PlaylistSongRepository playlistSongs,
                           SongRepository songs) {
        this.playlists = playlists;
        this.playlistSongs = playlistSongs;
        this.songs = songs;
    }

    @Transactional(readOnly = true)
    public List<PlaylistSummary> list(UUID userId) {
        List<Playlist> mine = playlists.findByOwnerIdOrderByUpdatedAtDesc(userId);
        Map<UUID, Integer> counts = new HashMap<>();
        if (!mine.isEmpty()) {
            List<UUID> ids = mine.stream().map(Playlist::getId).toList();
            for (PlaylistSong ps : playlistSongs.findByPlaylistIdIn(ids)) {
                counts.merge(ps.getPlaylistId(), 1, Integer::sum);
            }
        }
        return mine.stream()
                .map(p -> new PlaylistSummary(p.getId(), p.getName(),
                        counts.getOrDefault(p.getId(), 0), p.getUpdatedAt()))
                .toList();
    }

    @Transactional
    public PlaylistDetail create(UUID userId, String name) {
        Playlist p = playlists.save(new Playlist(userId, name.trim()));
        return toDetail(p);
    }

    @Transactional(readOnly = true)
    public PlaylistDetail get(UUID userId, UUID playlistId) {
        return toDetail(requirePlaylist(userId, playlistId));
    }

    @Transactional
    public PlaylistDetail rename(UUID userId, UUID playlistId, String name) {
        Playlist p = requirePlaylist(userId, playlistId);
        p.setName(name.trim());
        return toDetail(p);
    }

    @Transactional
    public void delete(UUID userId, UUID playlistId) {
        Playlist p = requirePlaylist(userId, playlistId);
        playlists.delete(p); // playlist_songs 隨外鍵 cascade 刪除
    }

    /** 把自己的一首歌加到歌單末端(重複加入為 no-op)。 */
    @Transactional
    public PlaylistDetail addSong(UUID userId, UUID playlistId, UUID songId) {
        Playlist p = requirePlaylist(userId, playlistId);
        Song song = songs.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
        if (!song.getOwnerId().equals(userId)) {
            throw AppException.forbidden("只能把自己的歌曲加入歌單");
        }
        List<PlaylistSong> existing = playlistSongs.findByPlaylistIdOrderByPosition(playlistId);
        boolean already = existing.stream().anyMatch(ps -> ps.getSongId().equals(songId));
        if (!already) {
            int nextPos = existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getPosition() + 1;
            playlistSongs.save(new PlaylistSong(playlistId, songId, nextPos));
        }
        return toDetail(p);
    }

    @Transactional
    public PlaylistDetail removeSong(UUID userId, UUID playlistId, UUID songId) {
        Playlist p = requirePlaylist(userId, playlistId);
        playlistSongs.deleteByPlaylistIdAndSongId(playlistId, songId);
        return toDetail(p);
    }

    /** 依傳入的 songId 順序重排(只影響已在歌單中的歌)。 */
    @Transactional
    public PlaylistDetail reorder(UUID userId, UUID playlistId, List<UUID> orderedSongIds) {
        Playlist p = requirePlaylist(userId, playlistId);
        Map<UUID, PlaylistSong> bySong = playlistSongs.findByPlaylistIdOrderByPosition(playlistId).stream()
                .collect(Collectors.toMap(PlaylistSong::getSongId, Function.identity()));
        int pos = 0;
        for (UUID songId : orderedSongIds) {
            PlaylistSong ps = bySong.get(songId);
            if (ps != null) ps.setPosition(pos++);
        }
        return toDetail(p);
    }

    private Playlist requirePlaylist(UUID userId, UUID playlistId) {
        return playlists.findByIdAndOwnerId(playlistId, userId)
                .orElseThrow(() -> AppException.notFound("PLAYLIST_NOT_FOUND", "找不到歌單"));
    }

    private PlaylistDetail toDetail(Playlist p) {
        List<PlaylistSong> ps = playlistSongs.findByPlaylistIdOrderByPosition(p.getId());
        List<UUID> songIds = ps.stream().map(PlaylistSong::getSongId).toList();
        Map<UUID, Song> songMap = songs.findAllById(songIds).stream()
                .filter(s -> s.getDeletedAt() == null)
                .collect(Collectors.toMap(Song::getId, Function.identity()));
        List<PlaylistSongItem> items = ps.stream()
                .map(x -> songMap.get(x.getSongId()))
                .filter(java.util.Objects::nonNull)
                .map(s -> new PlaylistSongItem(s.getId(), s.getTitle(), s.getArtist(),
                        s.getOriginalKey(), s.getBpm()))
                .toList();
        return new PlaylistDetail(p.getId(), p.getName(), items, p.getUpdatedAt());
    }
}

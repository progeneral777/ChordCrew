package com.bandsheet.song;

import com.bandsheet.band.BandAccess;
import com.bandsheet.band.BandMember;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import com.bandsheet.song.chord.ChordUtil;
import com.bandsheet.song.favorite.FavoriteService;
import com.bandsheet.song.dto.SongDtos.CreateSongRequest;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.song.dto.SongDtos.SongSummary;
import com.bandsheet.song.dto.SongDtos.UpdateSongRequest;
import com.bandsheet.common.event.SongContentReplaced;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class SongService {

    private final SongRepository songRepository;
    private final BandAccess bandAccess;
    private final SongAccess songAccess;
    private final FavoriteService favoriteService;
    private final ApplicationEventPublisher events;

    public SongService(SongRepository songRepository, BandAccess bandAccess, SongAccess songAccess,
                       FavoriteService favoriteService, ApplicationEventPublisher events) {
        this.songRepository = songRepository;
        this.bandAccess = bandAccess;
        this.songAccess = songAccess;
        this.favoriteService = favoriteService;
        this.events = events;
    }

    // --- 列表 ---

    @Transactional(readOnly = true)
    public List<SongSummary> list(UUID bandId, UUID userId, String query, String tag, String sort) {
        bandAccess.requireMember(bandId, userId);
        return toSummaries(songRepository.search(bandId, blankToNull(query)), userId, tag, sort);
    }

    /** 我的歌曲庫:我建立的所有歌曲(含已分享出去的)。 */
    @Transactional(readOnly = true)
    public List<SongSummary> listMine(UUID userId, String query, String tag, String sort) {
        return toSummaries(songRepository.searchByOwner(userId, blankToNull(query)), userId, tag, sort);
    }

    // --- 建立 ---

    /** 在樂團裡建立歌曲:建立者為 owner,並直接分享到該樂團。 */
    @Transactional
    public SongDetail create(UUID bandId, UUID userId, CreateSongRequest req) {
        BandMember me = bandAccess.requireRole(bandId, userId, Role.EDITOR);
        Song song = newSong(userId, req);
        song.setBandId(bandId);
        return SongMapper.toDetail(songRepository.save(song), me.getRole(), false);
    }

    /** 在「我的歌曲」建立個人歌曲(尚未分享到任何樂團)。 */
    @Transactional
    public SongDetail createPersonal(UUID userId, CreateSongRequest req) {
        Song song = newSong(userId, req);
        return SongMapper.toDetail(songRepository.save(song), Role.OWNER, false);
    }

    // --- 分享 ---

    /** 把個人歌曲分享到樂團(需為該曲建立者,且為目標樂團的 EDITOR 以上)。 */
    @Transactional
    public SongDetail share(UUID songId, UUID userId, UUID bandId) {
        Song song = requireSong(songId);
        songAccess.requireOwner(song, userId);
        bandAccess.requireRole(bandId, userId, Role.EDITOR);
        song.setBandId(bandId);
        return SongMapper.toDetail(song, Role.OWNER, favoriteService.isFavorite(userId, songId));
    }

    /** 取消分享,歌曲回到個人歌曲庫(需為建立者)。 */
    @Transactional
    public SongDetail unshare(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        songAccess.requireOwner(song, userId);
        song.setBandId(null);
        return SongMapper.toDetail(song, Role.OWNER, favoriteService.isFavorite(userId, songId));
    }

    // --- 讀取 / 更新 ---

    @Transactional(readOnly = true)
    public SongDetail get(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        Role role = songAccess.requireView(song, userId);
        return SongMapper.toDetail(song, role, favoriteService.isFavorite(userId, songId));
    }

    @Transactional
    public SongDetail updateMetadata(UUID songId, UUID userId, UpdateSongRequest req) {
        Song song = requireSong(songId);
        Role role = songAccess.requireEdit(song, userId);
        if (req.title() != null) {
            if (req.title().isBlank()) {
                throw AppException.badRequest("VALIDATION_ERROR", "歌名不可為空");
            }
            song.setTitle(req.title().trim());
        }
        if (req.artist() != null) song.setArtist(req.artist());
        if (req.originalKey() != null) song.setOriginalKey(req.originalKey());
        if (req.bpm() != null) song.setBpm(req.bpm());
        if (req.timeSignature() != null) song.setTimeSignature(req.timeSignature());
        if (req.tags() != null) song.setTags(req.tags());
        return SongMapper.toDetail(song, role, favoriteService.isFavorite(userId, songId));
    }

    public record ContentUpdateResult(boolean conflict, String content, int revision) {}

    @Transactional
    public ContentUpdateResult updateContent(UUID songId, UUID userId, String content, int baseRevision) {
        Song song = requireSong(songId);
        songAccess.requireEdit(song, userId);
        if (song.getRevision() != baseRevision) {
            return new ContentUpdateResult(true, song.getContent(), song.getRevision());
        }
        song.setContent(content);
        song.bumpRevision();
        events.publishEvent(new SongContentReplaced(songId, content, song.getRevision()));
        return new ContentUpdateResult(false, content, song.getRevision());
    }

    @Transactional
    public SongDetail transpose(UUID songId, UUID userId, int semitones) {
        Song song = requireSong(songId);
        Role role = songAccess.requireEdit(song, userId);
        song.setContent(ChordUtil.transposeContent(song.getContent() != null ? song.getContent() : "", semitones));
        if (song.getOriginalKey() != null && !song.getOriginalKey().isBlank()) {
            song.setOriginalKey(ChordUtil.transposeKey(song.getOriginalKey(), semitones));
        }
        song.bumpRevision();
        events.publishEvent(new SongContentReplaced(songId, song.getContent(), song.getRevision()));
        return SongMapper.toDetail(song, role, favoriteService.isFavorite(userId, songId));
    }

    @Transactional
    public void softDelete(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        songAccess.requireEdit(song, userId);
        song.softDelete();
    }

    // --- helpers ---

    private Song newSong(UUID userId, CreateSongRequest req) {
        Song song = new Song(userId, req.title().trim());
        song.setArtist(req.artist());
        song.setOriginalKey(req.originalKey());
        song.setBpm(req.bpm());
        song.setTimeSignature(req.timeSignature());
        song.setTags(req.tags());
        song.setContent("");
        return song;
    }

    private List<SongSummary> toSummaries(List<Song> found, UUID userId, String tag, String sort) {
        Stream<Song> stream = found.stream();
        if (tag != null && !tag.isBlank()) {
            stream = stream.filter(s -> s.getTags() != null && s.getTags().contains(tag.trim()));
        }
        Comparator<Song> comparator = "title".equals(sort)
                ? Comparator.comparing(Song::getTitle, String.CASE_INSENSITIVE_ORDER)
                : Comparator.comparing(Song::getUpdatedAt).reversed();
        List<Song> ordered = stream.sorted(comparator).toList();
        Set<UUID> fav = favoriteService.favoriteIdsAmong(userId, ordered);
        return ordered.stream().map(s -> SongMapper.toSummary(s, fav.contains(s.getId()))).toList();
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private Song requireSong(UUID songId) {
        return songRepository.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
    }
}

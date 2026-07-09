package com.bandsheet.song;

import com.bandsheet.band.BandAccess;
import com.bandsheet.band.BandMember;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import com.bandsheet.song.chord.ChordUtil;
import com.bandsheet.song.dto.SongDtos.CreateSongRequest;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.song.dto.SongDtos.SongSummary;
import com.bandsheet.song.dto.SongDtos.UpdateSongRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class SongService {

    private final SongRepository songRepository;
    private final BandAccess bandAccess;

    public SongService(SongRepository songRepository, BandAccess bandAccess) {
        this.songRepository = songRepository;
        this.bandAccess = bandAccess;
    }

    @Transactional(readOnly = true)
    public List<SongSummary> list(UUID bandId, UUID userId, String query, String tag, String sort) {
        bandAccess.requireMember(bandId, userId);
        String q = (query == null || query.isBlank()) ? null : query.trim();

        var stream = songRepository.search(bandId, q).stream();
        if (tag != null && !tag.isBlank()) {
            stream = stream.filter(s -> s.getTags() != null && s.getTags().contains(tag.trim()));
        }
        Comparator<Song> comparator = "title".equals(sort)
                ? Comparator.comparing(Song::getTitle, String.CASE_INSENSITIVE_ORDER)
                : Comparator.comparing(Song::getUpdatedAt).reversed();
        return stream.sorted(comparator).map(SongService::toSummary).toList();
    }

    @Transactional
    public SongDetail create(UUID bandId, UUID userId, CreateSongRequest req) {
        BandMember me = bandAccess.requireRole(bandId, userId, Role.EDITOR);
        Song song = new Song(bandId, req.title().trim());
        song.setArtist(req.artist());
        song.setOriginalKey(req.originalKey());
        song.setBpm(req.bpm());
        song.setTimeSignature(req.timeSignature());
        song.setTags(req.tags());
        song.setContent("");
        return toDetail(songRepository.save(song), me.getRole());
    }

    @Transactional(readOnly = true)
    public SongDetail get(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        BandMember me = bandAccess.requireMember(song.getBandId(), userId);
        return toDetail(song, me.getRole());
    }

    @Transactional
    public SongDetail updateMetadata(UUID songId, UUID userId, UpdateSongRequest req) {
        Song song = requireSong(songId);
        BandMember me = bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
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
        return toDetail(song, me.getRole());
    }

    public record ContentUpdateResult(boolean conflict, String content, int revision) {}

    @Transactional
    public ContentUpdateResult updateContent(UUID songId, UUID userId, String content, int baseRevision) {
        Song song = requireSong(songId);
        bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
        if (song.getRevision() != baseRevision) {
            return new ContentUpdateResult(true, song.getContent(), song.getRevision());
        }
        song.setContent(content);
        song.bumpRevision();
        return new ContentUpdateResult(false, content, song.getRevision());
    }

    @Transactional
    public SongDetail transpose(UUID songId, UUID userId, int semitones) {
        Song song = requireSong(songId);
        BandMember me = bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
        song.setContent(ChordUtil.transposeContent(song.getContent() != null ? song.getContent() : "", semitones));
        if (song.getOriginalKey() != null && !song.getOriginalKey().isBlank()) {
            song.setOriginalKey(ChordUtil.transposeKey(song.getOriginalKey(), semitones));
        }
        song.bumpRevision();
        return toDetail(song, me.getRole());
    }

    @Transactional
    public void softDelete(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
        song.softDelete();
    }

    private Song requireSong(UUID songId) {
        return songRepository.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
    }

    private static SongSummary toSummary(Song s) {
        return new SongSummary(s.getId(), s.getTitle(), s.getArtist(), s.getOriginalKey(),
                s.getBpm(), s.getTimeSignature(), s.getTags(), s.getUpdatedAt());
    }

    private static SongDetail toDetail(Song s, Role myRole) {
        return new SongDetail(s.getId(), s.getBandId(), s.getTitle(), s.getArtist(),
                s.getOriginalKey(), s.getBpm(), s.getTimeSignature(), s.getTags(),
                s.getContent(), s.getRevision(), myRole, s.getUpdatedAt());
    }
}

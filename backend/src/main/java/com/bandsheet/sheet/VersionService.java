package com.bandsheet.sheet;

import com.bandsheet.auth.User;
import com.bandsheet.auth.UserRepository;
import com.bandsheet.band.BandAccess;
import com.bandsheet.band.BandMember;
import com.bandsheet.band.Role;
import com.bandsheet.common.exception.AppException;
import com.bandsheet.sheet.dto.VersionDtos.VersionAuthor;
import com.bandsheet.sheet.dto.VersionDtos.VersionDetail;
import com.bandsheet.sheet.dto.VersionDtos.VersionSummary;
import com.bandsheet.song.Song;
import com.bandsheet.song.SongRepository;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.common.event.SongContentReplaced;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class VersionService {

    private final SongVersionRepository versionRepository;
    private final SongRepository songRepository;
    private final UserRepository userRepository;
    private final BandAccess bandAccess;
    private final ApplicationEventPublisher events;

    public VersionService(SongVersionRepository versionRepository,
                          SongRepository songRepository,
                          UserRepository userRepository,
                          BandAccess bandAccess,
                          ApplicationEventPublisher events) {
        this.versionRepository = versionRepository;
        this.songRepository = songRepository;
        this.userRepository = userRepository;
        this.bandAccess = bandAccess;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<VersionSummary> list(UUID songId, UUID userId) {
        Song song = requireSong(songId);
        bandAccess.requireMember(song.getBandId(), userId);

        List<SongVersion> versions = versionRepository.findBySongIdOrderByCreatedAtDesc(songId);
        Map<UUID, User> authors = userRepository.findAllById(
                        versions.stream().map(SongVersion::getCreatedBy).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return versions.stream()
                .map(v -> new VersionSummary(v.getId(), v.getNote(),
                        toAuthor(v.getCreatedBy(), authors), v.getCreatedAt()))
                .toList();
    }

    @Transactional
    public VersionSummary create(UUID songId, UUID userId, String note) {
        Song song = requireSong(songId);
        bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
        SongVersion version = versionRepository.save(new SongVersion(
                songId, song.getContent() != null ? song.getContent() : "", note, userId));
        return new VersionSummary(version.getId(), version.getNote(),
                authorOf(userId), version.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public VersionDetail get(UUID songId, UUID versionId, UUID userId) {
        Song song = requireSong(songId);
        bandAccess.requireMember(song.getBandId(), userId);
        SongVersion version = requireVersion(songId, versionId);
        return new VersionDetail(version.getId(), version.getNote(),
                authorOf(version.getCreatedBy()), version.getCreatedAt(), version.getContent());
    }

    @Transactional
    public SongDetail restore(UUID songId, UUID versionId, UUID userId) {
        Song song = requireSong(songId);
        BandMember me = bandAccess.requireRole(song.getBandId(), userId, Role.EDITOR);
        SongVersion version = requireVersion(songId, versionId);

        // 還原前自動快照目前內容(還原本身也產生新版本)
        versionRepository.save(new SongVersion(
                songId, song.getContent() != null ? song.getContent() : "",
                "還原前自動快照", userId));

        song.setContent(version.getContent());
        song.bumpRevision();
        events.publishEvent(new SongContentReplaced(songId, song.getContent(), song.getRevision()));

        return new SongDetail(song.getId(), song.getBandId(), song.getTitle(), song.getArtist(),
                song.getOriginalKey(), song.getBpm(), song.getTimeSignature(), song.getTags(),
                song.getContent(), song.getRevision(), me.getRole(), song.getUpdatedAt());
    }

    private Song requireSong(UUID songId) {
        return songRepository.findByIdAndDeletedAtIsNull(songId)
                .orElseThrow(() -> AppException.notFound("SONG_NOT_FOUND", "找不到歌曲"));
    }

    private SongVersion requireVersion(UUID songId, UUID versionId) {
        return versionRepository.findById(versionId)
                .filter(v -> v.getSongId().equals(songId))
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到版本"));
    }

    private VersionAuthor authorOf(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> new VersionAuthor(u.getId(), u.getDisplayName()))
                .orElse(new VersionAuthor(userId, "未知使用者"));
    }

    private static VersionAuthor toAuthor(UUID userId, Map<UUID, User> authors) {
        User user = authors.get(userId);
        return user != null
                ? new VersionAuthor(user.getId(), user.getDisplayName())
                : new VersionAuthor(userId, "未知使用者");
    }
}

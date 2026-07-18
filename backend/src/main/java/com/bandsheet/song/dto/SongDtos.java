package com.bandsheet.song.dto;

import com.bandsheet.band.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SongDtos {

    private SongDtos() {}

    public record CreateSongRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 200) String artist,
            @Size(max = 5) String originalKey,
            @Min(1) @Max(400) Integer bpm,
            @Size(max = 10) String timeSignature,
            List<String> tags) {}

    /** 部分更新:null 欄位不變(v1 不支援清空欄位)。 */
    public record UpdateSongRequest(
            @Size(max = 200) String title,
            @Size(max = 200) String artist,
            @Size(max = 5) String originalKey,
            @Min(1) @Max(400) Integer bpm,
            @Size(max = 10) String timeSignature,
            List<String> tags) {}

    public record UpdateContentRequest(
            @NotNull String content,
            @NotNull Integer baseRevision) {}

    public record TransposeRequest(
            @NotNull @Min(-11) @Max(11) Integer semitones) {}

    public record ShareRequest(@NotNull UUID bandId) {}

    /** bandIds 為已分享到的樂團(可多個;空 = 個人歌曲);favorite 為目前使用者是否加入最愛。 */
    public record SongSummary(
            UUID id, List<UUID> bandIds, String title, String artist, String originalKey,
            Integer bpm, String timeSignature, List<String> tags, boolean favorite, Instant updatedAt) {}

    public record SongDetail(
            UUID id, List<UUID> bandIds, UUID ownerId, String title, String artist, String originalKey,
            Integer bpm, String timeSignature, List<String> tags,
            String content, int revision, Role myRole, boolean favorite, Instant updatedAt) {}
}

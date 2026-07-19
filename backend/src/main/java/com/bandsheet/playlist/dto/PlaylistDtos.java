package com.bandsheet.playlist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PlaylistDtos {

    private PlaylistDtos() {}

    public record CreatePlaylistRequest(@NotBlank @Size(max = 200) String name) {}

    public record RenamePlaylistRequest(@NotBlank @Size(max = 200) String name) {}

    public record AddSongRequest(@NotNull UUID songId) {}

    public record ReorderRequest(@NotNull List<UUID> songIds) {}

    public record PlaylistSummary(UUID id, String name, int songCount, Instant updatedAt) {}

    /** 歌單裡的一首歌(精簡欄位,依 position 排序)。 */
    public record PlaylistSongItem(
            UUID id, String title, String artist, String originalKey, Integer bpm) {}

    public record PlaylistDetail(UUID id, String name, List<PlaylistSongItem> songs, Instant updatedAt) {}
}

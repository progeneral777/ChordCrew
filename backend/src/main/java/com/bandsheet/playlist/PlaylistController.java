package com.bandsheet.playlist;

import com.bandsheet.auth.AuthUser;
import com.bandsheet.common.dto.ApiResponse;
import com.bandsheet.playlist.dto.PlaylistDtos.AddSongRequest;
import com.bandsheet.playlist.dto.PlaylistDtos.CreatePlaylistRequest;
import com.bandsheet.playlist.dto.PlaylistDtos.PlaylistDetail;
import com.bandsheet.playlist.dto.PlaylistDtos.PlaylistSummary;
import com.bandsheet.playlist.dto.PlaylistDtos.RenamePlaylistRequest;
import com.bandsheet.playlist.dto.PlaylistDtos.ReorderRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping
    public ApiResponse<Map<String, List<PlaylistSummary>>> list(@AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(Map.of("playlists", playlistService.list(me.id())));
    }

    @PostMapping
    public ApiResponse<Map<String, PlaylistDetail>> create(@AuthenticationPrincipal AuthUser me,
                                                           @Valid @RequestBody CreatePlaylistRequest req) {
        return ApiResponse.ok(Map.of("playlist", playlistService.create(me.id(), req.name())));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, PlaylistDetail>> get(@AuthenticationPrincipal AuthUser me,
                                                        @PathVariable UUID id) {
        return ApiResponse.ok(Map.of("playlist", playlistService.get(me.id(), id)));
    }

    @PatchMapping("/{id}")
    public ApiResponse<Map<String, PlaylistDetail>> rename(@AuthenticationPrincipal AuthUser me,
                                                           @PathVariable UUID id,
                                                           @Valid @RequestBody RenamePlaylistRequest req) {
        return ApiResponse.ok(Map.of("playlist", playlistService.rename(me.id(), id, req.name())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        playlistService.delete(me.id(), id);
    }

    @PostMapping("/{id}/songs")
    public ApiResponse<Map<String, PlaylistDetail>> addSong(@AuthenticationPrincipal AuthUser me,
                                                            @PathVariable UUID id,
                                                            @Valid @RequestBody AddSongRequest req) {
        return ApiResponse.ok(Map.of("playlist", playlistService.addSong(me.id(), id, req.songId())));
    }

    @DeleteMapping("/{id}/songs/{songId}")
    public ApiResponse<Map<String, PlaylistDetail>> removeSong(@AuthenticationPrincipal AuthUser me,
                                                               @PathVariable UUID id,
                                                               @PathVariable UUID songId) {
        return ApiResponse.ok(Map.of("playlist", playlistService.removeSong(me.id(), id, songId)));
    }

    @PutMapping("/{id}/songs")
    public ApiResponse<Map<String, PlaylistDetail>> reorder(@AuthenticationPrincipal AuthUser me,
                                                            @PathVariable UUID id,
                                                            @Valid @RequestBody ReorderRequest req) {
        return ApiResponse.ok(Map.of("playlist", playlistService.reorder(me.id(), id, req.songIds())));
    }
}

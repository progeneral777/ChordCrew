package com.bandsheet.song;

import com.bandsheet.auth.AuthUser;
import com.bandsheet.common.dto.ApiResponse;
import com.bandsheet.song.dto.SongDtos.CreateSongRequest;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import com.bandsheet.song.dto.SongDtos.ShareRequest;
import com.bandsheet.song.dto.SongDtos.SongSummary;
import com.bandsheet.song.dto.SongDtos.TransposeRequest;
import com.bandsheet.song.dto.SongDtos.UpdateContentRequest;
import com.bandsheet.song.dto.SongDtos.UpdateSongRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class SongController {

    private final SongService songService;

    public SongController(SongService songService) {
        this.songService = songService;
    }

    @GetMapping("/bands/{bandId}/songs")
    public ApiResponse<Map<String, List<SongSummary>>> list(
            @AuthenticationPrincipal AuthUser me,
            @PathVariable UUID bandId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false, defaultValue = "updated") String sort) {
        return ApiResponse.ok(Map.of("songs", songService.list(bandId, me.id(), query, tag, sort)));
    }

    @PostMapping("/bands/{bandId}/songs")
    public ApiResponse<Map<String, SongDetail>> create(@AuthenticationPrincipal AuthUser me,
                                                       @PathVariable UUID bandId,
                                                       @Valid @RequestBody CreateSongRequest req) {
        return ApiResponse.ok(Map.of("song", songService.create(bandId, me.id(), req)));
    }

    @GetMapping("/me/songs")
    public ApiResponse<Map<String, List<SongSummary>>> listMine(
            @AuthenticationPrincipal AuthUser me,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false, defaultValue = "updated") String sort) {
        return ApiResponse.ok(Map.of("songs", songService.listMine(me.id(), query, tag, sort)));
    }

    @PostMapping("/me/songs")
    public ApiResponse<Map<String, SongDetail>> createPersonal(@AuthenticationPrincipal AuthUser me,
                                                               @Valid @RequestBody CreateSongRequest req) {
        return ApiResponse.ok(Map.of("song", songService.createPersonal(me.id(), req)));
    }

    @PostMapping("/songs/{id}/share")
    public ApiResponse<Map<String, SongDetail>> share(@AuthenticationPrincipal AuthUser me,
                                                      @PathVariable UUID id,
                                                      @Valid @RequestBody ShareRequest req) {
        return ApiResponse.ok(Map.of("song", songService.share(id, me.id(), req.bandId())));
    }

    @PostMapping("/songs/{id}/unshare")
    public ApiResponse<Map<String, SongDetail>> unshare(@AuthenticationPrincipal AuthUser me,
                                                        @PathVariable UUID id) {
        return ApiResponse.ok(Map.of("song", songService.unshare(id, me.id())));
    }

    @GetMapping("/songs/{id}")
    public ApiResponse<Map<String, SongDetail>> get(@AuthenticationPrincipal AuthUser me,
                                                    @PathVariable UUID id) {
        return ApiResponse.ok(Map.of("song", songService.get(id, me.id())));
    }

    @PatchMapping("/songs/{id}")
    public ApiResponse<Map<String, SongDetail>> updateMetadata(@AuthenticationPrincipal AuthUser me,
                                                               @PathVariable UUID id,
                                                               @Valid @RequestBody UpdateSongRequest req) {
        return ApiResponse.ok(Map.of("song", songService.updateMetadata(id, me.id(), req)));
    }

    @PutMapping("/songs/{id}/content")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateContent(
            @AuthenticationPrincipal AuthUser me,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateContentRequest req) {
        SongService.ContentUpdateResult result =
                songService.updateContent(id, me.id(), req.content(), req.baseRevision());
        if (result.conflict()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiResponse<>(
                    Map.of("content", result.content() != null ? result.content() : "",
                           "revision", result.revision()),
                    new ApiResponse.ErrorBody("REVISION_CONFLICT", "內容已被更新,請重新載入", null)));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("revision", result.revision())));
    }

    @PostMapping("/songs/{id}/transpose")
    public ApiResponse<Map<String, SongDetail>> transpose(@AuthenticationPrincipal AuthUser me,
                                                          @PathVariable UUID id,
                                                          @Valid @RequestBody TransposeRequest req) {
        return ApiResponse.ok(Map.of("song", songService.transpose(id, me.id(), req.semitones())));
    }

    @DeleteMapping("/songs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        songService.softDelete(id, me.id());
    }
}

package com.bandsheet.sheet;

import com.bandsheet.auth.AuthUser;
import com.bandsheet.common.dto.ApiResponse;
import com.bandsheet.sheet.dto.VersionDtos.CreateVersionRequest;
import com.bandsheet.sheet.dto.VersionDtos.VersionDetail;
import com.bandsheet.sheet.dto.VersionDtos.VersionSummary;
import com.bandsheet.song.dto.SongDtos.SongDetail;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/songs/{songId}/versions")
public class VersionController {

    private final VersionService versionService;

    public VersionController(VersionService versionService) {
        this.versionService = versionService;
    }

    @GetMapping
    public ApiResponse<Map<String, List<VersionSummary>>> list(@AuthenticationPrincipal AuthUser me,
                                                               @PathVariable UUID songId) {
        return ApiResponse.ok(Map.of("versions", versionService.list(songId, me.id())));
    }

    @PostMapping
    public ApiResponse<Map<String, VersionSummary>> create(@AuthenticationPrincipal AuthUser me,
                                                           @PathVariable UUID songId,
                                                           @Valid @RequestBody(required = false)
                                                           CreateVersionRequest req) {
        String note = req != null ? req.note() : null;
        return ApiResponse.ok(Map.of("version", versionService.create(songId, me.id(), note)));
    }

    @GetMapping("/{versionId}")
    public ApiResponse<Map<String, VersionDetail>> get(@AuthenticationPrincipal AuthUser me,
                                                       @PathVariable UUID songId,
                                                       @PathVariable UUID versionId) {
        return ApiResponse.ok(Map.of("version", versionService.get(songId, versionId, me.id())));
    }

    @PostMapping("/{versionId}/restore")
    public ApiResponse<Map<String, SongDetail>> restore(@AuthenticationPrincipal AuthUser me,
                                                        @PathVariable UUID songId,
                                                        @PathVariable UUID versionId) {
        return ApiResponse.ok(Map.of("song", versionService.restore(songId, versionId, me.id())));
    }
}

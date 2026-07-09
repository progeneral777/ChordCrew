package com.bandsheet.band;

import com.bandsheet.auth.AuthUser;
import com.bandsheet.band.dto.BandDtos.BandDetail;
import com.bandsheet.band.dto.BandDtos.BandSummary;
import com.bandsheet.band.dto.BandDtos.ChangeRoleRequest;
import com.bandsheet.band.dto.BandDtos.CreateBandRequest;
import com.bandsheet.band.dto.BandDtos.InviteRequest;
import com.bandsheet.band.dto.BandDtos.InviteResult;
import com.bandsheet.band.dto.BandDtos.MemberDto;
import com.bandsheet.band.dto.BandDtos.UpdateBandRequest;
import com.bandsheet.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class BandController {

    private final BandService bandService;

    public BandController(BandService bandService) {
        this.bandService = bandService;
    }

    @GetMapping("/bands")
    public ApiResponse<Map<String, List<BandSummary>>> list(@AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(Map.of("bands", bandService.listMyBands(me.id())));
    }

    @PostMapping("/bands")
    public ApiResponse<Map<String, BandSummary>> create(@AuthenticationPrincipal AuthUser me,
                                                        @Valid @RequestBody CreateBandRequest req) {
        return ApiResponse.ok(Map.of("band", bandService.create(me.id(), req.name())));
    }

    @GetMapping("/bands/{id}")
    public ApiResponse<Map<String, BandDetail>> detail(@AuthenticationPrincipal AuthUser me,
                                                       @PathVariable UUID id) {
        return ApiResponse.ok(Map.of("band", bandService.getDetail(id, me.id())));
    }

    @PatchMapping("/bands/{id}")
    public ApiResponse<Map<String, BandSummary>> rename(@AuthenticationPrincipal AuthUser me,
                                                        @PathVariable UUID id,
                                                        @Valid @RequestBody UpdateBandRequest req) {
        return ApiResponse.ok(Map.of("band", bandService.rename(id, me.id(), req.name())));
    }

    @DeleteMapping("/bands/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        bandService.delete(id, me.id());
    }

    @PostMapping("/bands/{id}/invites")
    public ApiResponse<InviteResult> createInvite(@AuthenticationPrincipal AuthUser me,
                                                  @PathVariable UUID id,
                                                  @Valid @RequestBody InviteRequest req) {
        return ApiResponse.ok(bandService.createInvite(id, me.id(), req.role()));
    }

    @PostMapping("/invites/{token}/accept")
    public ApiResponse<Map<String, BandSummary>> acceptInvite(@AuthenticationPrincipal AuthUser me,
                                                              @PathVariable String token) {
        return ApiResponse.ok(Map.of("band", bandService.acceptInvite(token, me.id())));
    }

    @DeleteMapping("/bands/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@AuthenticationPrincipal AuthUser me,
                             @PathVariable UUID id,
                             @PathVariable UUID userId) {
        bandService.removeMember(id, me.id(), userId);
    }

    @PatchMapping("/bands/{id}/members/{userId}")
    public ApiResponse<Map<String, MemberDto>> changeRole(@AuthenticationPrincipal AuthUser me,
                                                          @PathVariable UUID id,
                                                          @PathVariable UUID userId,
                                                          @Valid @RequestBody ChangeRoleRequest req) {
        return ApiResponse.ok(Map.of("member", bandService.changeRole(id, me.id(), userId, req.role())));
    }
}

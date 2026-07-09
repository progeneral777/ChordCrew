package com.bandsheet.band.dto;

import com.bandsheet.band.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class BandDtos {

    private BandDtos() {}

    public record CreateBandRequest(@NotBlank @Size(max = 100) String name) {}

    public record UpdateBandRequest(@NotBlank @Size(max = 100) String name) {}

    public record InviteRequest(@NotNull Role role) {}

    public record ChangeRoleRequest(@NotNull Role role) {}

    public record BandSummary(UUID id, String name, Role myRole, int memberCount) {}

    public record MemberDto(UUID userId, String email, String displayName, Role role) {}

    public record BandDetail(UUID id, String name, UUID ownerId, Role myRole, List<MemberDto> members) {}

    public record InviteResult(String inviteUrl, String token, Instant expiresAt) {}
}

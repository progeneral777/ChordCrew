package com.bandsheet.sheet.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class VersionDtos {

    private VersionDtos() {}

    public record CreateVersionRequest(@Size(max = 200) String note) {}

    public record VersionAuthor(UUID userId, String displayName) {}

    public record VersionSummary(UUID id, String note, VersionAuthor createdBy, Instant createdAt) {}

    public record VersionDetail(UUID id, String note, VersionAuthor createdBy, Instant createdAt,
                                String content) {}
}

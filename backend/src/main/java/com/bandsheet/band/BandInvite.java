package com.bandsheet.band;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "band_invites")
public class BandInvite extends BaseEntity {

    @Column(name = "band_id", nullable = false)
    private UUID bandId;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    protected BandInvite() {}

    public BandInvite(UUID bandId, String token, Role role, Instant expiresAt, UUID createdBy) {
        this.bandId = bandId;
        this.token = token;
        this.role = role;
        this.expiresAt = expiresAt;
        this.createdBy = createdBy;
    }

    public UUID getBandId() { return bandId; }
    public String getToken() { return token; }
    public Role getRole() { return role; }
    public Instant getExpiresAt() { return expiresAt; }
    public UUID getCreatedBy() { return createdBy; }
}

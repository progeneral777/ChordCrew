package com.bandsheet.band;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(name = "band_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"band_id", "user_id"}))
public class BandMember extends BaseEntity {

    @Column(name = "band_id", nullable = false)
    private UUID bandId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    protected BandMember() {}

    public BandMember(UUID bandId, UUID userId, Role role) {
        this.bandId = bandId;
        this.userId = userId;
        this.role = role;
    }

    public UUID getBandId() { return bandId; }
    public UUID getUserId() { return userId; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}

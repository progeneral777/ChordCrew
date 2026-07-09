package com.bandsheet.band;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "bands")
public class Band extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    protected Band() {}

    public Band(String name, UUID ownerId) {
        this.name = name;
        this.ownerId = ownerId;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public UUID getOwnerId() { return ownerId; }
}

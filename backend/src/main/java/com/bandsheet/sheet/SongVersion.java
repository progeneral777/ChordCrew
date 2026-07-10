package com.bandsheet.sheet;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "song_versions")
public class SongVersion extends BaseEntity {

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(nullable = false)
    private String content;

    @Column(length = 200)
    private String note;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    protected SongVersion() {}

    public SongVersion(UUID songId, String content, String note, UUID createdBy) {
        this.songId = songId;
        this.content = content;
        this.note = note;
        this.createdBy = createdBy;
    }

    public UUID getSongId() { return songId; }
    public String getContent() { return content; }
    public String getNote() { return note; }
    public UUID getCreatedBy() { return createdBy; }
}

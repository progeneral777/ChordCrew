package com.bandsheet.song;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "songs")
public class Song extends BaseEntity {

    @Column(name = "band_id", nullable = false)
    private UUID bandId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 200)
    private String artist;

    @Column(name = "original_key", length = 5)
    private String originalKey;

    private Integer bpm;

    @Column(name = "time_signature", length = 10)
    private String timeSignature;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> tags;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String content;

    @Column(nullable = false)
    private int revision;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Song() {}

    public Song(UUID bandId, String title) {
        this.bandId = bandId;
        this.title = title;
        this.revision = 0;
    }

    public UUID getBandId() { return bandId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public String getOriginalKey() { return originalKey; }
    public void setOriginalKey(String originalKey) { this.originalKey = originalKey; }
    public Integer getBpm() { return bpm; }
    public void setBpm(Integer bpm) { this.bpm = bpm; }
    public String getTimeSignature() { return timeSignature; }
    public void setTimeSignature(String timeSignature) { this.timeSignature = timeSignature; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public int getRevision() { return revision; }
    public void bumpRevision() { this.revision++; }
    public Instant getDeletedAt() { return deletedAt; }
    public void softDelete() { this.deletedAt = Instant.now(); }
}

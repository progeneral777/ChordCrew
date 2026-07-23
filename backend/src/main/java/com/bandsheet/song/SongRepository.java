package com.bandsheet.song;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SongRepository extends JpaRepository<Song, UUID> {

    // cast(:q as string):明確給定文字型別,否則 PostgreSQL 會把未指定型別的
    // null 參數推斷為 bytea,導致 lower(bytea) 不存在而整個查詢 500(H2 不會)。
    // 某樂團的歌曲 = 有分享關聯到該樂團的歌(透過 song_bands)。
    @Query("""
            select s from Song s
            where s.deletedAt is null
              and s.id in (select sb.songId from SongBand sb where sb.bandId = :bandId)
              and (:q is null or lower(s.title) like lower(concat('%', cast(:q as string), '%')))
            """)
    List<Song> search(@Param("bandId") UUID bandId, @Param("q") String q);

    // 個人歌曲庫:某使用者建立的所有歌曲(含已分享出去的)。
    @Query("""
            select s from Song s
            where s.ownerId = :ownerId and s.deletedAt is null
              and (:q is null or lower(s.title) like lower(concat('%', cast(:q as string), '%')))
            """)
    List<Song> searchByOwner(@Param("ownerId") UUID ownerId, @Param("q") String q);

    // 探索頁:所有公開歌曲。
    @Query("""
            select s from Song s
            where s.isPublic = true and s.deletedAt is null
              and (:q is null or lower(s.title) like lower(concat('%', cast(:q as string), '%')))
            """)
    List<Song> searchPublic(@Param("q") String q);

    Optional<Song> findByIdAndDeletedAtIsNull(UUID id);
}

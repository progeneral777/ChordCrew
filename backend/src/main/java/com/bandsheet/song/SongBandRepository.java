package com.bandsheet.song;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SongBandRepository extends JpaRepository<SongBand, UUID> {

    boolean existsBySongIdAndBandId(UUID songId, UUID bandId);

    void deleteBySongIdAndBandId(UUID songId, UUID bandId);

    @Query("select sb.bandId from SongBand sb where sb.songId = :songId")
    List<UUID> findBandIdsBySongId(@Param("songId") UUID songId);

    // 批次:一次取出多首歌的分享關聯,供列表組裝 bandIds(避免 N+1)。
    List<SongBand> findBySongIdIn(Collection<UUID> songIds);
}

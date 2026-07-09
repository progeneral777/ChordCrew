package com.bandsheet.song;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SongRepository extends JpaRepository<Song, UUID> {

    @Query("""
            select s from Song s
            where s.bandId = :bandId and s.deletedAt is null
              and (:q is null or lower(s.title) like lower(concat('%', :q, '%')))
            """)
    List<Song> search(@Param("bandId") UUID bandId, @Param("q") String q);

    Optional<Song> findByIdAndDeletedAtIsNull(UUID id);
}

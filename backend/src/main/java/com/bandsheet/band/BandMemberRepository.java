package com.bandsheet.band;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BandMemberRepository extends JpaRepository<BandMember, UUID> {
    List<BandMember> findByUserId(UUID userId);
    List<BandMember> findByBandId(UUID bandId);
    List<BandMember> findByBandIdIn(Collection<UUID> bandIds);
    Optional<BandMember> findByBandIdAndUserId(UUID bandId, UUID userId);
}

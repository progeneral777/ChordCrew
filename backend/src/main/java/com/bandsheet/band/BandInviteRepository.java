package com.bandsheet.band;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BandInviteRepository extends JpaRepository<BandInvite, UUID> {
    Optional<BandInvite> findByToken(String token);
}

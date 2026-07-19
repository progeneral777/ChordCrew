package com.bandsheet.playlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {
    List<Playlist> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    Optional<Playlist> findByIdAndOwnerId(UUID id, UUID ownerId);
}

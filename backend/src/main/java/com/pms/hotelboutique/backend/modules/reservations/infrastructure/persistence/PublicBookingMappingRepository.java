package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Public mapping reads only; never uses Staff scope or updates an existing profile. */
@Repository
public class PublicBookingMappingRepository {
    private final JdbcTemplate jdbc;

    public PublicBookingMappingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean roomTypeExists(UUID propertyId, UUID roomTypeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM room_types WHERE property_id=? AND id=?)",
                Boolean.class, propertyId, roomTypeId));
    }

    public Optional<UUID> findReusableProfile(UUID propertyId, PublicBookingRequest.BookingGuest guest) {
        // C collation enforces exact case/Unicode identity regardless of database
        // defaults. At most two ids suffice to distinguish unique from ambiguous.
        var matches = jdbc.query("""
                SELECT id FROM guest_profiles
                WHERE property_id=? AND status='ACTIVE' AND guest_account_id IS NULL
                  AND first_name COLLATE "C" = ? AND last_name COLLATE "C" = ? AND email COLLATE "C" = ?
                ORDER BY id LIMIT 2
                """, (row, index) -> row.getObject("id", UUID.class),
                propertyId, guest.firstName(), guest.lastName(), guest.email());
        return matches.size() == 1 ? Optional.of(matches.getFirst()) : Optional.empty();
    }
}

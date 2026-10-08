package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Query-only public booking access to the explicitly requested Property; no Staff scope. */
public interface PublicBookingPropertyRepository extends Repository<Property, UUID> {
    boolean existsById(UUID propertyId);
}

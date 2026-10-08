package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffUserRepository extends JpaRepository<StaffUser, UUID> {
    Optional<StaffUser> findByUsername(String username);
    @org.springframework.data.jpa.repository.Query("select s from StaffUser s where lower(trim(s.workEmail)) = :email")
    Optional<StaffUser> findByNormalizedEmail(@org.springframework.data.repository.query.Param("email") String email);
    boolean existsByUsername(String username);
}

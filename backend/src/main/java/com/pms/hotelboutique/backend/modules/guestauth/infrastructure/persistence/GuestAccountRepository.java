package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestAccountRepository extends JpaRepository<GuestAccount,UUID>{
 @org.springframework.data.jpa.repository.Query("select a from GuestAccount a where lower(trim(a.email)) = :email")
 java.util.Optional<GuestAccount> findByNormalizedEmail(@org.springframework.data.repository.query.Param("email") String email);}

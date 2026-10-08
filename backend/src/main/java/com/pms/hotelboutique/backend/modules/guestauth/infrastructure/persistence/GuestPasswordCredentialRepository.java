package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestPasswordCredential;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestPasswordCredentialRepository extends JpaRepository<GuestPasswordCredential,UUID> { }

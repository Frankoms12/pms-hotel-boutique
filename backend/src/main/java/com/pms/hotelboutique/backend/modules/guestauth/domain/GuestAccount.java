package com.pms.hotelboutique.backend.modules.guestauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guest_accounts")
public class GuestAccount {
    public enum Status { ACTIVE, DISABLED }
    @Id private UUID id;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "email_verified_at", nullable = false) private Instant emailVerifiedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(name = "last_login_at") private Instant lastLoginAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected GuestAccount() { }
    public GuestAccount(UUID id, String email, Instant now) { this.id=id; this.email=email; emailVerifiedAt=now; status=Status.ACTIVE; createdAt=now; updatedAt=now; }
    public UUID getId(){ return id; } public String getEmail(){ return email; } public boolean isActive(){ return status==Status.ACTIVE; }
    public boolean isEmailVerified(){ return emailVerifiedAt != null; }
    public void recordLogin(Instant now) { lastLoginAt=now; updatedAt=now; }
}

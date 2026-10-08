package com.pms.hotelboutique.backend.modules.guestauth.domain;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="guest_password_credentials")
public class GuestPasswordCredential {
    @Id @Column(name="guest_account_id") private UUID guestAccountId;
    @OneToOne(fetch=FetchType.LAZY) @MapsId @JoinColumn(name="guest_account_id") private GuestAccount account;
    @Column(name="password_hash",nullable=false,length=255) private String passwordHash;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    protected GuestPasswordCredential() { }
    public GuestPasswordCredential(GuestAccount account,String hash,Instant now) {
        this.account=account; guestAccountId=account.getId(); passwordHash=hash; createdAt=now; updatedAt=now;
    }
    public String getPasswordHash() { return passwordHash; }
}

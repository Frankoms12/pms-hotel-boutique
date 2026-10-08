package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class StaffReservationReadIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate FIRST = LocalDate.parse("2035-01-01");
    private static final String ROUTE = "/api/v1/reservations";
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired EntityManager entityManager;
    private UUID property, otherProperty, reservation, type;
    private StaffPrincipal reception;

    @BeforeEach
    void fixtures() {
        property = insertProperty("America/Guatemala", "GTQ");
        otherProperty = insertProperty("UTC", "USD");
        reception = staff("RECEPCION", property);
        type = insertRoomType(property);
        reservation = insertReservation(property, "CONFIRMED", "GTQ");
        insertStay(property, type, reservation, "RESERVED", FIRST, FIRST.plusDays(2));
    }

    @Test
    void readsRealMultiRoomReservationAndResponsibleProfileWithoutOccupancyOrMoney() throws Exception {
        UUID guest = UUID.randomUUID();
        jdbc.update("INSERT INTO guest_profiles(id,first_name,last_name,email,phone,status,created_at,updated_at) VALUES (?,'Real','Responsible','private@example.test','secret-phone','ACTIVE',now(),now())", guest);
        jdbc.update("UPDATE reservations SET booking_guest_id=? WHERE id=?", guest, reservation);
        insertStay(property, type, reservation, "IN_HOUSE", FIRST, FIRST.plusDays(3));
        var response = mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", property.toString())
                .header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.reservationId").value(reservation.toString()))
                .andExpect(jsonPath("$.responsibleGuest.profileId").value(guest.toString()))
                .andExpect(jsonPath("$.responsibleGuest.firstName").value("Real"))
                .andExpect(jsonPath("$.stays.length()").value(2))
                .andExpect(jsonPath("$.stays[0].roomType.name").value("Deluxe"))
                .andExpect(jsonPath("$.stays[0].room").isEmpty())
                .andExpect(jsonPath("$.stays[0].arrival").value(FIRST.toString())).andReturn();
        String raw = response.getResponse().getContentAsString();
        for (String absent : new String[]{"secret-phone", "private@example.test", "adults", "children", "occupants", "policy", "paidAmount", "paymentReference"}) assertFalse(raw.contains(absent));
    }

    @Test
    void readsAssignedRoomAndHistoricalHeaderWithoutInventingAStay() throws Exception {
        UUID room = insertRoom(property, type);
        jdbc.update("UPDATE reservation_stays SET room_id=? WHERE reservation_id=?", room, reservation);
        mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stays[0].room.code").value("203"));
        UUID header = insertReservation(property, "PENDING", "GTQ");
        mvc.perform(get(ROUTE + "/" + header).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stays").isEmpty()).andExpect(jsonPath("$.responsibleGuest").isEmpty());
    }

    @Test
    void listIncludesOnlyTheRequestedPropertyAndCanBeEmpty() throws Exception {
        insertReservation(otherProperty, "CANCELLED", "USD");
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reservationId").value(reservation.toString()));
        var emptyStaff = staff("GERENCIA", otherProperty);
        UUID empty = insertProperty("UTC", "USD");
        var emptySession = staff("GERENCIA", empty);
        mvc.perform(get(ROUTE).param("propertyId", empty.toString()).header("Authorization", bearer(emptySession)))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", otherProperty.toString()).header("Authorization", bearer(emptyStaff)))
                .andExpect(status().isNotFound());
        mvc.perform(get(ROUTE + "/" + UUID.randomUUID()).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isNotFound());
    }

    @Test
    void requiresStaffAndRejectsGuestMissingInvalidOrRevokedSession() throws Exception {
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        for (String route : new String[]{ROUTE, ROUTE + "/" + reservation}) {
            mvc.perform(get(route).param("propertyId", property.toString())).andExpect(status().isUnauthorized());
            for (String token : new String[]{"invalid", guest}) mvc.perform(get(route).param("propertyId", property.toString()).header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", reception.sessionId());
        entityManager.clear();
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isUnauthorized());
    }

    @Test
    void permissionsAndMembershipAreLiveAndUnauthorizedPropertyIs403() throws Exception {
        for (String role : new String[]{"OPERACIONES", "AUDITOR"}) {
            var session = staff(role, property);
            mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(session))).andExpect(status().isForbidden());
        }
        for (String role : new String[]{"GERENCIA", "SUPER_ADMIN"}) {
            mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(staff(role, property)))).andExpect(status().isOk());
        }
        mvc.perform(get(ROUTE).param("propertyId", otherProperty.toString()).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='RESERVATION_MANAGE'");
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
    }

    @Test
    void inactiveMembershipAndForeignOrganizationFailClosed() throws Exception {
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=?", reception.staffUserId());
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isUnauthorized());
        var admin = staff("SUPER_ADMIN", property);
        UUID org = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) VALUES (?,'Foreign',?,'ACTIVE',now(),now())", org, org.toString());
        jdbc.update("UPDATE properties SET organization_id=? WHERE id=?", org, otherProperty);
        mvc.perform(get(ROUTE).param("propertyId", otherProperty.toString()).header("Authorization", bearer(admin))).andExpect(status().isForbidden());
    }

    @Test
    void rejectsUnknownDuplicateMissingAndMalformedParameters() throws Exception {
        for (String route : new String[]{ROUTE, ROUTE + "/" + reservation}) {
            mvc.perform(get(route).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", "invalid").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", property.toString(), property.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", property.toString()).param("scope", "ALL_PROPERTIES").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        }
        for (String invalidId : new String[]{"invalid", "1-1-1-1-1"})
            mvc.perform(get(ROUTE + "/" + invalidId).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
    }

    private String bearer(StaffPrincipal principal) { return "Bearer " + jwt.issue(principal, Instant.now()); }

    private UUID insertProperty(String timezone, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?, ?, ?, ?,'ACTIVE',now(),now())",
                id, ORGANIZATION, "Report " + id, id.toString(), timezone, currency);
        return id;
    }

    private UUID insertRoomType(UUID propertyId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)",
                id, propertyId, id.toString(), "Deluxe");
        return id;
    }

    private UUID insertRoom(UUID propertyId, UUID typeId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                id, propertyId, typeId, "203");
        return id;
    }

    private UUID insertReservation(UUID propertyId, String status, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) "
                + "VALUES (?,?,?,?,?,'DIRECT',now(),now())",
                id, propertyId, id.toString().substring(0, 16), status, currency);
        return id;
    }

    private void insertStay(UUID propertyId, UUID typeId, UUID reservationId,
            String status, LocalDate arrival, LocalDate departure) {
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) "
                + "VALUES (?,?,?,?,?,?,?,now(),now())",
                UUID.randomUUID(), reservationId, propertyId, typeId, arrival, departure, status);
    }

    private StaffPrincipal staff(String role, UUID... propertyIds) {
        UUID id = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())",
                id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, role);
        for (UUID propertyId : propertyIds) {
            jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                    + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, propertyId);
        }
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) "
                + "VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}

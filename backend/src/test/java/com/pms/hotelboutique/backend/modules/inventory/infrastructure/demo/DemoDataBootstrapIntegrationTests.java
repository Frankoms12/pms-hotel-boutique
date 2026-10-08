package com.pms.hotelboutique.backend.modules.inventory.infrastructure.demo;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

/** Each test builds its own dataset in a rolled-back transaction. No Docker demo dependence. */
@SpringBootTest(properties = "pms.demo.data.enabled=false")
@Transactional
class DemoDataBootstrapIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired DemoRatePolicy rates;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
    @Autowired PublicAvailabilityService availability;
    private final UUID property = DemoDataBootstrap.PROPERTY_ID;
    private void populate() { new DemoDataBootstrap(jdbc, rates, passwords).run(null); }
    private int count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE property_id=?", Integer.class, property); }
    @Test void disabledNormalContextStartsWithoutDemoData() {
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM properties WHERE id=?", Integer.class, property));
    }
    @Test void createsCorrectPropertySixTypesAndTwentyFourPhysicalRooms() {
        populate();
        assertEquals(List.of("Hotel Boutique Demo", "HB-GT-DEMO", "America/Guatemala", "GTQ", "ACTIVE"), jdbc.queryForObject("SELECT name,code,timezone,currency,status FROM properties WHERE id=?", (rs, row) -> List.of(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4).trim(),rs.getString(5)), property));
        assertEquals(6, count("room_types")); assertEquals(24, count("rooms"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM rooms r JOIN room_types t ON t.id=r.room_type_id WHERE r.property_id=? AND t.property_id<>r.property_id", Integer.class, property));
        assertEquals(List.of("CLASSIC","DLX","KING","STD","SUITE","TWIN"), jdbc.queryForList("SELECT code FROM room_types WHERE property_id=? ORDER BY code", String.class, property));
        assertEquals(0, count("rate_plans"));
        var result = availability.search(new PublicAvailabilityQuery(property, LocalDate.of(2026,11,1), LocalDate.of(2026,11,3), 1));
        assertEquals(6, result.offers().size()); assertTrue(result.offers().stream().allMatch(offer -> offer.availableUnits()==4));
    }
    @Test void repeatedRunsPreserveIdsAndExistingAdditionalData() {
        populate(); var ids = jdbc.queryForList("SELECT id FROM rooms WHERE property_id=? ORDER BY code", UUID.class, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) SELECT ?,property_id,id,'EXTRA' FROM room_types WHERE property_id=? AND code='STD'", UUID.randomUUID(), property);
        populate(); populate(); assertEquals(6,count("room_types")); assertEquals(25,count("rooms"));
        assertEquals(ids, jdbc.queryForList("SELECT id FROM rooms WHERE property_id=? AND code<>'EXTRA' ORDER BY code", UUID.class, property));
    }
    @Test void completesPartialDatasetWithoutDuplicatingOtherTypes() {
        populate(); jdbc.update("DELETE FROM rooms WHERE property_id=? AND code IN ('101','602')", property);
        jdbc.update("DELETE FROM rooms WHERE room_type_id IN (SELECT id FROM room_types WHERE property_id=? AND code='DLX')", property);
        jdbc.update("DELETE FROM room_types WHERE property_id=? AND code='DLX'", property);
        populate(); assertEquals(6,count("room_types")); assertEquals(24,count("rooms"));
    }
    @Test void demoCredentialsAreHashedIdempotentAndHaveSeparateIdentities() {
        populate();
        String staffHash=jdbc.queryForObject("SELECT password_hash FROM staff_users WHERE work_email=?",String.class,DemoDataBootstrap.STAFF_EMAIL);
        String guestHash=jdbc.queryForObject("SELECT password_hash FROM guest_password_credentials c JOIN guest_accounts a ON a.id=c.guest_account_id WHERE email=?",String.class,DemoDataBootstrap.GUEST_EMAIL);
        assertTrue(passwords.matches(DemoDataBootstrap.DEMO_PASSWORD,staffHash));
        assertTrue(passwords.matches(DemoDataBootstrap.DEMO_PASSWORD,guestHash));
        populate();
        assertEquals(staffHash,jdbc.queryForObject("SELECT password_hash FROM staff_users WHERE work_email=?",String.class,DemoDataBootstrap.STAFF_EMAIL));
        assertEquals(guestHash,jdbc.queryForObject("SELECT password_hash FROM guest_password_credentials c JOIN guest_accounts a ON a.id=c.guest_account_id WHERE email=?",String.class,DemoDataBootstrap.GUEST_EMAIL));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM membership_properties mp JOIN staff_users s ON s.id=mp.staff_user_id WHERE s.work_email=? AND mp.property_id=?",Integer.class,DemoDataBootstrap.STAFF_EMAIL,property));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM guest_identities i JOIN guest_accounts a ON a.id=i.guest_account_id WHERE a.email=?",Integer.class,DemoDataBootstrap.GUEST_EMAIL));
    }
    @Test void conflictingPropertyIsReportedAndNeverOverwritten() {
        populate(); jdbc.update("UPDATE properties SET currency='USD' WHERE id=?", property);
        assertThrows(IllegalStateException.class, this::populate);
        assertEquals("USD", jdbc.queryForObject("SELECT currency FROM properties WHERE id=?", String.class, property).trim());
    }
}

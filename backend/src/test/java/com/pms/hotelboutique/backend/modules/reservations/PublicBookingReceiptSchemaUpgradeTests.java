package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class PublicBookingReceiptSchemaUpgradeTests {
    @Autowired DataSource dataSource;

    @Test
    void upgradesPreJ1WithoutChangingHistoricalChecksumsOrDataAndReappliesCleanly() throws Exception {
        String schema = "j1_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = TestConnections.publicConnection(dataSource); var sql = connection.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                migrate(connection, schema, "classpath:db/changelog/db.changelog-before-public-booking-receipts.yaml");
                Map<String, String> before = manifest(connection, schema);
                assertFalse(before.keySet().stream().anyMatch(key -> key.startsWith("004-reservations-008\n")));
                UUID reservation = UUID.randomUUID();
                try (var insert = connection.prepareStatement("INSERT INTO " + schema + ".reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) "
                        + "SELECT ?,id,'J1-UPGRADE','CONFIRMED','GTQ','J1_TEST',now(),now() FROM " + schema + ".properties WHERE code='HB-GT-001'")) {
                    insert.setObject(1, reservation);
                    assertEquals(1, insert.executeUpdate());
                }
                migrate(connection, schema, "classpath:db/changelog/db.changelog-master.yaml");
                Map<String, String> after = manifest(connection, schema);
                assertEquals(before.size() + 4, after.size());
                before.forEach((key, checksum) -> assertEquals(checksum, after.get(key), key));
                assertTrue(after.keySet().stream().anyMatch(key -> key.startsWith("004-reservations-008\n")));
                try (var row = sql.executeQuery("SELECT confirmation_code,status,currency FROM " + schema + ".reservations WHERE id='" + reservation + "'")) {
                    assertTrue(row.next());
                    assertEquals("J1-UPGRADE", row.getString(1));
                    assertEquals("CONFIRMED", row.getString(2));
                    assertEquals("GTQ", row.getString(3));
                    assertFalse(row.next());
                }
                try (var row = sql.executeQuery("SELECT count(*) FROM " + schema + ".public_booking_receipts")) {
                    assertTrue(row.next());
                    assertEquals(0, row.getInt(1));
                }
                try (var row = sql.executeQuery("SELECT count(*) FROM information_schema.triggers WHERE trigger_schema='" + schema
                        + "' AND trigger_name='trg_public_booking_receipts_append_only'")) {
                    assertTrue(row.next());
                    assertEquals(2, row.getInt(1)); // UPDATE and DELETE entries for the same trigger.
                }
                migrate(connection, schema, "classpath:db/changelog/db.changelog-master.yaml");
                assertEquals(after, manifest(connection, schema));
            } finally { sql.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }

    private Map<String, String> manifest(Connection connection, String schema) throws SQLException {
        var result = new TreeMap<String, String>();
        try (var sql = connection.createStatement(); var rows = sql.executeQuery("SELECT id,author,filename,md5sum FROM " + schema + ".databasechangelog")) {
            while (rows.next()) { result.put(rows.getString(1) + "\n" + rows.getString(2) + "\n" + rows.getString(3), rows.getString(4)); }
        }
        return result;
    }

    private void migrate(Connection connection, String schema, String changelog) throws Exception {
        String previousSchema = connection.getSchema();
        try {
            connection.setSchema(schema);
            var migration = new SpringLiquibase();
            migration.setDataSource(new SingleConnectionDataSource(connection, true));
            migration.setDefaultSchema(schema);
            migration.setLiquibaseSchema(schema);
            migration.setChangeLog(changelog);
            migration.afterPropertiesSet();
        } finally { connection.setSchema(previousSchema); }
    }
}

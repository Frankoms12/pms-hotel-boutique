package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingReceiptRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingReceiptResult;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class PublicBookingReceiptRequestTests {
    private static final String HASH = "1".repeat(64);

    @Test
    void lockIsGlobalByExactKeyAndIndependentOfPayloadHash() {
        var request = new PublicBookingReceiptRequest(" Key-123 ", HASH);
        assertEquals(" Key-123 ", request.idempotencyKey());
        assertEquals(request.lockId(), new PublicBookingReceiptRequest(" Key-123 ", "2".repeat(64)).lockId());
        assertNotEquals(request.lockId(), new PublicBookingReceiptRequest("Key-1234", HASH).lockId());
        assertNotEquals(request.lockId(), new PublicBookingReceiptRequest(" key-123 ", HASH).lockId());
        assertEquals(request.lockId(), new PublicBookingReceiptRequest(" Key-123 ", HASH).lockId());
    }

    @Test
    void preservesKeyBoundariesWithoutNormalizingUnicode() {
        assertDoesNotThrow(() -> new PublicBookingReceiptRequest("x".repeat(8), HASH));
        assertDoesNotThrow(() -> new PublicBookingReceiptRequest("x".repeat(128), HASH));
        assertDoesNotThrow(() -> new PublicBookingReceiptRequest("\uD83D\uDE00".repeat(128), HASH));
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptRequest("x".repeat(129), HASH));
        assertNotEquals(new PublicBookingReceiptRequest("Jos\u00e9-key", HASH).lockId(),
                new PublicBookingReceiptRequest("Jose\u0301-key", HASH).lockId());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "        ", "1234567", "1234567\n", "1234567\u007f", "1234567\uD800"})
    void rejectsInvalidKeyBeforePersistence(String key) {
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptRequest(key, HASH));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "hash", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "12345678"})
    void requiresTheExactJ3HashFormat(String hash) {
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptRequest("valid-key", hash));
    }

    @Test
    void rejectsIncompleteServerResultMetadata() {
        UUID reservation = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptResult(null, "J1-CODE", "SIM-J1", "{}"));
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptResult(reservation, " ", "SIM-J1", "{}"));
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptResult(reservation, "x".repeat(17), "SIM-J1", "{}"));
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptResult(reservation, "J1-CODE", " ", "{}"));
        assertThrows(IllegalArgumentException.class, () -> new PublicBookingReceiptResult(reservation, "J1-CODE", "SIM-J1", null));
    }
}

package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class PaymentContractTests {
    private static final String REFERENCE = "SIM-" + UUID.randomUUID();

    @Test
    void requestContainsOnlyExactAmountAndCurrencyWithoutSensitiveMetadata() {
        assertEquals(List.of("amountMinor", "currency"), Arrays.stream(PaymentRequest.class.getRecordComponents())
                .map(component -> component.getName()).toList());
        long exact = 9_007_199_254_740_993L;
        assertEquals(exact, new PaymentRequest(exact, "GTQ").amountMinor());
        assertEquals(Long.MAX_VALUE, new PaymentRequest(Long.MAX_VALUE, "GTQ").amountMinor());
        assertEquals("GTQ", new PaymentRequest(65000, "GTQ").currency());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "USD", "gtq", " GTQ", "GTQ "})
    void rejectsOtherCurrenciesWithoutNormalization(String currency) {
        var error = assertThrows(IllegalArgumentException.class, () -> new PaymentRequest(65000, currency));
        assertEquals("simulated booking payment requires GTQ", error.getMessage());
    }

    @Test
    void approvedIsTheOnlySuccessStatus() {
        assertEquals(List.of("APPROVED", "DECLINED", "ERROR"), Arrays.stream(PaymentResult.Status.values())
                .map(Enum::name).toList());
        assertEquals("SIMULATED", new PaymentResult(PaymentResult.Status.APPROVED, REFERENCE).provider());
        assertTrue(new PaymentResult(PaymentResult.Status.APPROVED, REFERENCE).isApproved());
        assertFalse(new PaymentResult(PaymentResult.Status.DECLINED, null).isApproved());
        assertFalse(new PaymentResult(PaymentResult.Status.ERROR, null).isApproved());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "real-provider-reference", "SIM-J2", " SIM-00000000-0000-0000-0000-000000000000",
            "SIM-00000000-0000-0000-0000-000000000000 ", "SIM-AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"})
    void approvedResultRequiresOnlyTheCanonicalSyntheticReference(String reference) {
        assertThrows(IllegalArgumentException.class, () -> new PaymentResult(PaymentResult.Status.APPROVED, reference));
    }

    @Test
    void failedResultsCannotPretendToHaveAPaymentReference() {
        assertThrows(IllegalArgumentException.class, () -> new PaymentResult(PaymentResult.Status.DECLINED, REFERENCE));
        assertThrows(IllegalArgumentException.class, () -> new PaymentResult(PaymentResult.Status.ERROR, REFERENCE));
        assertThrows(NullPointerException.class, () -> new PaymentResult(null, null));
    }

    @Test
    void receiptSnapshotAcceptsOnlyTheNewlyApprovedSuccessState() {
        var json = new ObjectMapper();
        UUID reservation = UUID.randomUUID();
        String snapshot = """
                {"reservationId":"%s","confirmationCode":"J2-CODE","status":"CONFIRMED",
                 "currency":"GTQ","totalMinor":65000,
                 "payment":{"provider":"SIMULATED","status":"APPROVED","reference":"%s"},
                 "stays":[{"reservationStayId":"%s","roomTypeId":"%s","roomId":null,
                           "arrival":"2035-01-01","departure":"2035-01-02"}]}
                """.formatted(reservation, REFERENCE, UUID.randomUUID(), UUID.randomUUID());
        assertDoesNotThrow(() -> PublicBookingReceiptSnapshotValidator.validate(json,
                new PublicBookingReceiptResult(reservation, "J2-CODE", REFERENCE, snapshot)));
        for (String status : List.of("CAPTURED", "DECLINED", "ERROR")) {
            assertThrows(IllegalArgumentException.class, () -> PublicBookingReceiptSnapshotValidator.validate(json,
                    new PublicBookingReceiptResult(reservation, "J2-CODE", REFERENCE, snapshot.replace("APPROVED", status))));
        }
    }
}

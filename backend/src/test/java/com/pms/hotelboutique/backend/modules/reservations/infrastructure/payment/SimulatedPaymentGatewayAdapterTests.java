package com.pms.hotelboutique.backend.modules.reservations.infrastructure.payment;

import com.pms.hotelboutique.backend.modules.reservations.application.PaymentRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentResult;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.junit.jupiter.api.Assertions.*;

class SimulatedPaymentGatewayAdapterTests {
    private static final PaymentRequest REQUEST = new PaymentRequest(65000, "GTQ");

    @Test
    void runtimeAlwaysApprovesWithAnIndependentSyntheticReference() {
        var gateway = new SimulatedPaymentGatewayAdapter();
        var references = new HashSet<String>();
        for (int call = 0; call < 100; call++) {
            var result = gateway.pay(REQUEST);
            assertEquals("SIMULATED", result.provider());
            assertEquals(PaymentResult.Status.APPROVED, result.status());
            assertTrue(result.isApproved());
            assertTrue(result.reference().startsWith("SIM-"));
            UUID identifier = UUID.fromString(result.reference().substring(4));
            assertEquals(4, identifier.version());
            assertEquals("SIM-" + identifier, result.reference());
            assertTrue(references.add(result.reference()));
        }
    }

    @ParameterizedTest
    @EnumSource(PaymentResult.Status.class)
    void fixtureOutcomeIsExplicitAndDeterministic(PaymentResult.Status status) {
        var gateway = new SimulatedPaymentGatewayAdapter(status);
        for (int call = 0; call < 3; call++) {
            var result = gateway.pay(REQUEST);
            assertEquals(status, result.status());
            assertEquals("SIMULATED", result.provider());
            if (status == PaymentResult.Status.APPROVED) {
                assertNotNull(result.reference());
            } else {
                assertFalse(result.isApproved());
                assertNull(result.reference());
            }
        }
    }

    @ParameterizedTest
    @EnumSource(PaymentResult.Status.class)
    void missingRequestIsRejectedForEveryOutcome(PaymentResult.Status status) {
        var gateway = new SimulatedPaymentGatewayAdapter(status);
        assertThrows(NullPointerException.class, () -> gateway.pay(null));
    }

    @Test
    void adapterHasNoInjectedIOClientsOrPublicFailureSwitch() {
        assertEquals(1, SimulatedPaymentGatewayAdapter.class.getConstructors().length);
        assertEquals(0, SimulatedPaymentGatewayAdapter.class.getConstructors()[0].getParameterCount());
        var fields = Arrays.stream(SimulatedPaymentGatewayAdapter.class.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers())).toList();
        assertEquals(1, fields.size());
        assertEquals(PaymentResult.Status.class, fields.getFirst().getType());
        assertTrue(Modifier.isFinal(fields.getFirst().getModifiers()));
        assertThrows(NullPointerException.class, () -> new SimulatedPaymentGatewayAdapter(null));
    }

    @Test
    void sharedAdapterIsStatelessUnderConcurrentLocalCalls() throws Exception {
        var gateway = new SimulatedPaymentGatewayAdapter();
        var references = new HashSet<String>();
        try (var workers = Executors.newFixedThreadPool(4)) {
            var calls = java.util.stream.IntStream.range(0, 32)
                    .mapToObj(ignored -> workers.submit(() -> gateway.pay(REQUEST))).toList();
            for (var call : calls) {
                var result = call.get(10, TimeUnit.SECONDS);
                assertEquals(PaymentResult.Status.APPROVED, result.status());
                assertTrue(references.add(result.reference()));
            }
        }
        assertEquals(32, references.size());
    }
}

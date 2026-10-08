package com.pms.hotelboutique.backend.modules.reservations.infrastructure.payment;

import com.pms.hotelboutique.backend.modules.reservations.application.PaymentGatewayPort;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentResult;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Stateless local simulation: no IO, persistence, credentials or provider SDK. */
@Component
public final class SimulatedPaymentGatewayAdapter implements PaymentGatewayPort {
    private final PaymentResult.Status outcome;

    /** The only runtime construction path; demo payments always succeed. */
    public SimulatedPaymentGatewayAdapter() {
        this(PaymentResult.Status.APPROVED);
    }

    /** Package-local fixture seam for deterministic DECLINED and ERROR tests. */
    SimulatedPaymentGatewayAdapter(PaymentResult.Status outcome) {
        this.outcome = Objects.requireNonNull(outcome, "simulation outcome is required");
    }

    @Override
    public PaymentResult pay(PaymentRequest request) {
        Objects.requireNonNull(request, "payment request is required");
        return new PaymentResult(outcome,
                outcome == PaymentResult.Status.APPROVED ? "SIM-" + UUID.randomUUID() : null);
    }
}

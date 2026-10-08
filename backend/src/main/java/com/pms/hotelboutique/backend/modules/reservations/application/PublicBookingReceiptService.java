package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.PublicBookingReceipt;
import java.util.function.Supplier;

public interface PublicBookingReceiptService {
    /**
     * Serializes the global key until the exterior transaction commits or rolls back.
     * The server callback must perform local persistence in this same transaction,
     * without external effects, REQUIRES_NEW, async work or a separate connection.
     * J3 validates the public request before the caller supplies its hash here.
     */
    PublicBookingReceipt execute(PublicBookingReceiptRequest request, Supplier<PublicBookingReceiptResult> persistence);
}

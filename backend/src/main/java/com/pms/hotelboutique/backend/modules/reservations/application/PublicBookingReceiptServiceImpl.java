package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.PublicBookingReceipt;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingReceiptRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Service
public class PublicBookingReceiptServiceImpl implements PublicBookingReceiptService {
    private final PublicBookingReceiptRepository receipts;
    private final EntityManager entities;
    private final ObjectMapper json;

    public PublicBookingReceiptServiceImpl(PublicBookingReceiptRepository receipts, EntityManager entities, ObjectMapper json) {
        this.receipts = receipts;
        this.entities = entities;
        this.json = json;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PublicBookingReceipt execute(PublicBookingReceiptRequest request, Supplier<PublicBookingReceiptResult> persistence) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(persistence, "persistence");
        Integer isolation = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                || (isolation != null && isolation != Isolation.READ_COMMITTED.value())
                || !receipts.isWritableReadCommitted()) {
            throw new IllegalStateException("public booking receipts require a writable READ_COMMITTED transaction");
        }
        receipts.lock(request);
        var existing = receipts.find(request.idempotencyKey());
        if (existing.isPresent()) {
            if (!existing.get().requestHash().equals(request.requestHash())) {
                throw new PublicBookingIdempotencyConflictException();
            }
            return existing.get();
        }
        var result = Objects.requireNonNull(persistence.get(), "local persistence must return a booking result");
        PublicBookingReceiptSnapshotValidator.validate(json, result);
        // JDBC's FK must see every pending JPA reservation/stay write in this same transaction.
        entities.flush();
        if (!receipts.matchesCompletedReservation(result)) {
            throw new IllegalArgumentException("local persistence must complete the matching GTQ reservation");
        }
        Instant created = Instant.now().truncatedTo(ChronoUnit.MICROS);
        receipts.insert(new PublicBookingReceipt(request.idempotencyKey(), request.requestHash(), PublicBookingReceipt.Status.COMPLETED,
                result.reservationId(), result.confirmationCode(), result.paymentReference(), result.responseSnapshot(), created, created));
        // Return PostgreSQL's JSONB/timestamp representation on the first response as well as replays.
        return receipts.find(request.idempotencyKey()).orElseThrow(() -> new IllegalStateException("completed receipt was not persisted"));
    }
}

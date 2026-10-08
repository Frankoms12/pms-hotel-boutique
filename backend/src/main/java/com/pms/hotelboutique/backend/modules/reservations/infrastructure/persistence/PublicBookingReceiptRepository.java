package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingReceiptRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingReceiptResult;
import com.pms.hotelboutique.backend.modules.reservations.domain.PublicBookingReceipt;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Completed receipts and advisory locks use the same application PostgreSQL transaction. */
@Repository
public class PublicBookingReceiptRepository {
    private final JdbcTemplate jdbc;

    public PublicBookingReceiptRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean isWritableReadCommitted() {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT current_setting('transaction_isolation')='read committed' "
                + "AND current_setting('transaction_read_only')='off'", Boolean.class));
    }

    public void lock(PublicBookingReceiptRequest request) {
        jdbc.query("SELECT pg_advisory_xact_lock(?)", result -> { }, request.lockId());
    }

    public Optional<PublicBookingReceipt> find(String key) {
        return jdbc.query("SELECT idempotency_key,request_hash,status,reservation_id,confirmation_code,"
                        + "payment_reference,response_snapshot,created_at,updated_at FROM public_booking_receipts "
                        + "WHERE idempotency_key=?",
                (row, index) -> new PublicBookingReceipt(row.getString("idempotency_key"), row.getString("request_hash"),
                        PublicBookingReceipt.Status.valueOf(row.getString("status")), row.getObject("reservation_id", UUID.class),
                        row.getString("confirmation_code"), row.getString("payment_reference"), row.getString("response_snapshot"),
                        row.getTimestamp("created_at").toInstant(), row.getTimestamp("updated_at").toInstant()), key)
                .stream().findFirst();
    }

    public void insert(PublicBookingReceipt receipt) {
        jdbc.update("INSERT INTO public_booking_receipts(idempotency_key,request_hash,status,reservation_id,"
                        + "confirmation_code,payment_reference,response_snapshot,created_at,updated_at) "
                        + "VALUES (?,?,?,?,?,?,CAST(? AS jsonb),?,?)",
                receipt.idempotencyKey(), receipt.requestHash(), receipt.status().name(), receipt.reservationId(),
                receipt.confirmationCode(), receipt.paymentReference(), receipt.responseSnapshot(),
                Timestamp.from(receipt.createdAt()), Timestamp.from(receipt.updatedAt()));
    }

    public boolean matchesCompletedReservation(PublicBookingReceiptResult result) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM reservations "
                        + "WHERE id=? AND confirmation_code=? AND status='CONFIRMED' AND currency='GTQ')",
                Boolean.class, result.reservationId(), result.confirmationCode()));
    }
}

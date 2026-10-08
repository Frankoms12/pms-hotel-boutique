package com.pms.hotelboutique.backend.modules.reservations.application;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** Receipt identity and J3's already calculated hash; never contains the Guest payload. */
public record PublicBookingReceiptRequest(String idempotencyKey, String requestHash) {
    public PublicBookingReceiptRequest {
        if (idempotencyKey == null || idempotencyKey.isBlank()
                || !StandardCharsets.UTF_8.newEncoder().canEncode(idempotencyKey)
                || idempotencyKey.codePointCount(0, idempotencyKey.length()) < 8
                || idempotencyKey.codePointCount(0, idempotencyKey.length()) > 128
                || idempotencyKey.codePoints().anyMatch(Character::isISOControl)
                || requestHash == null || !requestHash.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("a valid opaque key and J3 SHA-256 hash are required");
        }
    }

    /** Hash collisions only serialize extra work; the full key remains the database identity. */
    public long lockId() {
        try {
            var hash = MessageDigest.getInstance("SHA-256");
            hash.update("PUBLIC_BOOKING_LOCK_V1".getBytes(StandardCharsets.UTF_8));
            byte[] key = idempotencyKey.getBytes(StandardCharsets.UTF_8);
            hash.update(ByteBuffer.allocate(Integer.BYTES).putInt(key.length).array());
            hash.update(key);
            return ByteBuffer.wrap(hash.digest()).getLong();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required", exception);
        }
    }
}

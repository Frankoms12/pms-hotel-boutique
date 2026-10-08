package com.pms.hotelboutique.backend.modules.reservations.application;

/** Approved booking codes only; protocol mapping belongs to J6. */
public class PublicBookingException extends RuntimeException {
    public enum Code { PRICE_CHANGED, NO_AVAILABILITY, PAYMENT_DECLINED, BOOKING_FAILED }
    private final Code code;

    public PublicBookingException(Code code) { this(code, null); }
    public PublicBookingException(Code code, Throwable cause) {
        super(code.name(), cause);
        this.code = code;
    }
    public Code code() { return code; }
}

package com.pms.hotelboutique.backend.modules.reservations.application;

/** Contract error only; HTTP translation belongs to J6. Never contains guest data. */
public class PublicBookingValidationException extends RuntimeException {
    public enum Code { INVALID_REQUEST, INVALID_DATE_RANGE, PROPERTY_NOT_FOUND }

    private final Code code;

    public PublicBookingValidationException(Code code) {
        super(code.name());
        this.code = code;
    }

    public Code code() { return code; }
}

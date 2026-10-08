package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.UUID;

/** Booking responsibility only; does not imply occupancy or expose contact/document data. */
public record ResponsibleGuestView(UUID profileId, String firstName, String lastName) { }

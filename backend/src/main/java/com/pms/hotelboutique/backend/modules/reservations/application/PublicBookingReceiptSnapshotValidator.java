package com.pms.hotelboutique.backend.modules.reservations.application;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Restricts stored JSON to the approved public response; no Guest or card fields. */
final class PublicBookingReceiptSnapshotValidator {
    private PublicBookingReceiptSnapshotValidator() { }

    static void validate(ObjectMapper json, PublicBookingReceiptResult result) {
        try {
            JsonNode root = json.readTree(result.responseSnapshot());
            fields(root, Set.of("reservationId", "confirmationCode", "status", "currency", "totalMinor", "payment", "stays"));
            require(identifier(root, "reservationId").equals(result.reservationId()));
            require(text(root, "confirmationCode").equals(result.confirmationCode()));
            require("CONFIRMED".equals(text(root, "status")));
            require("GTQ".equals(text(root, "currency")));
            require(root.get("totalMinor").isIntegralNumber() && root.get("totalMinor").canConvertToLong());
            JsonNode payment = root.get("payment");
            fields(payment, Set.of("provider", "status", "reference"));
            require("SIMULATED".equals(text(payment, "provider")));
            // J2 approval selects APPROVED as the sole public booking success state.
            require(PaymentResult.Status.APPROVED.name().equals(text(payment, "status")));
            require(text(payment, "reference").equals(result.paymentReference()));
            JsonNode stays = root.get("stays");
            require(stays.isArray() && !stays.isEmpty());
            for (JsonNode stay : stays) {
                fields(stay, Set.of("reservationStayId", "roomTypeId", "roomId", "arrival", "departure"));
                identifier(stay, "reservationStayId");
                identifier(stay, "roomTypeId");
                require(stay.get("roomId").isNull());
                require(LocalDate.parse(text(stay, "arrival")).isBefore(LocalDate.parse(text(stay, "departure"))));
            }
        } catch (RuntimeException exception) {
            // Do not expose malformed JSON, Guest data or technical parser messages.
            throw new IllegalArgumentException("receipt snapshot must match the approved public booking response");
        }
    }

    private static void fields(JsonNode node, Set<String> expected) {
        require(node != null && node.isObject());
        var actual = new HashSet<String>();
        node.properties().forEach(entry -> actual.add(entry.getKey()));
        require(expected.equals(actual));
    }

    private static String text(JsonNode node, String name) {
        JsonNode value = node.get(name);
        require(value != null && value.isString() && !value.asText().isBlank());
        return value.asText();
    }

    private static UUID identifier(JsonNode node, String name) { return UUID.fromString(text(node, name)); }

    private static void require(boolean valid) {
        if (!valid) { throw new IllegalArgumentException("invalid receipt snapshot"); }
    }
}

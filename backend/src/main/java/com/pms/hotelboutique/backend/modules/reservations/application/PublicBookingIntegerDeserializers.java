package com.pms.hotelboutique.backend.modules.reservations.application;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.deser.std.StdDeserializer;

/** Exact numeric input for this DTO only; never truncates quantities or minor units. */
public final class PublicBookingIntegerDeserializers {
    private PublicBookingIntegerDeserializers() { }

    public static final class Quantity extends StdDeserializer<Integer> {
        public Quantity() { super(Integer.class); }

        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) {
            return switch (parser.currentToken()) {
                case VALUE_NUMBER_INT -> parser.getIntValue();
                case VALUE_NUMBER_FLOAT -> {
                    try { yield parser.getDecimalValue().intValueExact(); }
                    catch (ArithmeticException exception) {
                        yield context.reportInputMismatch(Integer.class, "quantity must be an exact Integer");
                    }
                }
                default -> context.reportInputMismatch(Integer.class, "quantity must be a JSON number");
            };
        }
    }

    public static final class ClientTotal extends StdDeserializer<Long> {
        public ClientTotal() { super(Long.class); }

        @Override
        public Long deserialize(JsonParser parser, DeserializationContext context) {
            return switch (parser.currentToken()) {
                case VALUE_NUMBER_INT -> parser.getLongValue();
                case VALUE_NUMBER_FLOAT -> {
                    try { yield parser.getDecimalValue().longValueExact(); }
                    catch (ArithmeticException exception) {
                        yield context.reportInputMismatch(Long.class, "clientTotalMinor must be an exact Long");
                    }
                }
                default -> context.reportInputMismatch(Long.class, "clientTotalMinor must be a JSON number");
            };
        }
    }
}

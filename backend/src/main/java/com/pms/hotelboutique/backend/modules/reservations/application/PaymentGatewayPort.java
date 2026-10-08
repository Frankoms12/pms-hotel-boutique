package com.pms.hotelboutique.backend.modules.reservations.application;

/**
 * Public booking's local simulated payment boundary. The caller supplies the
 * authoritative recalculated total, never card or Guest data. Implementations
 * used inside InventoryAdmissionPort callbacks must have no external effects,
 * independent transactions, connections or asynchronous work. A real gateway
 * requires a separately approved orchestration contract.
 */
public interface PaymentGatewayPort {
    PaymentResult pay(PaymentRequest request);
}

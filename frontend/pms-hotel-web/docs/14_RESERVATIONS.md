# 14 — Reservations

Owner: WEB-3.
Dependencias: WEB-4 Availability/Folio; WEB-2 account history.

## Estructura
Reservation -> ReservationStay[] -> ReservationGuest[].

## Flujos

### Create/booking
Una reserva puede ser guest/auth/multi-room.

### Cancellation
Policy -> penalty/refund -> cancel -> release -> audit.

### No-show
Cutoff/policy -> allowed charge -> NO_SHOW -> release -> Night Audit.

### Waitlist
Availability found -> revalidate -> confirm -> waitlist converted.

### Room Move
Preserve Stay/Folio.
Room assignment changes.
HK updates.

### Extension
Revalidate availability/rate.
Update departure/calendar/inventory.

### Cross-property rebooking
Preview:
- rate confirmation;
- policy confirmation;
- destination availability revalidated.

Apply only when all gates PASS.
Source preserved if destination commit fails.

## UI
No inventar estado final antes de respuesta real.

## E2E ownership
E2E 06–10 y rebooking-related flows.


## STAFF-RESERVATIONS-READ-01 — Listado/detalle real, 2026-10-08

Contrato de lectura [Backend49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md).
Staff `/reservas` y `/reservas/[reservationId]` consumen `/api/staff/reservations`
independientemente del flag de mocks; cookies Staff/refresh existente, scope
PROPERTY autorizado y permisos Backend revalidados. DTO camelCase real separado
del contrato provisional; mapper puro hacia Domain nullable, hooks validan IDs.
UI de José reutilizada: código confirmado, origen, responsable GuestProfile y N
stays con room nullable; headers históricos sin stays válidos. Sin ocupación,
contacto, solicitudes, política o finanzas inventadas; datos y acciones sin soporte
se ocultan/deshabilitan. Receipt financiero no expuesto ni APPROVED interpretado
como captura. No asignación física nueva. Estado COMPLETADA: aceptación/DoD PASS
y QA manual aplicable con mocks=false confirmado por Alan el 2026-10-08.

El gate manual/E2E de esta lectura usa únicamente
`NEXT_PUBLIC_USE_MOCK_API=false`, conforme al contrato49. Mocks=true no es gate
manual ni modo de integración real; se conservan los tests técnicos de boundaries.
El caso manual de Staff autenticado sin RESERVATION_MANAGE permanece
NO EJECUTABLE por falta de fixture, sin atribuir PASS ni FAIL manual.

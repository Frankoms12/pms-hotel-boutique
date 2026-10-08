# F14.2 — Cuentas por cobrar y Direct Bill

**Estado:** BORRADOR — no aprobado; implementación PENDIENTE de DoR.
**Owner propuesto:** Juan / BD3.
**Base inspeccionada:** `origin/main` en `02bd91b`.

Este documento registra el alcance de F14.2 y las decisiones necesarias para
cerrar su contrato. No establece reglas de crédito, aging, autorización,
transiciones ni API.

## Capacidades existentes

- `Company` y `companies` son property-scoped y contienen identidad/contacto;
  no modelan acuerdo de crédito, plazo ni aprobación Direct Bill.
- `Folio.Type.COMPANY` ya existe. `Folio` no tiene un vínculo persistente a
  `Company`.
- El saldo de un Folio se deriva de `FolioMovement`. Los movimientos son
  append-only y se corrigen con compensaciones.
- La creación/enlace comercial de folios MASTER pertenece a BD3. El ciclo
  financiero de Folio/Payments ahora pertenece a BD2; BD3 no duplicará su
  ledger ni sus servicios de escritura.
- No hay entidades, servicios ni persistencia específicos de cuentas por cobrar.

## Alcance propuesto

1. Acuerdo Direct Bill por Company y Property, con crédito y aprobación según
   reglas de negocio que todavía deben confirmarse.
2. Asociación de la empresa pagadora al folio COMPANY mediante la frontera
   acordada con BD2.
3. Saldos y aging de cuentas por cobrar sobre la fuente financiera confirmada,
   con property scope explícito.
4. Auditoría e idempotencia en cambios y efectos financieros. Ningún movimiento
   financiero existente se actualizará ni eliminará.

No incluye pagos externos, invoices fiscales, posting de promociones/rewards,
compras ni endpoints REST no confirmados.

## Decisiones requeridas para aprobar el contrato

| Tema | Debe confirmarse |
| --- | --- |
| Acuerdo de crédito | Campos, moneda, límite, vigencia, plazo y tratamiento de cambios/revocación. |
| Aprobación | Actor autorizado, condiciones, evidencia, excepciones y efecto de superar el límite. |
| Folio COMPANY | Cardinalidad y reglas del vínculo Company–Folio; autoridad de escritura y SPI con BD2. |
| Fuente del saldo | Si AR se deriva del Folio existente o requiere una proyección/ledger propio; conciliación y compensaciones. |
| Aging | Fecha de corte, fecha de vencimiento, zona/fecha operativa y límites de cada tramo. |
| Autorización Staff | Reutilizar `COMMERCIAL_MANAGE` existente o proponer otro permiso con BD1. No agregar permisos en esta fase. |
| Operaciones | Lecturas/escrituras, consistencia, idempotency key, errores y contrato interno; no asumir HTTP. |

Las reglas globales exigen acuerdo, property, crédito y aprobación para Direct
Bill. `FP-D04` sigue pendiente y trata saldo/credit balance/direct bill y
transiciones de Folio. `BD2-FP-003` (escritura de Folio) también está pendiente.
Esas dependencias deben resolverse o separarse formalmente antes de afirmar que
un posting está autorizado.

## DoR / DoD

**DoR:** decisiones de la tabla aprobadas por la autoridad correspondiente;
frontera BD2–BD3 y dependencias registradas en `AlanPlan.md`; permiso/scope
confirmados; aceptación, archivos y pruebas definidos.

**DoD de contrato:** propuesta y aprobación separadas; reglas, autorización,
scope, source of balance, aging, auditoría, idempotencia y responsabilidades
documentados sin decisiones implícitas.

**DoD de código:** queda pendiente hasta que el contrato esté aprobado. Incluirá
pruebas PostgreSQL de scope, concurrencia/idempotencia, ledger append-only,
upgrade Liquibase, suite `./mvnw -B verify` en Java 21/PostgreSQL 17 y
`git diff --check`.

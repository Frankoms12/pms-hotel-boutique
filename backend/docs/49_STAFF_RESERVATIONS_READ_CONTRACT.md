# STAFF-RESERVATIONS-READ-01 — Lectura Staff de reservas persistidas

Estado: COMPLETADA; aceptación/DoD PASS y QA manual aplicable confirmado por Alan
el 2026-10-08 con NEXT_PUBLIC_USE_MOCK_API=false. Autorización:
solicitud de Alan del 2026-10-08 para conectar listado/detalle Staff a PostgreSQL.
Owner de integración: Alan; revisión colaborativa: Juan (BD3) y José (UI Web).
Fuentes: [C2 aprobado](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md),
[scope](../../docs/05_PROPERTY_SCOPE.md), ReservationQueryService y modelos BD3.
Se reutiliza RESERVATION_MANAGE de C2 (RECEPCION, GERENCIA, SUPER_ADMIN), sin
permisos, roles ni facultades financieras nuevos. Esta entrega no aprueba las
otras filas propuestas de [BE-014A](21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md).

## HTTP Backend y BFF

| Operación | Backend | Browser BFF | Respuesta |
| --- | --- | --- | --- |
| Listado | GET `/api/v1/reservations?propertyId={uuid}` | GET `/api/staff/reservations?propertyId={uuid}` | 200 `StaffReservation[]`, incluido `[]` |
| Detalle | GET `/api/v1/reservations/{reservationId}?propertyId={uuid}` | GET `/api/staff/reservations/{reservationId}?propertyId={uuid}` | 200 `StaffReservation` |

Ambas exigen Staff activo y RESERVATION_MANAGE, revalidación de permisos y
membership actual mediante StaffAuthService/StaffAuthorizationService, y
PropertyScopeResolver antes de consultar. Solo PROPERTY explícito: sin scope
global ni fallback ALL_PROPERTIES. Guest Bearer y cookie Guest no habilitan estas
lecturas. ReservationQueryService aplica scope en SQL antes de cargar hijos o
responsable; RoomType/Room también se consultan con scope SQL.

Parámetros faltantes, inválidos, repetidos o desconocidos → 400; Staff ausente,
inválido o revocado → 401; permiso/property no autorizados → 403; detalle ausente
o de otra property dentro del scope solicitado autorizado → mismo 404.
Backend no revela errores internos; BFF conserva 400/401/403/404, convierte fallos
de transporte/Backend/DTO a 503 y no reenvía cuerpos de error upstream.
Respuestas de datos: `Cache-Control: private, no-store`. GET no requiere clave
idempotente ni genera eventos de mutación/audit. No endpoints de escritura.

Listado sin paginación HTTP: orden createdAt descendente, reservationId ascendente;
filtros/búsqueda/paginación visual existentes permanecen en Web. Stays ordenadas
arrival/stayId. Limitación: la proyección consulta hijos/catálogos por reserva;
volúmenes grandes requieren otro incremento de paginación/optimización.

## DTO real (campos presentes; null explícito donde corresponde)

```json
{
  "reservationId": "11111111-1111-1111-1111-111111111111",
  "propertyId": "22222222-2222-2222-2222-222222222222",
  "confirmationCode": "EXAMPLE-ONLY",
  "status": "CONFIRMED",
  "source": "WEB_DIRECTA",
  "sourceReference": null,
  "currency": "GTQ",
  "createdAt": "2026-10-08T10:00:00Z",
  "responsibleGuest": null,
  "stays": [{
    "stayId": "44444444-4444-4444-4444-444444444444",
    "arrival": "2026-11-01",
    "departure": "2026-11-03",
    "status": "RESERVED",
    "roomType": {"roomTypeId": "55555555-5555-5555-5555-555555555555", "code": "DELUXE", "name": "Deluxe"},
    "room": null
  }]
}
```

Reservation status: PENDING/CONFIRMED/CANCELLED. Stay status:
RESERVED/IN_HOUSE/CHECKED_OUT/CANCELLED/NO_SHOW; no convertirlo en estado de padre.
`source`/`sourceReference` nullable. `responsibleGuest` nullable o
`{profileId, firstName, lastName}` del booking GuestProfile. No equivale a
GuestAccount ni a ocupantes. `room` nullable o `{roomId, code}` real.
`stays: []` válido para headers históricos; no inventar fechas ni habitación.
No teléfono, email, documentos, adultos/niños, solicitudes, políticas ni
finanzas en este contrato. El total/reference del booking receipt no se expone:
su autorización financiera no forma parte de esta entrega. APPROVED no acredita
captura y no se transforma en PAID/NO_CAPTURE/BALANCE.

## Web y sesión

StaffReservationsWorkspace usa siempre el BFF real, con ambos valores del flag
mock; los adapters provisionales siguen aislados para sus tests/consumidores.
BFF obtiene únicamente pms_staff_access HttpOnly y reenvía Bearer server-side.
El refresh conserva su cookie con path `/api/auth/staff/refresh`: la infraestructura
Web comparte una rotación Staff entre sesión y lecturas; 401 → refresh → un retry;
403/404/5xx no refrescan, un segundo401 termina. Sin tokens en JavaScript/storage.

Service devuelve DTO; mapper puro valida campos, UUID, estados, fechas y duplicados,
produce DomainMappingError y Domain nullable sin valores mock; hooks validan
property/reservation del resultado. UI de José conserva componentes/layout/CSS,
presenta confirmationCode con navegación por reservationId, responsable y N stays.
KPIs/alertas/finanzas sin fuente se ocultan; creación, cancelación, asignación,
move/extension no se habilitan sobre lecturas reales. Sin asignación física nueva.

## QA manual y cierre

### Decisión de cierre aprobada — 2026-10-08

El QA manual/E2E obligatorio se ejecuta únicamente con
`NEXT_PUBLIC_USE_MOCK_API=false`, sobre el stack real y una reserva pública ya
persistida en PostgreSQL. `NEXT_PUBLIC_USE_MOCK_API=true` no es gate manual ni
modo de integración real para esta tarea. Su comportamiento no se clasifica como
FAIL de QA manual ni exige repetir el recorrido para cerrar este incremento.
Esta decisión sustituye el requisito previo de probar ambos flags manualmente.

Se conservan los tests técnicos existentes que protegen la selección del BFF
real con ambos flags, la exclusión de listado/detalle de MSW y los demás mocks.
Los tests y el smoke automatizado con mocks habilitados son evidencia técnica;
no sustituyen el QA manual/E2E obligatorio con mocks deshabilitados.
Alan confirmó el QA manual aplicable PASS el 2026-10-08; estado EN_QA → COMPLETADA.

### Aceptación manual confirmada por Alan — 2026-10-08

Entorno del gate: `NEXT_PUBLIC_USE_MOCK_API=false`, reserva real persistida.
Resultados reportados por Alan; no son una nueva ejecución del agente.

| Caso manual | Resultado confirmado |
| --- | --- |
| Listado Staff real → PostgreSQL | PASS |
| Detalle de reserva real y stays | PASS |
| Property fuera de scope → 403 | PASS |
| propertyId ausente/inválido → 400 | PASS |
| Reserva inexistente → 404 | PASS |
| Anónimo → 401 | PASS |
| Guest separado de Staff → 401 | PASS |
| Refresh Staff real | PASS |
| Datos ausentes/financieros no inventados | PASS |

Aceptación/DoD: **PASS** conforme a Backend AGENTS y al «Control operativo, DoR
y DoD comunes» de [AlanPlan](AlanPlan.md): evidencia técnica previa PASS y QA
manual aplicable del owner confirmado. No hay regla vigente que exija ejecutar
manualmente el caso sin RESERVATION_MANAGE para este cierre; su limitación se
conserva abajo, sin atribuirle PASS manual. Mocks=true permanece fuera del gate.
No se requiere crear fixtures ni alterar permisos. Sin commit/push/merge.

### Recorrido obligatorio con mocks deshabilitados

1. Iniciar Staff real con RESERVATION_MANAGE en `/acceso`, seleccionar property;
   abrir `/reservas` y una reserva pública previamente persistida en PostgreSQL.
2. Verificar código/UUID/status/origen/fechas/tipo/responsable contra DB; N stays
   independientes; room null indica sin asignar; header histórico sin stays no falla.
3. Cambiar property: no conservar filas/detalle anterior. Sin reservas: empty;
   recurso ajeno en property autorizada:404; property no autorizada:403.
   propertyId ausente/inválido:400; reserva inexistente:404.
4. Expirar access conservando refresh: restauración acotada; revocar Staff:401.
   Guest coexistente no sustituye Staff ni pierde su sesión al fallar la lectura.
   Acceso anónimo o sesión únicamente Guest a endpoints Staff:401.
5. Verificar ausencia de adultos,
   niños, teléfono, solicitudes, políticas, captura/balance y acciones de escritura.

### Caso manual no ejecutable con las fixtures actuales

Staff autenticado sin RESERVATION_MANAGE → 403 esperado en listado y detalle.
Estado manual: **NO EJECUTABLE**, por falta de una fixture Staff activa con login
real y sin ese permiso. No declarar PASS ni FAIL manual para este caso; la
cobertura automatizada de autorización se registra por separado y no acredita
su ejecución manual. Cobertura técnica existente: método
`permissionsAndMembershipAreLiveAndUnauthorizedPropertyIs403` de
StaffReservationReadIntegrationTests, incluido en la evidencia focalizada y
full verify PASS registrada en AlanHandoff. Esta actualización no crea ni
modifica fixtures ni permisos.

Pruebas automatizadas/entorno/resultados: [AlanHandoff](AlanHandoff.md), entrada
STAFF-RESERVATIONS-READ-01. OpenAPI generado y mappings se verifican juntos;
no hay migraciones ni dependencias añadidas.

# Habitaciones Staff: ocupación y filtros

Incremento frontend autorizado sobre `/staff/habitaciones`; owner WEB-3, reviewer WEB-4. Relacionado con la visualización de estadías por habitación/fecha de IMP-WEB-0308 y con el tablero existente. No cierra Calendar/Gantt ni incorpora housekeeping. La fila del backlog requiere scope explícito, selección a detalle, filtros/fechas y representación por Stay; este incremento reutiliza esos límites sin editar el XLSX.

## Comportamiento

- Fecha inicial: día local del timezone de la propiedad autorizada en la sesión. Sin timezone válido no se inventa una fecha; el usuario puede elegirla. `Hoy` usa nuevamente ese timezone.
- Ocupación se presenta como una proyección de estadías asignadas para `[arrival, departure)`: RESERVED → Reservada; IN_HOUSE → Ocupada; ninguna → Libre de estadías. Son etiquetas de UI, no estados nuevos de Room ni una consulta ATS. Una consulta histórica/futura usa las fechas y el estado de viaje disponible, no reconstruye historial de check-in/check-out.
- OOO/OOS/ACTIVE siguen siendo estados operativos independientes. Libre de estadías no significa vendible, lista para check-in ni limpia. OOS no descuenta ATS.
- Padre cancelado, waitlist y estadías CANCELLED/NO_SHOW/CHECKED_OUT no aparecen como ocupación. NO_SHOW_PENDING conserva sus estadías RESERVED hasta resolverlas en el escenario provisional.
- Estadías sin habitación se muestran aparte con enlace a su reserva. No se asigna un número arbitrariamente. Más de una estadía en una habitación se muestra como conflicto; no se oculta bajo una sola etiqueta.
- Filtros combinables: ocupación, operación, tipo, piso y búsqueda por número/tipo (sin sensibilidad a acentos). Limpiar conserva la fecha. Contadores de ocupación reflejan todo el inventario físico de la propiedad en esa fecha, antes de filtros.
- Detalle: huésped, fechas, estado de viaje y enlace a la reserva, conservando las acciones operativas existentes. Carga/error/datos ausentes no se presentan como habitaciones libres.

## Adaptador y límites de integración

Service → DTO → Mapper → Domain → Hook → UI. `GET /__mock/staff-room-occupancy/{propertyId}?date=YYYY-MM-DD` es exclusivamente MSW local y **PROVISIONAL**, no una API de Backend. Se bloquea cuando mocks están desactivados. El backend deberá confirmar consulta scoped y autorizada de asignaciones/estados de estadías antes de conectar este panel a datos reales.

El escenario usa el mismo catálogo, las reservas seed y las creadas/asignadas en Staff. Fechas seed: el 28 de agosto de 2026 permite ver reservas asignadas; el 30 muestra además una estadía pendiente de asignar. No se cambia una estadía RESERVED a IN_HOUSE para aparentar una ocupación; los casos IN_HOUSE se verifican con fixtures de prueba. Crear reservas o asignar habitaciones invalida la consulta; editar catálogo invalida inventario y ocupación. Refresco manual y al volver a la pantalla consultan nuevamente. Cerrar sesión elimina sus caches. No se crean mutaciones de check-in ni se toca Backend.

## Pruebas

Mapper: fechas reales, scope/fecha exactos, IDs únicos, estados de viaje y conflicto. Service/MSW: checkout exclusivo, cancelación del padre, estados terminales, IN_HOUSE, otras propiedades, reserva sin asignar → asignada, OOO/OOS independientes y transporte desactivado en modo real. UI: filtros combinados, limpiar sin perder fecha, enlaces y fallo sin falsa disponibilidad. QA navegador: fecha, filtros, reserva asignada y vista móvil.

Validación del incremento: 17 archivos / 93 tests PASS (Rooms, integración MSW de ocupación, asignación inicial y regresión del provider Staff); lint, typecheck, build y `git diff --check` PASS. Chrome: filtros combinados, checkout exclusivo en fixtures, enlaces y recorrido crear → asignar 101 → consultar tablero; sin excepciones ni consultas al BFF Staff real. Vista verificada a 320, 390, 540, 768, 1024 y 1440 px sin desbordamiento. Los casos IN_HOUSE y conflictos se verificaron en tests, sin alterar estados de los ejemplos existentes para simular un check-in.

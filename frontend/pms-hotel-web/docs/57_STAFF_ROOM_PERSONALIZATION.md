# Personalización de habitaciones y ficha pública

Incremento frontend autorizado en `/staff/habitaciones` → Administrar inventario. Reutiliza el catálogo existente; owner WEB-3, reviewer WEB-4. Referencia visual y semántica: Public 01 y la fila IMP-WEB-0104 (RoomType, galería, datos, amenidades; no expone Room físico). No declara terminado ese backlog ni cambia contratos de Backend.

## Distribución de datos

- **Room física:** número/código, tipo, piso/nivel y notas internas. Las notas no se incluyen en la vista previa pública. Editar conserva ID y RoomType; no reasigna reservas ni altera ocupación/OOO/OOS.
- **RoomType:** nombre/código, capacidad, camas, área en m², vista, descripción, categoría, amenidades y fotografías. Son datos compartidos. Editar el tipo indica cuántas habitaciones usan esa ficha. No modifica snapshots comerciales/financieros de reservas existentes.
- **RatePlan:** precio, comidas/servicios incluidos y cancelación. No se crean ni modifican desde este formulario. Crear un tipo sin tarifa no inventa una oferta reservable.

Nueva habitación permite elegir un tipo existente y consultar su ficha, o crear un tipo personalizado junto con una unidad física. El cambio local valida ambos registros antes de insertar; un código duplicado o dato inválido no deja tipos huérfanos. Se mantienen los datos al alternar modos o fallar el guardado. También se amplían Nuevo tipo/Editar tipo y la edición de piso/notas de una unidad existente.

La vista previa comparte los campos, jerarquía y lenguaje visual de Public 01: foto, nombre, capacidad/camas/m², vista, descripción y amenidades. Los campos opcionales ausentes se muestran como pendientes, sin fabricar características. Las categorías reutilizan DELUXE/SUITE/SUPERIOR del catálogo público; no son estados operativos ni reglas nuevas de Backend.

## Fotografías y límites locales

Se pueden seleccionar archivos JPG/PNG/WebP o agregar referencias HTTPS/activos `/images/`. Hasta 5 fotos y 2 MB por archivo; son límites del editor frontend, pendientes de política definitiva de contenido. Es posible quitar fotos y elegir portada. Se rechazan SVG, esquemas ejecutables, credenciales embebidas y archivos vacíos/demasiado grandes.

En una ficha editable sin fotografías, el recuadro «Agrega fotografías del tipo» abre el mismo selector de archivos del formulario; la foto seleccionada aparece en la vista previa. Es accesible con teclado y queda deshabilitado durante la lectura o guardado. La ficha heredada de un tipo existente conserva su vista previa de solo lectura.

FileReader genera referencias raster para el escenario local. **No se suben archivos a un servidor ni se garantiza persistencia al recargar.** Tampoco se envían a Backend, publican URLs persistentes o se crea infraestructura de almacenamiento. Cambiar fotos no modifica cuentas ni tarifas.

## Contrato e integración pendientes

El transporte sigue siendo `POST /__mock/staff-room-catalog/{propertyId}`, **PROVISIONAL** y únicamente MSW. Los DTO base conservan identidad/código/timestamps del contrato confirmado; `presentation`, `floor` e `internalNotes`, y la creación combinada `newType`, son extensiones del escenario frontend, no campos/endpoints confirmados de Backend. En modo real el editor sigue cerrado hasta conectar el catálogo; no se envían estos campos a APIs existentes por suposición.

Public 01 actualmente usa otro escenario público (property/IDs propios) o las ofertas reales de Backend. **No se mezclan IDs ni se publica automáticamente allí lo creado en Staff.** Esta tarea prepara la ficha y su vista previa; el responsable de integración deberá confirmar cómo guardar y leer metadata de RoomType, piso/notas, fotos y tarifas antes de publicar un producto real. No se altera el login ni la lógica pública que está conectando BD1.

Los ejemplos editoriales del catálogo Staff son ficticios y reutilizan fotos/amenidades del diseño público; no confirman características del hotel real. Para tipos existentes con tarifa local, las consultas nuevas usan la capacidad configurada; la admisión local vuelve a revisar cambios posteriores a una cotización. Tipos nuevos sin RatePlan no aparecen como opciones de reserva. Se invalidan consultas de catálogo, habitaciones, ocupación, cotizaciones y asignación después de guardar.

## Validación requerida

Model/mapper: validación de dimensiones, texto, fotos, scope e identidad. MSW: creación conjunta, rechazo sin inserciones parciales, códigos únicos, privacidad de notas, aislamiento de propiedad y capacidad actual al reservar. UI: herencia, edición, vista previa, conservación de borrador, fotos y primer campo inválido. Navegador: formulario/preview/guardado/piso y responsive. El modal usa una clase opcional propia con ancho y scroll; otros modales conservan su apariencia.

Validación realizada: 21 archivos / 119 tests PASS (Rooms, ocupación/personalización MSW, creación y asignación Staff, modal compartido). Lint, typecheck, build y `git diff --check` PASS. Chrome: herencia de un tipo existente, creación de tipo+habitación con foto raster seleccionada localmente, validación/foco, vista previa sin notas privadas, guardado y edición de piso preservando IDs. Ventana dentro del viewport y sin desbordamiento a 320, 390, 540, 768, 1024 y 1440 px; sin excepciones de ejecución ni llamadas al BFF Staff real.

Corrección del acceso desde el recuadro: 9 tests del catálogo/editor de fotografías PASS; lint, typecheck y build PASS. Chrome confirmó la apertura del selector nativo al hacer clic en el recuadro, carga de un WebP, vista previa y guardado; se repitió la comprobación responsive en los seis anchos anteriores sin excepciones.

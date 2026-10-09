# 06-decisions.md - Decisiones arquitectonicas

## ADR-0001 - Informes como tablero operativo

### Fecha
2026-05-07

### Estado
Aceptada

### Contexto
La usuaria necesita vistas claras para decidir que cobrar, imprimir y entregar. Mostrar pedidos o libros ya cerrados agrega ruido operativo.

### Decision
Los informes operativos muestran trabajo pendiente:

- `Sin pagar` se basa en `saldo > 0`.
- `Imp. sin pagar` se basa en `estadoImpresion = 'Impreso'` y `saldo > 0`.
- `Faltan imprimir` se basa en `estadoImpresion = 'Pendiente'`.
- `Sin entregar` se basa en pedidos impresos con entrega pendiente.
- El avance por libro oculta libros 100% cerrados o sin pedidos.
- El filtro de libro en informes lista solo libros con resultados para la vista actual.

### Consecuencias
La pantalla de informes queda mas enfocada en accion inmediata. La informacion historica cerrada deja de aparecer en estas vistas y, si se necesita auditar historial, deberia resolverse con una vista separada.

## ADR-0002 - Tamaño de impresion A4 / A5 con precio por tamaño

### Fecha
2026-10-08

### Estado
Aceptada

### Contexto
Los libros se imprimen en A4 y en A5, con precios distintos. El sistema tenia un unico `libros.precio` y el tamaño se anotaba a mano en `pedidos.observaciones` (por ejemplo `(A4)`), sin poder filtrarse.

### Decision
- Enum `public.tamanio_impresion ('A4', 'A5')`.
- `libros.precio` se renombra a `precio_a5` y se agrega `precio_a4`. Corregido por el usuario el mismo dia: el precio existente era el A5, porque los pedidos se cargaban con el precio del libro y la mayoria son A5. A los que pedian A4 se les subia el precio a mano.
- `precio_a4` es nullable en la base porque los libros existentes no lo tienen. La app exige ambos precios al crear o editar un libro. `ActualizarLibroInput` admite `null` solo para poder activar o desactivar un libro viejo sin forzar la carga del precio.
- `pedidos.tamanio` es `not null` y sin default: cada alta declara su tamaño. La migracion deja todos los pedidos existentes en A5. Los A4 de los libros de la cotizacion 2026-10 los detecta ese script (ver ADR-0003). El resto se corrige a mano.
- El precio del pedido se sigue copiando al crearlo (`precio_cobrado`). Cambiar el tamaño de un pedido existente trae el precio vigente del libro para ese tamaño, porque es una accion explicita. El precio sigue siendo editable.
- `TAMANIO_POR_DEFECTO = A5` en la app: es el tamaño de la mayoria de los pedidos. El A4 llegaba marcado como excepcion en las listas.
- El calculo de precio sugerido sigue usando insumos A4 y solo completa el precio A4.

### Consecuencias
- Positivo: el tamaño queda como dato estructurado, filtrable en Pedidos, Informes y Listados, y el precio se resuelve solo segun el tamaño.
- Negativo: el renombre de columna acopla el despliegue. Hay que ejecutar el script y publicar la app nueva juntos, y la app anterior falla entre un paso y el otro.
- Riesgo: mientras un libro no tenga `precio_a4`, el alta A4 pide el precio a mano y la carga masiva A4 se bloquea. Cuando todos los libros lo tengan, se puede pasar `precio_a4` a `not null`.
- Pendiente: `hojas` y el semaforo de toner no distinguen tamaño (ver `08-known-issues.md`).

## ADR-0003 - Dos precios por libro; la cotizacion usa el precio "+15"

### Fecha
2026-10-08

### Estado
Aceptada

### Contexto
La cotizacion de 2026-10 trae cuatro precios por libro: A4 y A5, cada uno para menos de 15 y para 15 o mas. Se implemento una escala automatica por curso (libro + division) con re-precio al cruzar los 15, y en la revision el usuario la descarto: tener cuatro precios por libro confundia.

### Decision
- El libro mantiene dos precios: A4 y A5 (ADR-0002).
- Como precio de cada tamaño se tomo como referencia la columna "+15" de la cotizacion. Los precios definitivos se cargaron a mano en la base y son los que valen.
- El script de la cotizacion actua solo sobre los libros de la cotizacion que esten activos y no modifica sus precios.
- En esos libros el script tambien detecta el tamaño de los pedidos existentes: el precio mas repetido de cada libro se toma como A5, y los pedidos con un precio mayor o con `A4` en observaciones pasan a A4. La deteccion solo corre en libros que todavia no tienen pedidos A4, para que reejecutar el script no confunda un A5 pagado al precio viejo con un A4.
- Despues re-precia segun su tamaño los pedidos con pago Pendiente; pagados y señas no cambian de precio.
- La escala por curso se revirtio por completo: no quedan columnas `precio_*_desde_15` ni logica de umbral.

### Consecuencias
- Positivo: un solo precio por tamaño, simple de leer y de cargar desde el celular.
- Negativo: los cursos chicos pagan el mismo precio que los grandes. Si hace falta diferenciar, se ajusta el precio a mano en el pedido.
- Si en el futuro se retoma una escala, conviene definirla por cotizacion y no como cuatro precios en la ficha del libro.

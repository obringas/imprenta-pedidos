# 07-changelog.md - Memoria de cambios

## [2026-07-29] - Agente: Claude

### Cambios
- Pedidos e informes ahora ignoran los pedidos de libros inactivos.
- La lista de pedidos suma un filtro opcional `Incluir libros inactivos`, visible solo cuando existen pedidos ocultos.
- Los selectores de libro de pedidos ofrecen solo libros activos.
- El formulario de pedido conserva el libro original aunque este inactivo, marcandolo como `(inactivo)`.
- La pantalla de libros suma buscador sin acentos y filtro Activos / Inactivos / Todos con contadores.
- La activacion y desactivacion de un libro pasa a ser optimista, con un switch y bloqueo del boton mientras persiste.
- Las busquedas de alumno en pedidos e informes ignoran acentos.
- Se reparo `estado.utils.spec.ts`, que no compilaba por campos faltantes en el mock, y se agrego `pedidos.store.spec.ts`.

### Motivo
El catalogo acumula muchos libros de ciclos anteriores y solo dos estan vigentes. Los informes y el listado de pedidos mostraban todo junto, lo que hacia dificil leer la operacion real. La pantalla de libros era el cuello de botella para mantener esa distincion desde el celular.

### Archivos afectados
- `src/app/features/informes/state/informes.facade.ts`
- `src/app/features/libros/state/libros.facade.ts`
- `src/app/features/libros/ui/pages/libros-lista.page.ts`
- `src/app/features/pedidos/domain/pedido.model.ts`
- `src/app/features/pedidos/domain/estado.utils.spec.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `src/app/features/pedidos/state/pedidos.store.ts`
- `src/app/features/pedidos/state/pedidos.store.spec.ts`
- `src/app/features/pedidos/ui/components/pedido-form.component.ts`
- `src/app/features/pedidos/ui/pages/pedidos-lista.page.ts`
- `src/app/shared/utils/text-normalizer.ts`
- `src/styles.css`
- `.claude/launch.json`

### Decisiones tomadas
`libroActivo` se deriva en `PedidosFacade.aDetalle` desde el catalogo en memoria y no se persiste: la fuente de verdad sigue siendo `libros.activo` y no hay que tocar el schema ni duplicar el dato en `pedidos`.

Se distinguen dos colecciones. `PedidosStore.pedidosVisibles` respeta el filtro de pantalla y alimenta la lista de pedidos. `PedidosFacade.pedidosDeLibrosActivos` ignora ese filtro y alimenta los informes, que siempre deben mostrar solo el catalogo vigente.

Los pedidos de libros inactivos se ocultan por defecto pero no se vuelven inaccesibles: el filtro opcional evita que la usuaria crea que perdio datos.

Si un pedido apunta a un libro que no esta en el catalogo cargado, se considera activo. Es preferible mostrar un dato de mas que ocultarlo en silencio.

### Validaciones realizadas
- `npm run build`
- `npm test`: 12 de 12 en verde. La suite no compilaba desde antes de este cambio.
- Validacion manual en viewport 375x812 con datos mock: desactivar dos libros baja los pedidos de 6 a 4, recalcula los KPI, saca esos libros de los selectores y los deja fuera de informes. El filtro opcional los restituye. Area tactil del switch medida en 72x62 px.

### Pendientes / Follow-ups
- El estado del buscador y del filtro de la pantalla de libros no se conserva al navegar y volver.

### Cambios
- Se agrego `supabase/pedidos_bajo_el_jacaranda_6b.sql` para dar de alta los 21 pedidos de 6to grado B del libro "Bajo el jacaranda - Margara Averbach".
- Se agrego `supabase/pedidos_2b_707911af.sql` para dar de alta los 20 pedidos de 2do grado B del libro `707911af-3427-4f10-bf44-1a081b01e8f1`.

### Motivo
Cargar por SQL un curso completo sin tener que dar de alta pedido por pedido desde la UI.

### Archivos afectados
- `supabase/pedidos_bajo_el_jacaranda_6b.sql`
- `supabase/pedidos_2b_707911af.sql`

### Decisiones tomadas
Se sigue la convencion de scripts de carga ya usada en el proyecto: insert plano dentro de una transaccion, estados explicitos y division en formato `6B`. El precio se lee de `libros.precio` con un `cross join` en lugar de hardcodearse, replicando lo que hace el formulario al seleccionar un libro.

### Validaciones realizadas
- Verificacion de encoding UTF-8 sin BOM del script.
- Script no ejecutado contra la base: queda a cargo del usuario desde el SQL Editor.

### Pendientes / Follow-ups
- No hay unique constraint en `pedidos (libro_id, alumno)`: reejecutar el script duplica los pedidos. Registrado en `08-known-issues.md`.

## [2026-05-07] - Agente: Codex

### Cambios
- Normalizacion de estructura documental con archivos `01` a `08`.
- Ajuste de informes para separar deuda total, deuda impresa y pendientes operativos.
- `Sin pagar` ahora lista todos los pedidos con saldo pendiente.
- Se agrego `Imp. sin pagar` para pedidos impresos con saldo pendiente.
- `Marcar pagado` desde informes fuerza pago total y deja saldo en cero.
- El avance por libro oculta libros 100% cerrados o sin pedidos.
- El filtro de libro en informes muestra solo libros con resultados para la vista actual.

### Motivo
Hacer que la pantalla de informes funcione como tablero operativo claro: cobrar deuda real, distinguir lo ya impreso pendiente de pago, y ocultar trabajo ya cerrado.

### Archivos afectados
- `src/app/features/informes/state/informes.facade.ts`
- `src/app/features/informes/ui/pages/informes.page.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `docs/CONTEXT.md`
- `docs/prompt_codex_final.md`
- `docs/README.md`
- `docs/01-context.md`
- `docs/02-architecture.md`
- `docs/03-setup.md`
- `docs/04-conventions.md`
- `docs/05-ai-rules.md`
- `docs/06-decisions.md`
- `docs/07-changelog.md`
- `docs/08-known-issues.md`

### Decisiones tomadas
No se cambio el schema de base de datos. Los nuevos informes se derivan desde los pedidos ya cargados en el facade, manteniendo los filtros en la capa de estado de informes.
Se adopto la estructura documental numerada solicitada por `AGENTS.md`, manteniendo referencias heredadas mientras se completa la fusion documental.

### Validaciones realizadas
- `npm.cmd run build`

### Pendientes / Follow-ups
- Fusionar gradualmente documentos heredados en los archivos numerados y moverlos a `docs/_legacy/` cuando se confirme la migracion completa.

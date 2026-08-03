# 07-changelog.md - Memoria de cambios

## [2026-08-02] - Agente: Claude

### Cambios
- Nueva pantalla `/pedidos/carga-masiva`: se elige libro activo y division, se pega la lista de WhatsApp y se crean todos los pedidos juntos.
- El parser limpia numeracion en cualquier formato, emojis, espacios dobles y caracteres invisibles.
- Una nota entre parentesis al final de la linea se guarda como observacion del pedido.
- Paso de previsualizacion: cada alumno se marca `Nuevo`, `Repetido` (aparece dos veces en la lista) o `Ya existe` (ya cargado para ese libro y division). Los dos ultimos vienen destildados y se pueden incluir a mano.
- Alta en lote con una sola escritura, en vez de una por alumno.
- Boton `Carga masiva` en el encabezado de Pedidos.

### Motivo
Los cursos se venian cargando con scripts SQL escritos a mano, uno por curso. Cada lista de WhatsApp traia numeracion irregular, emojis y caracteres invisibles que habia que limpiar manualmente antes de armar el insert.

### Archivos afectados
- `src/app/features/carga-masiva/domain/parsear-lista.util.ts`
- `src/app/features/carga-masiva/domain/parsear-lista.util.spec.ts`
- `src/app/features/carga-masiva/ui/pages/carga-masiva.page.ts`
- `src/app/features/carga-masiva/carga-masiva.routes.ts`
- `src/app/features/pedidos/pedidos.routes.ts`
- `src/app/features/pedidos/data/pedidos.repository.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `src/app/features/pedidos/ui/pages/pedidos-lista.page.ts`
- `src/styles.css`

### Decisiones tomadas
El parser se aisla en un util con tests propios, construidos con las lineas reales que fueron apareciendo en las listas: `1-Oli P`, `1Leonella` sin separador, `10_Marcos`, `32. Mileka  Levy Cein  (A4)` y nombres con word joiner pegado adelante. Un invisible que sobreviva es especialmente danino porque el nombre se ve bien pero no matchea en ninguna busqueda.

Los caracteres invisibles y pictogramas se declaran con escapes Unicode y no como literales, para que se lea que hace cada regex y no dependa del encoding del archivo.

`createMany` hace un solo insert con todas las filas. Postgres lo resuelve como transaccion: o entra el curso completo o no entra ninguno.

La previsualizacion es obligatoria: no se escribe nada hasta confirmar. Como `pedidos` no tiene unique constraint sobre `(libro_id, alumno)`, esta deteccion es la unica defensa real contra cargar dos veces el mismo curso.

La pantalla cuelga de `/pedidos` y no del menu principal. La barra inferior ya tiene 5 items y en 375px un sexto obligaria a recortar los rotulos.

### Validaciones realizadas
- `npm run build` y `npm test` (37 de 37, con 12 casos nuevos del parser).
- Validacion manual en viewport 375x812 pegando una lista real con emojis, numeracion mezclada, un word joiner, un nombre repetido en otra capitalizacion y una linea basura: se reconocieron 10 alumnos, se descarto `---`, se marcaron 1 `Ya existe` y 1 `Repetido`, y se crearon los 8 restantes.
- Verificado tras la carga: division normalizada a mayusculas (`6b` quedo `6B`), precio tomado del libro, estado Pendiente, observacion `A4` preservada y cero caracteres invisibles en los nombres.
- Reejecutar la misma carga marca todo como `Ya existe` y deja el boton deshabilitado en `Crear 0 pedidos`.

## [2026-08-01] - Agente: Claude

### Cambios
- La pantalla de Pedidos suma un filtro por division, disponible en el panel de escritorio y en el de celular.
- El desplegable se arma con las divisiones que existen en los pedidos visibles y se ordena como curso, no alfabeticamente.
- Los pedidos sin division cargada se agrupan bajo la opcion `Sin división`.
- El filtro tiene su chip removible, como el resto.
- `curso.util.ts` se movio de `features/listados/domain/` a `shared/utils/`.

### Motivo
Con varios cursos cargados sobre el mismo libro, filtrar solo por libro devolvia demasiados pedidos.

### Archivos afectados
- `src/app/features/pedidos/domain/pedido.model.ts`
- `src/app/features/pedidos/state/pedidos.store.ts`
- `src/app/features/pedidos/state/pedidos.store.spec.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `src/app/features/pedidos/ui/pages/pedidos-lista.page.ts`
- `src/app/shared/utils/curso.util.ts` (movido)
- `src/app/shared/utils/curso.util.spec.ts` (movido)
- `src/app/features/listados/ui/pages/listado-curso.page.ts`
- `src/app/features/listados/ui/components/editar-alumno-dialog.component.ts`

### Decisiones tomadas
El filtro compara contra el valor crudo de `pedidos.division` en vez de contra grado y division por separado. En esta pantalla alcanza con elegir el curso completo, y evita que un pedido heredado quede fuera del filtro por no poder parsearse.

`curso.util.ts` paso a `shared/utils/`: lo necesitan dos features y la alternativa era que Pedidos importara desde Listados o que se duplicara el criterio de orden.

Los pedidos sin division usan el centinela `DIVISION_SIN_ASIGNAR` para distinguir "no filtrar" de "filtrar los que no tienen division".

Los KPI de la pantalla siguen resumiendo todos los pedidos visibles y no el subconjunto filtrado. Es el comportamiento que ya tenian con los filtros de libro y estado; no se cambio para no alterar una pantalla en uso sin pedirlo.

### Validaciones realizadas
- `npm run build` y `npm test` (25 de 25, con 4 casos nuevos del filtro).
- Validacion manual en viewport 375x812: el desplegable ofrece `3A, 6A, 6B, 10A, Sin división` en ese orden, con `10A` despues de `6B`. Filtrar por `6A` deja los dos pedidos correctos, `Sin división` aisla el pedido sin curso, el chip limpia el filtro y se combina con la busqueda por alumno.

## [2026-07-31] - Agente: Claude

### Cambios
- La tabla del listado por curso se ordena haciendo clic en `Alumno` o en `Grado - División`. Un segundo clic invierte el sentido.
- El orden elegido es el que se exporta al Excel.
- Edicion rapida desde el listado por curso: doble clic en una fila abre un dialogo para corregir alumno y division sin salir de la pantalla.
- Cada fila suma un boton `Editar`, porque en celular no existe el doble clic.
- El campo division muestra en vivo como se va a interpretar el valor (`7 B` se lee como `7B`).

### Motivo
Cuando aparecia un dato mal cargado habia que salir del listado, ir a Pedidos, buscar el pedido y editarlo. Con cargas masivas por SQL los errores de tipeo en nombre y curso son frecuentes.

### Archivos afectados
- `src/app/features/listados/ui/components/editar-alumno-dialog.component.ts`
- `src/app/features/listados/ui/pages/listado-curso.page.ts`
- `src/app/features/listados/domain/curso.util.spec.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `src/styles.css`

### Decisiones tomadas
El orden por curso reutiliza `compararGrados` y `compararDivisiones`, los mismos comparadores que ya poblaban los selectores. Ordenar como texto pondria `10A` antes que `6A`. Cuando dos filas comparten curso, desempata por nombre.

Los encabezados ordenables son `button` dentro del `th`, no un `th` con click: asi funcionan con teclado y el `aria-sort` anuncia el estado a lectores de pantalla.

El dialogo solo expone alumno y division, que es lo que la pantalla muestra y lo que suele venir mal de una carga masiva. Para el resto del pedido sigue estando la pantalla de detalle. `PedidosFacade.corregirDatosDelAlumno` reenvia el resto de los campos sin tocarlos, siguiendo el patron de los `toggle` ya existentes, de modo que precio, estados y montos no se alteran.

El pedido en edicion se resuelve contra el store por id en vez de copiarse, para que el dialogo no quede desincronizado despues de guardar.

### Validaciones realizadas
- `npm run build` y `npm test` (21 de 21).
- Orden verificado con datos sembrados: ascendente por curso da `2B, 6A, 6A, 6B, 10A, Sin grado B`. `10A` queda despues de `6B` y no antes, que es lo que pasaria con orden alfabetico. El segundo clic invierte y `aria-sort` acompana. Los encabezados responden a teclado y miden 44px de alto.
- Validacion manual en viewport 375x812: doble clic abre el dialogo con los datos reales; guardar persiste y actualiza la fila; los selectores de grado y division se recalculan solos; cancelar descarta y al reabrir no quedan valores viejos.
- Verificado que precio, estados de pago, impresion y entrega quedan intactos tras la correccion.
- Validaciones de formulario probadas: alumno menor a 2 caracteres y division mayor a 10 bloquean el guardado.
- Area tactil del boton `Editar` medida en 44px de alto, el minimo que respeta el resto de la app.

## [2026-07-30] - Agente: Claude

### Cambios
- Nueva pagina `/listados`: filtra por libro activo, grado y division, y descarga la nomina en Excel.
- El archivo generado tiene dos columnas, `Alumno` y `Grado - División`, con encabezado fijo.
- Nuevo item `Listados` en la navegacion. La barra inferior pasa a 5 columnas y `Configuracion` se abrevia a `Config.` para que ningun rotulo se corte en 375px.
- Se agrego `supabase/pedidos_bajo_el_jacaranda_6a.sql` con los 13 pedidos de 6to A del libro "Bajo el jacaranda - Margara Averbach".

### Motivo
Hacia falta poder imprimir o compartir la nomina de un curso sin exportar todo el sistema. El script SQL corresponde al segundo curso del mismo libro: comparte `libro_id` con 6to B y se distingue por `division`.

### Archivos afectados
- `src/app/features/listados/domain/curso.util.ts`
- `src/app/features/listados/domain/curso.util.spec.ts`
- `src/app/features/listados/data/exportar-listado.service.ts`
- `src/app/features/listados/ui/pages/listado-curso.page.ts`
- `src/app/features/listados/listados.routes.ts`
- `src/app/app.routes.ts`
- `src/app/core/layout/app-shell.component.ts`
- `src/styles.css`
- `package.json`
- `supabase/pedidos_bajo_el_jacaranda_6a.sql`

### Decisiones tomadas
La base no tiene columna `grado`: guarda el curso en el texto libre `pedidos.division`. En lugar de migrar el schema, `curso.util.ts` interpreta ese campo y separa grado de division. Asi conviven los formatos nuevos (`6A`) con los heredados (`A`, `7 B`, vacio) sin reescribir datos historicos. Los valores sin grado se agrupan como `Sin grado` y quedan visibles, para que se note que hay datos por normalizar.

Los selectores se arman con los valores que existen en los pedidos del libro elegido, no con una lista fija, y las divisiones se acotan al grado seleccionado para no ofrecer combinaciones vacias.

Se sumo la dependencia `write-excel-file`. Se eligio sobre `exceljs` (21 MB descomprimido) y `xlsx` (la version de npm esta desactualizada y con vulnerabilidades conocidas). Es browser-first y solo entra en el chunk lazy de la pagina: el bundle inicial crecio 0,6 kB.

La exportacion vive en un servicio aparte para que la pagina no dependa de la libreria.

### Validaciones realizadas
- `npm run build` y `npm test` (19 de 19).
- Validacion manual en viewport 375x812: se genero una descarga real, verificada como ZIP OOXML valido (`PK`, con `[Content_Types].xml`, `xl/workbook.xml`, `xl/styles.xml`, `xl/sharedStrings.xml`) y MIME de xlsx.
- Caso heredado verificado: un pedido con division `B` sin grado se agrupa bajo `Sin grado` y se exporta como `Sin grado B`.
- Barra inferior con 5 items medida en 375px: ningun rotulo se corta y no hay scroll horizontal.
- Verificacion de encoding y de ausencia de caracteres invisibles en los 13 nombres del script SQL.
- El script SQL no se ejecuto contra la base: queda a cargo del usuario desde el SQL Editor.

### Pendientes / Follow-ups
- Los datos heredados con division `A`, `C` o `7 B` conviene normalizarlos al formato `7A`. Hasta entonces aparecen como `Sin grado`.

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

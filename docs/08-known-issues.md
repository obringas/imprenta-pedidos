# 08-known-issues.md - Bugs conocidos y deuda tecnica

## Toner: la etiqueta de `toner_costo` decia "x 4 cartuchos" y el calculo lo multiplicaba por 4

### Fecha
2026-10-09

### Descripcion
En produccion la fila `toner_costo` de `/configuracion/insumos` se mostraba como "Toner (4 colores) · ARS x 4 cartuchos" con valor 360.000. Esa etiqueta no viene del repo: el seed y `docs/esquema-base-de-datos.md` dicen "Toner individual · ARS x cartucho", asi que se edito a mano en la base. El calculo (`calcular-precio-sugerido.util.ts`) hacia `tonerPorCara = (toner_costo * 4) / toner_impresiones`, o sea que tomaba el valor como precio de UN cartucho.

Lo que estaba mal era la etiqueta, no el codigo: 360.000 corresponde a un cartucho. Con los precios actuales (negro 166.000, cada color 330.000) un juego de 4 cuesta unos 1.156.000, asi que 360.000 no puede ser el juego completo. Igual el calculo viejo tenia dos errores de modelo:

- usaba el mismo precio para el negro que para los colores;
- trataba toda pagina como color pleno (5 % de cada color), sin distinguir B/N ni texto con poco color.

Precio sugerido que venia saliendo, libro de 130 paginas, margen 156 % (el default del formulario), con hojas 59.000, espiral 6.700, tapa 7.900 y `toner_impresiones = 22.000` (el valor del seed: no se pudo leer el de produccion porque la tabla requiere sesion):

- toner por cara: 360.000 x 4 / 22.000 = 65,45
- costo: 158 + 134 + 65 x 11,80 + 130 x 65,45 = 9.568
- precio sugerido: 9.568 x 2,56 = **$24.494** (sin redondear)

Si la etiqueta hubiera sido la correcta (360.000 por el juego), el toner por cara habria sido 16,36 y el sugerido $8.157. Con el modelo nuevo el mismo libro, texto con poco color, margen 150 %, sale **$11.050** en A4 (costo 4.410).

### Estado
Resuelto con el cotizador. `toner_costo` y `toner_impresiones` quedan deprecadas: siguen en la tabla (la migracion corrige su etiqueta a "Toner individual (deprecado) · ARS x 1 cartucho"), la pantalla de insumos las oculta y ningun calculo las usa. El costo de toner sale de `toner_negro_*`, `toner_color_*`, `toner_factor_rendimiento` y las coberturas por tipo de impresion.

### Impacto
Alto mientras estuvo vigente: el precio sugerido de un libro con poco color salia al doble del real.

### Modulo afectado
`configuracion_insumos` (filas `toner_costo`, `toner_impresiones`), `src/app/shared/utils/calcular-precio-sugerido.util.ts` (eliminado).

### Recomendacion
Cuando nadie consulte los valores historicos, se pueden borrar las dos filas con `delete from public.configuracion_insumos where clave in ('toner_costo', 'toner_impresiones');`. La app ya no las necesita.

## Tipos Supabase incompletos para `informes_resumen`

### Fecha
2026-04-16

### Descripcion
`database.types.ts` no tipa la vista `informes_resumen`, aunque el SQL principal la define.

### Impacto
Medio.

### Modulo afectado
`src/app/core/supabase/database.types.ts`

### Recomendacion
Regenerar tipos con `supabase gen types` cuando esten disponibles las credenciales reales de Supabase.

## Credenciales reales de Supabase pendientes

### Fecha
2026-04-16

### Descripcion
El proyecto necesita configurar credenciales reales para validar login, persistencia final y generacion de tipos.

### Impacto
Alto.

### Modulo afectado
Configuracion de entorno y repositorios Supabase.

### Recomendacion
Cargar credenciales reales en environment seguro y validar flujos principales contra Supabase.

## Sin unique constraint en pedidos por libro y alumno

### Fecha
2026-07-29

### Descripcion
`public.pedidos` no tiene unique constraint sobre `(libro_id, alumno)`. Nada impide cargar dos veces el mismo pedido para el mismo alumno y libro, ni desde la UI ni por SQL. Los scripts de carga masiva tienen que protegerse solos con `where not exists`.

### Impacto
Medio.

### Modulo afectado
`supabase/imprenta-pedidos.sql`, `src/app/features/pedidos/data/pedidos.repository.ts`

### Recomendacion
Evaluar un unique constraint o un indice unico parcial. Antes de aplicarlo hay que confirmar con la usuaria si un mismo alumno puede pedir dos ejemplares del mismo libro, caso en el que el constraint no corresponde y la validacion deberia ser una advertencia en la UI.

## Documentacion heredada pendiente de fusion final

### Fecha
2026-05-07

### Descripcion
Existen documentos heredados (`CONTEXT.md`, `STANDARDS.md`, `esquema-base-de-datos.md`, `prompt_codex_final.md`) con detalle historico que convive con la estructura numerada.

### Impacto
Bajo.

### Modulo afectado
`docs/`

### Recomendacion
Fusionar gradualmente el detalle historico en los documentos numerados y mover lo heredado a `docs/_legacy/` cuando se confirme la migracion completa.

## Informes: hojas pendientes y semaforo de toner cuentan los A5 como A4

### Fecha
2026-10-08 (acotado el 2026-10-09)

### Descripcion
Con el cotizador, el costo y el precio sugerido ya distinguen A4 de A5: el A5 se imprime 2-up sobre A4 cortada y usa la mitad del papel y del toner (ver "Modelo de costos" en `01-context.md`). Esa limitacion quedo resuelta.

Sigue pendiente la parte operativa: `libros.hojas` (`ceil(paginas / 2)`) y los KPI de hojas pendientes, hojas impresas y semaforo de toner de Informes tratan igual un pedido A4 que uno A5. Las hojas A4 reales de un pedido A5 son `ceil(paginas / 4)`, asi que para los A5 el sistema muestra casi el doble de hojas y de consumo.

### Impacto
Medio.

### Modulo afectado
`src/app/features/informes/state/informes.facade.ts`, vistas `pedidos_detalle` e `informes_resumen_por_libro`, `shared/constants/negocio.constants.ts` (`calcularHojas`)

### Recomendacion
Calcular las hojas por pedido segun su tamaño (`ceil(paginas / 2)` en A4, `ceil(paginas / 4)` en A5) en las vistas o en el facade, en lugar de tomarlas del libro.

## `libros.precio_a4` nullable

### Fecha
2026-10-08

### Descripcion
La migracion A4/A5 deja `precio_a4` vacio en los libros existentes que no esten en la cotizacion 2026-10. La app exige ambos precios al guardar un libro, pero la base lo admite nulo.

### Impacto
Bajo.

### Modulo afectado
`public.libros`

### Recomendacion
Cuando todos los libros tengan precio A4 (`select count(*) from public.libros where precio_a4 is null` en 0), ejecutar `alter table public.libros alter column precio_a4 set not null;` y quitar el `null` de `Libro.precioA4`.

## Desplegar la migracion del cotizador antes que la app

### Fecha
2026-10-09

### Descripcion
La app del cotizador escribe `libros.tipo_impresion` y `libros.paginas_color`, y lee las claves nuevas de `configuracion_insumos`. Si se publica antes de ejecutar `supabase/migracion_cotizador.sql`, guardar un libro falla (columna inexistente) y el cotizador y el precio sugerido muestran el aviso de datos faltantes en lugar de precios. La app anterior, en cambio, funciona sin problemas con la base ya migrada.

### Impacto
Alto durante el despliegue; nulo una vez ejecutada la migracion.

### Modulo afectado
`supabase/migracion_cotizador.sql`, `src/app/features/libros/data/libros.repository.ts`

### Recomendacion
Ejecutar la migracion en el SQL Editor de Supabase y despues hacer el merge a `main` (Vercel despliega desde ahi).


# Esquema de base de datos

Estado relevado el `2026-04-16` a partir de:

- `supabase/imprenta-pedidos.sql`
- `supabase/actualizar_schema_imprenta-pedidos.sql`
- `supabase/configuracion-insumos.sql`
- `src/app/core/supabase/database.types.ts`
- repositorios y consumo real en `src/app/features/**`

## Resumen

El sistema usa el schema `public` de Supabase y hoy tiene:

- 3 tablas persistentes: `libros`, `pedidos`, `configuracion_insumos`
- 4 enums: `estado_pago`, `estado_impresion`, `estado_entrega`, `tamanio_impresion`
- 2 funciones: `set_updated_at`, `calcular_saldo`
- 3 vistas operativas: `pedidos_detalle`, `informes_resumen`, `informes_resumen_por_libro`
- triggers de `updated_at` en `libros`, `pedidos` y `configuracion_insumos`
- RLS habilitado en `libros`, `pedidos` y `configuracion_insumos`

## Enums

### `public.estado_pago`

- `Pendiente`
- `Seña`
- `Pagado`

### `public.estado_impresion`

- `Pendiente`
- `Impreso`

### `public.estado_entrega`

- `Pendiente`
- `Entregado`

### `public.tamanio_impresion`

Agregado el `2026-10-08` (`supabase/migracion_tamanio_a4_a5.sql`).

- `A4`
- `A5`

## Tablas

### `public.libros`

| Columna | Tipo | Nulo | Default / Regla |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `titulo` | `text` | no | |
| `precio_a4` | `numeric(12,2)` | si | `check (precio_a4 is null or precio_a4 >= 0)`; nulo solo en libros previos a A4/A5 |
| `precio_a5` | `numeric(12,2)` | no | `check (precio_a5 >= 0)`; antes se llamaba `precio` |
| `paginas` | `integer` | no | `check (paginas > 0)` |
| `hojas` | `integer` | no | generada: `ceil(paginas / 2)` |
| `observaciones` | `text` | si | |
| `margen_ganancia` | `numeric(5,2)` | no | `150` (antes `156`), rango `0..500`. Margen con el que se aplicaron los precios de ese libro |
| `tipo_impresion` | `text` | no | `'poco_color'`, `check in ('bn','poco_color','color_pleno','mixto')` |
| `paginas_color` | `integer` | no | `0`, `check (paginas_color >= 0)`; solo cuenta en `mixto` |
| `activo` | `boolean` | no | `true` |
| `created_at` | `timestamptz` | no | `timezone('utc', now())` |
| `updated_at` | `timestamptz` | no | `timezone('utc', now())` |

Restricciones y notas:

- PK: `libros_pkey (id)`
- `hojas` no se persiste desde frontend; la calcula la base.
- `libros_paginas_color_max_check`: `paginas_color <= paginas`.
- `tipo_impresion`, `paginas_color` y el default 150 los agrega `supabase/migracion_cotizador.sql`.
- La app tiene fallback legacy si la columna `margen_ganancia` no existe, pero el esquema vigente la da por obligatoria.

Indices:

- `idx_libros_activo` sobre `activo`
- `idx_libros_titulo` sobre `titulo`

### `public.pedidos`

| Columna | Tipo | Nulo | Default / Regla |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `libro_id` | `uuid` | no | FK a `public.libros(id)` |
| `alumno` | `text` | no | |
| `division` | `text` | si | |
| `tamanio` | `public.tamanio_impresion` | no | sin default: cada alta lo declara |
| `precio_cobrado` | `numeric(12,2)` | no | `check (precio_cobrado >= 0)` |
| `estado_impresion` | `public.estado_impresion` | no | `Pendiente` |
| `fecha_impresion` | `date` | si | |
| `estado_entrega` | `public.estado_entrega` | no | `Pendiente` |
| `fecha_entrega` | `date` | si | |
| `estado_pago` | `public.estado_pago` | no | `Pendiente` |
| `monto_cobrado` | `numeric(12,2)` | no | `0`, `check (monto_cobrado >= 0)` |
| `fecha_pago` | `date` | si | |
| `observaciones` | `text` | si | |
| `created_at` | `timestamptz` | no | `timezone('utc', now())` |
| `updated_at` | `timestamptz` | no | `timezone('utc', now())` |

Restricciones y notas:

- PK: `pedidos_pkey (id)`
- FK: `libro_id -> libros.id`
- `on update cascade`
- `on delete restrict`
- `constraint pedidos_monto_no_supera_precio check (monto_cobrado <= precio_cobrado)`

Indices:

- `idx_pedidos_libro_id` sobre `libro_id`
- `idx_pedidos_alumno` sobre `alumno`
- `idx_pedidos_estado_pago` sobre `estado_pago`
- `idx_pedidos_estado_impresion` sobre `estado_impresion`
- `idx_pedidos_estado_entrega` sobre `estado_entrega`

### `public.configuracion_insumos`

| Columna | Tipo | Nulo | Default / Regla |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `clave` | `text` | no | `unique` |
| `descripcion` | `text` | no | |
| `valor` | `numeric(12,2)` | no | `check (valor >= 0)`; `0` en los insumos de texto |
| `valor_texto` | `text` | si | solo insumos de texto (`whatsapp_contacto`, `whatsapp_firma`) |
| `unidad` | `text` | no | puede incluir `{clave}`: la app lo reemplaza por el valor actual de ese insumo |
| `updated_at` | `timestamptz` | no | `timezone('utc', now())` |

Claves usadas por el sistema (el tipo por clave vive en `REGLAS_INSUMO`, `src/app/shared/models/configuracion-insumos.model.ts`):

- Papel: `hojas_resma`, `hojas_cantidad`
- Espiral y tapa: `espiral_paquete`, `espiral_cantidad`, `espiral_max_hojas`, `tapa_paquete`, `tapa_a5_paquete`, `tapa_cantidad`
- Toner: `toner_negro_costo`, `toner_negro_rinde`, `toner_color_costo`, `toner_color_rinde`, `toner_factor_rendimiento`
- Cobertura de pagina: `cobertura_bn_negro`, `cobertura_poco_negro`, `cobertura_poco_color`, `cobertura_pleno_negro`, `cobertura_pleno_color`
- Precio: `margen_default`, `margen_minimo`, `precio_redondeo`, `descuento_cantidad_pct`, `descuento_cantidad_minima`
- Mensaje (texto): `whatsapp_contacto`, `whatsapp_firma`
- Deprecadas: `toner_costo`, `toner_impresiones`. Siguen en la tabla, la app las oculta y no las usa (ver `docs/08-known-issues.md`).

Notas:

- Se guardan valores de compra y cantidades bulk; los costos unitarios se derivan en frontend (`derivarCostosUnitarios`, ver "Modelo de costos" en `docs/01-context.md`).
- Las claves nuevas las inserta `supabase/migracion_cotizador.sql` con `on conflict do nothing`. Si falta alguna, la migracion hace rollback.

## Funciones y triggers

### `public.set_updated_at()`

- tipo: `trigger`
- comportamiento: setea `new.updated_at = timezone('utc', now())`

Triggers que la usan:

- `set_libros_updated_at`
- `set_pedidos_updated_at`
- `trg_configuracion_insumos_updated_at`

### `public.calcular_saldo(precio numeric, cobrado numeric)`

- tipo: `sql immutable`
- retorno: `greatest(precio - cobrado, 0)`

## Vistas

### `public.pedidos_detalle`

Expone el join entre `pedidos` y `libros` con estas columnas:

- `id`
- `libro_id`
- `libro_titulo`
- `libro_paginas`
- `libro_hojas`
- `alumno`
- `division`
- `precio_cobrado`
- `estado_impresion`
- `fecha_impresion`
- `estado_entrega`
- `fecha_entrega`
- `estado_pago`
- `monto_cobrado`
- `fecha_pago`
- `saldo`
- `estado_general`
- `observaciones`
- `created_at`
- `updated_at`
- `tamanio` (al final: `create or replace view` solo permite agregar columnas al final)

Logica de `estado_general`:

- `Cerrado`: entregado y sin saldo
- `Entregado con saldo`: entregado y con saldo
- `Listo p/entregar`: impreso y sin saldo
- `Impreso con saldo`: impreso y con saldo
- `Pagado/pend. impresión`: cobrado parcialmente o totalmente y todavia pendiente de impresion
- `Pendiente`: resto de los casos

### `public.informes_resumen`

Vista agregada general con:

- `total_pedidos`
- `total_impresos`
- `total_pagados`
- `total_con_saldo`
- `saldo_total`
- `hojas_pendientes`

### `public.informes_resumen_por_libro`

Vista agregada por libro con:

- `libro_id`
- `libro_titulo`
- `libro_precio_a4`
- `libro_precio_a5`
- `libro_hojas`
- `total_pedidos`
- `total_a_cobrar`
- `total_cobrado`
- `saldo_total`
- `total_impresos`
- `total_entregados`
- `total_cerrados`
- `hojas_pendientes`

Notas:

- usa `left join` contra `pedidos`
- filtra `where l.activo = true`
- ordena por `l.titulo`

## RLS y politicas

### `public.libros`

- RLS habilitado
- policy `authenticated can read libros`: `select` para `authenticated`
- policy `authenticated can write libros`: `for all` para `authenticated`

### `public.pedidos`

- RLS habilitado
- policy `authenticated can read pedidos`: `select` para `authenticated`
- policy `authenticated can write pedidos`: `for all` para `authenticated`

### `public.configuracion_insumos`

- RLS habilitado
- policy `Autenticados pueden leer insumos`: `select` para `authenticated`
- policy `Autenticados pueden editar insumos`: `update` para `authenticated`

Nota:

- En `configuracion_insumos` el script actual no define `insert` ni `delete` para usuarios autenticados. Solo lectura y actualizacion.

## Seed inicial de `configuracion_insumos`

El seed completo (27 claves, con los valores vigentes al 2026-10-09) esta en `supabase/configuracion-insumos.sql`. Para una base existente, usar `supabase/migracion_cotizador.sql`, que no pisa valores.

## Reglas funcionales asociadas

Derivaciones implementadas en frontend:

```ts
hojas = Math.ceil(paginas / 2)
// costos por cara, precio y margen: ver "Modelo de costos" en docs/01-context.md
```

El precio sugerido no se persiste en base de datos.

## Divergencias detectadas

Hay una diferencia puntual entre tipos generados y SQL:

- `src/app/core/supabase/database.types.ts` incluye `configuracion_insumos`, `pedidos_detalle` e `informes_resumen_por_libro`
- el SQL principal tambien define `informes_resumen`
- hoy `database.types.ts` no tipa `informes_resumen`

Conclusion operativa:

- la fuente de verdad del esquema actual es el SQL de `supabase/` validado contra el uso real de la app
- si se regeneran tipos de Supabase, conviene actualizarlos para incluir `informes_resumen` y verificar que no haya mas drift

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
- 3 enums: `estado_pago`, `estado_impresion`, `estado_entrega`
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

## Tablas

### `public.libros`

| Columna | Tipo | Nulo | Default / Regla |
|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` |
| `titulo` | `text` | no | |
| `precio` | `numeric(12,2)` | no | `check (precio >= 0)` |
| `paginas` | `integer` | no | `check (paginas > 0)` |
| `hojas` | `integer` | no | generada: `ceil(paginas / 2)` |
| `observaciones` | `text` | si | |
| `margen_ganancia` | `numeric(5,2)` | no | `156`, rango `0..500` |
| `activo` | `boolean` | no | `true` |
| `created_at` | `timestamptz` | no | `timezone('utc', now())` |
| `updated_at` | `timestamptz` | no | `timezone('utc', now())` |

Restricciones y notas:

- PK: `libros_pkey (id)`
- `hojas` no se persiste desde frontend; la calcula la base.
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
| `valor` | `numeric(12,2)` | no | `check (valor >= 0)` |
| `unidad` | `text` | no | |
| `updated_at` | `timestamptz` | no | `timezone('utc', now())` |

Claves usadas por el sistema:

- `tapa_paquete`
- `tapa_cantidad`
- `espiral_paquete`
- `espiral_cantidad`
- `hojas_resma`
- `hojas_cantidad`
- `toner_costo`
- `toner_impresiones`

Notas:

- Se guardan valores de compra y cantidades bulk; los costos unitarios se derivan en frontend.
- `toner_costo` representa el cartucho individual.
- El costo del juego completo se calcula en frontend como `toner_costo * 4`.

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
- `libro_precio`
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

```sql
insert into public.configuracion_insumos (clave, descripcion, valor, unidad) values
  ('tapa_paquete', 'Tapas A4 (paquete)', 6500, 'ARS x 50 unidades'),
  ('tapa_cantidad', 'Tapas por paquete', 50, 'unidades'),
  ('espiral_paquete', 'Espirales (paquete)', 4895, 'ARS x 50 unidades'),
  ('espiral_cantidad', 'Espirales por paquete', 50, 'unidades'),
  ('hojas_resma', 'Hojas A4 (10 resmas)', 49720, 'ARS x 10 resmas'),
  ('hojas_cantidad', 'Hojas por resma', 500, 'hojas por resma'),
  ('toner_costo', 'Toner individual', 160000, 'ARS x cartucho'),
  ('toner_impresiones', 'Impresiones por juego de toner', 22000, 'caras impresas');
```

## Reglas funcionales asociadas

Derivaciones implementadas en frontend:

```ts
hojas = Math.ceil(paginas / 2)
tonerPorCara = (toner_costo * 4) / toner_impresiones
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

# Actualizacion del schema - imprenta-pedidos.sql

Este archivo documenta los cambios de base de datos que hoy forman parte del proyecto.
Sirve como referencia para mantener `supabase/imprenta-pedidos.sql` y los artefactos
relacionados alineados con la aplicacion Angular.

---

## Contexto

- En base de datos se mantiene `snake_case`.
- En frontend Angular y TypeScript se usa `camelCase`.
- La conversion entre ambos formatos ocurre solo en los repositorios.
- El precio sugerido no se persiste en DB: se calcula en frontend.
- Lo que si se persiste es:
  - `precio`
  - `margen_ganancia`
  - configuracion editable de insumos

---

## Cambios vigentes en `libros`

La tabla `public.libros` debe incluir:

```sql
create table if not exists public.libros (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  precio          numeric(12, 2) not null check (precio >= 0),
  paginas         integer not null check (paginas > 0),
  hojas           integer generated always as (ceil(paginas::numeric / 2)) stored,
  observaciones   text null,
  margen_ganancia numeric(5, 2) not null default 156
    check (margen_ganancia >= 0 and margen_ganancia <= 500),
  activo          boolean not null default true,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);
```

Reglas:
- `hojas` se calcula en DB como `ceil(paginas / 2)`.
- `margen_ganancia` se persiste por libro.
- El default actual es `156`.

---

## Cambios vigentes en `pedidos`

La tabla `public.pedidos` debe incluir estas fechas:

```sql
fecha_impresion date null,
fecha_entrega   date null,
fecha_pago      date null,
```

Se mantiene la restriccion:

```sql
constraint pedidos_monto_no_supera_precio
  check (monto_cobrado <= precio_cobrado)
```

---

## Vista `pedidos_detalle`

La vista debe exponer:
- `libro_hojas`
- `fecha_impresion`
- `fecha_entrega`
- `fecha_pago`

Y el `estado_general` debe usar esta logica para el caso de cobro previo a impresion:

```sql
when p.monto_cobrado > 0
     and p.estado_impresion = 'Pendiente'
  then 'Pagado/pend. impresion'
```

---

## Vista `informes_resumen_por_libro`

Debe existir una vista agrupada por libro con:
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

---

## Nueva tabla `configuracion_insumos`

Debe existir el archivo:

`supabase/configuracion-insumos.sql`

Con la tabla:

```sql
create table if not exists public.configuracion_insumos (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique,
  descripcion text not null,
  valor       numeric(12, 2) not null check (valor >= 0),
  unidad      text not null,
  updated_at  timestamptz not null default timezone('utc', now())
);
```

Y con:
- trigger `trg_configuracion_insumos_updated_at`
- RLS habilitado
- politica de lectura para autenticados
- politica de edicion para autenticados

---

## Seed actual de insumos

El seed vigente es:

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

Importante:
- `toner_costo` representa un toner individual.
- El juego completo se calcula en frontend como `toner_costo * 4`.
- No guardar en DB el costo ya multiplicado por cuatro.

---

## Formula funcional asociada

La formula vigente en frontend para derivar costos unitarios es:

```ts
tonerPorCara = (toner_costo * 4) / toner_impresiones
```

Y el precio sugerido se calcula como:

```ts
hojas = ceil(paginas / 2)
costoBase =
  tapaPorLibro +
  espiralPorLibro +
  hojas * hojaUnitaria +
  paginas * tonerPorCara

precioSugerido = costoBase * (1 + margenGanancia / 100)
```

---

## Resumen

Los cambios de DB que hoy hay que considerar son:

1. `libros` con `hojas`, `observaciones` y `margen_ganancia default 156`
2. `pedidos` con fechas operativas
3. `pedidos_detalle` enriquecida
4. `informes_resumen_por_libro`
5. `configuracion_insumos`
6. seed real de insumos con toner individual a `160000`


# Actualización del schema — imprenta-pedidos.sql

Este prompt describe exactamente qué cambiar en el archivo `imprenta-pedidos.sql`
que generaste anteriormente. El objetivo es que el schema quede completo y alineado
con todos los requerimientos del sistema antes de que arranque el desarrollo Angular.

Leé cada sección, aplicá el cambio, y regenerá el archivo completo y funcional.

---

## CONTEXTO

El schema actual tiene una base sólida (ENUMs, triggers, RLS, función `calcular_saldo`,
vistas `pedidos_detalle` e `informes_resumen`). Hay 5 cambios a aplicar:

- 2 columnas faltantes en `libros`
- 3 columnas faltantes en `pedidos`
- 1 corrección en la vista `pedidos_detalle`
- 1 columna faltante en `pedidos_detalle`
- 1 vista nueva: `informes_resumen_por_libro`
- Eliminar el seed ficticio (los datos reales se cargan por separado)

---

## CAMBIO 1 — Tabla `libros`: agregar `hojas` y `observaciones`

### Situación actual
```sql
create table if not exists public.libros (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  precio     numeric(12, 2) not null check (precio >= 0),
  paginas    integer not null check (paginas > 0),
  activo     boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

### Qué agregar
Dos columnas nuevas después de `paginas`:

```sql
hojas integer generated always as (ceil(paginas::numeric / 2)) stored,
observaciones text null,
```

**Por qué `hojas`:**
La imprenta trabaja en doble faz. El cálculo `ceil(paginas / 2)` se usa en múltiples
lugares: la vista de informes, el informe de "faltan imprimir", el resumen por libro.
Al guardarlo como columna generada, el dato es consistente y no se recalcula en cada
query. Un libro de 79 páginas → 40 hojas (la última tiene una cara en blanco).

**Por qué `observaciones`:**
La usuaria necesita poder anotar datos por libro (ej: "pendiente conseguir el PDF",
"precio acordado con el colegio", etc.).

### Resultado esperado
```sql
create table if not exists public.libros (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  precio        numeric(12, 2) not null check (precio >= 0),
  paginas       integer not null check (paginas > 0),
  hojas         integer generated always as (ceil(paginas::numeric / 2)) stored,
  observaciones text null,
  activo        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);
```

---

## CAMBIO 2 — Tabla `pedidos`: agregar las 3 columnas de fecha

### Situación actual
La tabla `pedidos` registra los *estados* pero no *cuándo* ocurrió cada evento.
Las fechas son necesarias para el historial y para que la usuaria recuerde
cuándo imprimió, cuándo cobró, cuándo entregó.

### Qué agregar
Tres columnas, una por cada flujo de estado, después de su estado correspondiente:

```sql
-- después de estado_impresion:
fecha_impresion date null,

-- después de estado_entrega:
fecha_entrega date null,

-- después de monto_cobrado:
fecha_pago date null,
```

### Resultado esperado (fragmento)
```sql
create table if not exists public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  libro_id         uuid not null references public.libros(id) on update cascade on delete restrict,
  alumno           text not null,
  division         text null,
  precio_cobrado   numeric(12, 2) not null check (precio_cobrado >= 0),
  estado_impresion public.estado_impresion not null default 'Pendiente',
  fecha_impresion  date null,
  estado_entrega   public.estado_entrega not null default 'Pendiente',
  fecha_entrega    date null,
  estado_pago      public.estado_pago not null default 'Pendiente',
  monto_cobrado    numeric(12, 2) not null default 0 check (monto_cobrado >= 0),
  fecha_pago       date null,
  observaciones    text null,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  constraint pedidos_monto_no_supera_precio check (monto_cobrado <= precio_cobrado)
);
```

---

## CAMBIO 3 — Vista `pedidos_detalle`: agregar `libro_hojas` y corregir `estado_general`

### Problema 1: falta `libro_hojas`
La vista actual no expone las hojas del libro. El frontend Angular la necesita
para mostrar cuántas hojas requiere cada pedido pendiente en el informe
"Faltan imprimir".

Agregar en el SELECT, después de `l.paginas as libro_paginas`:
```sql
l.hojas as libro_hojas,
```

### Problema 2: `estado_general` — lógica incorrecta en el último WHEN

#### Código actual (incorrecto)
```sql
when p.estado_pago = 'Pagado' or p.monto_cobrado > 0 then 'Pagado/pend. impresión'
```

#### Por qué es incorrecto
Esta condición mezcla dos casos distintos con `OR`:
- `estado_pago = 'Pagado'`: puede ocurrir aunque `monto_cobrado = 0`
  (edge case: si alguien pone Pagado pero no cargó el monto)
- `monto_cobrado > 0`: incluye correctamente el caso Seña con monto parcial

El estado `Pagado/pend. impresión` debe activarse cuando hay dinero recibido
(ya sea Pagado completo o Seña parcial) PERO el libro todavía no se imprimió.
La condición correcta es explícita en ambas partes:

#### Código correcto
```sql
when p.monto_cobrado > 0 and p.estado_impresion = 'Pendiente' then 'Pagado/pend. impresión'
```

Esto es correcto porque:
- Los casos con `estado_impresion = 'Impreso'` ya fueron capturados por los WHEN anteriores
- Al llegar a este WHEN, `estado_impresion` es siempre 'Pendiente' implícitamente
- Aun así, hacerlo explícito es más legible y robusto ante futuros cambios

### Resultado esperado (vista completa)
```sql
create or replace view public.pedidos_detalle as
select
  p.id,
  p.libro_id,
  l.titulo           as libro_titulo,
  l.paginas          as libro_paginas,
  l.hojas            as libro_hojas,
  p.alumno,
  p.division,
  p.precio_cobrado,
  p.estado_impresion,
  p.fecha_impresion,
  p.estado_entrega,
  p.fecha_entrega,
  p.estado_pago,
  p.monto_cobrado,
  p.fecha_pago,
  public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) as saldo,
  case
    when p.estado_entrega    = 'Entregado'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
      then 'Cerrado'
    when p.estado_entrega    = 'Entregado'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0
      then 'Entregado con saldo'
    when p.estado_impresion  = 'Impreso'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
      then 'Listo p/entregar'
    when p.estado_impresion  = 'Impreso'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0
      then 'Impreso con saldo'
    when p.monto_cobrado > 0
         and p.estado_impresion = 'Pendiente'
      then 'Pagado/pend. impresión'
    else 'Pendiente'
  end                as estado_general,
  p.observaciones,
  p.created_at,
  p.updated_at
from public.pedidos p
join public.libros l on l.id = p.libro_id;
```

---

## CAMBIO 4 — Vista nueva: `informes_resumen_por_libro`

### Situación actual
La vista `informes_resumen` solo devuelve totales globales (una sola fila).
El frontend necesita los mismos datos **agrupados por libro** para mostrar
la tabla de resumen por libro en la pantalla de Informes.

### Agregar esta vista nueva después de `informes_resumen`
```sql
create or replace view public.informes_resumen_por_libro as
select
  l.id                                                                     as libro_id,
  l.titulo                                                                 as libro_titulo,
  l.precio                                                                 as libro_precio,
  l.hojas                                                                  as libro_hojas,
  count(p.id)::integer                                                     as total_pedidos,
  coalesce(sum(p.precio_cobrado), 0)::numeric(12,2)                        as total_a_cobrar,
  coalesce(sum(p.monto_cobrado), 0)::numeric(12,2)                         as total_cobrado,
  coalesce(sum(public.calcular_saldo(p.precio_cobrado,
               p.monto_cobrado)), 0)::numeric(12,2)                        as saldo_total,
  count(p.id) filter (where p.estado_impresion = 'Impreso')::integer       as total_impresos,
  count(p.id) filter (where p.estado_entrega   = 'Entregado')::integer     as total_entregados,
  count(p.id) filter (
    where p.estado_entrega = 'Entregado'
    and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
  )::integer                                                               as total_cerrados,
  -- hojas físicas que faltan imprimir para este libro
  coalesce(
    l.hojas * count(p.id) filter (where p.estado_impresion = 'Pendiente'),
    0
  )::integer                                                               as hojas_pendientes
from public.libros l
left join public.pedidos p on p.libro_id = l.id
where l.activo = true
group by l.id, l.titulo, l.precio, l.hojas
order by l.titulo;
```

**Nota:** usa `LEFT JOIN` para que los libros sin pedidos también aparezcan en el resumen.

---

## CAMBIO 5 — Eliminar el seed ficticio

### Situación actual
El archivo tiene al final:
- 7 libros inventados (WORKBOOK con 144 páginas, Prácticas del Lenguaje 5, Matemática 4, etc.)
- 6 pedidos de prueba

### Qué hacer
**Eliminar completamente** los dos bloques `INSERT INTO public.libros` e
`INSERT INTO public.pedidos` que están al final del archivo.

Los datos reales (7 libros del catálogo real + 140 pedidos migrados del Excel)
se cargan por separado con el script `migracion_datos.sql`.
Mantener el schema limpio sin datos hardcodeados facilita:
- Ejecutarlo en cualquier entorno sin efectos secundarios
- Versionarlo en git sin datos sensibles
- Reutilizarlo para pruebas con datos de test independientes

---

## RESUMEN DE CAMBIOS

| # | Objeto         | Tipo de cambio     | Detalle                                      |
|---|----------------|--------------------|----------------------------------------------|
| 1 | `libros`       | 2 columnas nuevas  | `hojas` (generada) + `observaciones`         |
| 2 | `pedidos`      | 3 columnas nuevas  | `fecha_impresion`, `fecha_entrega`, `fecha_pago` |
| 3 | `pedidos_detalle` | Corregir + ampliar | Agregar `libro_hojas`, exponer fechas, fix `estado_general` |
| 4 | `informes_resumen_por_libro` | Vista nueva | Resumen agrupado por libro para el dashboard |
| 5 | Seed ficticio  | Eliminar           | Los datos reales van en `migracion_datos.sql` |

---

## INSTRUCCIONES FINALES PARA CODEX

- Regenerá el archivo completo `imprenta-pedidos.sql` aplicando los 5 cambios
- No cambies nada que no esté listado en este prompt
- Mantené el estilo de código que ya tenías: lowercase SQL, identación consistente,
  comentarios descriptivos por sección
- El archivo debe poder ejecutarse desde cero en un proyecto Supabase vacío
  sin errores y sin datos de prueba
- Verificá que las referencias entre objetos sean correctas:
  - `pedidos_detalle` usa `l.hojas` → requiere que `libros.hojas` exista primero
  - `informes_resumen_por_libro` usa `l.hojas` → igual
  - La función `calcular_saldo()` debe definirse antes de las vistas que la usan

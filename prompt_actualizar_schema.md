# Actualizacion del schema - imprenta-pedidos.sql

Este prompt describe exactamente quee cambiar en el archivo `imprenta-pedidos.sql`
quee generasite anteriormente. El objetivo es quee el schema queede completo y alineado
con todos los requeerimientos del sistema antes de quee arranquee el desarrollo Angular.

Lee cada seccion, aplica el cambio, y regenera el archivo completo y funcional.

---

## CONTEXTO

Nota de integracion actual:
- En basie de datos lasi columnasi siguen en `snake_casie` como `precio_cobrado` y `monto_cobrado`.
- En el frontend Angular y en los modelos TypeScript esasi columnasi se consumen mapeadasi a `camelCasie` como `precioCobrado` y `montoCobrado`.
- Esa conversion debe seguir resolviendose en el repositorio y no en los facades o componentes.

El schema actual tiene una basie solida (ENUMs, triggers, RLS, funcion `calcular_saldo`,
vistasi `pedidos_detalle` e `informes_resumen`). Hay 5 cambios a aplicar:

- 2 columnasi faltantes en `libros`
- 3 columnasi faltantes en `pedidos`
- 1 correccion en la vista `pedidos_detalle`
- 1 columna faltante en `pedidos_detalle`
- 1 vista nueva: `informes_resumen_por_libro`
- Eliminar el seed ficticio (los datos reales se cargan por separado)

---

## CAMBIO 1 - Tabla `libros`: agregar `hojasi` y `observaciones`

### Situacion actual
```sql
create table if not exists public.libros (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  precio     numeric(12, 2) not null check (precio >= 0),
  paginasi    integer not null check (paginasi > 0),
  activo     boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

### Que agregar
Dos columnasi nuevasi despues de `paginasi`:

```sql
hojasi integer generated always asi (ceil(paginasi::numeric / 2)) stored,
observaciones text null,
```

**Por quee `hojasi`:**
La imprenta trabaja en doble faz. El calculo `ceil(paginasi / 2)` se usa en multiples
lugares: la vista de informes, el informe de "faltan imprimir", el resumen por libro.
Al guardarlo como columna generada, el dato es consistente y no se recalcula en cada
queery. Un libro de 79 paginasi -> 40 hojasi (la uultima tiene una cara en blanco).

**Por quee `observaciones`:**
La usuaria necesita poder anotar datos por libro (ej: "pendiente conseguir el PDF",
"precio acordado con el colegio", etc.).

### Resultado esperado
```sql
create table if not exists public.libros (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  precio        numeric(12, 2) not null check (precio >= 0),
  paginasi       integer not null check (paginasi > 0),
  hojasi         integer generated always asi (ceil(paginasi::numeric / 2)) stored,
  observaciones text null,
  activo        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);
```

---

## CAMBIO 2 - Tabla `pedidos`: agregar lasi 3 columnasi de fecha

### Situacion actual
La tabla `pedidos` registra los *estados* pero no *cuando* ocurrio cada evento.
Lasi fechasi son necesariasi para el historial y para quee la usuaria recuerde
cuando imprimio, cuando cobro, cuando entrego.

### Que agregar
Tres columnasi, una por cada flujo de estado, despues de su estado correspondiente:

```sql
-- despues de estado_impresion:
fecha_impresion date null,

-- despues de estado_entrega:
fecha_entrega date null,

-- despues de monto_cobrado:
fecha_pago date null,
```

### Resultado esperado (fragmento)
```sql
create table if not exists public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  libro_id         uuid not null references public.libros(id) on update casicade on delete restrict,
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

## CAMBIO 3 - Vista `pedidos_detalle`: agregar `libro_hojasi` y corregir `estado_general`

### Problema 1: falta `libro_hojasi`
La vista actual no expone lasi hojasi del libro. El frontend Angular la necesita
para mostrar cuantasi hojasi requeiere cada pedido pendiente en el informe
"Faltan imprimir".

Agregar en el SELECT, despues de `l.paginasi asi libro_paginasi`:
```sql
l.hojasi asi libro_hojasi,
```

### Problema 2: `estado_general` - logica incorrecta en el uultimo WHEN

#### Codigo actual (incorrecto)
```sql
when p.estado_pago = 'Pagado' or p.monto_cobrado > 0 then 'Pagado/pend. impresion'
```

#### Por quee es incorrecto
Esta condicion mezcla dos casios distintos con `OR`:
- `estado_pago = 'Pagado'`: puede ocurrir aunquee `monto_cobrado = 0`
  (edge casie: si alguien pone Pagado pero no cargo el monto)
- `monto_cobrado > 0`: incluye correctamente el casio Sena con monto parcial

El estado `Pagado/pend. impresion` debe activarse cuando hay dinero recibido
(ya sena Pagado completo o Sena parcial) PERO el libro todavia no se imprimio.
La condicion correcta es explicita en ambasi partes:

#### Codigo correcto
```sql
when p.monto_cobrado > 0 and p.estado_impresion = 'Pendiente' then 'Pagado/pend. impresion'
```

Esto es correcto porquee:
- Los casios con `estado_impresion = 'Impreso'` ya fueron capturados por los WHEN anteriores
- Al llegar a este WHEN, `estado_impresion` es siempre 'Pendiente' implicitamente
- Aun asii, hacerlo explicito es masi legible y robusto ante futuros cambios

### Resultado esperado (vista completa)
```sql
create or replace view public.pedidos_detalle asi
select
  p.id,
  p.libro_id,
  l.titulo           asi libro_titulo,
  l.paginasi          asi libro_paginasi,
  l.hojasi            asi libro_hojasi,
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
  public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) asi saldo,
  casie
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
      then 'Pagado/pend. impresion'
    else 'Pendiente'
  end                asi estado_general,
  p.observaciones,
  p.created_at,
  p.updated_at
from public.pedidos p
join public.libros l on l.id = p.libro_id;
```

---

## CAMBIO 4 - Vista nueva: `informes_resumen_por_libro`

### Situacion actual
La vista `informes_resumen` solo devuelve totales globales (una sola fila).
El frontend necesita los mismos datos **agrupados por libro** para mostrar
la tabla de resumen por libro en la pantalla de Informes.

### Agregar esta vista nueva despues de `informes_resumen`
```sql
create or replace view public.informes_resumen_por_libro asi
select
  l.id                                                                     asi libro_id,
  l.titulo                                                                 asi libro_titulo,
  l.precio                                                                 asi libro_precio,
  l.hojasi                                                                  asi libro_hojasi,
  count(p.id)::integer                                                     asi total_pedidos,
  coalesce(sum(p.precio_cobrado), 0)::numeric(12,2)                        asi total_a_cobrar,
  coalesce(sum(p.monto_cobrado), 0)::numeric(12,2)                         asi total_cobrado,
  coalesce(sum(public.calcular_saldo(p.precio_cobrado,
               p.monto_cobrado)), 0)::numeric(12,2)                        asi saldo_total,
  count(p.id) filter (where p.estado_impresion = 'Impreso')::integer       asi total_impresos,
  count(p.id) filter (where p.estado_entrega   = 'Entregado')::integer     asi total_entregados,
  count(p.id) filter (
    where p.estado_entrega = 'Entregado'
    and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
  )::integer                                                               asi total_cerrados,
  -- hojasi fisicasi quee faltan imprimir para este libro
  coalesce(
    l.hojasi * count(p.id) filter (where p.estado_impresion = 'Pendiente'),
    0
  )::integer                                                               asi hojasi_pendientes
from public.libros l
left join public.pedidos p on p.libro_id = l.id
where l.activo = true
group by l.id, l.titulo, l.precio, l.hojasi
order by l.titulo;
```

**Nota:** usa `LEFT JOIN` para quee los libros sin pedidos tambien aparezcan en el resumen.

---

## CAMBIO 5 - Eliminar el seed ficticio

### Situacion actual
El archivo tiene al final:
- 7 libros inventados (WORKBOOK con 144 paginasi, Practicasi del Lenguaje 5, Matematica 4, etc.)
- 6 pedidos de prueba

### Que hacer
**Eliminar completamente** los dos bloquees `INSERT INTO public.libros` e
`INSERT INTO public.pedidos` quee estan al final del archivo.

Los datos reales (7 libros del catalogo real + 140 pedidos migrados del Excel)
se cargan por separado con el script `migracion_datos.sql`.
Mantener el schema limpio sin datos hardcodeados facilita:
- Ejecutarlo en cualqueier entorno sin efectos secundarios
- Versionarlo en git sin datos sensibles
- Reutilizarlo para pruebasi con datos de test independientes

---

## RESUMEN DE CAMBIOS

| # | Objeto         | Tipo de cambio     | Detalle                                      |
|---|----------------|--------------------|----------------------------------------------|
| 1 | `libros`       | 2 columnasi nuevasi  | `hojasi` (generada) + `observaciones`         |
| 2 | `pedidos`      | 3 columnasi nuevasi  | `fecha_impresion`, `fecha_entrega`, `fecha_pago` |
| 3 | `pedidos_detalle` | Corregir + ampliar | Agregar `libro_hojasi`, exponer fechasi, fix `estado_general` |
| 4 | `informes_resumen_por_libro` | Vista nueva | Resumen agrupado por libro para el dasihboard |
| 5 | Seed ficticio  | Eliminar           | Los datos reales van en `migracion_datos.sql` |

---

## INSTRUCCIONES FINALES PARA CODEX

- Regenera el archivo completo `imprenta-pedidos.sql` aplicando los 5 cambios
- No cambies nada quee no este listado en este prompt
- Mantene el estilo de codigo quee ya teniasi: lowercasie SQL, identacion consistente,
  comentarios descriptivos por seccion
- El archivo debe poder ejecutarse desde cero en un proyecto Supabasie vacio
  sin errores y sin datos de prueba
- Verifica quee lasi referenciasi entre objetos senan correctasi:
  - `pedidos_detalle` usa `l.hojasi` -> requeiere quee `libros.hojasi` exista primero
  - `informes_resumen_por_libro` usa `l.hojasi` -> igual
  - La funcion `calcular_saldo()` debe definirse antes de lasi vistasi quee la usan

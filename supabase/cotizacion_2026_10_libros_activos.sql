-- =============================================================================
-- Cotizacion 2026-10: tamaño de los pedidos y precio segun tamaño
-- Solo estos 5 libros, y solo si estan activos:
--   Cuentos de la selva, El genio de la cartuchera, Heredé un fantasma,
--   El club de los detectives feroces, Amigos para siempre.
-- Requiere haber ejecutado antes: migracion_tamanio_a4_a5.sql
--
-- Los precios NO se cargan aca: se usan los precio_a4 y precio_a5 que ya
-- tiene cada libro en la base.
--
-- COMO USARLO
--   1. Ejecutarlo tal cual. Es una VISTA PREVIA: no modifica nada y devuelve
--      una tabla con:
--        - cada libro, el libro activo que le corresponde, sus precios y
--          cuantos pedidos A5 y A4 se detectaron;
--        - cada pedido que pasa a A4 y por que;
--        - cada pedido pendiente de pago que cambia de precio.
--   2. Si todo esta bien, cambiar `false` por `true` en la linea MODO y volver
--      a ejecutarlo. La tabla de resultado pasa a decir CAMBIOS APLICADOS.
--
-- REGLAS
--   - Los pedidos se cargaron con el precio del libro, que era el A5. A los
--     que pedian A4 se les subio el precio a mano. Por eso, en cada libro, el
--     precio mas repetido entre sus pedidos se toma como A5 y los pedidos con
--     un precio mayor pasan a A4. Tambien pasan a A4 los que dicen "A4" en
--     observaciones. Si la observacion era solo "A4" o "A5", se limpia.
--   - El tamaño se detecta en todos los pedidos del libro, cualquiera sea su
--     estado de pago, y solo si el libro todavia no tiene ningun pedido A4
--     (como lo deja la migracion). Asi, reejecutar el script despues de
--     aplicarlo no vuelve a clasificar.
--   - Cada pedido pendiente de pago (nada cobrado) toma el precio de su
--     tamaño. Los pagados y las señas conservan su precio.
--   - Los libros se buscan entre los activos por titulo, sin distinguir
--     mayusculas ni acentos. Si un titulo coincide con mas de un libro activo,
--     el script se detiene sin cambiar nada. Si no coincide con ninguno, se
--     informa y se ignora.
-- =============================================================================

drop table if exists pg_temp.parametros;
create temp table parametros as
select false as aplicar;  -- MODO: false = vista previa, true = aplicar los cambios


-- Libros a procesar -------------------------------------------------------------
drop table if exists pg_temp.libros_cotizados;
create temp table libros_cotizados (titulo text primary key);

insert into libros_cotizados (titulo) values
  ('Cuentos de la selva'),
  ('El genio de la cartuchera'),
  ('Heredé un fantasma'),
  ('El club de los detectives feroces'),
  ('Amigos para siempre');


-- Coincidencia con libros activos --------------------------------------------
create or replace function pg_temp.normalizar_titulo(texto text)
returns text
language sql
immutable
as $$
  select translate(lower(trim(texto)), 'áéíóúüñ', 'aeiouun');
$$;

drop table if exists pg_temp.coincidencias;
create temp table coincidencias as
select
  c.titulo,
  l.id        as libro_id,
  l.titulo    as titulo_libro,
  l.precio_a4 as a4,
  l.precio_a5 as a5
from libros_cotizados c
left join public.libros l
  on l.activo
 and pg_temp.normalizar_titulo(l.titulo) like '%' || pg_temp.normalizar_titulo(c.titulo) || '%';

do $$
declare
  ambiguos text;
begin
  select string_agg(format('"%s" coincide con %s libros activos', titulo, cantidad), '; ')
  into ambiguos
  from (
    select titulo, count(libro_id) as cantidad
    from coincidencias
    group by titulo
    having count(libro_id) > 1
  ) x;

  if ambiguos is null then
    select string_agg(format('"%s" coincide con %s titulos de la lista', titulo_libro, cantidad), '; ')
    into ambiguos
    from (
      select titulo_libro, count(*) as cantidad
      from coincidencias
      where libro_id is not null
      group by titulo_libro
      having count(*) > 1
    ) x;
  end if;

  if ambiguos is not null then
    raise exception 'Los libros no se pueden asociar sin ambiguedad. No se modifico nada. %', ambiguos;
  end if;
end $$;


-- Tamaño de cada pedido ---------------------------------------------------------
-- Libros sin ningun pedido A4 todavia: recien migrados, falta detectar.
-- Precio mas repetido de cada uno: el A5 con el que se cargaban los pedidos.
-- Ante un empate se toma el menor.
drop table if exists pg_temp.precio_mas_comun;
create temp table precio_mas_comun as
select p.libro_id, mode() within group (order by p.precio_cobrado) as precio_a5_anterior
from public.pedidos p
join coincidencias co on co.libro_id = p.libro_id
where not exists (
  select 1 from public.pedidos a4
  where a4.libro_id = p.libro_id and a4.tamanio = 'A4'
)
group by p.libro_id;

drop table if exists pg_temp.tamanios;
create temp table tamanios as
select
  p.id,
  p.libro_id,
  co.titulo_libro,
  p.alumno,
  p.division,
  p.precio_cobrado,
  p.observaciones,
  m.precio_a5_anterior,
  p.tamanio as tamanio_actual,
  case
    when p.precio_cobrado > m.precio_a5_anterior or p.observaciones ~* '\mA4\M' then 'A4'
    else 'A5'
  end::public.tamanio_impresion as tamanio_nuevo
from public.pedidos p
join coincidencias co on co.libro_id = p.libro_id
join precio_mas_comun m on m.libro_id = p.libro_id;


-- Pedidos que cambian de precio ------------------------------------------------
drop table if exists pg_temp.repreciados;
create temp table repreciados as
select
  p.id,
  co.titulo_libro,
  p.alumno,
  p.division,
  coalesce(t.tamanio_nuevo, p.tamanio) as tamanio,
  p.precio_cobrado as precio_actual,
  case when coalesce(t.tamanio_nuevo, p.tamanio) = 'A4' then co.a4 else co.a5 end as precio_nuevo
from public.pedidos p
join coincidencias co on co.libro_id = p.libro_id
left join tamanios t on t.id = p.id
where p.estado_pago = 'Pendiente'
  and p.monto_cobrado = 0;

-- Sin precio cargado para ese tamaño no se toca el pedido.
delete from repreciados where precio_nuevo is null or precio_nuevo = precio_actual;


-- Aplicar (solo en MODO true) -------------------------------------------------
begin;

update public.pedidos p
set tamanio = t.tamanio_nuevo
from tamanios t
where t.id = p.id
  and p.tamanio <> t.tamanio_nuevo
  and (select aplicar from parametros);

update public.pedidos p
set observaciones = null
from tamanios t
where t.id = p.id
  and p.observaciones ~* '^\s*\(?\s*A[45]\s*\)?\s*$'
  and (select aplicar from parametros);

update public.pedidos p
set precio_cobrado = r.precio_nuevo
from repreciados r
where r.id = p.id
  and p.estado_pago = 'Pendiente'
  and p.monto_cobrado = 0
  and (select aplicar from parametros);

commit;


-- Resultado ---------------------------------------------------------------------
select tipo, detalle, antes, despues
from (
  select
    1 as orden,
    'Modo' as tipo,
    case when aplicar then 'CAMBIOS APLICADOS' else 'VISTA PREVIA: no se modifico nada' end as detalle,
    null::text as antes,
    null::text as despues
  from parametros

  union all

  select
    2,
    'Libro',
    c.titulo || ' -> ' || coalesce(c.titulo_libro, 'NO ESTA ENTRE LOS LIBROS ACTIVOS: se ignora')
      || case
           when c.libro_id is null then ''
           when not exists (select 1 from public.pedidos p where p.libro_id = c.libro_id) then ' (sin pedidos)'
           when not exists (select 1 from precio_mas_comun m where m.libro_id = c.libro_id)
             then ' (ya tiene pedidos A4: no se vuelven a detectar tamaños)'
           else format(
             ' (precio mas comun %s: %s pedidos A5, %s A4)',
             (select m.precio_a5_anterior from precio_mas_comun m where m.libro_id = c.libro_id),
             (select count(*) from tamanios t where t.libro_id = c.libro_id and t.tamanio_nuevo = 'A5'),
             (select count(*) from tamanios t where t.libro_id = c.libro_id and t.tamanio_nuevo = 'A4')
           )
         end,
    case when c.libro_id is null then null
         else format('Precios del libro: A4 %s · A5 %s', coalesce(c.a4::text, 'SIN CARGAR'), coalesce(c.a5::text, 'SIN CARGAR')) end,
    null
  from coincidencias c

  union all

  select
    3,
    'Pedido pasa a A4',
    format(
      '%s · %s · %s · %s',
      titulo_libro,
      alumno,
      coalesce(division, 'sin division'),
      case
        when precio_cobrado > precio_a5_anterior then format('precio %s mayor al comun %s', precio_cobrado, precio_a5_anterior)
        else format('observacion "%s"', observaciones)
      end
    ),
    tamanio_actual::text,
    tamanio_nuevo::text
  from tamanios
  where tamanio_nuevo = 'A4'

  union all

  select
    4,
    'Pedido pendiente cambia de precio',
    format('%s · %s · %s · %s', titulo_libro, alumno, coalesce(division, 'sin division'), tamanio),
    precio_actual::text,
    precio_nuevo::text
  from repreciados
) resultado
order by orden, detalle;

-- =============================================================================
-- Migracion: tamaño de impresion A4 / A5
-- Fecha: 2026-10-08
--
-- Que hace:
--   1. Crea el enum public.tamanio_impresion ('A4', 'A5').
--   2. libros: el precio unico actual pasa a ser precio_a5 (con ese precio se
--      cargaban los pedidos, que en su mayoria son A5) y se agrega precio_a4.
--      Los libros quedan con precio_a4 vacio hasta que se cargue desde la app
--      (Libros > editar) o con el script de cotizacion.
--   3. pedidos: agrega la columna tamanio y deja todos los pedidos en A5. Los
--      A4 de los libros de la cotizacion 2026-10 los detecta el script
--      cotizacion_2026_10_libros_activos.sql. El resto se corrige a mano.
--   4. Recrea las vistas pedidos_detalle e informes_resumen_por_libro.
--
-- No toca precio_cobrado, montos ni observaciones de ningun pedido.
--
-- Orden de despliegue: ejecutar este script y publicar la version nueva de la
-- app inmediatamente despues. La app anterior lee libros.precio, que deja de
-- existir.
--
-- Se puede reejecutar: cada paso verifica si ya fue aplicado.
-- =============================================================================


begin;

-- 1. Enum de tamaños -----------------------------------------------------------
do $$ begin
  create type public.tamanio_impresion as enum ('A4', 'A5');
exception when duplicate_object then null; end $$;


-- 2. Libros: precio A5 (el actual) y precio A4 -----------------------------------
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'libros' and column_name = 'precio'
  ) then
    alter table public.libros rename column precio to precio_a5;
  end if;
end $$;

-- Nullable a proposito: los libros existentes no tienen precio A4 todavia.
-- La app exige ambos precios al crear o editar un libro.
alter table public.libros
  add column if not exists precio_a4 numeric(12, 2) null;

alter table public.libros drop constraint if exists libros_precio_a4_check;
alter table public.libros
  add constraint libros_precio_a4_check check (precio_a4 is null or precio_a4 >= 0);


-- 3. Pedidos: tamaño -----------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'tamanio'
  ) then
    -- El default solo sirve para completar los pedidos existentes; se quita
    -- para que todo pedido nuevo declare su tamaño explicitamente.
    alter table public.pedidos
      add column tamanio public.tamanio_impresion not null default 'A5';

    alter table public.pedidos alter column tamanio drop default;
  end if;
end $$;


-- 4. Vistas --------------------------------------------------------------------
-- pedidos_detalle: create or replace permite agregar columnas solo al final.
create or replace view public.pedidos_detalle as
select
  p.id,
  p.libro_id,
  l.titulo as libro_titulo,
  l.paginas as libro_paginas,
  l.hojas as libro_hojas,
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
    when p.estado_entrega = 'Entregado'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
      then 'Cerrado'
    when p.estado_entrega = 'Entregado'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0
      then 'Entregado con saldo'
    when p.estado_impresion = 'Impreso'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
      then 'Listo p/entregar'
    when p.estado_impresion = 'Impreso'
         and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0
      then 'Impreso con saldo'
    when p.monto_cobrado > 0
         and p.estado_impresion = 'Pendiente'
      then 'Pagado/pend. impresión'
    else 'Pendiente'
  end as estado_general,
  p.observaciones,
  p.created_at,
  p.updated_at,
  p.tamanio
from public.pedidos p
join public.libros l on l.id = p.libro_id;

-- informes_resumen_por_libro cambia de columnas (libro_precio se divide en dos),
-- por eso se recrea en vez de reemplazarse.
drop view if exists public.informes_resumen_por_libro;
create view public.informes_resumen_por_libro as
select
  l.id as libro_id,
  l.titulo as libro_titulo,
  l.precio_a4 as libro_precio_a4,
  l.precio_a5 as libro_precio_a5,
  l.hojas as libro_hojas,
  count(p.id)::integer as total_pedidos,
  coalesce(sum(p.precio_cobrado), 0)::numeric(12,2) as total_a_cobrar,
  coalesce(sum(p.monto_cobrado), 0)::numeric(12,2) as total_cobrado,
  coalesce(sum(public.calcular_saldo(p.precio_cobrado, p.monto_cobrado)), 0)::numeric(12,2) as saldo_total,
  count(p.id) filter (where p.estado_impresion = 'Impreso')::integer as total_impresos,
  count(p.id) filter (where p.estado_entrega = 'Entregado')::integer as total_entregados,
  count(p.id) filter (
    where p.estado_entrega = 'Entregado'
      and public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) = 0
  )::integer as total_cerrados,
  coalesce(
    l.hojas * count(p.id) filter (where p.estado_impresion = 'Pendiente'),
    0
  )::integer as hojas_pendientes
from public.libros l
left join public.pedidos p on p.libro_id = l.id
where l.activo = true
group by l.id, l.titulo, l.precio_a4, l.precio_a5, l.hojas
order by l.titulo;

commit;

-- Supabase cachea el schema en la API REST: sin esto la app puede no ver las
-- columnas nuevas durante unos minutos.
notify pgrst, 'reload schema';


-- -----------------------------------------------------------------------------
-- PASO FINAL (solo lectura): verificar el resultado.
-- -----------------------------------------------------------------------------
-- Pedidos por tamaño:
-- select tamanio, count(*) from public.pedidos group by tamanio order by tamanio;
--
-- Libros activos sin precio A4 (hay que cargarlo desde la app o con la cotizacion):
-- select id, titulo, precio_a5 from public.libros
-- where activo and precio_a4 is null
-- order by titulo;

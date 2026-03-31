-- migración incremental para actualizar una base ya creada con el schema anterior
-- no inserta datos y no elimina registros existentes

create extension if not exists pgcrypto;

alter table if exists public.libros
  add column if not exists hojas integer generated always as (ceil(paginas::numeric / 2)) stored,
  add column if not exists observaciones text null;

alter table if exists public.pedidos
  add column if not exists fecha_impresion date null,
  add column if not exists fecha_entrega date null,
  add column if not exists fecha_pago date null;

create or replace function public.calcular_saldo(precio numeric, cobrado numeric)
returns numeric
language sql
immutable
as $$
  select greatest(precio - cobrado, 0);
$$;

drop view if exists public.informes_resumen_por_libro;
drop view if exists public.informes_resumen;
drop view if exists public.pedidos_detalle;

create view public.pedidos_detalle as
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
  p.updated_at
from public.pedidos p
join public.libros l on l.id = p.libro_id;

create view public.informes_resumen as
select
  count(*)::integer as total_pedidos,
  count(*) filter (where p.estado_impresion = 'Impreso')::integer as total_impresos,
  count(*) filter (where p.estado_pago = 'Pagado')::integer as total_pagados,
  count(*) filter (where public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0)::integer as total_con_saldo,
  coalesce(sum(public.calcular_saldo(p.precio_cobrado, p.monto_cobrado)), 0)::numeric(12, 2) as saldo_total,
  coalesce(sum(l.hojas) filter (where p.estado_impresion = 'Pendiente'), 0)::integer as hojas_pendientes
from public.pedidos p
join public.libros l on l.id = p.libro_id;

create view public.informes_resumen_por_libro as
select
  l.id as libro_id,
  l.titulo as libro_titulo,
  l.precio as libro_precio,
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
group by l.id, l.titulo, l.precio, l.hojas
order by l.titulo;

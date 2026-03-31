-- proyecto recomendado en supabase: imprenta-pedidos
-- nota: en supabase hosted este script no puede crear ni renombrar la base física.
-- el nombre del proyecto/base se define al crear el proyecto en supabase.
-- este archivo crea el schema funcional completo del sistema dentro del proyecto.

create extension if not exists pgcrypto;

do $$ begin
  create type public.estado_pago as enum ('Pendiente', 'Seña', 'Pagado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_impresion as enum ('Pendiente', 'Impreso');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_entrega as enum ('Pendiente', 'Entregado');
exception when duplicate_object then null; end $$;

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

create index if not exists idx_libros_activo on public.libros(activo);
create index if not exists idx_libros_titulo on public.libros(titulo);
create index if not exists idx_pedidos_libro_id on public.pedidos(libro_id);
create index if not exists idx_pedidos_alumno on public.pedidos(alumno);
create index if not exists idx_pedidos_estado_pago on public.pedidos(estado_pago);
create index if not exists idx_pedidos_estado_impresion on public.pedidos(estado_impresion);
create index if not exists idx_pedidos_estado_entrega on public.pedidos(estado_entrega);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_libros_updated_at on public.libros;
create trigger set_libros_updated_at
before update on public.libros
for each row
execute function public.set_updated_at();

drop trigger if exists set_pedidos_updated_at on public.pedidos;
create trigger set_pedidos_updated_at
before update on public.pedidos
for each row
execute function public.set_updated_at();

create or replace function public.calcular_saldo(precio numeric, cobrado numeric)
returns numeric
language sql
immutable
as $$
  select greatest(precio - cobrado, 0);
$$;

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
  p.updated_at
from public.pedidos p
join public.libros l on l.id = p.libro_id;

create or replace view public.informes_resumen as
select
  count(*)::integer as total_pedidos,
  count(*) filter (where p.estado_impresion = 'Impreso')::integer as total_impresos,
  count(*) filter (where p.estado_pago = 'Pagado')::integer as total_pagados,
  count(*) filter (where public.calcular_saldo(p.precio_cobrado, p.monto_cobrado) > 0)::integer as total_con_saldo,
  coalesce(sum(public.calcular_saldo(p.precio_cobrado, p.monto_cobrado)), 0)::numeric(12, 2) as saldo_total,
  coalesce(sum(l.hojas) filter (where p.estado_impresion = 'Pendiente'), 0)::integer as hojas_pendientes
from public.pedidos p
join public.libros l on l.id = p.libro_id;

create or replace view public.informes_resumen_por_libro as
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

alter table public.libros enable row level security;
alter table public.pedidos enable row level security;

drop policy if exists "authenticated can read libros" on public.libros;
create policy "authenticated can read libros"
on public.libros
for select
to authenticated
using (true);

drop policy if exists "authenticated can write libros" on public.libros;
create policy "authenticated can write libros"
on public.libros
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read pedidos" on public.pedidos;
create policy "authenticated can read pedidos"
on public.pedidos
for select
to authenticated
using (true);

drop policy if exists "authenticated can write pedidos" on public.pedidos;
create policy "authenticated can write pedidos"
on public.pedidos
for all
to authenticated
using (true)
with check (true);

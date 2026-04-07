-- ============================================================
-- Tabla: configuracion_insumos
-- Proposito: almacenar los costos de insumos de la imprenta.
-- Son editables por la usuaria desde la aplicacion.
-- Se usa para calcular el precio sugerido de cada libro.
--
-- Nota de diseno: se persisten los valores bulk (precio del
-- paquete + cantidad por paquete) por separado. El costo
-- unitario se deriva en el servicio Angular. Asi la usuaria
-- edita lo que realmente compra sin hacer divisiones mentales.
-- ============================================================

create table if not exists public.configuracion_insumos (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique,
  descripcion text not null,
  valor       numeric(12, 2) not null check (valor >= 0),
  unidad      text not null,
  updated_at  timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_configuracion_insumos_updated_at on public.configuracion_insumos;
create trigger trg_configuracion_insumos_updated_at
  before update on public.configuracion_insumos
  for each row execute function public.set_updated_at();

alter table public.configuracion_insumos enable row level security;

drop policy if exists "Autenticados pueden leer insumos" on public.configuracion_insumos;
create policy "Autenticados pueden leer insumos"
  on public.configuracion_insumos for select
  to authenticated using (true);

drop policy if exists "Autenticados pueden editar insumos" on public.configuracion_insumos;
create policy "Autenticados pueden editar insumos"
  on public.configuracion_insumos for update
  to authenticated using (true);

insert into public.configuracion_insumos (clave, descripcion, valor, unidad) values
  ('tapa_paquete', 'Tapas A4 (paquete)', 6500, 'ARS x 50 unidades'),
  ('tapa_cantidad', 'Tapas por paquete', 50, 'unidades'),
  ('espiral_paquete', 'Espirales (paquete)', 4895, 'ARS x 50 unidades'),
  ('espiral_cantidad', 'Espirales por paquete', 50, 'unidades'),
  ('hojas_resma', 'Hojas A4 (10 resmas)', 49720, 'ARS x 10 resmas'),
  ('hojas_cantidad', 'Hojas por resma', 500, 'hojas por resma'),
  ('toner_costo', 'Toner individual', 160000, 'ARS x cartucho'),
  ('toner_impresiones', 'Impresiones por juego de toner', 22000, 'caras impresas')
on conflict (clave) do update
set
  descripcion = excluded.descripcion,
  valor = excluded.valor,
  unidad = excluded.unidad;

-- ============================================================
-- Tabla: configuracion_insumos
-- Proposito: almacenar los costos de insumos de la imprenta.
-- Son editables por la usuaria desde la aplicacion.
-- Es la unica fuente de costos, margenes y datos del mensaje del
-- cotizador (ver "Modelo de costos" en docs/01-context.md).
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
  -- solo para insumos de texto (whatsapp_contacto, whatsapp_firma); valor queda en 0.
  valor_texto text null,
  -- puede incluir {clave} para mostrar el valor actual de otro insumo.
  unidad      text not null,
  updated_at  timestamptz not null default timezone('utc', now())
);

alter table public.configuracion_insumos
  add column if not exists valor_texto text null;

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

insert into public.configuracion_insumos (clave, descripcion, valor, valor_texto, unidad) values
  ('tapa_paquete', 'Tapas A4 (paquete)', 7900, null, 'ARS x {tapa_cantidad} unidades'),
  ('tapa_a5_paquete', 'Tapas A5 (paquete)', 3950, null, 'ARS x {tapa_cantidad} unidades'),
  ('tapa_cantidad', 'Tapas por paquete', 50, null, 'unidades'),
  ('espiral_paquete', 'Espirales (paquete)', 6700, null, 'ARS x {espiral_cantidad} unidades'),
  ('espiral_cantidad', 'Espirales por paquete', 50, null, 'unidades'),
  ('espiral_max_hojas', 'Hojas máximas por espiral', 85, null, 'hojas'),
  ('hojas_resma', 'Hojas A4 (10 resmas)', 59000, null, 'ARS x 10 resmas'),
  ('hojas_cantidad', 'Hojas por resma', 500, null, 'hojas por resma'),
  -- deprecadas: el modelo de costos usa toner_negro_* y toner_color_*.
  ('toner_costo', 'Toner individual (deprecado)', 160000, null, 'ARS x 1 cartucho'),
  ('toner_impresiones', 'Impresiones por juego de toner (deprecado)', 22000, null, 'caras impresas'),
  ('toner_negro_costo', 'Toner negro (cartucho)', 166000, null, 'ARS x 1 cartucho'),
  ('toner_negro_rinde', 'Rendimiento toner negro', 24000, null, 'caras al 5% de cobertura'),
  ('toner_color_costo', 'Toner color (cada cartucho)', 330000, null, 'ARS x 1 cartucho (C, M o Y)'),
  ('toner_color_rinde', 'Rendimiento toner color', 21000, null, 'caras al 5% de cobertura'),
  ('toner_factor_rendimiento', 'Factor de rendimiento real', 1, null, '1 = nominal, 0,8 = conservador'),
  ('cobertura_bn_negro', 'Página B/N: % de negro', 5, null, '%'),
  ('cobertura_poco_negro', 'Texto con poco color: % de negro', 5, null, '%'),
  ('cobertura_poco_color', 'Texto con poco color: % de cada color', 2, null, '%'),
  ('cobertura_pleno_negro', 'Color pleno: % de negro', 5, null, '%'),
  ('cobertura_pleno_color', 'Color pleno: % de cada color', 5, null, '%'),
  ('margen_default', 'Margen de ganancia por defecto', 150, null, '% sobre costo'),
  ('margen_minimo', 'Margen mínimo (alerta por debajo)', 60, null, '% sobre costo'),
  ('precio_redondeo', 'Redondear precio a múltiplos de', 50, null, 'ARS'),
  ('descuento_cantidad_pct', 'Descuento por cantidad (0 = no mostrar)', 12, null, '%'),
  ('descuento_cantidad_minima', 'Cantidad mínima para el descuento', 15, null, 'unidades'),
  ('whatsapp_contacto', 'WhatsApp de contacto', 0, '3874094328', 'número'),
  ('whatsapp_firma', 'Firma del mensaje', 0, 'Emilse', 'texto')
on conflict (clave) do update
set
  descripcion = excluded.descripcion,
  valor = excluded.valor,
  valor_texto = excluded.valor_texto,
  unidad = excluded.unidad;

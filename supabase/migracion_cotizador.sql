-- =============================================================================
-- Migracion: cotizador de libros (modelo de costos real)
-- Fecha: 2026-10-09
--
-- Que hace:
--   1. configuracion_insumos: agrega valor_texto para los insumos de texto
--      (whatsapp_contacto, whatsapp_firma). valor sigue siendo numeric y en
--      esas filas queda en 0.
--   2. configuracion_insumos: las unidades de tapa_paquete y espiral_paquete
--      pasan a leer la cantidad actual ({tapa_cantidad}, {espiral_cantidad})
--      si todavia tienen el texto fijo "ARS x N unidades". La app reemplaza el
--      marcador por el valor vigente.
--   3. configuracion_insumos: corrige la etiqueta de toner_costo (el valor es
--      el precio de UN cartucho, ver docs/08-known-issues.md) y marca
--      toner_costo y toner_impresiones como deprecadas. La app las oculta.
--   4. configuracion_insumos: inserta las 19 claves nuevas del cotizador.
--      ON CONFLICT DO NOTHING: no pisa valores ya cargados.
--   5. libros: agrega tipo_impresion y paginas_color, y el margen por defecto
--      pasa a 150. Los libros existentes quedan en 'poco_color'.
--   6. Verifica que esten todas las claves que usa el modelo de costos. Si
--      falta alguna, RAISE EXCEPTION y se revierte todo.
--
-- No toca precios de libros, pedidos ni valores de insumos existentes.
-- Las politicas RLS no cambian (lectura y actualizacion para autenticados).
--
-- Orden de despliegue: ejecutar este script y despues publicar la app. La app
-- anterior ignora las columnas y claves nuevas, asi que puede convivir con la
-- base migrada.
--
-- Se puede reejecutar: cada paso verifica si ya fue aplicado.
-- =============================================================================


begin;

-- 1. Insumos de texto ----------------------------------------------------------
alter table public.configuracion_insumos
  add column if not exists valor_texto text null;


-- 2. Unidades que dependen de la cantidad por paquete ----------------------------
update public.configuracion_insumos
set unidad = 'ARS x {tapa_cantidad} unidades'
where clave = 'tapa_paquete'
  and unidad ~ '^ARS x [0-9]+ unidades$';

update public.configuracion_insumos
set unidad = 'ARS x {espiral_cantidad} unidades'
where clave = 'espiral_paquete'
  and unidad ~ '^ARS x [0-9]+ unidades$';


-- 3. Toner viejo: etiqueta correcta y deprecado ----------------------------------
update public.configuracion_insumos
set descripcion = 'Toner individual (deprecado)',
    unidad = 'ARS x 1 cartucho'
where clave = 'toner_costo';

update public.configuracion_insumos
set descripcion = 'Impresiones por juego de toner (deprecado)'
where clave = 'toner_impresiones';


-- 4. Claves nuevas -------------------------------------------------------------
insert into public.configuracion_insumos (clave, descripcion, valor, valor_texto, unidad) values
  ('espiral_max_hojas',         'Hojas máximas por espiral',                85,     null,         'hojas'),
  ('tapa_a5_paquete',           'Tapas A5 (paquete)',                       3950,   null,         'ARS x {tapa_cantidad} unidades'),
  ('toner_negro_costo',         'Toner negro (cartucho)',                   166000, null,         'ARS x 1 cartucho'),
  ('toner_negro_rinde',         'Rendimiento toner negro',                  24000,  null,         'caras al 5% de cobertura'),
  ('toner_color_costo',         'Toner color (cada cartucho)',              330000, null,         'ARS x 1 cartucho (C, M o Y)'),
  ('toner_color_rinde',         'Rendimiento toner color',                  21000,  null,         'caras al 5% de cobertura'),
  ('toner_factor_rendimiento',  'Factor de rendimiento real',               1,      null,         '1 = nominal, 0,8 = conservador'),
  ('cobertura_bn_negro',        'Página B/N: % de negro',                   5,      null,         '%'),
  ('cobertura_poco_negro',      'Texto con poco color: % de negro',         5,      null,         '%'),
  ('cobertura_poco_color',      'Texto con poco color: % de cada color',    2,      null,         '%'),
  ('cobertura_pleno_negro',     'Color pleno: % de negro',                  5,      null,         '%'),
  ('cobertura_pleno_color',     'Color pleno: % de cada color',             5,      null,         '%'),
  ('margen_default',            'Margen de ganancia por defecto',           150,    null,         '% sobre costo'),
  ('margen_minimo',             'Margen mínimo (alerta por debajo)',        60,     null,         '% sobre costo'),
  ('precio_redondeo',           'Redondear precio a múltiplos de',          50,     null,         'ARS'),
  ('descuento_cantidad_pct',    'Descuento por cantidad (0 = no mostrar)',  12,     null,         '%'),
  ('descuento_cantidad_minima', 'Cantidad mínima para el descuento',        15,     null,         'unidades'),
  ('whatsapp_contacto',         'WhatsApp de contacto',                     0,      '3874094328', 'número'),
  ('whatsapp_firma',            'Firma del mensaje',                        0,      'Emilse',     'texto')
on conflict (clave) do nothing;


-- 5. Libros: tipo de impresion, paginas a color y margen por defecto --------------
alter table public.libros
  add column if not exists tipo_impresion text not null default 'poco_color'
    check (tipo_impresion in ('bn', 'poco_color', 'color_pleno', 'mixto'));

alter table public.libros
  add column if not exists paginas_color integer not null default 0
    check (paginas_color >= 0);

-- Las paginas a color nunca pueden superar las del libro.
alter table public.libros drop constraint if exists libros_paginas_color_max_check;
alter table public.libros
  add constraint libros_paginas_color_max_check check (paginas_color <= paginas);

alter table public.libros alter column margen_ganancia set default 150;


-- 6. Verificacion: si falta una clave, se revierte todo --------------------------
do $$
declare
  claves_esperadas constant text[] := array[
    'hojas_resma', 'hojas_cantidad',
    'espiral_paquete', 'espiral_cantidad', 'espiral_max_hojas',
    'tapa_paquete', 'tapa_a5_paquete', 'tapa_cantidad',
    'toner_negro_costo', 'toner_negro_rinde',
    'toner_color_costo', 'toner_color_rinde', 'toner_factor_rendimiento',
    'cobertura_bn_negro', 'cobertura_poco_negro', 'cobertura_poco_color',
    'cobertura_pleno_negro', 'cobertura_pleno_color',
    'margen_default', 'margen_minimo', 'precio_redondeo',
    'descuento_cantidad_pct', 'descuento_cantidad_minima',
    'whatsapp_contacto', 'whatsapp_firma'
  ];
  encontradas integer;
  faltantes text;
begin
  select count(*) into encontradas
  from public.configuracion_insumos
  where clave = any (claves_esperadas);

  if encontradas <> array_length(claves_esperadas, 1) then
    select string_agg(esperada, ', ') into faltantes
    from unnest(claves_esperadas) as esperada
    where not exists (
      select 1 from public.configuracion_insumos c where c.clave = esperada
    );

    raise exception 'Faltan claves en configuracion_insumos: %. No se aplico ningun cambio.', faltantes;
  end if;
end $$;

commit;


-- Control posterior (solo lectura) ---------------------------------------------
-- select clave, descripcion, valor, valor_texto, unidad
-- from public.configuracion_insumos
-- order by clave;
--
-- select tipo_impresion, count(*) from public.libros group by tipo_impresion;

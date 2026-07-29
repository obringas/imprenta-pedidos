-- =============================================================================
-- Insert de pedidos para "Bajo el jacaranda - Margara Averbach" — 6to B
-- libro_id: e44953e8-a985-443e-8014-e9cf944f7f25
-- precio_cobrado: se toma de libros.precio (no se hardcodea)
-- =============================================================================

begin;

insert into public.pedidos
  (libro_id, alumno, division, precio_cobrado, estado_impresion, estado_entrega, estado_pago, monto_cobrado)
select
  l.id, a.alumno, '6B', l.precio, 'Pendiente', 'Pendiente', 'Pendiente', 0
from public.libros l
cross join (values
  ('Oli P'),
  ('Fabian Prentice'),
  ('Bauti Pérez'),
  ('Irina Duarte'),
  ('Sofi Sardi'),
  ('Thomas Bozovich'),
  ('Maia Choque'),
  ('Teo Fonteñez'),
  ('Martin Clark'),
  ('Flor Saravia'),
  ('Vicky Assaf'),
  ('Gregorio Crespo'),
  ('León Mendieta'),
  ('Martina Herrera'),
  ('Valentín Esliman'),
  ('Manuel Hubaide'),
  ('Cata Ontiveros'),
  ('Ian Col'),
  ('Otto Wituslavsky'),
  ('Guadalupe Rionda'),
  ('Jeremias Miguens')
) as a(alumno)
where l.id = 'e44953e8-a985-443e-8014-e9cf944f7f25';

commit;

-- =============================================================================
-- Verificación: estado completo de pedidos del 6B
-- =============================================================================
select alumno, division, precio_cobrado, estado_pago
from public.pedidos
where libro_id = 'e44953e8-a985-443e-8014-e9cf944f7f25'
  and division = '6B'
order by alumno;
-- Esperado: 21 filas

select count(*) as total_pedidos, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = 'e44953e8-a985-443e-8014-e9cf944f7f25'
  and division = '6B';

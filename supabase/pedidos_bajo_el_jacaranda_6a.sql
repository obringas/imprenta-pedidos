-- =============================================================================
-- Insert de pedidos para "Bajo el jacaranda - Margara Averbach" — 6to A
-- libro_id: e44953e8-a985-443e-8014-e9cf944f7f25 (mismo libro que 6to B)
-- precio_cobrado: se toma de libros.precio (no se hardcodea)
-- =============================================================================

begin;

insert into public.pedidos
  (libro_id, alumno, division, precio_cobrado, estado_impresion, estado_entrega, estado_pago, monto_cobrado)
select
  l.id, a.alumno, '6A', l.precio, 'Pendiente', 'Pendiente', 'Pendiente', 0
from public.libros l
cross join (values
  ('Cata Arqued'),
  ('Gino Lóndero'),
  ('Dylan Macias'),
  ('Balta Moreno'),
  ('Ciro Bidone'),
  ('Sofi Lescano'),
  ('Josefina Zerpa'),
  ('Emma Yarade'),
  ('Pedro Barberá'),
  ('Marcos Gomez'),
  ('Joel Turco'),
  ('Gemma Peruyera Elías'),
  ('Benicio Lucci')
) as a(alumno)
where l.id = 'e44953e8-a985-443e-8014-e9cf944f7f25';

commit;

-- =============================================================================
-- Verificación: estado completo de pedidos del 6A
-- =============================================================================
select count(*) as total, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = 'e44953e8-a985-443e-8014-e9cf944f7f25'
  and division = '6A';
-- Esperado: 13 pedidos

select alumno, division, precio_cobrado, estado_pago
from public.pedidos
where libro_id = 'e44953e8-a985-443e-8014-e9cf944f7f25'
  and division = '6A'
order by alumno;

-- Control por division del mismo libro: deberia dar 6A=13 y 6B=21
select division, count(*) as pedidos, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = 'e44953e8-a985-443e-8014-e9cf944f7f25'
group by division
order by division;

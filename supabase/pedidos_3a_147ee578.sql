-- =============================================================================
-- Insert de pedidos para el libro 147ee578-03e3-4c2c-b13b-74bb10b7c395 — 3ro A
-- 33 alumnos
-- precio_cobrado: se toma de libros.precio (no se hardcodea)
--
-- Nota: el pedido de Mileka Levy Cein venia marcado "(A4)" en la lista. Se
-- guarda como observacion del pedido, no como parte del nombre.
-- =============================================================================

begin;

insert into public.pedidos
  (libro_id, alumno, division, precio_cobrado, estado_impresion, estado_entrega, estado_pago, monto_cobrado, observaciones)
select
  l.id, a.alumno, '3A', l.precio, 'Pendiente', 'Pendiente', 'Pendiente', 0, a.observaciones
from public.libros l
cross join (values
  ('Leonella Martinez Romegialli', null),
  ('Antonio Martínez',             null),
  ('Bauti Gutierraz',              null),
  ('Bauti Lopez',                  null),
  ('Malala Vargas',                null),
  ('Jeremías Bustos',              null),
  ('Agustín Vaca',                 null),
  ('Franco Armata',                null),
  ('Emma Gallegos',                null),
  ('Eluney Alvares',               null),
  ('Delfina Antonelli',            null),
  ('Samuel Guzman',                null),
  ('Martina Barreira',             null),
  ('Olivia Ferlatti',              null),
  ('Clarita Montaño',              null),
  ('Berenice Flores',              null),
  ('Cande Montaño',                null),
  ('Maximo de Muñoz',              null),
  ('Julieta Garzón',               null),
  ('Joaquín Villar',               null),
  ('Benja Pérez',                  null),
  ('Lola García',                  null),
  ('Lara Pachao',                  null),
  ('Jazmín Vaca',                  null),
  ('Manuel Canda',                 null),
  ('Galo Zurita',                  null),
  ('Benja Robles',                 null),
  ('Bauty Collar',                 null),
  ('Amelia Oliva',                 null),
  ('Belisario Oliva',              null),
  ('Zoe Martínez',                 null),
  ('Mileka Levy Cein',             'A4'),
  ('Patricio Comune',              null)
) as a(alumno, observaciones)
where l.id = '147ee578-03e3-4c2c-b13b-74bb10b7c395';

commit;

-- =============================================================================
-- Verificación: estado completo de pedidos del 3A
-- =============================================================================
select count(*) as total, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = '147ee578-03e3-4c2c-b13b-74bb10b7c395'
  and division = '3A';
-- Esperado: 33 pedidos

select alumno, division, precio_cobrado, estado_pago, observaciones
from public.pedidos
where libro_id = '147ee578-03e3-4c2c-b13b-74bb10b7c395'
  and division = '3A'
order by alumno;

-- Control por division del mismo libro
select division, count(*) as pedidos, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = '147ee578-03e3-4c2c-b13b-74bb10b7c395'
group by division
order by division;

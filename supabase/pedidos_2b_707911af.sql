-- =============================================================================
-- Insert de pedidos para el libro 707911af-3427-4f10-bf44-1a081b01e8f1 — 2do B
-- precio_cobrado: se toma de libros.precio (no se hardcodea)
-- =============================================================================

begin;

insert into public.pedidos
  (libro_id, alumno, division, precio_cobrado, estado_impresion, estado_entrega, estado_pago, monto_cobrado)
select
  l.id, a.alumno, '2B', l.precio, 'Pendiente', 'Pendiente', 'Pendiente', 0
from public.libros l
cross join (values
  ('Emma'),
  ('Maryam'),
  ('Milo'),
  ('Delfi'),
  ('Juan Ignacio'),
  ('Sofia'),
  ('Paulo'),
  ('Amadeo'),
  ('Beni Gimenez'),
  ('Mateo Portillo'),
  ('Pedro L'),
  ('Tomas L'),
  ('Barto'),
  ('Catalina Esliman'),
  ('Laia'),
  ('Alina'),
  ('Olivia Saravia'),
  ('Sol'),
  ('Felipe Rodríguez'),
  ('Olivia Gottling')
) as a(alumno)
where l.id = '707911af-3427-4f10-bf44-1a081b01e8f1';

commit;

-- =============================================================================
-- Verificación: estado completo de pedidos del 2B
-- =============================================================================
select count(*) as total, sum(precio_cobrado) as total_a_cobrar
from public.pedidos
where libro_id = '707911af-3427-4f10-bf44-1a081b01e8f1'
  and division = '2B';
-- Esperado: 20 pedidos

select alumno, division, precio_cobrado, estado_pago
from public.pedidos
where libro_id = '707911af-3427-4f10-bf44-1a081b01e8f1'
  and division = '2B'
order by alumno;

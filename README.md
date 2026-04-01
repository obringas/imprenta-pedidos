# ImprentaPedidos

Aplicación Angular para gestionar pedidos de impresión, libros, cobros e informes operativos de una imprenta.

## Stack

- Angular 19 con standalone components y signals
- Supabase para datos y autenticación
- PWA orientada a uso móvil

## Comandos

```bash
npm install
npm run start
npm run build
```

## Módulos principales

### Pedidos

- Alta y edición de pedidos por alumno y libro.
- El libro se selecciona por defecto al crear un pedido si hay libros activos.
- El precio del libro se copia automáticamente al pedido al seleccionarlo, pero sigue siendo editable.
- El avance rápido de pago desde listados e informes ahora alterna entre `Pendiente` y `Pagado`.
- En el formulario de pedido, la opción visual principal de pago es `Pagado`.
- La gestión de impresión y entrega sigue disponible desde listado, detalle e informes.

### Libros

- Catálogo de libros con precio y cantidad de hojas.
- Los pedidos conservan su precio aunque después cambie el libro.

### Informes

- Resumen operativo con KPIs generales.
- Avance por libro con columnas de:
  - `Total pedidos`
  - `Impresos`
  - `Pagados`
  - `Por cobrar`
  - `Cerrados`
  - `Hojas pendientes`
- Informe `Sin pagar` con filtro por libro.
- Informe `Faltan imprimir` con filtro por libro.

## Comportamientos recientes

- En móvil, la pantalla de pedidos muestra el total real del filtro y aclara cuántos pedidos se están mostrando en la página actual.
- Se corrigieron problemas de encoding en textos de la pantalla de pedidos e informes.

## Build verificado

Últimos cambios verificados con:

```bash
npm.cmd run build
```
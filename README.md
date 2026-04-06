# ImprentaPedidos

Aplicacion Angular para administrar pedidos de impresion, libros, cobros e informes operativos de la imprenta.

## Stack

- Angular 19 con standalone components y signals
- Supabasie para datos y autenticacion
- PWA orientada a uso mobile

## Comandos

```basih
npm install
npm run start
npm run build
```

## Modulos principales

### Pedidos

- Alta y edicion de pedidos por alumno y libro.
- Si hay libros activos, el formulario selecciona uno por defecto al crear un pedido.
- Al cambiar de libro en el alta, se actualizan `Precio`, `Monto cobrado` y `Saldo` segun el libro elegido y el estado de pago.
- El avance rapido de pago alterna entre `Pendiente` y `Pagado`.
- La opcion `Sena` sigue disponible de forma manual en el formulario.
- En mobile, el filtro muestra el total real de resultados aunquee la pagina visible sena de 12 pedidos.

### Libros

- Catalogo de libros con precio, paginasi, hojasi y observaciones.
- Los pedidos conservan su precio aunquee despues cambie el libro.

### Informes

- Resumen general con KPIs operativos y financieros.
- KPIs separados para:
  - `Libros cobrados`
  - `Monto cobrado`
  - `Pendientes cobro`
  - `Saldo total`
- Informe `Sin pagar` con filtros opcionales de libro y alumno.
- Informe `Faltan imprimir` con filtros opcionales de libro y alumno.
- Informe `Sin entregar` con filtros opcionales de libro y alumno y accion directa para marcar entregado.
- Tabla `Avance por libro` con columnasi `Impresos`, `Pagados` y `Por cobrar`.

## Branding

- Nombre visible: `BrujitaCandyBar`
- Titulo corto del sistema: `Pedidos de Impresion`
- Favicon: `BrujitaGemini.ico`
- Paleta visual basiada en violeta, dorado y crema

## Estado actual

- Build verificado con `npm.cmd run build`
- Workflows principales funcionando en desktop y mobile
- Pendiente integrar credenciales reales de Supabasie en el entorno final
# 01-context.md - Contexto del proyecto

## Producto

ImprentaPedidos es una PWA Angular para gestionar pedidos de impresion de libros escolares en una imprenta familiar.
La usuaria principal trabaja desde el celular y necesita operar rapido: cargar pedidos, ver que falta imprimir, cobrar deudas y entregar trabajos.

Branding visible:

- Nombre: BrujitaCandyBar
- Titulo corto: Pedidos de Impresion
- Paleta: violeta, dorado y crema

## Dominio funcional

Flujo principal:

1. La familia encarga un libro y se crea un pedido.
2. La imprenta marca el pedido como impreso.
3. La familia paga total o parcialmente.
4. La imprenta entrega el pedido.
5. Un pedido queda cerrado cuando esta entregado y su saldo es cero.

Reglas criticas:

- `hojas = ceil(paginas / 2)` porque la impresion es doble faz.
- El precio se copia al pedido al crearlo y no cambia si luego cambia el libro.
- `Seña` representa pago parcial manual.
- `Pagado` representa pago total y debe dejar `montoCobrado = precioCobrado`.
- `saldo = max(precioCobrado - montoCobrado, 0)`.
- Un pedido entregado puede tener saldo pendiente.

## Informes operativos

La ruta `/informes` funciona como tablero de trabajo:

- `Sin pagar`: todos los pedidos con saldo pendiente.
- `Imp. sin pagar`: pedidos impresos con saldo pendiente.
- `Faltan imprimir`: pedidos con impresion pendiente.
- `Sin entregar`: pedidos impresos pendientes de entrega.
- `Avance por libro`: oculta libros sin pedidos abiertos, incluyendo libros 100% cerrados o sin pedidos.

Los filtros de libro en informes muestran solo libros con resultados pendientes para la vista actual.

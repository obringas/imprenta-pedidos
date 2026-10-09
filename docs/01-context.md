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
- El A5 se imprime 2-up sobre hoja A4 cortada (dos paginas A5 por cara).
- Cada libro tiene precio A4 y precio A5. Cada pedido tiene un tamaño (`A4` o `A5`); por defecto es A5.
- El precio se copia al pedido al crearlo, segun su tamaño, y no cambia si luego cambia el libro. Si se cambia el tamaño de un pedido, se trae el precio vigente del libro para el nuevo tamaño.
- En la carga masiva, una nota `(A4)` o `(A5)` al final de la linea define el tamaño de ese alumno.
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
Pedidos, informes y listados por curso se pueden filtrar por tamaño.

## Cotizador

La ruta `/cotizador` arma presupuestos para el grupo del colegio:

1. Se tildan uno o varios libros activos (o se carga uno nuevo, que vuelve tildado).
2. El **margen general** (input y slider 0..300 %) arranca en `margen_default` y es la variable de negociacion. Cada libro puede tener su propio margen ("fijado"), que deja de seguir al general hasta que se lo vuelve a sincronizar.
3. Por tamaño se puede escribir un **precio objetivo** (por ejemplo, el de la competencia): el precio sale de ahi y se muestran el margen y la ganancia que deja.
4. Debajo de `margen_minimo` la tarjeta se marca en rojo y "Aplicar precios" pide confirmacion.
5. "Aplicar precios" guarda `precio_a4`, `precio_a5` y el margen usado en el libro. Los pedidos ya cargados no cambian.
6. El mensaje de WhatsApp se arma en vivo con los precios que se ven, se puede retocar y se copia o se abre en WhatsApp.

`margen_default` es solo el punto de partida: cambiarlo no toca libros ni pedidos. `libros.margen_ganancia` guarda el margen con el que se aplicaron los precios de ese libro.

## Modelo de costos

Todos los valores salen de `/configuracion/insumos` (`configuracion_insumos`); no hay costos ni margenes en el codigo. Las funciones son puras y estan en `src/app/features/cotizador/domain/` (`derivarCostosUnitarios`, `cotizarLibro`).

### Costos unitarios

| Costo | Formula | Con los valores al 2026-10-09 |
|---|---|---|
| Hoja A4 | `hojas_resma / (hojas_cantidad * 10)` | 59.000 / 5.000 = $11,80 |
| Espiral | `espiral_paquete / espiral_cantidad` | 6.700 / 50 = $134 |
| Tapa A4 | `tapa_paquete / tapa_cantidad` | 7.900 / 50 = $158 |
| Tapa A5 | `tapa_a5_paquete / tapa_cantidad` | 3.950 / 50 = $79 |
| Negro al 5 % | `toner_negro_costo / (toner_negro_rinde * toner_factor_rendimiento)` | 166.000 / 24.000 = $6,9167 |
| Cada color al 5 % | `toner_color_costo / (toner_color_rinde * toner_factor_rendimiento)` | 330.000 / 21.000 = $15,7143 |

El costo de toner de una cara es `negroPor5 * (coberturaNegro / 5) + 3 * colorPor5 * (coberturaColor / 5)`, con la cobertura de cada tipo de pagina:

| Tipo | Negro | Cada color | Por cara |
|---|---|---|---|
| B/N (`bn`) | `cobertura_bn_negro` 5 % | 0 | $6,92 |
| Texto con poco color (`poco_color`) | `cobertura_poco_negro` 5 % | `cobertura_poco_color` 2 % | $25,77 |
| Color pleno (`color_pleno`) | `cobertura_pleno_negro` 5 % | `cobertura_pleno_color` 5 % | $54,06 |
| Mixto (`mixto`) | `paginasColor` caras a color pleno, el resto B/N | | |

### Costo de un ejemplar

- Siempre doble faz: 1 pagina = 1 cara. `hojasFisicas = ceil(paginas / 2)`.
- `tomos = max(1, ceil(hojasFisicas / espiral_max_hojas))`: espiral y tapa se cobran por tomo.
- A4: papel = `hojasFisicas` hojas, toner = `paginas` caras, tapa A4.
- A5 (2-up sobre A4 cortada): papel = `ceil(paginas / 4)` hojas A4, toner = la mitad del A4, tapa A5. Hojas y tomos no cambian.
- `costo = papel + toner + espiral + tapa`.

### Precio

- Por margen: `precio = costo * (1 + margen / 100)`, redondeado **hacia arriba** a multiplos de `precio_redondeo`, para no quedar nunca debajo del margen elegido.
- Con precio objetivo: `precio = precio objetivo` (redondeado igual) y el margen sale de el: `margenSobreCosto = (precio / costo - 1) * 100`.
- Precio por cantidad: `precio * (1 - descuento_cantidad_pct / 100)`, redondeado **hacia abajo**, para que el descuento nunca sea menor al anunciado. No se muestra si el descuento es 0 y nunca se guarda.
- `ganancia = precio - costo`; `margenSobreVenta = 1 - costo / precio`. El margen que se muestra es el del precio final, ya redondeado.
- `bajoMinimo = margenSobreCosto < margen_minimo`.

### Ejemplo: 130 paginas, texto con poco color, margen 150 %

| | A4 | A5 |
|---|---|---|
| Hojas fisicas / tomos | 65 / 1 | 65 / 1 |
| Papel | 65 x 11,80 = $767,00 | ceil(130 / 4) = 33 x 11,80 = $389,40 |
| Toner | 130 x 25,7738 = $3.350,60 | 3.350,60 / 2 = $1.675,30 |
| Espiral | $134 | $134 |
| Tapa | $158 | $79 |
| **Costo** | **$4.409,60** | **$2.277,70** |
| Costo x 2,5 | $11.023,99 | $5.694,24 |
| **Precio** (hacia arriba a $50) | **$11.050** | **$5.700** |
| Precio por cantidad (-12 %, hacia abajo a $50) | 9.724 → **$9.700** | 5.016 → **$5.000** |
| Ganancia | $6.640,40 | $3.422,30 |
| Margen sobre costo / sobre venta | 150,6 % / 60,1 % | 150,3 % / 60,0 % |

Si en vez del margen se escribe un precio objetivo A4 de $9.000, el margen queda en 104,1 % y la ganancia en $4.590. Con $6.500 el margen baja a 47,4 % y la tarjeta se marca por estar debajo del 60 % minimo.

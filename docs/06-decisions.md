# 06-decisions.md - Decisiones arquitectonicas

## ADR-0001 - Informes como tablero operativo

### Fecha
2026-05-07

### Estado
Aceptada

### Contexto
La usuaria necesita vistas claras para decidir que cobrar, imprimir y entregar. Mostrar pedidos o libros ya cerrados agrega ruido operativo.

### Decision
Los informes operativos muestran trabajo pendiente:

- `Sin pagar` se basa en `saldo > 0`.
- `Imp. sin pagar` se basa en `estadoImpresion = 'Impreso'` y `saldo > 0`.
- `Faltan imprimir` se basa en `estadoImpresion = 'Pendiente'`.
- `Sin entregar` se basa en pedidos impresos con entrega pendiente.
- El avance por libro oculta libros 100% cerrados o sin pedidos.
- El filtro de libro en informes lista solo libros con resultados para la vista actual.

### Consecuencias
La pantalla de informes queda mas enfocada en accion inmediata. La informacion historica cerrada deja de aparecer en estas vistas y, si se necesita auditar historial, deberia resolverse con una vista separada.

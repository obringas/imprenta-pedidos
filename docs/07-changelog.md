# 07-changelog.md - Memoria de cambios

## [2026-05-07] - Agente: Codex

### Cambios
- Ajuste de informes para separar deuda total, deuda impresa y pendientes operativos.
- `Sin pagar` ahora lista todos los pedidos con saldo pendiente.
- Se agrego `Imp. sin pagar` para pedidos impresos con saldo pendiente.
- `Marcar pagado` desde informes fuerza pago total y deja saldo en cero.
- El avance por libro oculta libros 100% cerrados o sin pedidos.
- El filtro de libro en informes muestra solo libros con resultados para la vista actual.

### Motivo
Hacer que la pantalla de informes funcione como tablero operativo claro: cobrar deuda real, distinguir lo ya impreso pendiente de pago, y ocultar trabajo ya cerrado.

### Archivos afectados
- `src/app/features/informes/state/informes.facade.ts`
- `src/app/features/informes/ui/pages/informes.page.ts`
- `src/app/features/pedidos/state/pedidos.facade.ts`
- `docs/CONTEXT.md`
- `docs/prompt_codex_final.md`

### Decisiones tomadas
No se cambio el schema de base de datos. Los nuevos informes se derivan desde los pedidos ya cargados en el facade, manteniendo los filtros en la capa de estado de informes.

### Validaciones realizadas
- `npm.cmd run build`

### Pendientes / Follow-ups
- Normalizar la carpeta `docs` al esquema nuevo indicado por `AGENTS.md` si se decide adoptar ese protocolo completo.

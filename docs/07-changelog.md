# 07-changelog.md - Memoria de cambios

## [2026-05-07] - Agente: Codex

### Cambios
- Normalizacion de estructura documental con archivos `01` a `08`.
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
- `docs/README.md`
- `docs/01-context.md`
- `docs/02-architecture.md`
- `docs/03-setup.md`
- `docs/04-conventions.md`
- `docs/05-ai-rules.md`
- `docs/06-decisions.md`
- `docs/07-changelog.md`
- `docs/08-known-issues.md`

### Decisiones tomadas
No se cambio el schema de base de datos. Los nuevos informes se derivan desde los pedidos ya cargados en el facade, manteniendo los filtros en la capa de estado de informes.
Se adopto la estructura documental numerada solicitada por `AGENTS.md`, manteniendo referencias heredadas mientras se completa la fusion documental.

### Validaciones realizadas
- `npm.cmd run build`

### Pendientes / Follow-ups
- Fusionar gradualmente documentos heredados en los archivos numerados y moverlos a `docs/_legacy/` cuando se confirme la migracion completa.

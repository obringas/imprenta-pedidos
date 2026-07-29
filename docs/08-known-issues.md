# 08-known-issues.md - Bugs conocidos y deuda tecnica

## Tipos Supabase incompletos para `informes_resumen`

### Fecha
2026-04-16

### Descripcion
`database.types.ts` no tipa la vista `informes_resumen`, aunque el SQL principal la define.

### Impacto
Medio.

### Modulo afectado
`src/app/core/supabase/database.types.ts`

### Recomendacion
Regenerar tipos con `supabase gen types` cuando esten disponibles las credenciales reales de Supabase.

## Credenciales reales de Supabase pendientes

### Fecha
2026-04-16

### Descripcion
El proyecto necesita configurar credenciales reales para validar login, persistencia final y generacion de tipos.

### Impacto
Alto.

### Modulo afectado
Configuracion de entorno y repositorios Supabase.

### Recomendacion
Cargar credenciales reales en environment seguro y validar flujos principales contra Supabase.

## Sin unique constraint en pedidos por libro y alumno

### Fecha
2026-07-29

### Descripcion
`public.pedidos` no tiene unique constraint sobre `(libro_id, alumno)`. Nada impide cargar dos veces el mismo pedido para el mismo alumno y libro, ni desde la UI ni por SQL. Los scripts de carga masiva tienen que protegerse solos con `where not exists`.

### Impacto
Medio.

### Modulo afectado
`supabase/imprenta-pedidos.sql`, `src/app/features/pedidos/data/pedidos.repository.ts`

### Recomendacion
Evaluar un unique constraint o un indice unico parcial. Antes de aplicarlo hay que confirmar con la usuaria si un mismo alumno puede pedir dos ejemplares del mismo libro, caso en el que el constraint no corresponde y la validacion deberia ser una advertencia en la UI.

## Documentacion heredada pendiente de fusion final

### Fecha
2026-05-07

### Descripcion
Existen documentos heredados (`CONTEXT.md`, `STANDARDS.md`, `esquema-base-de-datos.md`, `prompt_codex_final.md`) con detalle historico que convive con la estructura numerada.

### Impacto
Bajo.

### Modulo afectado
`docs/`

### Recomendacion
Fusionar gradualmente el detalle historico en los documentos numerados y mover lo heredado a `docs/_legacy/` cuando se confirme la migracion completa.

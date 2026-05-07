# 04-conventions.md - Convenciones

## TypeScript y Angular

- No usar `any`; preferir tipos concretos o `unknown` con type guards.
- Componentes standalone.
- `ChangeDetectionStrategy.OnPush` en componentes.
- Estado con Signals.
- No usar RxJS para estado de UI; reservarlo para interop y Realtime.
- No poner logica de negocio en templates.
- Usar funciones puras testeables para reglas de negocio.

## Datos

- Base de datos: `snake_case`.
- TypeScript/Angular: `camelCase`.
- El mapeo entre ambos ocurre solo en repositorios.
- No acceder a Supabase directamente desde componentes.

## UI

- Mobile-first.
- Touch targets de al menos 44px.
- Estados de carga, error y vacio en vistas modificadas.
- Mensajes claros para una usuaria no tecnica.
- Mantener la paleta BrujitaCandyBar: violeta, dorado y crema.

## Git

- Mantener commits con alcance claro.
- No incluir cambios ajenos al pedido del usuario.
- No revertir cambios no propios.
- Antes de push, verificar si la rama contiene commits previos pendientes.

## Documentacion

- Toda tarea funcional debe actualizar `07-changelog.md`.
- Cambios de comportamiento deben reflejarse en `01-context.md` o documentos heredados relevantes.
- Cambios de arquitectura deben documentarse en `06-decisions.md`.
- Bugs o deuda detectada fuera de alcance deben registrarse en `08-known-issues.md`.

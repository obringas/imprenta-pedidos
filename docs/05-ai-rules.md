# 05-ai-rules.md - Reglas obligatorias para agentes IA

## Regla de entrada

Antes de tocar archivos, leer:

1. `AGENTS.md`
2. `docs/README.md`
3. Los documentos numerados en orden

Si falta documentacion requerida, crearla o actualizarla antes de cerrar la tarea.

## Calidad

- Actuar como arquitecto senior, frontend senior, backend senior, ingeniero de datos y revisor tecnico segun aplique.
- Entender el problema real antes de implementar.
- Respetar la arquitectura existente.
- No introducir dependencias sin necesidad.
- Evitar duplicacion y metodos largos.
- Separar UI, estado, dominio y persistencia.
- No usar soluciones rapidas que generen deuda evitable.

## Seguridad y datos

- No hardcodear credenciales.
- No exponer secretos.
- No ejecutar operaciones destructivas sin filtro y confirmacion explicita.
- Validar entradas antes de persistir.
- No concatenar SQL con datos de usuario.

## UI/UX

- Diseñar para mobile primero.
- Mantener claridad visual y mensajes simples.
- Mostrar estados vacios, errores y feedback de acciones.
- Cuidar accesibilidad basica: labels, foco visible, contraste y targets tactiles.

## Validacion

Antes de entregar, ejecutar build o la validacion disponible. Si no se puede validar, informarlo con claridad.

## Registro obligatorio

Toda tarea que cambie el proyecto debe registrar una entrada al inicio de `docs/07-changelog.md`.

Si hay decisiones tecnicas relevantes, documentarlas en `docs/06-decisions.md`.
Si queda deuda o bug fuera de alcance, registrarlo en `docs/08-known-issues.md`.

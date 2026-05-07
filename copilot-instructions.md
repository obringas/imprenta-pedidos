# Copilot Instructions

> **Fuente de verdad:** [`../AGENTS.md`](../AGENTS.md)

Este archivo existe solo para que GitHub Copilot detecte automáticamente el protocolo del proyecto. Toda la configuración, reglas, estructura de documentación y flujo de trabajo para agentes IA está centralizada en [`../AGENTS.md`](../AGENTS.md).

**Instrucción para Copilot:** Antes de sugerir código o ejecutar cualquier tarea, aplicá el protocolo definido en `AGENTS.md` en la raíz del proyecto:

- Leer toda la carpeta `/docs` en orden antes de generar código.
- Aplicar Clean Code, SOLID, DRY y KISS.
- Respetar convenciones de `/docs/04-conventions.md`.
- Cumplir reglas obligatorias de `/docs/05-ai-rules.md`.
- No hardcodear secrets ni credenciales.
- Registrar cambios relevantes en `/docs/07-changelog.md`.

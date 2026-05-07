# 03-setup.md - Setup

## Requisitos

- Node.js compatible con Angular 19.
- npm.
- Credenciales Supabase configuradas en environment cuando se trabaje contra backend real.

## Comandos

```bash
npm install
npm run start
npm run build
```

En Windows, si PowerShell bloquea `npm.ps1`, usar:

```bash
npm.cmd run build
```

## Entorno

Las credenciales de Supabase no deben hardcodearse. Deben vivir en archivos de environment o mecanismo seguro definido para deploy.

## Validacion minima

Antes de entregar cambios funcionales, ejecutar:

```bash
npm.cmd run build
```

Si el sandbox bloquea Angular con `spawn EPERM`, ejecutar el build con aprobacion fuera del sandbox.

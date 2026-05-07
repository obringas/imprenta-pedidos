# 02-architecture.md - Arquitectura

## Stack

- Angular 19
- Standalone components
- Angular Signals para estado de UI y datos
- Supabase para PostgreSQL, Auth y Realtime
- Tailwind CSS v3
- Spartan UI para primitivos visuales cuando corresponda
- Zod para validacion
- PWA orientada a mobile

## Estructura principal

```text
src/app/
  core/
    auth/
    layout/
    supabase/
  features/
    auth/
    pedidos/
      data/
      domain/
      state/
      ui/
    libros/
      data/
      domain/
      state/
      ui/
    informes/
      state/
      ui/
    configuracion/
  shared/
    components/
    constants/
    errors/
    models/
    pipes/
    utils/
```

## Patrones

- Repository Pattern para acceso a datos.
- Facade Pattern para exponer estado y acciones a componentes.
- Signals (`signal`, `computed`, `effect`) como mecanismo de estado.
- `Result<T>` para errores manejables desde UI.
- Mapeo `snake_case` de Supabase a `camelCase` solo en repositorios.

## Base de datos

Fuente de verdad funcional:

- Tablas: `libros`, `pedidos`, `configuracion_insumos`.
- Vistas: `pedidos_detalle`, `informes_resumen`, `informes_resumen_por_libro`.
- Enums: `estado_pago`, `estado_impresion`, `estado_entrega`.
- RLS habilitado para tablas persistentes.

No cambiar schema sin actualizar `docs/esquema-base-de-datos.md` o su reemplazo numerado.

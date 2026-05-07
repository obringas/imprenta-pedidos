# CONTEXT.md — Contexto completo del proyecto

> Ultima actualizacion: 2026-04-16
> Fuente: codigo en `src/`, SQL en `supabase/`, docs en `docs/`

---

## 1. Contexto de negocio

### Que es el sistema
Una imprenta familiar recibe pedidos de familias para imprimir libros escolares.
La duena necesita saber en todo momento:
- Que pedidos estan pendientes de imprimir
- Quien le debe plata y cuanto
- Cuantas hojas fisicas necesita para completar los pedidos

### Flujo operativo
```
1. Familia encarga un libro  →  se crea un PEDIDO
2. Duena imprime             →  marca como "Impreso"
3. Familia paga              →  "Pagado" (total) o "Seña" (parcial, manual)
4. Duena entrega             →  marca como "Entregado"
5. Entregado + saldo = $0   →  pedido "Cerrado"
```

### Reglas de negocio criticas
- `hojas = ceil(paginas / 2)` — impresion siempre doble faz
- El precio se **copia al pedido** al momento de crearlo; si cambia el libro, los pedidos existentes NO se modifican
- `Seña` = pago parcial, la duena ingresa el monto manualmente
- `Pagado` = monto cobrado = precio (el sistema completa automaticamente)
- `Saldo = precio_cobrado - monto_cobrado` (siempre >= 0)
- Un pedido puede entregarse con saldo pendiente (caso valido: entrego fiado)
- El avance rapido de pago desde listados alterna `Pendiente ↔ Pagado` (no pasa por Seña)

### Usuaria principal
- No tecnica, usa el celular como dispositivo primario
- Opera en momentos de alta carga (muchos pedidos juntos al inicio del ciclo escolar)
- No tolera errores confusos ni flujos de muchos pasos
- El KPI de UX mas importante: velocidad de carga de un pedido nuevo

---

## 2. Stack tecnico

| Capa | Tecnologia |
|---|---|
| Frontend | Angular 19, standalone components, Signals |
| Estilos | Tailwind CSS v3, Spartan UI (headless, basado en Angular CDK) |
| Backend / BD | Supabase (PostgreSQL + Auth + Realtime) |
| Validacion | Zod + validators Angular |
| Fechas | date-fns (sin moment) |
| PWA | @angular/pwa, display: standalone |
| Deploy | Vercel / Netlify |

### Patrones de estado
- Angular Signals exclusivamente: `signal()`, `computed()`, `linkedSignal()`, `effect()`
- Patron: Services with Signals (sin NgRx, sin BehaviorSubject para estado)
- RxJS solo para interop con Supabase Realtime → convertir con `toSignal()`

---

## 3. Branding

- Nombre visible: **BrujitaCandyBar**
- Titulo corto: `Pedidos de Impresion`
- Favicon: `BrujitaGemini.ico`
- Paleta: violeta, dorado y crema
- KPI mas importante visualmente: hojas pendientes de imprimir (color ambar)

---

## 4. Modulos y features implementados

### `/pedidos` — Listado principal
- Listado con tarjetas en mobile, tabla en desktop
- Filtros: busqueda por alumno (debounce 300ms), por libro, por estado general, por estado pago
- Filtros en Sheet (mobile) o sidebar (desktop)
- Acciones rapidas inline: toggle impreso, ciclo pago Pendiente↔Pagado, toggle entregado
- Ordenamiento por prioridad operativa (`PRIORIDAD_ESTADO_GENERAL`)
- FAB "+" para nuevo pedido
- En mobile el filtro muestra el total real, no solo la pagina visible

### `/pedidos/nuevo` — Alta rapida
- Cabe en una pantalla mobile SIN scroll
- Al cargar: selecciona el primer libro activo por defecto y completa el precio
- Al cambiar de libro: refresca precio, monto cobrado y saldo
- Estado pago: 3 botones (Pagado es la primera opcion visual)
- Seña: input de monto aparece con animacion
- Boton GUARDAR: 56px alto, full width

### `/pedidos/:id` — Detalle y edicion
- Todos los campos editables
- Saldo calculado en tiempo real con `computed()`
- Estado general calculado automaticamente
- ConfirmDialog al eliminar
- Boton guardar sticky al fondo

### `/libros` — Catalogo
- Lista: titulo, precio, paginas, hojas calculadas, margen, activo/inactivo
- Toggle activo/inactivo por libro
- FAB "+" → `/libros/nuevo`
- Warning visible al cambiar precios: "Los pedidos existentes mantienen su precio original"

### `/libros/:id` — Formulario de libro
- Campos: titulo, precio, paginas, observaciones, margen de ganancia (default 156%)
- Bloque reactivo de precio sugerido (se calcula en tiempo real, NO se persiste)
- Referencia: precio por hoja = `precio_sugerido / paginas`
- Boton "Usar precio sugerido" copia el valor al campo precio (accion explicita)

### `/informes` — Dashboard con tabs
**Resumen:**
- KPIs: libros cobrados, monto cobrado, pendientes cobro, saldo total, hojas impresas
- KPI `Hojas impresas` actua como semaforo de toner (referencia: 22.000 caras)
- Tabla `Avance por libro`: columnas impresos, pagados, por cobrar, % cerrado
- La tabla `Avance por libro` oculta libros sin pedidos abiertos: no muestra libros 100% cerrados ni libros sin pedidos
- Los filtros de libro en informes operativos muestran solo libros con resultados pendientes en la vista actual

**Sin pagar:**
- Pedidos con saldo pendiente, sin importar si ya estan impresos o faltan imprimir
- Filtros por libro y alumno
- Accion "Marcar pagado" inline fuerza pago total (`monto_cobrado = precio_cobrado`) y deja saldo $0
- Footer con total saldo

**Impresos sin pagar:**
- Pedidos impresos con saldo pendiente
- Filtros por libro y alumno
- Accion "Marcar pagado" inline
- Footer con total saldo impreso pendiente

**Faltan imprimir:**
- Pedidos con estado impresion = Pendiente
- Filtros por libro y alumno
- Agrupados por libro (collapsible)
- Accion "Marcar impreso" inline
- Footer con total hojas necesarias

**Sin entregar:**
- Pedidos impresos pendientes de entrega
- Filtros por libro y alumno
- Accion "Marcar entregado" inline

### `/configuracion/insumos` — Costos de insumos
- Tabla editable: tapa, espiral, hojas, toner
- Los valores se persisten en Supabase (`configuracion_insumos`)
- El sistema los usa para calcular el precio sugerido de libros
- La ruta `/configuracion` redirige a `/configuracion/insumos`

---

## 5. Estado de implementacion (2026-04-16)

### Completado
- Base Angular 19 standalone con routing y arquitectura por features
- Dominio modelado: libros, pedidos, estados, saldo, hojas, estado general
- Stores/facades con Angular Signals
- Validacion con Zod
- Login via Supabase Auth con guards y sesion persistente
- Repositorios Supabase para libros, pedidos e informes
- UI completa: pedidos, libros, informes, configuracion
- Acciones rapidas inline (impresion, pago, entrega)
- Precio sugerido reactivo en formulario de libros
- Configuracion de insumos editable
- PWA: manifest + service worker configurados
- Build verificado

### Pendiente / Bloqueado
- Credenciales reales de Supabase en environment (BLOQUEADO — no hay acceso aun)
- Seed inicial real de libros y pedidos (140 pedidos desde Excel)
- Regenerar `database.types.ts` con `supabase gen types` (despues de tener credenciales)
- Supabase Realtime para cambios en tiempo real
- Deploy final en Vercel/Netlify
- Agregar iconos reales PWA (192 y 512)
- Cubrir utilities y facades con unit tests
- Historial de cambios de precios de insumos

---

## 6. Arquitectura de carpetas (resumen)

```
src/app/
  core/
    auth/           — guard + service de autenticacion
    layout/         — app-shell
    supabase/       — cliente Supabase + tipos generados
  features/
    auth/           — login page
    pedidos/        — data / domain / state / ui
    libros/         — data / domain / state / ui
    informes/       — state / ui
    configuracion/  — repositories / stores / pages
  shared/
    components/     — EmptyState, EstadoBadge, ConfirmDialog, etc.
    constants/      — negocio.constants.ts (estados, prioridades, visual)
    errors/         — AppError
    models/         — configuracion-insumos.model.ts
    pipes/          — PesoPipe
    utils/          — result.ts, calcular-precio-sugerido.util.ts
```

Estructura completa en `docs/prompt_codex_final.md` seccion 6.

---

## 7. Divergencias conocidas

- `database.types.ts` no tipa `informes_resumen` (la vista si existe en SQL)
- Al regenerar tipos con `supabase gen types`, verificar que `informes_resumen` quede incluida
- La fuente de verdad del schema es el SQL en `supabase/` validado contra el uso real

---

## 8. Como actualizar este documento

Actualizar este archivo cuando:
- Cambia el estado de implementacion (algo nuevo se completa o se desbloquea)
- Se agrega un nuevo modulo o feature
- Cambia una regla de negocio critica
- Se conectan credenciales reales de Supabase

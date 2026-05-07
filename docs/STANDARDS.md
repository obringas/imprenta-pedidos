# STANDARDS.md — Estandares de codigo y diseno UI

Este documento define las reglas no negociables del proyecto.
Todo agente y desarrollador debe respetarlas en cada linea de codigo que escriba.

---

## PARTE 1 — ESTANDARES DE CODIGO

---

### 1.1 Principios SOLID en Angular

**Single Responsibility**
- Un componente = una responsabilidad. El que muestra una lista no valida formularios.
- Un servicio que hace CRUD no formatea fechas.
- Cada metodo hace una sola cosa. Si necesitas comentar una seccion, esa seccion es un metodo aparte.

**Open/Closed**
- Componentes de estado (`EstadoBadge`) reciben configuracion, no tienen `if/else` internos.
- Usar mapas de configuracion para extender, no modificar el existente.

**Interface Segregation**
- Interfaces pequenas y especificas. No un `IPedidoService` con 15 metodos.
- Mejor `IPedidosQuery` + `IPedidosMutation` separados.

**Dependency Inversion**
- Los componentes dependen de abstracciones (InjectionTokens), no de implementaciones concretas.

---

### 1.2 Clean Code — reglas concretas

**Naming**
```typescript
// MAL
const d = new Date()
const pd = this.sp.getPed()
function calc(x: number, y: number) { return x - y }
const flag = true

// BIEN
const fechaHoy = new Date()
const pedidos = this.pedidosService.obtenerPedidos()
function calcularSaldo(precio: number, montoCobrado: number): number {
  return precio - montoCobrado
}
const estaImpreso = true
```

**Funciones**
- Maximo 20 lineas por funcion. Si crece, extraer.
- Maximo 3 parametros. Si necesitas mas, usar un objeto tipado.
- Sin efectos secundarios ocultos. Una funcion que dice "calcular" no debe modificar estado.
- Funciones puras donde sea posible.

**Sin magic numbers ni magic strings**
```typescript
// MAL
if (pedido.estado_pago === 'Pagado') { ... }
const hojas = Math.ceil(paginas / 2)

// BIEN — usar constantes del dominio
import { ESTADO_PAGO, calcularHojas } from '@/shared/constants/negocio.constants'
if (pedido.estado_pago === ESTADO_PAGO.PAGADO) { ... }
const hojas = calcularHojas(paginas)
```

**Early returns — evitar anidamiento**
```typescript
// MAL
function procesarPedido(pedido: Pedido) {
  if (pedido) {
    if (pedido.estado_impresion === 'Impreso') {
      if (pedido.saldo === 0) { return 'Listo p/entregar' }
    }
  }
}

// BIEN
function determinarEstadoGeneral(pedido: Pedido): EstadoGeneral {
  if (!pedido) return 'Pendiente'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo === 0) return 'Cerrado'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo > 0)   return 'Entregado con saldo'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo === 0) return 'Listo p/entregar'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo > 0)   return 'Impreso con saldo'
  if (pedido.monto_cobrado > 0)                                     return 'Pagado/pend. impresion'
  return 'Pendiente'
}
```

---

### 1.3 TypeScript — uso estricto

**tsconfig** — activar siempre:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Prohibido `any`** — usar `unknown` + type guards:
```typescript
// Prohibido
function procesar(data: any) { ... }

// Correcto
function procesar(data: unknown) {
  if (!esPedido(data)) throw new Error('Dato invalido')
  // TypeScript ya sabe que data es Pedido
}
```

**Discriminated Unions para estados:**
```typescript
type EstadoPedidoPago =
  | { tipo: 'pendiente' }
  | { tipo: 'sena';   monto: number }
  | { tipo: 'pagado'; monto: number; fecha: string }
```

---

### 1.4 Angular — mejores practicas

**Componentes standalone siempre:**
```typescript
@Component({
  selector: 'app-pedido-card',
  standalone: true,
  imports: [EstadoBadgeComponent, PesoPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush, // SIEMPRE
  template: `...`
})
```

**Inputs con signal (Angular 17.1+):**
```typescript
export class PedidoCardComponent {
  readonly pedido = input.required<PedidoDetalle>()
  readonly saldoFormateado = computed(() => formatearPeso(this.pedido().saldo))
}
```

**Sin logica en templates:**
```html
<!-- MAL -->
<span>{{ pedido.precio - pedido.monto_cobrado > 0 ? '$' + ... : 'Saldado' }}</span>

<!-- BIEN — logica en computed() del componente -->
<span>{{ etiquetaSaldo() }}</span>
```

**Subscripciones — nunca subscribe() sin cleanup:**
```typescript
// Preferir toSignal() — se limpia automaticamente
readonly pedidos = toSignal(this.pedidosService.pedidos$, { initialValue: [] })

// O takeUntilDestroyed() si es necesario subscribe()
this.realtime.cambios$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(cambio => this.procesarCambio(cambio))
```

---

### 1.5 Patrones obligatorios del proyecto

**Repository Pattern** — acceso a datos desacoplado de Supabase:
```typescript
interface PedidosRepository {
  findAll(filtros: FiltroPedidos): Promise<PedidoDetalle[]>
  create(input: CrearPedidoInput): Promise<Pedido>
  update(id: string, input: ActualizarPedidoInput): Promise<Pedido>
}

// InjectionToken para swappear implementacion (tests, etc.)
const PEDIDOS_REPOSITORY = new InjectionToken<PedidosRepository>(
  'PedidosRepository',
  { providedIn: 'root', factory: () => inject(SupabasePedidosRepository) }
)
```

**Mapeo snake_case → camelCase exclusivamente en el repositorio**, nunca en el componente ni en el store:
```typescript
// En el repositorio:
const mapear = (raw: Database['public']['Tables']['pedidos']['Row']): Pedido => ({
  id: raw.id,
  libroId: raw.libro_id,
  precioCobrado: raw.precio_cobrado,
  // ...
})
```

**Result Pattern** — manejo de errores sin excepciones en la UI:
```typescript
type Result<T, E = AppError> =
  | { success: true;  data: T }
  | { success: false; error: E }

// En componentes: nunca try/catch
const result = await this.facade.crearPedido(formValue)
if (!result.success) {
  this.toast.error(result.error.mensaje)
  return
}
this.router.navigate(['/pedidos'])
```

**Facade Pattern** — los componentes solo hablan con el Facade, nunca con repositorios directamente.

---

### 1.6 Comentarios y documentacion

```typescript
// MAL — describe el que, no el por que
// Sumar los montos cobrados
const total = pedidos.reduce((acc, p) => acc + p.monto_cobrado, 0)

// BIEN — explica una decision no obvia
// El precio se copia al pedido al momento de crearlo y no cambia despues.
// Esto es intencional: si el libro sube de precio, los pedidos anteriores
// mantienen el precio acordado originalmente con la familia.
const precio_cobrado = libro.precio
```

JSDoc solo en interfaces publicas de servicios y funciones de calculo critico.

---

### 1.7 Testing

- Funciones puras → test unitario directo (sin TestBed)
- Nomenclatura: `describe('nombre', () => { it('deberia...', ...) })`
- Cubrir al menos: `calcularHojas`, `calcularPrecioSugerido`, `derivarCostosUnitarios`, `determinarEstadoGeneral`

---

## PARTE 2 — ESTANDARES DE DISENO UI

---

### 2.1 Principios fundamentales

1. **Mobile-first**: disena primero para < 640px, luego expande
2. **Utilidad, no decoracion**: cada elemento visual debe tener proposito
3. **Consistencia por sistema**: usar tokens y componentes definidos; no inventar variantes ad-hoc
4. **Feedback inmediato**: toda accion del usuario debe tener respuesta visual (< 100ms)
5. **Progressive disclosure**: mostrar solo lo necesario; revelar complejidad gradualmente

---

### 2.2 Paleta de colores del proyecto

```
Primario (violeta)  →  violet-600 / violet-700  (acciones, links, activos)
Acento (dorado)     →  amber-400 / amber-500    (KPI critico, highlights)
Neutro (crema)      →  stone-50 / stone-100     (fondos de pagina)
Superficie          →  white / slate-50          (cards, modales)
Texto principal     →  slate-900
Texto secundario    →  slate-500
Borde               →  slate-200

Semanticos:
  Exito    →  emerald-500 / green-100 + green-700
  Alerta   →  amber-400 / amber-100 + amber-700
  Error    →  red-500 / red-100 + red-700
  Info     →  blue-500 / blue-100 + blue-700
```

**Usar siempre los colores semanticos de `ESTADO_VISUAL` en `negocio.constants.ts`** para badges de estado.
No hardcodear colores de estado en componentes individuales.

---

### 2.3 Tipografia

- Font: la que provee Tailwind por defecto (system font stack) — no agregar fuentes externas salvo necesidad critica
- Escala de tamanos en uso:

| Uso | Clase Tailwind |
|---|---|
| Titulo de pagina | `text-xl font-semibold` o `text-2xl font-bold` |
| Subtitulo / seccion | `text-base font-semibold` o `text-sm font-semibold text-slate-600` |
| Cuerpo principal | `text-sm` |
| Texto secundario / ayuda | `text-xs text-slate-500` |
| KPI grande | `text-2xl font-bold` o `text-3xl font-bold` |
| Badge / chip | `text-xs font-medium` |
| Boton principal | `text-sm font-semibold` |

- Evitar mas de 3 tamanos de texto en una misma pantalla
- Contraste minimo WCAG AA: texto oscuro sobre fondo claro, siempre

---

### 2.4 Espaciado y layout

- Usar exclusivamente la escala de espaciado de Tailwind (multiples de 4px)
- Padding de pagina en mobile: `px-4 py-4` (16px)
- Padding de pagina en desktop: `px-6 py-6` (24px) o `px-8` (32px)
- Gap entre secciones: `space-y-4` (mobile) / `space-y-6` (desktop)
- Gap entre cards en grid: `gap-4` (mobile) / `gap-6` (desktop)
- `max-w-screen-lg mx-auto` para contenido principal en desktop

**Breakpoints Tailwind a usar:**
```
mobile:   default (sin prefijo)  — < 640px
tablet:   sm:                    — >= 640px
desktop:  lg:                    — >= 1024px
wide:     xl:                    — >= 1280px (solo si es necesario)
```

---

### 2.5 Componentes y primitivos

**Siempre usar Spartan UI** cuando exista el primitivo:
- `HlmButton` para botones
- `HlmInput` / `HlmLabel` para formularios
- `HlmBadge` para badges de estado
- `HlmCard` para tarjetas
- `HlmSheet` para drawers / paneles laterales en mobile
- `HlmDialog` para modales de confirmacion
- `HlmSkeleton` para estados de carga
- `HlmTabs` para vistas tabuladas
- `HlmSonner` para toasts

**No crear un componente custom cuando Spartan ya lo tiene.**

---

### 2.6 Targets tactiles y accesibilidad

- Touch target minimo: **44px de alto** en mobile; preferir **48px** para acciones principales
- Boton principal de formulario: `min-h-[48px] w-full` (full-width en mobile)
- FAB flotante: `h-14 w-14` (56px) con sombra `shadow-lg`
- Todos los inputs deben tener `<label>` asociado (via `for` / `id`)
- Focus ring visible en todos los elementos interactivos: `focus-visible:ring-2 focus-visible:ring-violet-500`
- `aria-label` en iconos sin texto visible
- Orden de tab logico; nunca `tabindex > 0` fuera de casos muy especificos

---

### 2.7 Formularios

- Validacion inline (debajo del campo), no en alert/modal
- Mensajes de error: texto rojo corto, accionable (`"Ingresa un precio mayor a 0"`)
- Campos requeridos: marcar con asterisco o placeholder descriptivo, no en el label
- Al hacer submit con errores: hacer scroll / focus al primer campo con error
- Disabled durante el guardado: desactivar el boton con spinner visual

```html
<!-- Patron de campo con error -->
<div class="flex flex-col gap-1">
  <label hlmLabel for="precio">Precio</label>
  <input hlmInput id="precio" type="number" ... />
  @if (precioError()) {
    <p class="text-xs text-red-600">{{ precioError() }}</p>
  }
</div>
```

---

### 2.8 Estados de carga, vacio y error

**Siempre manejar los 3 estados:**

```html
@if (cargando()) {
  <!-- Skeleton: mismo layout que el contenido real -->
  <hlm-skeleton class="h-20 w-full rounded-lg" />
} @else if (error()) {
  <!-- Estado de error: mensaje + accion para reintentar -->
  <app-error-state [mensaje]="error()" (reintentar)="cargar()" />
} @else if (lista().length === 0) {
  <!-- Estado vacio: siempre con mensaje descriptivo + CTA -->
  <app-empty-state
    titulo="Sin pedidos"
    descripcion="Crea tu primer pedido con el boton +"
  />
} @else {
  <!-- Contenido real -->
}
```

- Skeletons: misma estructura que el contenido real (no un spinner generico)
- Empty states: titulo + descripcion + accion sugerida (boton o link)
- Error states: mensaje legible para la usuaria + boton "Reintentar"

---

### 2.9 Animaciones y transiciones

- Usar `transition-all duration-200 ease-in-out` como base para la mayoria de transiciones
- Animaciones de entrada/salida en paneles y modales: `duration-200` a `duration-300`
- Evitar animaciones de mas de 400ms
- No animar cambios de layout (evita jank en mobile)
- Usar `animate-pulse` de Tailwind para skeletons

```html
<!-- Ejemplo: input de seña que aparece con animacion -->
@if (mostrarInputMonto()) {
  <div class="animate-in slide-in-from-top-2 duration-200">
    <input hlmInput ... />
  </div>
}
```

---

### 2.10 Cards y listas

**Mobile — tarjetas apiladas:**
```html
<div class="flex flex-col gap-3 px-4">
  @for (pedido of pedidos(); track pedido.id) {
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      ...
    </div>
  }
</div>
```

**Desktop — tabla:**
```html
<div class="hidden lg:block overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
      ...
    </thead>
    ...
  </table>
</div>
```

Patron: mobile usa cards, desktop usa tabla. Ambas vistas conviven con `lg:hidden` / `hidden lg:block`.

---

### 2.11 KPIs y metricas

```html
<!-- Card de KPI -->
<div class="rounded-xl border border-slate-200 bg-white p-4">
  <p class="text-xs font-medium text-slate-500 truncate">Saldo total</p>
  <p class="mt-1 text-2xl font-bold text-slate-900 tabular-nums truncate">
    {{ saldoTotal() | peso }}
  </p>
</div>
```

- `tabular-nums` para evitar saltos al actualizar numeros
- `truncate` para evitar overflow en montos grandes
- Color acento (amber) para el KPI de hojas pendientes de imprimir
- Nunca mostrar decimales en montos ARS: usar `maximumFractionDigits: 0` en el pipe

---

### 2.12 Navegacion y layout general

- Bottom navigation en mobile (4-5 items max), sidebar en desktop
- `App Shell` component maneja el layout global
- Ruta activa: highlight con `violet-600` en nav
- Header de pagina: titulo + accion secundaria opcional (alineados en una fila)
- FAB flotante: posicion `fixed bottom-6 right-6 z-20`, shadow, color primario

---

### 2.13 Diseno responsive — checklist por pantalla

Antes de dar por terminada cualquier pantalla, verificar:

- [ ] Se ve bien en 375px (iPhone SE) sin scroll horizontal
- [ ] Se ve bien en 390px (iPhone 14)
- [ ] Se ve bien en 768px (tablet)
- [ ] Se ve bien en 1280px (desktop)
- [ ] Touch targets tienen al menos 44px de alto en mobile
- [ ] Los textos no se cortan ni se superponen
- [ ] Los KPIs / montos grandes no desbordan su contenedor
- [ ] Los estados de carga, vacio y error estan implementados
- [ ] No hay logica en el template (todo en `computed()`)

---

## PARTE 3 — BASE DE DATOS

### 3.1 Convencion de nombres

- BD / Supabase: `snake_case` (`precio_cobrado`, `estado_pago`, `libro_id`)
- TypeScript / Angular: `camelCase` (`precioCobrado`, `estadoPago`, `libroId`)
- El mapeo ocurre **exclusivamente en el repositorio**

### 3.2 Seguridad

- RLS habilitado en todas las tablas
- Solo usuarios `authenticated` pueden leer/escribir
- No exponer `service_role` key en el frontend
- Credenciales en `environment.ts`, nunca hardcodeadas en el codigo

### 3.3 Fuente de verdad del schema

El SQL en `supabase/` es la fuente de verdad.
Los tipos en `database.types.ts` son derivados y pueden estar desactualizados.
Ante duda, verificar contra el SQL.

# Sistema de GestiÃ³n de Pedidos de ImpresiÃ³n
## Prompt completo para Codex

---

## 0. INSTRUCCIONES GENERALES PARA CODEX

Sos un **arquitecto senior de software** construyendo un sistema de producciÃ³n real.
No es un ejercicio acadÃ©mico: hay datos reales, una usuaria real y plata real en juego.

**Reglas absolutas de este proyecto:**

- Cada lÃ­nea de cÃ³digo que escribas debe poder ser mantenida por otro desarrollador
  Angular senior sin que tenga que preguntarle nada a nadie
- Si existe una forma mÃ¡s limpia de hacer algo, usÃ¡ esa, no la mÃ¡s rÃ¡pida
- Nunca escribas cÃ³digo que "funciona pero es un hack"
- PensÃ¡ en casos borde antes de escribir la funciÃ³n, no despuÃ©s
- Si algo no estÃ¡ especificado, tomÃ¡ la decisiÃ³n mÃ¡s conservadora y documentala

---

## 1. CONTEXTO DE NEGOCIO

### QuÃ© es el sistema
Una imprenta familiar recibe pedidos de familias para imprimir libros escolares.
La dueÃ±a (usuaria principal) necesita saber en todo momento:
- QuÃ© pedidos estÃ¡n pendientes de imprimir
- QuiÃ©n le debe plata y cuÃ¡nto
- CuÃ¡ntas hojas fÃ­sicas necesita tener para completar los pedidos

### CÃ³mo funciona el negocio
1. Una familia encarga un libro â†’ se crea un pedido
2. La dueÃ±a imprime el libro â†’ marca el pedido como "Impreso"
3. La familia paga â†’ puede pagar todo (Pagado) o una parte (SeÃ±a)
4. La dueÃ±a entrega el libro â†’ marca el pedido como "Entregado"
5. Cuando estÃ¡ entregado Y el saldo es $0 â†’ el pedido queda "Cerrado"

### Reglas de negocio crÃ­ticas
- **Hojas por libro** = ceil(pÃ¡ginas / 2) â†’ impresiÃ³n doble faz siempre
- **El precio se copia al pedido** en el momento de crearlo. Si despuÃ©s el libro
  cambia de precio, los pedidos existentes NO se modifican
- **SeÃ±a** = pago parcial. La dueÃ±a ingresa el monto recibido manualmente
- **Pagado** = pago total. El sistema completa automÃ¡ticamente monto = precio
- **Saldo** = precio_cobrado - monto_cobrado (siempre >= 0)
- Un pedido "Listo p/entregar" = Impreso + Saldo = 0 (prioridad alta para entregar)
- Un pedido puede estar Entregado pero con saldo (caso vÃ¡lido: entregÃ³ fiado)

### Usuaria principal
- No tÃ©cnica, usa el celular como dispositivo primario
- Opera en momentos de alta carga (muchos pedidos juntos al inicio del aÃ±o escolar)
- No tiene tolerancia a errores confusos o flujos de muchos pasos
- La velocidad de carga de un pedido nuevo es el KPI mÃ¡s importante de UX

### Datos actuales (migraciÃ³n del Excel)
El sistema arranca con datos reales que vienen de un Excel previo:
- **7 libros** en el catÃ¡logo
- **140 pedidos** existentes
- 68 impresos, 72 pendientes de impresiÃ³n
- 58 pagados, 82 pendientes de pago

---

## 2. STACK TÃ‰CNICO

### Frontend
- **Angular 18** â€” standalone components, signals, control flow nativo (`@if`, `@for`, `@switch`)
- **Tailwind CSS v3** â€” mobile-first, utility-first
- **Spartan UI** (spartan.ng) â€” componentes headless sobre Angular CDK.
  Instalar: Button, Input, Label, Select, Badge, Card, Table, Tabs,
  Sheet (drawer mobile), Dialog, Skeleton, Sonner (toasts), Separator
- **Angular CDK** â€” ya incluido por Spartan, usar para: overlay, a11y, drag
- **@angular/pwa** â€” PWA instalable, display: standalone, sin barra del browser

### Estado
- **Angular Signals** exclusivamente para estado de UI y datos
- `signal()`, `computed()`, `linkedSignal()`, `effect()`
- PatrÃ³n: services with signals (no NgRx, no BehaviorSubject para estado)
- RxJS solo para interop con Supabase Realtime â†’ convertir con `toSignal()`

### Backend / Base de datos
- **Supabase** â€” PostgreSQL + Auth + Realtime (free tier)
- SDK `@supabase/supabase-js` v2
- Sin backend propio. Todo acceso a datos via servicios Angular â†’ Supabase directo

### ValidaciÃ³n
- **Zod** â€” schemas en `shared/schemas/`. Validar antes de cada operaciÃ³n de escritura
- Custom Angular validator que wrappea Zod para formularios reactivos

### Utilidades
- **date-fns** â€” solo para formateo. Sin moment.js
- **`@angular/core/rxjs-interop`** â€” `toSignal()`, `toObservable()`

### Hosting
- **Vercel** o **Netlify** (free, CDN global, soporte PWA)

---

## 3. ESTÃNDARES DE CÃ“DIGO â€” NO NEGOCIABLES

Esta secciÃ³n define cÃ³mo se escribe cÃ³digo en este proyecto.
Todo el cÃ³digo generado debe cumplir con cada punto.

### 3.1 Principios SOLID aplicados a Angular

**Single Responsibility**
- Un componente = una responsabilidad. Un componente que muestra una lista
  no valida formularios. Un servicio que hace CRUD no formatea fechas.
- Cada mÃ©todo hace una sola cosa. Si necesitÃ¡s un comentario para explicar
  quÃ© hace una secciÃ³n del mÃ©todo, esa secciÃ³n es un mÃ©todo aparte.

**Open/Closed**
- Los componentes de estado (`EstadoBadge`) reciben configuraciÃ³n, no tienen
  `if/else` internos para cada estado. Usar un mapa de configuraciÃ³n.
- Extender funcionalidad agregando cÃ³digo, no modificando el existente.

**Liskov Substitution**
- Las implementaciones concretas de repositorios/servicios deben ser
  intercambiables. Usar interfaces para los contratos.

**Interface Segregation**
- Interfaces pequeÃ±as y especÃ­ficas. No un `IPedidoService` con 15 mÃ©todos.
  Mejor `IPedidosQuery` y `IPedidosMutation` separados.

**Dependency Inversion**
- Los componentes dependen de abstracciones (tokens de inyecciÃ³n), no de
  implementaciones concretas. Facilita testing y sustituciÃ³n.

### 3.2 Clean Code â€” reglas concretas

**Naming**
```typescript
// âŒ MAL
const d = new Date()
const pd = this.sp.getPed()
function calc(x: number, y: number) { return x - y }
const flag = true

// âœ… BIEN
const fechaHoy = new Date()
const pedidos  = this.pedidosService.obtenerPedidos()
function calcularSaldo(precio: number, montoCobrado: number): number {
  return precio - montoCobrado
}
const estaImpreso = true
```

**Funciones**
- MÃ¡ximo 20 lÃ­neas por funciÃ³n. Si crece mÃ¡s, extraer.
- MÃ¡ximo 3 parÃ¡metros. MÃ¡s de 3 â†’ usar un objeto tipado.
- Sin efectos secundarios ocultos. Una funciÃ³n que dice "calcular" no debe
  modificar estado.
- Funciones puras donde sea posible.

**Sin magic numbers o magic strings**
```typescript
// âŒ MAL
if (pedido.estado_pago === 'Pagado') { ... }
const hojas = Math.ceil(paginas / 2)

// âœ… BIEN
import { ESTADO_PAGO, calcularHojas } from '@/shared/constants/negocio.constants'
if (pedido.estado_pago === ESTADO_PAGO.PAGADO) { ... }
const hojas = calcularHojas(paginas)
```

**Early returns â€” evitar anidamiento**
```typescript
// âŒ MAL
function procesarPedido(pedido: Pedido) {
  if (pedido) {
    if (pedido.estado_impresion === 'Impreso') {
      if (pedido.saldo === 0) {
        return 'Listo p/entregar'
      }
    }
  }
}

// âœ… BIEN
function determinarEstadoGeneral(pedido: Pedido): EstadoGeneral {
  if (!pedido) return 'Pendiente'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo === 0) return 'Cerrado'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo > 0)  return 'Entregado con saldo'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo === 0) return 'Listo p/entregar'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo > 0)   return 'Impreso con saldo'
  if (pedido.monto_cobrado > 0)                                     return 'Pagado/pend. impresiÃ³n'
  return 'Pendiente'
}
```

### 3.3 Patrones de diseÃ±o aplicados

**Repository Pattern â€” acceso a datos**
```typescript
// AbstracciÃ³n del acceso a datos, desacoplada de Supabase
interface PedidosRepository {
  findAll(filtros: FiltroPedidos): Promise<PedidoDetalle[]>
  findById(id: string): Promise<PedidoDetalle | null>
  create(input: CrearPedidoInput): Promise<Pedido>
  update(id: string, input: ActualizarPedidoInput): Promise<Pedido>
  delete(id: string): Promise<void>
}

// ImplementaciÃ³n concreta con Supabase
@Injectable({ providedIn: 'root' })
class SupabasePedidosRepository implements PedidosRepository {
  // ... implementaciÃ³n
}

// Token de inyecciÃ³n â€” permite swappear la implementaciÃ³n (ej: para tests)
const PEDIDOS_REPOSITORY = new InjectionToken<PedidosRepository>(
  'PedidosRepository',
  { providedIn: 'root', factory: () => inject(SupabasePedidosRepository) }
)
```

**Facade Pattern â€” simplificar la complejidad para los componentes**
```typescript
// Los componentes solo hablan con el Facade, nunca con repos directamente
@Injectable({ providedIn: 'root' })
class PedidosFacade {
  // Expone estado como signals readonly
  readonly pedidos       = this.store.pedidos.asReadonly()
  readonly loading       = this.store.loading.asReadonly()
  readonly filtros       = this.store.filtros.asReadonly()
  readonly estadisticas  = this.store.estadisticas  // computed

  constructor(
    private store:      PedidosStore,
    private repository: PedidosRepository,
    private validator:  PedidosValidator,
  ) {}

  async crearPedido(input: unknown): Promise<Result<Pedido>> {
    const parsed = await this.validator.validarNuevoPedido(input)
    if (!parsed.success) return Result.error(parsed.error)
    return this.store.crear(parsed.data)
  }
}
```

**Result Pattern â€” manejo de errores sin excepciones**
```typescript
// shared/utils/result.ts
type Result<T, E = AppError> =
  | { success: true;  data: T }
  | { success: false; error: E }

const Result = {
  ok:    <T>(data: T):  Result<T> => ({ success: true, data }),
  error: <E>(error: E): Result<never, E> => ({ success: false, error }),
}

// Uso en servicios:
async function crearPedido(input: NuevoPedidoInput): Promise<Result<Pedido>> {
  try {
    const { data, error } = await supabase.from('pedidos').insert(input).select().single()
    if (error) return Result.error(mapSupabaseError(error))
    return Result.ok(data)
  } catch (e) {
    return Result.error(AppError.unexpected(e))
  }
}

// Uso en componentes: nunca try/catch en la UI
const result = await this.facade.crearPedido(formValue)
if (!result.success) {
  this.toast.error(result.error.mensaje)
  return
}
this.router.navigate(['/pedidos'])
```

**Strategy Pattern â€” para el ordenamiento del listado**
```typescript
interface OrdenamientoPedidos {
  ordenar(pedidos: PedidoDetalle[]): PedidoDetalle[]
}

const PRIORIDAD_ESTADO: Record<EstadoGeneral, number> = {
  'Listo p/entregar':      1,
  'Impreso con saldo':     2,
  'Pagado/pend. impresiÃ³n':3,
  'Pendiente':             4,
  'Entregado con saldo':   5,
  'Cerrado':               6,
  'Entregado':             7,
}

class OrdenarPorPrioridad implements OrdenamientoPedidos {
  ordenar(pedidos: PedidoDetalle[]): PedidoDetalle[] {
    return [...pedidos].sort((a, b) =>
      (PRIORIDAD_ESTADO[a.estado_general] ?? 99) -
      (PRIORIDAD_ESTADO[b.estado_general] ?? 99)
    )
  }
}
```

**Command Pattern â€” para operaciones de estado (optimistic updates)**
```typescript
interface Comando<T> {
  ejecutar(): Promise<Result<T>>
  deshacer(): void  // rollback del optimistic update
}

class MarcarImpresoPedidoCommand implements Comando<void> {
  constructor(
    private pedidoId: string,
    private store: PedidosStore,
    private repo:  PedidosRepository,
  ) {}

  async ejecutar(): Promise<Result<void>> {
    // 1. Optimistic update inmediato
    this.store.actualizarEstadoLocal(this.pedidoId, { estado_impresion: 'Impreso' })
    // 2. Persistir
    const result = await this.repo.actualizarEstado(this.pedidoId, {
      estado_impresion: 'Impreso',
      fecha_impresion:  formatISO(new Date(), { representation: 'date' })
    })
    if (!result.success) this.deshacer()
    return result
  }

  deshacer(): void {
    this.store.actualizarEstadoLocal(this.pedidoId, { estado_impresion: 'Pendiente' })
  }
}
```

**Observer Pattern â€” Supabase Realtime con signals**
```typescript
// Cambios en DB se reflejan automÃ¡ticamente en la UI
@Injectable({ providedIn: 'root' })
class PedidosRealtimeService implements OnDestroy {
  private channel: RealtimeChannel | null = null

  iniciarSuscripcion(onCambio: (payload: RealtimePayload) => void): void {
    this.channel = this.supabase
      .channel('pedidos-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        onCambio
      )
      .subscribe()
  }

  ngOnDestroy(): void {
    this.channel?.unsubscribe()
  }
}
```

### 3.4 TypeScript â€” uso estricto

**tsconfig.json**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Prohibido usar `any`**
```typescript
// âŒ Prohibido absolutamente
function procesar(data: any) { ... }

// âœ… Usar unknown + type guards
function procesar(data: unknown) {
  if (!esPedido(data)) throw new Error('Dato invÃ¡lido')
  // acÃ¡ TypeScript ya sabe que data es Pedido
}

function esPedido(data: unknown): data is Pedido {
  return typeof data === 'object' && data !== null && 'id' in data
}
```

**Discriminated Unions para estados**
```typescript
// Hace imposible tener un estado invÃ¡lido
type EstadoPedidoPago =
  | { tipo: 'pendiente' }
  | { tipo: 'sena';   monto: number }
  | { tipo: 'pagado'; monto: number; fecha: string }

// El compilador obliga a manejar todos los casos
function describirPago(estado: EstadoPedidoPago): string {
  switch (estado.tipo) {
    case 'pendiente': return 'Sin pagar'
    case 'sena':      return `SeÃ±a de $${estado.monto}`
    case 'pagado':    return `Pagado $${estado.monto} el ${estado.fecha}`
    // No hace falta default: TypeScript detecta si falta algÃºn caso
  }
}
```

### 3.5 Angular â€” mejores prÃ¡cticas especÃ­ficas

**Componentes standalone siempre**
```typescript
@Component({
  selector: 'app-pedido-card',
  standalone: true,
  imports: [EstadoBadgeComponent, PesoPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush, // siempre OnPush
  template: `...`
})
```

**OnPush en todos los componentes, sin excepciÃ³n**
Con signals, OnPush es gratuito â€” Angular sabe exactamente quÃ© cambiÃ³.

**Inputs con signal**
```typescript
// Angular 17.1+
export class PedidoCardComponent {
  readonly pedido = input.required<PedidoDetalle>()
  readonly saldoFormateado = computed(() =>
    formatearPeso(this.pedido().saldo)
  )
}
```

**Outputs tipados**
```typescript
export class QuickStatusComponent {
  readonly estadoImpresionCambiado = output<EstadoImpresion>()
  readonly estadoPagoCambiado      = output<CambioEstadoPago>()
}
```

**Sin lÃ³gica en templates**
```html
<!-- âŒ MAL -->
<span>{{ pedido.precio - pedido.monto_cobrado > 0 ? '$' + (pedido.precio - pedido.monto_cobrado) : 'Saldado' }}</span>

<!-- âœ… BIEN â€” la lÃ³gica estÃ¡ en el componente como computed() -->
<span>{{ etiquetaSaldo() }}</span>
```

**Pipes para transformaciones de display**
```typescript
@Pipe({ name: 'peso', standalone: true, pure: true })
export class PesoPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor == null) return '-'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0
    }).format(valor)
  }
}
```

**Manejo de subscripciones**
```typescript
// Nunca subscribe() manual sin cleanup en componentes
// âœ… Usar toSignal() â€” se limpia automÃ¡ticamente
readonly pedidos = toSignal(this.pedidosService.pedidos$, { initialValue: [] })

// O usar takeUntilDestroyed() si necesitÃ¡s subscribe()
this.realtime.cambios$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(cambio => this.procesarCambio(cambio))
```

### 3.6 Estructura de errores

```typescript
// shared/errors/app-error.ts
export class AppError {
  constructor(
    public readonly codigo:  ErrorCodigo,
    public readonly mensaje: string,
    public readonly causa?:  unknown,
  ) {}

  static noEncontrado(recurso: string): AppError {
    return new AppError('NOT_FOUND', `${recurso} no encontrado`)
  }

  static validacion(campo: string, detalle: string): AppError {
    return new AppError('VALIDATION', `${campo}: ${detalle}`)
  }

  static inesperado(causa: unknown): AppError {
    return new AppError('UNEXPECTED', 'Error inesperado. IntentÃ¡ de nuevo.', causa)
  }

  static desdeSupabase(error: PostgrestError): AppError {
    if (error.code === '23503') return new AppError('CONSTRAINT', 'No se puede eliminar: tiene pedidos asociados')
    if (error.code === '23505') return new AppError('DUPLICATE', 'Ya existe un registro con esos datos')
    return AppError.inesperado(error)
  }
}

type ErrorCodigo = 'NOT_FOUND' | 'VALIDATION' | 'UNEXPECTED' | 'CONSTRAINT' | 'DUPLICATE' | 'AUTH'
```

### 3.7 Testing â€” estructura

```typescript
// Cada servicio y utility debe tener su spec
// Nomenclatura: describe('nombre', () => { it('deberÃ­a...', ...) })
// Usar TestBed solo cuando sea necesario. Funciones puras â†’ test unitario directo.

describe('determinarEstadoGeneral', () => {
  it('deberÃ­a retornar Cerrado cuando estÃ¡ entregado y saldo es 0', () => {
    const pedido = crearPedidoMock({ estado_entrega: 'Entregado', saldo: 0 })
    expect(determinarEstadoGeneral(pedido)).toBe('Cerrado')
  })

  it('deberÃ­a retornar Listo p/entregar cuando estÃ¡ impreso y saldo es 0', () => {
    const pedido = crearPedidoMock({ estado_impresion: 'Impreso', saldo: 0, estado_entrega: 'Pendiente' })
    expect(determinarEstadoGeneral(pedido)).toBe('Listo p/entregar')
  })
})
```

### 3.8 Comentarios y documentaciÃ³n

```typescript
// âŒ Comentario inÃºtil: describe el quÃ©, no el por quÃ©
// Sumar los montos cobrados
const total = pedidos.reduce((acc, p) => acc + p.monto_cobrado, 0)

// âœ… Comentario Ãºtil: explica una decisiÃ³n no obvia
// El precio se copia al pedido al momento de crearlo y no cambia despuÃ©s.
// Esto es intencional: si el libro sube de precio, los pedidos anteriores
// mantienen el precio acordado originalmente con la familia.
const precio_cobrado = libro.precio
```

**JSDoc solo en interfaces y funciones pÃºblicas de servicios:**
```typescript
/**
 * Calcula las hojas fÃ­sicas necesarias para imprimir un libro.
 * La imprenta trabaja siempre en doble faz, por eso se divide por 2
 * y se redondea hacia arriba (pÃ¡ginas impares agregan una hoja en blanco).
 */
export function calcularHojas(paginas: number): number {
  return Math.ceil(paginas / 2)
}
```

---

## 4. BASE DE DATOS (Supabase / PostgreSQL)

```sql
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLA: libros
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE libros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT NOT NULL,
  precio        NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  paginas       INTEGER CHECK (paginas > 0),
  hojas         INTEGER GENERATED ALWAYS AS (CEIL(paginas::numeric / 2)) STORED,
  observaciones TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLA: pedidos
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libro_id        UUID NOT NULL REFERENCES libros(id) ON DELETE RESTRICT,
  alumno_nombre   TEXT NOT NULL,
  division        TEXT,
  -- precio acordado al momento del pedido, NO cambia si el libro cambia de precio
  precio_cobrado  NUMERIC(10,2) NOT NULL CHECK (precio_cobrado >= 0),
  estado_impresion TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_impresion IN ('Pendiente', 'Impreso')),
  fecha_impresion  DATE,
  estado_entrega  TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_entrega IN ('Pendiente', 'Entregado')),
  fecha_entrega   DATE,
  estado_pago     TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_pago IN ('Pendiente', 'SeÃ±a', 'Pagado')),
  monto_cobrado   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_cobrado >= 0),
  fecha_pago      DATE,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- VISTA: pedidos_detalle (enriquece con datos del libro y cÃ¡lculos)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE VIEW pedidos_detalle AS
SELECT
  p.*,
  l.titulo        AS libro_titulo,
  l.hojas         AS libro_hojas,
  l.paginas       AS libro_paginas,
  l.precio        AS libro_precio_actual,
  (p.precio_cobrado - COALESCE(p.monto_cobrado, 0)) AS saldo,
  CASE
    WHEN p.estado_entrega    = 'Entregado' AND (p.precio_cobrado - COALESCE(p.monto_cobrado,0)) = 0 THEN 'Cerrado'
    WHEN p.estado_entrega    = 'Entregado' AND (p.precio_cobrado - COALESCE(p.monto_cobrado,0)) > 0 THEN 'Entregado con saldo'
    WHEN p.estado_impresion  = 'Impreso'   AND (p.precio_cobrado - COALESCE(p.monto_cobrado,0)) = 0 THEN 'Listo p/entregar'
    WHEN p.estado_impresion  = 'Impreso'   AND (p.precio_cobrado - COALESCE(p.monto_cobrado,0)) > 0 THEN 'Impreso con saldo'
    WHEN COALESCE(p.monto_cobrado,0) > 0 AND p.estado_impresion = 'Pendiente'                       THEN 'Pagado/pend. impresiÃ³n'
    ELSE 'Pendiente'
  END AS estado_general
FROM pedidos p
JOIN libros l ON l.id = p.libro_id;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TRIGGERS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_libros_updated
  BEFORE UPDATE ON libros FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ROW LEVEL SECURITY
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE libros  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_autenticados" ON libros  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "solo_autenticados" ON pedidos FOR ALL USING (auth.role() = 'authenticated');

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ÃNDICES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE INDEX idx_pedidos_libro_id       ON pedidos(libro_id);
CREATE INDEX idx_pedidos_estado_imp     ON pedidos(estado_impresion);
CREATE INDEX idx_pedidos_estado_pago    ON pedidos(estado_pago);
CREATE INDEX idx_pedidos_estado_ent     ON pedidos(estado_entrega);
CREATE INDEX idx_pedidos_alumno         ON pedidos USING gin(to_tsvector('simple', alumno_nombre));
CREATE INDEX idx_pedidos_created_at     ON pedidos(created_at DESC);
```

---

## 5. DATOS SEMILLA â€” MIGRACIÃ“N DESDE EXCEL

Ejecutar en el SQL Editor de Supabase Dashboard despuÃ©s de crear las tablas.

```sql
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SEED: CatÃ¡logo de libros (7 libros reales del negocio)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO libros (titulo, precio, paginas) VALUES
  ('Supertrazos2',      8500,  70),
  ('Brighter Ideas',    14800, 114),
  ('Sentir y pensar 2', 8500,  79),
  ('WORKBOOK',          10300, 128),
  ('Cartilla 7Âª',       7500,  84),
  ('Supertrazos3',      8900,  69),
  ('Sentir y pensar 3', 8500,  84);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SEED: 140 pedidos migrados del Excel
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO pedidos (libro_id, alumno_nombre, division, precio_cobrado,
                     estado_impresion, estado_entrega, estado_pago,
                     monto_cobrado, observaciones)
VALUES
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Valentina Gallo', NULL, 8500, 'Pendiente', 'Entregado', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Martina', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Nico', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Max', NULL, 8500, 'Pendiente', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Delfi Fernandez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Prieto Lopez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Catalina', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Cata MuÃ±oz', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Milo', NULL, 8500, 'Impreso', 'Entregado', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Laia', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Laura', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Benicio Gimenez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Sofia', NULL, 8500, 'Impreso', 'Entregado', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Pedro L', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Tomas L', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Juan Ignacio', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Delfi', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Felipe cruz', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Paulo', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Olivia Glotting', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Benicio Dantur', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Felipe Rodriguez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Sol Ramos', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Paulita', NULL, 8500, 'Impreso', 'Entregado', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Ciro', NULL, 8500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Laura', NULL, 8500, 'Impreso', 'Entregado', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Belen', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Gabi', NULL, 8500, 'Impreso', 'Entregado', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Emanuel', 'A', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Amadeo', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Tomy', 'A', 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Helena', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Juan Manuel', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Jano', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Almendra', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Alfon', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Delfina Groh', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Lucas', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Coni', NULL, 8500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Oli Saravia', NULL, 8500, 'Pendiente', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Mateo Portillo', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Valentina Gallo', NULL, 14800, 'Impreso', 'Entregado', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Juan Ignacio', NULL, 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Rosario', NULL, 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Laura', NULL, 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Lolo', 'C', 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Gabi', NULL, 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Emanuel', NULL, 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Juan Manuel', NULL, 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Almendra', NULL, 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'benicio Dantur', 'A', 14800, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Delfina Groh', 'A', 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'Olivia Saravia', 'c', 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'cata MuÃ±oz', NULL, 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Olivia Saravia', 'B', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Catalina Esliman', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Cata MuÃ±oz', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Laura', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Felipe RodrÃ­guez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Laia', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Amadeo H', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Juan Ignacio', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Maryam', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Mateo portillo', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Sol Ramos', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Pedro L', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Tomas L', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Paulo Lopez', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Delfi', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Barto', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Alina', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Lucas', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'OlÃ­ Saravia', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Benicio GimÃ©nez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Amor', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Ciro', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Franco', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Martina', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Benicio Dantur', 'A', 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Milo', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Coni', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Alfon', 'c', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Felipe Cruz', 'b', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Bauti PÃ©rez Postigo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'TomÃ¡s Bozovich', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'ValentÃ­n Esliman', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Juan Marcos Elbusto', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Catalina Rodo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Vicky assaf', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Bauti catalano', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Martina Herrera', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Pintos Olivia', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Maia Choque', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Flor Saravia', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'MartÃ­n Clark', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'JeremÃ­as MIGUENS', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Duarte Irina', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Gregorio Crespo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'LeÃ³n Mendieta', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Julian Casap', 'A', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Violeta Portocarrero', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Cielo AlarcÃ³n', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Isabella GarzÃ³n DurÃ¡n', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Olivia Jorge', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Cande James 7 B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Isabella Rossini 7mo C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Bautista Assennato 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Valentina Assennato 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Isabella Ende 7 C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'TomÃ¡s Pimentel 7b', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Lorenzo ESTEVES , 7 A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Theo MedrÃ¡n 7 B.', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Alfonsina Elbusto. 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Juliana Guanca 7Â° B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Olivia Gutierrez 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Tomas Caramella 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Felipe bruzzone 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Lucio Morales 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Damiana Caldera 7 A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Benja Lazarte Dagun 7C a', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Fraia lautaro 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Candelaria Uldry', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Selena Julio Soria', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Moises Ehlert', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Guillermina Casap 7mo B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Felicitas Bernardinez ( 7mo C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Giulia Beccalli 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Ana Paula Gallardo Zeitune libro mÃ¡s cartilla de inglÃ©s', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'LucÃ­a Valdez cartilla', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Oriana Sarraf  7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Juan Ignacio de la Vega 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Lucas Erz 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Juanpi Pereyra ( 7C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'SofÃ­a Choque 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'LucÃ­a Jerez (7C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Catalina Menin 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Benja Palavecino 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7Âª' LIMIT 1), 'Tiziana Haro 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Sofia', 'B', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Olivia Glotting', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL);
```

---

## 6. ARQUITECTURA DE CARPETAS

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ core/
â”‚   â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”‚   â”œâ”€â”€ auth.service.ts            â† sesiÃ³n como signal, login/logout
â”‚   â”‚   â”‚   â””â”€â”€ auth.guard.ts              â† redirige a /login si no autenticado
â”‚   â”‚   â”œâ”€â”€ supabase/
â”‚   â”‚   â”‚   â”œâ”€â”€ supabase.client.ts         â† InjectionToken con createClient()
â”‚   â”‚   â”‚   â””â”€â”€ database.types.ts          â† generado por "supabase gen types"
â”‚   â”‚   â””â”€â”€ layout/
â”‚   â”‚       â”œâ”€â”€ app-shell.component.ts     â† router-outlet + nav condicional
â”‚   â”‚       â”œâ”€â”€ nav-bottom.component.ts    â† nav fijo inferior mobile
â”‚   â”‚       â””â”€â”€ nav-sidebar.component.ts   â† sidebar desktop (lg+)
â”‚   â”‚
â”‚   â”œâ”€â”€ features/
â”‚   â”‚   â”œâ”€â”€ pedidos/
â”‚   â”‚   â”‚   â”œâ”€â”€ pedidos.routes.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ data/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ pedidos.repository.ts    â† interface + implementaciÃ³n Supabase
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ pedidos.repository.token.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ domain/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ pedido.model.ts          â† tipos e interfaces del dominio
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ estado.utils.ts          â† determinarEstadoGeneral(), pura
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ pedido.validator.ts      â† Zod schemas
â”‚   â”‚   â”‚   â”œâ”€â”€ state/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ pedidos.store.ts         â† signals: pedidos, loading, filtros
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ pedidos.facade.ts        â† API pÃºblica para componentes
â”‚   â”‚   â”‚   â””â”€â”€ ui/
â”‚   â”‚   â”‚       â”œâ”€â”€ pages/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ pedidos-lista.page.ts
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ pedido-nuevo.page.ts
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ pedido-detalle.page.ts
â”‚   â”‚   â”‚       â””â”€â”€ components/
â”‚   â”‚   â”‚           â”œâ”€â”€ pedido-card.component.ts
â”‚   â”‚   â”‚           â”œâ”€â”€ pedido-row.component.ts
â”‚   â”‚   â”‚           â”œâ”€â”€ pedido-form.component.ts
â”‚   â”‚   â”‚           â”œâ”€â”€ quick-status.component.ts
â”‚   â”‚   â”‚           â””â”€â”€ filtros-panel.component.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ libros/
â”‚   â”‚   â”‚   â”œâ”€â”€ libros.routes.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ data/libros.repository.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ domain/libro.model.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ state/libros.facade.ts
â”‚   â”‚   â”‚   â””â”€â”€ ui/
â”‚   â”‚   â”‚       â”œâ”€â”€ pages/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ libros-lista.page.ts
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ libro-form.page.ts
â”‚   â”‚   â”‚       â””â”€â”€ components/
â”‚   â”‚   â”‚           â”œâ”€â”€ libro-card.component.ts
â”‚   â”‚   â”‚           â””â”€â”€ libro-selector.component.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ informes/
â”‚   â”‚       â”œâ”€â”€ informes.routes.ts
â”‚   â”‚       â”œâ”€â”€ data/informes.repository.ts
â”‚   â”‚       â”œâ”€â”€ state/informes.facade.ts
â”‚   â”‚       â””â”€â”€ ui/
â”‚   â”‚           â”œâ”€â”€ pages/informes.page.ts
â”‚   â”‚           â””â”€â”€ components/
â”‚   â”‚               â”œâ”€â”€ kpi-card.component.ts
â”‚   â”‚               â”œâ”€â”€ resumen-tabla.component.ts
â”‚   â”‚               â”œâ”€â”€ sin-pagar-lista.component.ts
â”‚   â”‚               â””â”€â”€ faltan-imprimir-lista.component.ts
â”‚   â”‚
â”‚   â””â”€â”€ shared/
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ estado-badge.component.ts
â”‚       â”‚   â”œâ”€â”€ confirm-dialog.component.ts
â”‚       â”‚   â”œâ”€â”€ skeleton-card.component.ts
â”‚       â”‚   â””â”€â”€ empty-state.component.ts
â”‚       â”œâ”€â”€ pipes/
â”‚       â”‚   â”œâ”€â”€ peso.pipe.ts
â”‚       â”‚   â””â”€â”€ fecha-corta.pipe.ts
â”‚       â”œâ”€â”€ errors/
â”‚       â”‚   â””â”€â”€ app-error.ts              â† AppError + Result<T>
â”‚       â”œâ”€â”€ constants/
â”‚       â”‚   â””â”€â”€ negocio.constants.ts      â† ESTADO_PAGO, ESTADO_GENERAL, etc.
â”‚       â””â”€â”€ utils/
â”‚           â””â”€â”€ result.ts                 â† Result<T, E> pattern
â”‚
â”œâ”€â”€ environments/
â”‚   â”œâ”€â”€ environment.ts
â”‚   â””â”€â”€ environment.prod.ts
â”œâ”€â”€ manifest.webmanifest
â””â”€â”€ ngsw-config.json
```

---

## 7. CONSTANTES DEL DOMINIO

```typescript
// shared/constants/negocio.constants.ts

export const ESTADO_PAGO = {
  PENDIENTE: 'Pendiente',
  SENA:      'SeÃ±a',
  PAGADO:    'Pagado',
} as const
export type EstadoPago = typeof ESTADO_PAGO[keyof typeof ESTADO_PAGO]

export const ESTADO_IMPRESION = {
  PENDIENTE: 'Pendiente',
  IMPRESO:   'Impreso',
} as const
export type EstadoImpresion = typeof ESTADO_IMPRESION[keyof typeof ESTADO_IMPRESION]

export const ESTADO_ENTREGA = {
  PENDIENTE:  'Pendiente',
  ENTREGADO:  'Entregado',
} as const
export type EstadoEntrega = typeof ESTADO_ENTREGA[keyof typeof ESTADO_ENTREGA]

export const ESTADO_GENERAL = {
  PENDIENTE:          'Pendiente',
  IMPRESO_CON_SALDO:  'Impreso con saldo',
  LISTO_ENTREGAR:     'Listo p/entregar',
  ENTREGADO_CON_SALDO:'Entregado con saldo',
  PAGADO_PEND_IMP:    'Pagado/pend. impresiÃ³n',
  CERRADO:            'Cerrado',
} as const
export type EstadoGeneral = typeof ESTADO_GENERAL[keyof typeof ESTADO_GENERAL]

// Prioridad de ordenamiento en el listado (menor = primero)
export const PRIORIDAD_ESTADO_GENERAL: Record<EstadoGeneral, number> = {
  [ESTADO_GENERAL.LISTO_ENTREGAR]:      1,
  [ESTADO_GENERAL.IMPRESO_CON_SALDO]:   2,
  [ESTADO_GENERAL.PAGADO_PEND_IMP]:     3,
  [ESTADO_GENERAL.PENDIENTE]:           4,
  [ESTADO_GENERAL.ENTREGADO_CON_SALDO]: 5,
  [ESTADO_GENERAL.CERRADO]:             6,
}

// Config visual por estado (usada por EstadoBadgeComponent)
export const ESTADO_VISUAL: Record<string, {
  bg: string; text: string; label: string
}> = {
  [ESTADO_GENERAL.PENDIENTE]:           { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Pendiente' },
  [ESTADO_IMPRESION.IMPRESO]:           { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Impreso' },
  [ESTADO_GENERAL.IMPRESO_CON_SALDO]:   { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Impreso c/saldo' },
  [ESTADO_GENERAL.LISTO_ENTREGAR]:      { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'Listo p/entregar' },
  [ESTADO_ENTREGA.ENTREGADO]:           { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Entregado' },
  [ESTADO_GENERAL.ENTREGADO_CON_SALDO]: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Entregado c/saldo' },
  [ESTADO_GENERAL.CERRADO]:             { bg: 'bg-emerald-500', text: 'text-white',       label: 'âœ“ Cerrado' },
  [ESTADO_GENERAL.PAGADO_PEND_IMP]:     { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'Pagado/pend.imp.' },
  [ESTADO_PAGO.PAGADO]:                 { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Pagado' },
  [ESTADO_PAGO.SENA]:                   { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'SeÃ±a' },
}

/**
 * Calcula las hojas fÃ­sicas de un libro.
 * ImpresiÃ³n siempre doble faz â†’ pÃ¡ginas / 2 redondeando hacia arriba.
 * Ej: 79 pÃ¡ginas â†’ 40 hojas (la Ãºltima hoja tiene una cara en blanco)
 */
export function calcularHojas(paginas: number): number {
  return Math.ceil(paginas / 2)
}
```

---

## 8. FUNCIONALIDADES â€” PANTALLA POR PANTALLA

### `/login`
- Email + password via Supabase Auth
- Sin opciÃ³n de registro (la cuenta se crea desde Supabase dashboard)
- Redirige a `/pedidos` al autenticar
- Guard en todas las rutas protegidas

### `/pedidos` â€” Listado principal
**Mobile (< lg):** tarjetas apiladas  
**Desktop (lg+):** tabla

Cada Ã­tem muestra: alumno, libro, divisiÃ³n, 3 badges de estado, estado general, saldo (en rojo si > 0)

**Acciones rÃ¡pidas inline** (sin entrar al detalle):
- Toggle Impreso / Pendiente
- Ciclo Pendiente â†’ SeÃ±a â†’ Pagado (con input de monto si SeÃ±a)
- Toggle Entregado / Pendiente

**Filtros** (Sheet en mobile, sidebar en desktop):
- BÃºsqueda por alumno (filtra en cliente, debounce 300ms)
- Por libro (select)
- Por estado general (chips)
- Por estado pago (chips)

**Ordenamiento default**: por PRIORIDAD_ESTADO_GENERAL  
**FAB** "+" esquina inferior derecha â†’ `/pedidos/nuevo`

### `/pedidos/nuevo` â€” Carga ultra-rÃ¡pida
Cabe en una pantalla mobile SIN scroll. Campos:
1. Libro (combobox con bÃºsqueda) â†’ auto-llena precio
2. Alumno (input, autocapitalize words)
3. DivisiÃ³n (opcional, corto) | Precio (pre-llenado, editable)
4. Estado pago: 3 botones [Pendiente] [SeÃ±a] [Pagado]
   - SeÃ±a: aparece input monto con animaciÃ³n
   - Pagado: monto = precio (invisible, automÃ¡tico)
5. Observaciones (colapsado por defecto)
6. BotÃ³n GUARDAR (56px alto, full width)

Toast de Ã©xito + navegar a `/pedidos`

### `/pedidos/:id` â€” Detalle/ediciÃ³n
- Todos los campos editables
- Saldo calculado en tiempo real con `computed()`
- Estado general calculado automÃ¡ticamente
- BotÃ³n eliminar (con ConfirmDialog)
- BotÃ³n guardar sticky al fondo

### `/libros` â€” CatÃ¡logo
- Lista: tÃ­tulo, precio, pÃ¡ginas, hojas (calculadas)
- FAB "+" â†’ `/libros/nuevo`
- Toggle activo/inactivo por libro

### `/libros/:id` â€” Formulario
- tÃ­tulo, precio, pÃ¡ginas
- Mostrar: "Hojas por ejemplar: XX (ceil(pÃ¡ginas/2))"
- Warning si edita precio: "Los pedidos existentes mantienen su precio original"

### `/informes` â€” Dashboard (tabs)

**Resumen:** 8 KPI cards + tabla por libro con % cerrado (semÃ¡foro)  
El KPI **"Hojas pend. imprimir"** es el mÃ¡s importante visualmente (color Ã¡mbar)

**Sin pagar:** pedidos con imp=Impreso y pagoâ‰ Pagado  
- BotÃ³n inline "Marcar pagado"
- Footer: total saldo

**Faltan imprimir:** pedidos con imp=Pendiente  
- Agrupados por libro (collapsible)
- BotÃ³n inline "Marcar impreso"
- Footer: total hojas necesarias

---

## 9. PWA â€” CONFIGURACIÃ“N

```json
// manifest.webmanifest
{
  "name": "Pedidos Imprenta",
  "short_name": "Pedidos",
  "start_url": "/pedidos",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 10. COMANDOS DE SETUP

```bash
ng new imprenta-pedidos --routing --style=css --standalone
npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init
# Spartan UI â€” seguir docs en spartan.ng para proyectos Angular CLI
npm install @supabase/supabase-js zod date-fns
ng add @angular/pwa
# Generar tipos Supabase (repetir si cambia el schema)
npx supabase gen types typescript --project-id [PROJECT_ID] \
  > src/app/core/supabase/database.types.ts
```

---

## 11. VARIABLES DE ENTORNO

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  supabase: {
    url:     'https://[PROJECT_ID].supabase.co',
    anonKey: '[ANON_KEY]'
  }
}
```


---

## 12. PLAN DE IMPLEMENTACIÓN VIVO

> Este plan se actualiza al finalizar cada tarea relevante.
> Estado posible por ítem: `Pendiente` | `En curso` | `Hecho` | `Bloqueado`

### Fase 1 — Base productiva mínima
- [x] `Hecho` Crear la base Angular standalone con routing y arquitectura por features
- [x] `Hecho` Modelar dominio principal: libros, pedidos, estados, saldo, hojas y estado general
- [x] `Hecho` Implementar stores/facades con Angular Signals
- [x] `Hecho` Implementar validación inicial con Zod para pedidos
- [x] `Hecho` Crear UI inicial funcional para login, pedidos, libros e informes
- [x] `Hecho` Agregar datos locales mock para permitir desarrollo sin bloquear por backend
- [ ] `Pendiente` Reemplazar almacenamiento local por persistencia real en Supabase

### Fase 2 — Infraestructura Supabase real
- [ ] `En curso` Crear proyecto Supabase y definir variables reales de entorno
- [x] `Hecho` Implementar schema PostgreSQL según el prompt
- [ ] `Pendiente` Cargar seed inicial real de libros y pedidos
- [ ] `Pendiente` Generar `database.types.ts` con `supabase gen types`
- [x] `Hecho` Crear cliente Supabase e integración por InjectionToken
- [ ] `En curso` Implementar repositorios reales de libros, pedidos e informes sobre Supabase
- [x] `Hecho` Reemplazar auth local por Supabase Auth
- [x] `Hecho` Implementar guards y sesión persistente con Supabase
- [ ] `Pendiente` Implementar Realtime para cambios de pedidos

### Fase 3 — Migración de datos reales
- [ ] `Pendiente` Preparar importación desde Excel
- [ ] `Pendiente` Migrar los 7 libros reales al catálogo
- [ ] `Pendiente` Migrar los 140 pedidos reales
- [ ] `Pendiente` Verificar consistencia de importes, estados y saldos
- [ ] `Pendiente` Validar métricas iniciales contra el Excel original

### Fase 4 — Pedidos: flujo operativo completo
- [x] `Hecho` Listado principal funcional de pedidos
- [x] `Hecho` Implementar vista desktop en tabla
- [x] `Hecho` Implementar filtros completos por estado general y estado de pago
- [x] `Hecho` Implementar chips y UX de filtros mobile/desktop
- [x] `Hecho` Implementar Sheet mobile para filtros
- [x] `Hecho` Implementar FAB flotante para alta rápida
- [x] `Hecho` Implementar acciones rápidas inline para impresión, pago y entrega
- [x] `Hecho` Implementar formulario de alta de pedido
- [x] `Hecho` Optimizar alta para que entre en una pantalla mobile sin scroll
- [x] `Hecho` Mostrar input condicional animado para seña
- [x] `Hecho` Agregar toast de éxito y error
- [x] `Hecho` Implementar detalle/edición de pedido
- [x] `Hecho` Agregar ConfirmDialog al eliminar
- [x] `Hecho` Agregar botón guardar sticky al fondo
- [x] `Hecho` Endurecer reglas de negocio y casos borde en edición

### Fase 5 — Libros: catálogo completo
- [x] `Hecho` Implementar listado base de libros
- [x] `Hecho` Implementar alta básica de libro
- [x] `Hecho` Implementar edición de libro por `:id`
- [x] `Hecho` Implementar toggle activo/inactivo
- [x] `Hecho` Implementar FAB flotante para libros
- [x] `Hecho` Mostrar warning más visible al cambiar precios

### Fase 6 — Informes y priorización operativa
- [x] `Hecho` Implementar dashboard base con KPIs
- [x] `Hecho` Destacar KPI de hojas pendientes de impresión
- [x] `Hecho` Implementar listado base de pedidos sin pagar
- [x] `Hecho` Implementar listado base de pedidos faltantes de impresión
- [x] `Hecho` Implementar tabs reales: Resumen / Sin pagar / Faltan imprimir
- [x] `Hecho` Implementar tabla por libro con porcentaje cerrado
- [x] `Hecho` Implementar agrupación por libro en faltan imprimir
- [x] `Hecho` Agregar footer con total saldo en sin pagar
- [x] `Hecho` Agregar footer con total hojas necesarias en faltan imprimir

### Fase 7 — UI system y experiencia final
- [ ] `Pendiente` Instalar y configurar Tailwind CSS v3
- [ ] `Pendiente` Instalar y configurar Spartan UI
- [ ] `Pendiente` Reemplazar componentes caseros por primitives consistentes donde convenga
- [ ] `Pendiente` Mejorar diseño mobile-first para uso intensivo por la dueña
- [x] `Hecho` Revisar accesibilidad, foco, tamaños táctiles y estados vacíos
- [ ] `Pendiente` Agregar skeletons, dialogs y feedback visual consistente

### Fase 8 — PWA y despliegue
- [x] `Hecho` Crear manifest webmanifest
- [x] `Hecho` Crear configuración inicial de service worker
- [ ] `Pendiente` Integrar `@angular/pwa` oficialmente
- [ ] `Pendiente` Agregar iconos reales 192 y 512
- [ ] `Pendiente` Validar instalación standalone en mobile
- [ ] `Pendiente` Preparar deploy en Vercel o Netlify

### Fase 9 — Testing y endurecimiento
- [x] `Hecho` Agregar test inicial de utilidad de negocio
- [ ] `Pendiente` Cubrir utilities críticas con unit tests
- [ ] `Pendiente` Cubrir facades y repositorios con tests
- [ ] `Pendiente` Cubrir flujos críticos de pedidos
- [x] `Hecho` Revisar errores de validación y mensajes para usuaria no técnica
- [ ] `Pendiente` Auditar performance de carga y acciones rápidas

### Bloqueadores actuales
- [ ] `Bloqueado` Faltan credenciales reales de Supabase
- [ ] `Bloqueado` Falta origen del Excel real para migración completa
- [ ] `Bloqueado` Falta decidir si la UI final debe respetar estrictamente Spartan/Tailwind desde ahora o en una fase posterior

### Próxima tarea recomendada
- [ ] `Pendiente` Cargar credenciales reales en environment y validar login Supabase
- [ ] `Pendiente` Implementar repositorio real de informes sobre Supabase
- [ ] `Pendiente` Validar que libros y pedidos ya salgan de la base real
---

## 13. ACTUALIZACIÓN FUNCIONAL RECIENTE

Esta sección complementa el prompt original con cambios ya implementados en la aplicación y debe prevalecer cuando haya contradicción con secciones anteriores.

### Pedidos
- El avance rápido de pago desde listados e informes alterna entre `Pendiente` y `Pagado`.
- La `Seña` sigue existiendo como opción manual en el formulario, pero no forma parte del flujo rápido principal.
- En el formulario de alta, `Pagado` es la primera opción visual en el selector de estado de pago.
- Al crear un pedido, si existen libros activos, el formulario selecciona uno por defecto.
- Al seleccionar un libro, el precio del libro se copia automáticamente al pedido como valor inicial, pero el usuario puede editarlo.
- Si el usuario cambia de libro durante el alta, el formulario debe refrescar `Precio`, `Monto cobrado` y `Saldo` según el libro seleccionado y el estado de pago actual.
- En mobile, el sheet de filtros de pedidos debe mostrar el total real del filtro, no solamente la cantidad visible en la página actual.

### Informes
- La pestaña `Sin pagar` debe permitir filtrar por libro.
- La pestaña `Faltan imprimir` debe permitir filtrar por libro.
- La pestaña `Sin entregar` debe existir como informe operativo para listar pedidos impresos pendientes de entrega y permitir marcarlos como entregados directamente desde informes.
- Los informes `Sin pagar`, `Faltan imprimir` y `Sin entregar` deben compartir filtros opcionales de `Libro` y `Alumno`, acumulables entre sí.
- El resumen de informes debe mostrar también el KPI `Total cobrado`, además de `Saldo total`.
- La tabla `Avance por libro` debe incluir además las columnas `Impresos`, `Pagados` y `Por cobrar`.

### Criterio de implementación
- Si una instrucción anterior del documento describe el avance rápido de pago como `Pendiente -> Seña -> Pagado`, reemplazarla por el comportamiento actual `Pendiente <-> Pagado`.
- Si una instrucción anterior omite el libro por defecto en alta, el precio inicial editable o la resincronización de precio/saldo al cambiar de libro, tomar esta sección como fuente vigente.
- Si una instrucción anterior de informes no incluye filtros compartidos por libro/alumno, el informe `Sin entregar`, el KPI `Total cobrado` o las columnas nuevas de avance por libro, esta sección tiene prioridad.

### Plan vivo actualizado
- [x] `Hecho` Hacer que el avance rápido de pago salte de `Pendiente` a `Pagado`.
- [x] `Hecho` Seleccionar libro por defecto y precargar precio editable en alta de pedido.
- [x] `Hecho` Agregar filtro por libro en `Sin pagar`.
- [x] `Hecho` Agregar filtro por libro en `Faltan imprimir`.
- [x] `Hecho` Agregar informe `Sin entregar` con acción directa para marcar entregado.
- [x] `Hecho` Compartir filtros de `Libro` y `Alumno` entre `Sin pagar`, `Faltan imprimir` y `Sin entregar`.
- [x] `Hecho` Agregar KPI `Total cobrado` al resumen de informes.
- [x] `Hecho` Resincronizar `Precio`, `Monto cobrado` y `Saldo` al cambiar de libro en el alta de pedido.
- [x] `Hecho` Agregar columnas `Impresos`, `Pagados` y `Por cobrar` en `Avance por libro`.
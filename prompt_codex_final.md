# Sistema de Gestion de Pedidos de Impresion
## Prompt completo para Codex

---

## 0. INSTRUCCIONES GENERALES PARA CODEX

Sos un **arquitecto senior de software** construyendo un sistema de produccion real.
No es un ejercicio academico: hay datos reales, una usuaria real y plata real en juego.

**Reglas absolutas de este proyecto:**

- Cada linea de codigo que escribas debe poder ser mantenida por otro desarrollador
  Angular senior sin que tenga que preguntarle nada a nadie
- Si existe una forma mas limpia de hacer algo, usa esa, no la mas rapida
- Nunca escribas codigo que "funciona pero es un hack"
- Pensa en casos borde antes de escribir la funcion, no despues
- Si algo no esta especificado, toma la decision mas conservadora y documentala

---

## 1. CONTEXTO DE NEGOCIO

### Que es el sistema
Una imprenta familiar recibe pedidos de familias para imprimir libros escolares.
La duena (usuaria principal) necesita saber en todo momento:
- Que pedidos estan pendientes de imprimir
- Quien le debe plata y cuanto
- Cuantas hojas fisicas necesita tener para completar los pedidos

### Como funciona el negocio
1. Una familia encarga un libro -> se crea un pedido
2. La duena imprime el libro -> marca el pedido como "Impreso"
3. La familia paga -> puede pagar todo (Pagado) o una parte (Sena)
4. La duena entrega el libro -> marca el pedido como "Entregado"
5. Cuando esta entregado Y el saldo es $0 -> el pedido queda "Cerrado"

### Reglas de negocio criticas
- **Hojas por libro** = ceil(paginas / 2) -> impresion doble faz siempre
- **El precio se copia al pedido** en el momento de crearlo. Si despues el libro
  cambia de precio, los pedidos existentes NO se modifican
- **Sena** = pago parcial. La duena ingresa el monto recibido manualmente
- **Pagado** = pago total. El sistema completa automaticamente monto = precio
- **Saldo** = precio_cobrado - monto_cobrado (siempre >= 0)
- Un pedido "Listo p/entregar" = Impreso + Saldo = 0 (prioridad alta para entregar)
- Un pedido puede estar Entregado pero con saldo (caso valido: entrego fiado)

### Usuaria principal
- No tecnica, usa el celular como dispositivo primario
- Opera en momentos de alta carga (muchos pedidos juntos al inicio del ano escolar)
- No tiene tolerancia a errores confusos o flujos de muchos pasos
- La velocidad de carga de un pedido nuevo es el KPI mas importante de UX

### Datos actuales (migracion del Excel)
El sistema arranca con datos reales que vienen de un Excel previo:
- **7 libros** en el catalogo
- **140 pedidos** existentes
- 68 impresos, 72 pendientes de impresion
- 58 pagados, 82 pendientes de pago

---

## 2. STACK TECNICO

### Frontend
- **Angular 18** - standalone components, signals, control flow nativo (`@if`, `@for`, `@switch`)
- **Tailwind CSS v3** - mobile-first, utility-first
- **Spartan UI** (spartan.ng) - componentes headless sobre Angular CDK.
  Instalar: Button, Input, Label, Select, Badge, Card, Table, Tabs,
  Sheet (drawer mobile), Dialog, Skeleton, Sonner (toasts), Separator
- **Angular CDK** - ya incluido por Spartan, usar para: overlay, a11y, drag
- **@angular/pwa** - PWA instalable, display: standalone, sin barra del browser

### Estado
- **Angular Signals** exclusivamente para estado de UI y datos
- `signal()`, `computed()`, `linkedSignal()`, `effect()`
- Patron: services with signals (no NgRx, no BehaviorSubject para estado)
- RxJS solo para interop con Supabase Realtime -> convertir con `toSignal()`

### Backend / Base de datos
- **Supabase** - PostgreSQL + Auth + Realtime (free tier)
- SDK `@supabase/supabase-js` v2
- Sin backend propio. Todo acceso a datos via servicios Angular -> Supabase directo

### Validacion
- **Zod** - schemas en `shared/schemas/`. Validar antes de cada operacion de escritura
- Custom Angular validator que wrappea Zod para formularios reactivos

### Utilidades
- **date-fns** - solo para formateo. Sin moment.js
- **`@angular/core/rxjs-interop`** - `toSignal()`, `toObservable()`

### Hosting
- **Vercel** o **Netlify** (free, CDN global, soporte PWA)

---

## 3. ESTANDARES DE CODIGO - NO NEGOCIABLES

Esta seccion define como se escribe codigo en este proyecto.
Todo el codigo generado debe cumplir con cada punto.

### 3.1 Principios SOLID aplicados a Angular

**Single Responsibility**
- Un componente = una responsabilidad. Un componente que muestra una lista
  no valida formularios. Un servicio que hace CRUD no formatea fechas.
- Cada metodo hace una sola cosa. Si necesitas un comentario para explicar
  que hace una seccion del metodo, esa seccion es un metodo aparte.

**Open/Closed**
- Los componentes de estado (`EstadoBadge`) reciben configuracion, no tienen
  `if/else` internos para cada estado. Usar un mapa de configuracion.
- Extender funcionalidad agregando codigo, no modificando el existente.

**Liskov Substitution**
- Las implementaciones concretas de repositorios/servicios deben ser
  intercambiables. Usar interfaces para los contratos.

**Interface Segregation**
- Interfaces pequenas y especificas. No un `IPedidoService` con 15 metodos.
  Mejor `IPedidosQuery` y `IPedidosMutation` separados.

**Dependency Inversion**
- Los componentes dependen de abstracciones (tokens de inyeccion), no de
  implementaciones concretas. Facilita testing y sustitucion.

### 3.2 Clean Code - reglas concretas

**Naming**
```typescript
//  MAL
const d = new Date()
const pd = this.sp.getPed()
function calc(x: number, y: number) { return x - y }
const flag = true

//  BIEN
const fechaHoy = new Date()
const pedidos  = this.pedidosService.obtenerPedidos()
function calcularSaldo(precio: number, montoCobrado: number): number {
  return precio - montoCobrado
}
const estaImpreso = true
```

**Funciones**
- Maximo 20 lineas por funcion. Si crece mas, extraer.
- Maximo 3 parametros. Mas de 3 -> usar un objeto tipado.
- Sin efectos secundarios ocultos. Una funcion que dice "calcular" no debe
  modificar estado.
- Funciones puras donde sea posible.

**Sin magic numbers o magic strings**
```typescript
//  MAL
if (pedido.estado_pago === 'Pagado') { ... }
const hojas = Math.ceil(paginas / 2)

//  BIEN
import { ESTADO_PAGO, calcularHojas } from '@/shared/constants/negocio.constants'
if (pedido.estado_pago === ESTADO_PAGO.PAGADO) { ... }
const hojas = calcularHojas(paginas)
```

**Early returns - evitar anidamiento**
```typescript
//  MAL
function procesarPedido(pedido: Pedido) {
  if (pedido) {
    if (pedido.estado_impresion === 'Impreso') {
      if (pedido.saldo === 0) {
        return 'Listo p/entregar'
      }
    }
  }
}

//  BIEN
function determinarEstadoGeneral(pedido: Pedido): EstadoGeneral {
  if (!pedido) return 'Pendiente'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo === 0) return 'Cerrado'
  if (pedido.estado_entrega === 'Entregado' && pedido.saldo > 0)  return 'Entregado con saldo'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo === 0) return 'Listo p/entregar'
  if (pedido.estado_impresion === 'Impreso'  && pedido.saldo > 0)   return 'Impreso con saldo'
  if (pedido.monto_cobrado > 0)                                     return 'Pagado/pend. impresion'
  return 'Pendiente'
}
```

### 3.3 Patrones de diseno aplicados

**Repository Pattern - acceso a datos**
```typescript
// Abstraccion del acceso a datos, desacoplada de Supabase
interface PedidosRepository {
  findAll(filtros: FiltroPedidos): Promise<PedidoDetalle[]>
  findById(id: string): Promise<PedidoDetalle | null>
  create(input: CrearPedidoInput): Promise<Pedido>
  update(id: string, input: ActualizarPedidoInput): Promise<Pedido>
  delete(id: string): Promise<void>
}

// Implementacion concreta con Supabase
@Injectable({ providedIn: 'root' })
class SupabasePedidosRepository implements PedidosRepository {
  // ... implementacion
}

// Token de inyeccion - permite swappear la implementacion (ej: para tests)
const PEDIDOS_REPOSITORY = new InjectionToken<PedidosRepository>(
  'PedidosRepository',
  { providedIn: 'root', factory: () => inject(SupabasePedidosRepository) }
)
```

**Facade Pattern - simplificar la complejidad para los componentes**
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

**Result Pattern - manejo de errores sin excepciones**
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

**Strategy Pattern - para el ordenamiento del listado**
```typescript
interface OrdenamientoPedidos {
  ordenar(pedidos: PedidoDetalle[]): PedidoDetalle[]
}

const PRIORIDAD_ESTADO: Record<EstadoGeneral, number> = {
  'Listo p/entregar':      1,
  'Impreso con saldo':     2,
  'Pagado/pend. impresion':3,
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

**Command Pattern - para operaciones de estado (optimistic updates)**
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

**Observer Pattern - Supabase Realtime con signals**
```typescript
// Cambios en DB se reflejan automaticamente en la UI
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

### 3.4 TypeScript - uso estricto

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
//  Prohibido absolutamente
function procesar(data: any) { ... }

//  Usar unknown + type guards
function procesar(data: unknown) {
  if (!esPedido(data)) throw new Error('Dato invalido')
  // aca TypeScript ya sabe que data es Pedido
}

function esPedido(data: unknown): data is Pedido {
  return typeof data === 'object' && data !== null && 'id' in data
}
```

**Discriminated Unions para estados**
```typescript
// Hace imposible tener un estado invalido
type EstadoPedidoPago =
  | { tipo: 'pendiente' }
  | { tipo: 'sena';   monto: number }
  | { tipo: 'pagado'; monto: number; fecha: string }

// El compilador obliga a manejar todos los casos
function describirPago(estado: EstadoPedidoPago): string {
  switch (estado.tipo) {
    case 'pendiente': return 'Sin pagar'
    case 'sena':      return `Sena de $${estado.monto}`
    case 'pagado':    return `Pagado $${estado.monto} el ${estado.fecha}`
    // No hace falta default: TypeScript detecta si falta algun caso
  }
}
```

### 3.5 Angular - mejores practicas especificas

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

**OnPush en todos los componentes, sin excepcion**
Con signals, OnPush es gratuito - Angular sabe exactamente que cambio.

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

**Sin logica en templates**
```html
<!--  MAL -->
<span>{{ pedido.precio - pedido.monto_cobrado > 0 ? '$' + (pedido.precio - pedido.monto_cobrado) : 'Saldado' }}</span>

<!--  BIEN - la logica esta en el componente como computed() -->
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
//  Usar toSignal() - se limpia automaticamente
readonly pedidos = toSignal(this.pedidosService.pedidos$, { initialValue: [] })

// O usar takeUntilDestroyed() si necesitas subscribe()
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
    return new AppError('UNEXPECTED', 'Error inesperado. Intenta de nuevo.', causa)
  }

  static desdeSupabase(error: PostgrestError): AppError {
    if (error.code === '23503') return new AppError('CONSTRAINT', 'No se puede eliminar: tiene pedidos asociados')
    if (error.code === '23505') return new AppError('DUPLICATE', 'Ya existe un registro con esos datos')
    return AppError.inesperado(error)
  }
}

type ErrorCodigo = 'NOT_FOUND' | 'VALIDATION' | 'UNEXPECTED' | 'CONSTRAINT' | 'DUPLICATE' | 'AUTH'
```

### 3.7 Testing - estructura

```typescript
// Cada servicio y utility debe tener su spec
// Nomenclatura: describe('nombre', () => { it('deberia...', ...) })
// Usar TestBed solo cuando sea necesario. Funciones puras -> test unitario directo.

describe('determinarEstadoGeneral', () => {
  it('deberia retornar Cerrado cuando esta entregado y saldo es 0', () => {
    const pedido = crearPedidoMock({ estado_entrega: 'Entregado', saldo: 0 })
    expect(determinarEstadoGeneral(pedido)).toBe('Cerrado')
  })

  it('deberia retornar Listo p/entregar cuando esta impreso y saldo es 0', () => {
    const pedido = crearPedidoMock({ estado_impresion: 'Impreso', saldo: 0, estado_entrega: 'Pendiente' })
    expect(determinarEstadoGeneral(pedido)).toBe('Listo p/entregar')
  })
})
```

### 3.8 Comentarios y documentacion

```typescript
//  Comentario inutil: describe el que, no el por que
// Sumar los montos cobrados
const total = pedidos.reduce((acc, p) => acc + p.monto_cobrado, 0)

//  Comentario util: explica una decision no obvia
// El precio se copia al pedido al momento de crearlo y no cambia despues.
// Esto es intencional: si el libro sube de precio, los pedidos anteriores
// mantienen el precio acordado originalmente con la familia.
const precio_cobrado = libro.precio
```

**JSDoc solo en interfaces y funciones publicas de servicios:**
```typescript
/**
 * Calcula las hojas fisicas necesarias para imprimir un libro.
 * La imprenta trabaja siempre en doble faz, por eso se divide por 2
 * y se redondea hacia arriba (paginas impares agregan una hoja en blanco).
 */
export function calcularHojas(paginas: number): number {
  return Math.ceil(paginas / 2)
}
```

---

## 4. BASE DE DATOS (Supabase / PostgreSQL)

```sql
-- ----------------------------------------------------------------
-- TABLA: libros
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- TABLA: pedidos
-- ----------------------------------------------------------------
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
    CHECK (estado_pago IN ('Pendiente', 'Sena', 'Pagado')),
  monto_cobrado   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_cobrado >= 0),
  fecha_pago      DATE,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- VISTA: pedidos_detalle (enriquece con datos del libro y calculos)
-- ----------------------------------------------------------------
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
    WHEN COALESCE(p.monto_cobrado,0) > 0 AND p.estado_impresion = 'Pendiente'                       THEN 'Pagado/pend. impresion'
    ELSE 'Pendiente'
  END AS estado_general
FROM pedidos p
JOIN libros l ON l.id = p.libro_id;

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_libros_updated
  BEFORE UPDATE ON libros FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE libros  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_autenticados" ON libros  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "solo_autenticados" ON pedidos FOR ALL USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- INDICES
-- ----------------------------------------------------------------
CREATE INDEX idx_pedidos_libro_id       ON pedidos(libro_id);
CREATE INDEX idx_pedidos_estado_imp     ON pedidos(estado_impresion);
CREATE INDEX idx_pedidos_estado_pago    ON pedidos(estado_pago);
CREATE INDEX idx_pedidos_estado_ent     ON pedidos(estado_entrega);
CREATE INDEX idx_pedidos_alumno         ON pedidos USING gin(to_tsvector('simple', alumno_nombre));
CREATE INDEX idx_pedidos_created_at     ON pedidos(created_at DESC);
```

---

## 5. DATOS SEMILLA - MIGRACION DESDE EXCEL

Ejecutar en el SQL Editor de Supabase Dashboard despues de crear las tablas.

```sql
-- ----------------------------------------------------------------
-- SEED: Catalogo de libros (7 libros reales del negocio)
-- ----------------------------------------------------------------
INSERT INTO libros (titulo, precio, paginas) VALUES
  ('Supertrazos2',      8500,  70),
  ('Brighter Ideas',    14800, 114),
  ('Sentir y pensar 2', 8500,  79),
  ('WORKBOOK',          10300, 128),
  ('Cartilla 7',       7500,  84),
  ('Supertrazos3',      8900,  69),
  ('Sentir y pensar 3', 8500,  84);

-- ----------------------------------------------------------------
-- SEED: 140 pedidos migrados del Excel
-- ----------------------------------------------------------------
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
  ((SELECT id FROM libros WHERE titulo = 'Supertrazos2' LIMIT 1), 'Cata Munoz', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
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
  ((SELECT id FROM libros WHERE titulo = 'Brighter Ideas' LIMIT 1), 'cata Munoz', NULL, 14800, 'Pendiente', 'Pendiente', 'Pagado', 14800, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Olivia Saravia', 'B', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Catalina Esliman', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Cata Munoz', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Laura', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Felipe Rodriguez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
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
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Oli Saravia', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Benicio Gimenez', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Amor', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Ciro', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Franco', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Martina', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Benicio Dantur', 'A', 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Milo', NULL, 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Coni', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Alfon', 'c', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Felipe Cruz', 'b', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Bauti Perez Postigo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Tomas Bozovich', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Valentin Esliman', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Juan Marcos Elbusto', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Catalina Rodo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Vicky assaf', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Bauti catalano', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Martina Herrera', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Pintos Olivia', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Maia Choque', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Flor Saravia', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Martin Clark', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Jeremias MIGUENS', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Duarte Irina', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Gregorio Crespo', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Leon Mendieta', 'B', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'WORKBOOK' LIMIT 1), 'Julian Casap', 'A', 10300, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Violeta Portocarrero', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Cielo Alarcon', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Isabella Garzon Duran', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Olivia Jorge', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Cande James 7 B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Isabella Rossini 7mo C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Bautista Assennato 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Valentina Assennato 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Isabella Ende 7 C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Tomas Pimentel 7b', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Lorenzo ESTEVES , 7 A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Theo Medran 7 B.', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Alfonsina Elbusto. 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Juliana Guanca 7 B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Olivia Gutierrez 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Tomas Caramella 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Felipe bruzzone 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Lucio Morales 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Damiana Caldera 7 A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Benja Lazarte Dagun 7C a', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Fraia lautaro 7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Candelaria Uldry', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Selena Julio Soria', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Moises Ehlert', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Guillermina Casap 7mo B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Felicitas Bernardinez ( 7mo C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Giulia Beccalli 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Ana Paula Gallardo Zeitune libro mas cartilla de ingles', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Lucia Valdez cartilla', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Oriana Sarraf  7C', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Juan Ignacio de la Vega 7A', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Lucas Erz 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Juanpi Pereyra ( 7C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Sofia Choque 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Lucia Jerez (7C)', NULL, 7500, 'Pendiente', 'Pendiente', 'Pagado', 7500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Catalina Menin 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Benja Palavecino 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Cartilla 7' LIMIT 1), 'Tiziana Haro 7B', NULL, 7500, 'Pendiente', 'Pendiente', 'Pendiente', 0, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Sofia', 'B', 8500, 'Impreso', 'Pendiente', 'Pagado', 8500, NULL),
  ((SELECT id FROM libros WHERE titulo = 'Sentir y pensar 2' LIMIT 1), 'Olivia Glotting', NULL, 8500, 'Impreso', 'Pendiente', 'Pendiente', 0, NULL);
```

---

## 6. ARQUITECTURA DE CARPETAS

```
src/
 app/
    core/
       auth/
          auth.service.ts            <- sesion como signal, login/logout
          auth.guard.ts              <- redirige a /login si no autenticado
       supabase/
          supabase.client.ts         <- InjectionToken con createClient()
          database.types.ts          <- generado por "supabase gen types"
       layout/
           app-shell.component.ts     <- router-outlet + nav condicional
           nav-bottom.component.ts    <- nav fijo inferior mobile
           nav-sidebar.component.ts   <- sidebar desktop (lg+)
   
    features/
       pedidos/
          pedidos.routes.ts
          data/
             pedidos.repository.ts    <- interface + implementacion Supabase
             pedidos.repository.token.ts
          domain/
             pedido.model.ts          <- tipos e interfaces del dominio
             estado.utils.ts          <- determinarEstadoGeneral(), pura
             pedido.validator.ts      <- Zod schemas
          state/
             pedidos.store.ts         <- signals: pedidos, loading, filtros
             pedidos.facade.ts        <- API publica para componentes
          ui/
              pages/
                 pedidos-lista.page.ts
                 pedido-nuevo.page.ts
                 pedido-detalle.page.ts
              components/
                  pedido-card.component.ts
                  pedido-row.component.ts
                  pedido-form.component.ts
                  quick-status.component.ts
                  filtros-panel.component.ts
      
       libros/
          libros.routes.ts
          data/libros.repository.ts
          domain/libro.model.ts
          state/libros.facade.ts
          ui/
              pages/
                 libros-lista.page.ts
                 libro-form.page.ts
              components/
                  libro-card.component.ts
                  libro-selector.component.ts
      
       informes/
           informes.routes.ts
           data/informes.repository.ts
           state/informes.facade.ts
           ui/
               pages/informes.page.ts
               components/
                   kpi-card.component.ts
                   resumen-tabla.component.ts
                   sin-pagar-lista.component.ts
                   faltan-imprimir-lista.component.ts
   
    shared/
        components/
           estado-badge.component.ts
           confirm-dialog.component.ts
           skeleton-card.component.ts
           empty-state.component.ts
        pipes/
           peso.pipe.ts
           fecha-corta.pipe.ts
        errors/
           app-error.ts              <- AppError + Result<T>
        constants/
           negocio.constants.ts      <- ESTADO_PAGO, ESTADO_GENERAL, etc.
        utils/
            result.ts                 <- Result<T, E> pattern

 environments/
    environment.ts
    environment.prod.ts
 manifest.webmanifest
 ngsw-config.json
```

---

## 7. CONSTANTES DEL DOMINIO

```typescript
// shared/constants/negocio.constants.ts

export const ESTADO_PAGO = {
  PENDIENTE: 'Pendiente',
  SENA:      'Sena',
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
  PAGADO_PEND_IMP:    'Pagado/pend. impresion',
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
  [ESTADO_GENERAL.CERRADO]:             { bg: 'bg-emerald-500', text: 'text-white',       label: 'OK Cerrado' },
  [ESTADO_GENERAL.PAGADO_PEND_IMP]:     { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'Pagado/pend.imp.' },
  [ESTADO_PAGO.PAGADO]:                 { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Pagado' },
  [ESTADO_PAGO.SENA]:                   { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'Sena' },
}

/**
 * Calcula las hojas fisicas de un libro.
 * Impresion siempre doble faz -> paginas / 2 redondeando hacia arriba.
 * Ej: 79 paginas -> 40 hojas (la ultima hoja tiene una cara en blanco)
 */
export function calcularHojas(paginas: number): number {
  return Math.ceil(paginas / 2)
}
```

---

## 8. FUNCIONALIDADES - PANTALLA POR PANTALLA

### `/login`
- Email + password via Supabase Auth
- Sin opcion de registro (la cuenta se crea desde Supabase dashboard)
- Redirige a `/pedidos` al autenticar
- Guard en todas las rutas protegidas

### `/pedidos` - Listado principal
**Mobile (< lg):** tarjetas apiladas  
**Desktop (lg+):** tabla

Cada item muestra: alumno, libro, division, 3 badges de estado, estado general, saldo (en rojo si > 0)

**Acciones rapidas inline** (sin entrar al detalle):
- Toggle Impreso / Pendiente
- Ciclo Pendiente -> Sena -> Pagado (con input de monto si Sena)
- Toggle Entregado / Pendiente

**Filtros** (Sheet en mobile, sidebar en desktop):
- Busqueda por alumno (filtra en cliente, debounce 300ms)
- Por libro (select)
- Por estado general (chips)
- Por estado pago (chips)

**Ordenamiento default**: por PRIORIDAD_ESTADO_GENERAL  
**FAB** "+" esquina inferior derecha -> `/pedidos/nuevo`

### `/pedidos/nuevo` - Carga ultra-rapida
Cabe en una pantalla mobile SIN scroll. Campos:
1. Libro (combobox con busqueda) -> auto-llena precio
2. Alumno (input, autocapitalize words)
3. Division (opcional, corto) | Precio (pre-llenado, editable)
4. Estado pago: 3 botones [Pendiente] [Sena] [Pagado]
   - Sena: aparece input monto con animacion
   - Pagado: monto = precio (invisible, automatico)
5. Observaciones (colapsado por defecto)
6. Boton GUARDAR (56px alto, full width)

Toast de exito + navegar a `/pedidos`

### `/pedidos/:id` - Detalle/edicion
- Todos los campos editables
- Saldo calculado en tiempo real con `computed()`
- Estado general calculado automaticamente
- Boton eliminar (con ConfirmDialog)
- Boton guardar sticky al fondo

### `/libros` - Catalogo
- Lista: titulo, precio, paginas, hojas (calculadas)
- FAB "+" -> `/libros/nuevo`
- Toggle activo/inactivo por libro

### `/libros/:id` - Formulario
- titulo, precio, paginas
- Mostrar: "Hojas por ejemplar: XX (ceil(paginas/2))"
- Warning si edita precio: "Los pedidos existentes mantienen su precio original"

### `/informes` - Dashboard (tabs)

**Resumen:** 8 KPI cards + tabla por libro con % cerrado (semaforo)  
El KPI **"Hojas pend. imprimir"** es el mas importante visualmente (color ambar)

**Sin pagar:** pedidos con imp=Impreso y pago=Pagado  
- Boton inline "Marcar pagado"
- Footer: total saldo

**Faltan imprimir:** pedidos con imp=Pendiente  
- Agrupados por libro (collapsible)
- Boton inline "Marcar impreso"
- Footer: total hojas necesarias

---

## 9. PWA - CONFIGURACION

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
# Spartan UI - seguir docs en spartan.ng para proyectos Angular CLI
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

## 12. PLAN DE IMPLEMENTACIN VIVO

> Este plan se actualiza al finalizar cada tarea relevante.
> Estado posible por tem: `Pendiente` | `En curso` | `Hecho` | `Bloqueado`

### Fase 1  Base productiva mnima
- [x] `Hecho` Crear la base Angular standalone con routing y arquitectura por features
- [x] `Hecho` Modelar dominio principal: libros, pedidos, estados, saldo, hojas y estado general
- [x] `Hecho` Implementar stores/facades con Angular Signals
- [x] `Hecho` Implementar validacin inicial con Zod para pedidos
- [x] `Hecho` Crear UI inicial funcional para login, pedidos, libros e informes
- [x] `Hecho` Agregar datos locales mock para permitir desarrollo sin bloquear por backend
- [ ] `Pendiente` Reemplazar almacenamiento local por persistencia real en Supabase

### Fase 2  Infraestructura Supabase real
- [ ] `En curso` Crear proyecto Supabase y definir variables reales de entorno
- [x] `Hecho` Implementar schema PostgreSQL segn el prompt
- [ ] `Pendiente` Cargar seed inicial real de libros y pedidos
- [ ] `Pendiente` Generar `database.types.ts` con `supabase gen types`
- [x] `Hecho` Crear cliente Supabase e integracin por InjectionToken
- [ ] `En curso` Implementar repositorios reales de libros, pedidos e informes sobre Supabase
- [x] `Hecho` Reemplazar auth local por Supabase Auth
- [x] `Hecho` Implementar guards y sesin persistente con Supabase
- [ ] `Pendiente` Implementar Realtime para cambios de pedidos

### Fase 3  Migracin de datos reales
- [ ] `Pendiente` Preparar importacin desde Excel
- [ ] `Pendiente` Migrar los 7 libros reales al catlogo
- [ ] `Pendiente` Migrar los 140 pedidos reales
- [ ] `Pendiente` Verificar consistencia de importes, estados y saldos
- [ ] `Pendiente` Validar mtricas iniciales contra el Excel original

### Fase 4  Pedidos: flujo operativo completo
- [x] `Hecho` Listado principal funcional de pedidos
- [x] `Hecho` Implementar vista desktop en tabla
- [x] `Hecho` Implementar filtros completos por estado general y estado de pago
- [x] `Hecho` Implementar chips y UX de filtros mobile/desktop
- [x] `Hecho` Implementar Sheet mobile para filtros
- [x] `Hecho` Implementar FAB flotante para alta rpida
- [x] `Hecho` Implementar acciones rpidas inline para impresin, pago y entrega
- [x] `Hecho` Implementar formulario de alta de pedido
- [x] `Hecho` Optimizar alta para que entre en una pantalla mobile sin scroll
- [x] `Hecho` Mostrar input condicional animado para sea
- [x] `Hecho` Agregar toast de xito y error
- [x] `Hecho` Implementar detalle/edicin de pedido
- [x] `Hecho` Agregar ConfirmDialog al eliminar
- [x] `Hecho` Agregar botn guardar sticky al fondo
- [x] `Hecho` Endurecer reglas de negocio y casos borde en edicin

### Fase 5  Libros: catlogo completo
- [x] `Hecho` Implementar listado base de libros
- [x] `Hecho` Implementar alta bsica de libro
- [x] `Hecho` Implementar edicin de libro por `:id`
- [x] `Hecho` Implementar toggle activo/inactivo
- [x] `Hecho` Implementar FAB flotante para libros
- [x] `Hecho` Mostrar warning ms visible al cambiar precios

### Fase 6  Informes y priorizacin operativa
- [x] `Hecho` Implementar dashboard base con KPIs
- [x] `Hecho` Destacar KPI de hojas pendientes de impresin
- [x] `Hecho` Implementar listado base de pedidos sin pagar
- [x] `Hecho` Implementar listado base de pedidos faltantes de impresin
- [x] `Hecho` Implementar tabs reales: Resumen / Sin pagar / Faltan imprimir
- [x] `Hecho` Implementar tabla por libro con porcentaje cerrado
- [x] `Hecho` Implementar agrupacin por libro en faltan imprimir
- [x] `Hecho` Agregar footer con total saldo en sin pagar
- [x] `Hecho` Agregar footer con total hojas necesarias en faltan imprimir

### Fase 7  UI system y experiencia final
- [ ] `Pendiente` Instalar y configurar Tailwind CSS v3
- [ ] `Pendiente` Instalar y configurar Spartan UI
- [ ] `Pendiente` Reemplazar componentes caseros por primitives consistentes donde convenga
- [ ] `Pendiente` Mejorar diseo mobile-first para uso intensivo por la duea
- [x] `Hecho` Revisar accesibilidad, foco, tamaos tctiles y estados vacos
- [ ] `Pendiente` Agregar skeletons, dialogs y feedback visual consistente

### Fase 8  PWA y despliegue
- [x] `Hecho` Crear manifest webmanifest
- [x] `Hecho` Crear configuracin inicial de service worker
- [ ] `Pendiente` Integrar `@angular/pwa` oficialmente
- [ ] `Pendiente` Agregar iconos reales 192 y 512
- [ ] `Pendiente` Validar instalacin standalone en mobile
- [ ] `Pendiente` Preparar deploy en Vercel o Netlify

### Fase 9  Testing y endurecimiento
- [x] `Hecho` Agregar test inicial de utilidad de negocio
- [ ] `Pendiente` Cubrir utilities crticas con unit tests
- [ ] `Pendiente` Cubrir facades y repositorios con tests
- [ ] `Pendiente` Cubrir flujos crticos de pedidos
- [x] `Hecho` Revisar errores de validacin y mensajes para usuaria no tcnica
- [ ] `Pendiente` Auditar performance de carga y acciones rpidas

### Bloqueadores actuales
- [ ] `Bloqueado` Faltan credenciales reales de Supabase
- [ ] `Bloqueado` Falta origen del Excel real para migracin completa
- [ ] `Bloqueado` Falta decidir si la UI final debe respetar estrictamente Spartan/Tailwind desde ahora o en una fase posterior

### Prxima tarea recomendada
- [ ] `Pendiente` Cargar credenciales reales en environment y validar login Supabase
- [ ] `Pendiente` Implementar repositorio real de informes sobre Supabase
- [ ] `Pendiente` Validar que libros y pedidos ya salgan de la base real
---

## 13. ACTUALIZACION FUNCIONAL RECIENTE

Esta seccion complementa el prompt original con cambios ya implementados en la aplicacion y debe prevalecer cuando haya contradiccion con secciones anteriores.

### Pedidos
- El avance rapido de pago desde listados e informes alterna entre `Pendiente` y `Pagado`.
- La `Sena` sigue existiendo como opcion manual en el formulario, pero no forma parte del flujo rapido principal.
- En el formulario de alta, `Pagado` es la primera opcion visual en el selector de estado de pago.
- Al crear un pedido, si existen libros activos, el formulario selecciona uno por defecto.
- Al seleccionar un libro, el precio del libro se copia automaticamente al pedido como valor inicial, pero el usuario puede editarlo.
- Si el usuario cambia de libro durante el alta, el formulario debe refrescar `Precio`, `Monto cobrado` y `Saldo` segun el libro seleccionado y el estado de pago actual.
- En mobile, el sheet de filtros de pedidos debe mostrar el total real del filtro, no solamente la cantidad visible en la pagina actual.

### Informes
- La pestana `Sin pagar` debe permitir filtrar por libro.
- La pestana `Faltan imprimir` debe permitir filtrar por libro.
- La pestana `Sin entregar` debe existir como informe operativo para listar pedidos impresos pendientes de entrega y permitir marcarlos como entregados directamente desde informes.
- Los informes `Sin pagar`, `Faltan imprimir` y `Sin entregar` deben compartir filtros opcionales de `Libro` y `Alumno`, acumulables entre si.
- El resumen de informes debe mostrar por separado los KPIs `Libros cobrados`, `Monto cobrado`, `Pendientes cobro` y `Saldo total`.
- El KPI `Monto cobrado` debe calcularse como la suma real de `montoCobrado`.
- La tabla `Avance por libro` debe incluir ademas las columnas `Impresos`, `Pagados` y `Por cobrar`.

### Branding y UI
- El sistema usa branding `BrujitaCandyBar` con titulo corto `Pedidos de Impresion`.
- El favicon vigente es `BrujitaGemini.ico`.
- La paleta visual base es violeta, dorado y crema.
- Los KPIs deben adaptarse a montos grandes para no desbordar el recuadro.

### Criterio de implementacion
- Si una instruccion anterior del documento describe el avance rapido de pago como `Pendiente -> Sena -> Pagado`, reemplazarla por el comportamiento actual `Pendiente <-> Pagado`.
- Si una instruccion anterior omite el libro por defecto en alta, el precio inicial editable o la resincronizacion de precio/saldo al cambiar de libro, tomar esta seccion como fuente vigente.
- Si una instruccion anterior de informes no incluye filtros compartidos por libro/alumno, el informe `Sin entregar`, la separacion de KPIs de cobro o las columnas nuevas de avance por libro, esta seccion tiene prioridad.
- En base de datos se mantiene `snake_case` (`precio_cobrado`, `monto_cobrado`), pero en frontend Angular y TypeScript se debe usar `camelCase` (`precioCobrado`, `montoCobrado`).

### Plan vivo actualizado
- [x] `Hecho` Hacer que el avance rapido de pago salte de `Pendiente` a `Pagado`.
- [x] `Hecho` Seleccionar libro por defecto y precargar precio editable en alta de pedido.
- [x] `Hecho` Agregar filtro por libro en `Sin pagar`.
- [x] `Hecho` Agregar filtro por libro en `Faltan imprimir`.
- [x] `Hecho` Agregar informe `Sin entregar` con accion directa para marcar entregado.
- [x] `Hecho` Compartir filtros de `Libro` y `Alumno` entre `Sin pagar`, `Faltan imprimir` y `Sin entregar`.
- [x] `Hecho` Separar KPIs `Libros cobrados` y `Monto cobrado` en informes.
- [x] `Hecho` Calcular `Monto cobrado` como suma de `montoCobrado`.
- [x] `Hecho` Resincronizar `Precio`, `Monto cobrado` y `Saldo` al cambiar de libro en el alta de pedido.
- [x] `Hecho` Agregar columnas `Impresos`, `Pagados` y `Por cobrar` en `Avance por libro`.
- [x] `Hecho` Ajustar visualizacion de montos largos en los KPIs.

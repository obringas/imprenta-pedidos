import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { normalizarParaBusqueda } from '../../../../shared/utils/text-normalizer';
import { etiquetaCurso, parsearCurso } from '../../../../shared/utils/curso.util';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidosFacade } from '../../../pedidos/state/pedidos.facade';
import { AlumnoParseado, parsearListaPegada } from '../../domain/parsear-lista.util';

type MotivoOmision = 'repetido-en-lista' | 'ya-cargado';

interface FilaPrevisualizada extends AlumnoParseado {
  readonly incluir: boolean;
  readonly motivo: MotivoOmision | null;
}

const LARGO_MAXIMO_DIVISION = 10;

@Component({
  selector: 'app-carga-masiva-page',
  standalone: true,
  imports: [PesoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Pedidos</p>
        <h1>Carga masiva</h1>
        <p class="page-description">Pegá la lista de alumnos de WhatsApp y creá todos los pedidos de una vez.</p>
      </div>
    </section>

    <section class="card filters-stack">
      <div class="filters-grid">
        <label class="field">
          <span>Libro</span>
          <select [value]="libroId()" (change)="cambiarLibro($any($event.target).value)">
            <option value="">Elegí un libro</option>
            @for (libro of librosFacade.activos(); track libro.id) {
              <option [value]="libro.id">{{ libro.titulo }}</option>
            }
          </select>
          @if (libroElegido(); as libro) {
            <small class="caption">Cada pedido se crea con el precio del libro: {{ libro.precio | peso }}</small>
          }
        </label>

        <label class="field">
          <span>División</span>
          <input
            type="text"
            autocapitalize="characters"
            placeholder="6A"
            [value]="division()"
            (input)="cambiarDivision($any($event.target).value)"
            [class.input-invalid]="!divisionValida()"
          />
          @if (!divisionValida()) {
            <small class="field-error">Máximo {{ largoMaximoDivision }} caracteres.</small>
          } @else if (division().trim()) {
            <small class="caption">Se va a leer como: {{ vistaPreviaCurso() }}</small>
          }
        </label>
      </div>

      <label class="field">
        <span>Lista de alumnos</span>
        <textarea
          rows="8"
          placeholder="1- Oli P&#10;2. Fabian Prentice&#10;3. Bauti Pérez"
          [value]="listaPegada()"
          (input)="cambiarLista($any($event.target).value)"
        ></textarea>
        <small class="caption">
          Se limpian solos la numeración, los emojis y los espacios de más. Una nota entre paréntesis al final se
          guarda como observación del pedido.
        </small>
      </label>

      <div class="filters-actions">
        <button type="button" class="primary-button" [disabled]="!puedeProcesar()" (click)="procesar()">
          Procesar lista
        </button>
        @if (previsualizacion().length) {
          <button type="button" class="secondary-button" (click)="limpiar()">Limpiar</button>
        }
      </div>

      @if (!libroId()) {
        <p class="caption">Elegí un libro para continuar.</p>
      }
    </section>

    @if (procesado()) {
      @if (previsualizacion().length) {
        <section class="card listado-resumen">
          <div>
            <strong>{{ aCrear().length }}</strong>
            <span class="caption">
              {{ aCrear().length === 1 ? 'pedido a crear' : 'pedidos a crear' }}
              @if (omitidos().length) {
                · {{ omitidos().length }} en gris no se van a cargar
              }
            </span>
          </div>
          <button type="button" class="primary-button" [disabled]="!aCrear().length || guardando()" (click)="confirmar()">
            {{ guardando() ? 'Cargando...' : 'Crear ' + aCrear().length + ' pedidos' }}
          </button>
        </section>

        @if (descartadas().length) {
          <section class="card note-card">
            <p class="field-label">Líneas ignoradas porque no parecen un nombre</p>
            <p class="caption">{{ descartadas().join(' · ') }}</p>
          </section>
        }

        <section class="card table-card">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th><span class="sr-only">Incluir</span></th>
                <th>Alumno</th>
                <th>Observación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of previsualizacion(); track fila.lineaOriginal + $index) {
                <tr [class.fila-omitida]="!fila.incluir">
                  <td>
                    <input
                      type="checkbox"
                      class="check-incluir"
                      [checked]="fila.incluir"
                      [attr.aria-label]="'Incluir a ' + fila.alumno"
                      (change)="alternarFila($index)"
                    />
                  </td>
                  <td>{{ fila.alumno }}</td>
                  <td>{{ fila.observaciones ?? '-' }}</td>
                  <td>
                    @if (fila.motivo === 'ya-cargado') {
                      <span class="badge badge-warning">Ya existe</span>
                    } @else if (fila.motivo === 'repetido-en-lista') {
                      <span class="badge badge-muted">Repetido</span>
                    } @else {
                      <span class="badge badge-success">Nuevo</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <section class="card note-card">
          <p class="field-label">No se reconoció ningún alumno</p>
          <p class="caption">Revisá que la lista tenga un nombre por línea.</p>
        </section>
      }
    }
  `,
})
export class CargaMasivaPageComponent {
  protected readonly librosFacade = inject(LibrosFacade);
  private readonly pedidosFacade = inject(PedidosFacade);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly largoMaximoDivision = LARGO_MAXIMO_DIVISION;
  protected readonly libroId = signal('');
  protected readonly division = signal('');
  protected readonly listaPegada = signal('');
  protected readonly procesado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly previsualizacion = signal<FilaPrevisualizada[]>([]);
  protected readonly descartadas = signal<readonly string[]>([]);

  protected readonly libroElegido = computed(() => this.librosFacade.obtenerPorId(this.libroId()));
  protected readonly divisionValida = computed(() => this.division().trim().length <= LARGO_MAXIMO_DIVISION);
  protected readonly aCrear = computed(() => this.previsualizacion().filter((fila) => fila.incluir));
  protected readonly omitidos = computed(() => this.previsualizacion().filter((fila) => !fila.incluir));

  protected readonly vistaPreviaCurso = computed(() => etiquetaCurso(parsearCurso(this.division())));

  protected readonly puedeProcesar = computed(
    () => !!this.libroId() && this.divisionValida() && this.listaPegada().trim().length > 0,
  );

  constructor() {
    effect(() => {
      void this.pedidosFacade.cargar();
    });
  }

  protected cambiarLibro(valor: string): void {
    this.libroId.set(valor);
    this.reiniciarPrevisualizacion();
  }

  protected cambiarDivision(valor: string): void {
    this.division.set(valor);
    this.reiniciarPrevisualizacion();
  }

  protected cambiarLista(valor: string): void {
    this.listaPegada.set(valor);
    this.reiniciarPrevisualizacion();
  }

  /**
   * Marca cada alumno como nuevo, repetido dentro de la lista, o ya cargado
   * para ese libro y division. Los dos ultimos vienen destildados: la tabla
   * `pedidos` no tiene unique constraint, asi que la unica defensa contra
   * duplicados es esta.
   */
  protected procesar(): void {
    const { alumnos, descartadas } = parsearListaPegada(this.listaPegada());
    const yaCargados = this.pedidosFacade.alumnosYaCargados(this.libroId(), this.divisionNormalizada());
    const vistosEnLista = new Set<string>();

    this.previsualizacion.set(
      alumnos.map((alumno) => {
        const clave = normalizarParaBusqueda(alumno.alumno);
        const motivo: MotivoOmision | null = vistosEnLista.has(clave)
          ? 'repetido-en-lista'
          : yaCargados.has(clave)
            ? 'ya-cargado'
            : null;

        vistosEnLista.add(clave);
        return { ...alumno, motivo, incluir: motivo === null };
      }),
    );

    this.descartadas.set(descartadas);
    this.procesado.set(true);
  }

  protected alternarFila(indice: number): void {
    this.previsualizacion.update((filas) =>
      filas.map((fila, i) => (i === indice ? { ...fila, incluir: !fila.incluir } : fila)),
    );
  }

  protected limpiar(): void {
    this.listaPegada.set('');
    this.reiniciarPrevisualizacion();
  }

  protected async confirmar(): Promise<void> {
    const alumnos = this.aCrear().map((fila) => ({
      alumno: fila.alumno,
      observaciones: fila.observaciones,
    }));

    this.guardando.set(true);
    try {
      const resultado = await this.pedidosFacade.crearPedidosEnLote(
        this.libroId(),
        alumnos,
        this.divisionNormalizada(),
      );

      if (!resultado.success) {
        this.toastService.error(resultado.error.mensaje);
        return;
      }

      this.toastService.success(`Se crearon ${resultado.data} pedidos.`);
      await this.router.navigateByUrl('/pedidos');
    } catch (error) {
      console.error('Error en la carga masiva de pedidos', error);
      this.toastService.error('No se pudieron crear los pedidos.');
    } finally {
      this.guardando.set(false);
    }
  }

  private divisionNormalizada(): string | null {
    return this.division().trim().toUpperCase() || null;
  }

  private reiniciarPrevisualizacion(): void {
    this.procesado.set(false);
    this.previsualizacion.set([]);
    this.descartadas.set([]);
  }
}

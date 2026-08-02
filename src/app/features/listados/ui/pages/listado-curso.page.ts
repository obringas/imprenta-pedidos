import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidoDetalle } from '../../../pedidos/domain/pedido.model';
import { PedidosFacade } from '../../../pedidos/state/pedidos.facade';
import { ExportarListadoService, FilaListado } from '../../data/exportar-listado.service';
import {
  claveDivision,
  claveGrado,
  compararDivisiones,
  compararGrados,
  etiquetaCurso,
  parsearCurso,
} from '../../domain/curso.util';

const TODOS = '';

interface CriteriosBusqueda {
  readonly libroId: string;
  readonly grado: string;
  readonly division: string;
}

@Component({
  selector: 'app-listado-curso-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Listados</p>
        <h1>Listado por curso</h1>
        <p class="page-description">Elegí libro, grado y división para descargar la nómina en Excel.</p>
      </div>
    </section>

    <section class="card filters-stack">
      <label class="field">
        <span>Libro</span>
        <select [value]="libroSeleccionado()" (change)="cambiarLibro($any($event.target).value)">
          <option value="">Elegí un libro</option>
          @for (libro of librosFacade.activos(); track libro.id) {
            <option [value]="libro.id">{{ libro.titulo }}</option>
          }
        </select>
      </label>

      <div class="filters-grid">
        <label class="field">
          <span>Grado</span>
          <select
            [value]="gradoSeleccionado()"
            [disabled]="!libroSeleccionado()"
            (change)="cambiarGrado($any($event.target).value)"
          >
            <option value="">Todos</option>
            @for (grado of gradosDisponibles(); track grado) {
              <option [value]="grado">{{ grado }}</option>
            }
          </select>
        </label>

        <label class="field">
          <span>División</span>
          <select
            [value]="divisionSeleccionada()"
            [disabled]="!libroSeleccionado()"
            (change)="cambiarDivision($any($event.target).value)"
          >
            <option value="">Todas</option>
            @for (division of divisionesDisponibles(); track division) {
              <option [value]="division">{{ division }}</option>
            }
          </select>
        </label>
      </div>

      <div class="filters-actions">
        <button type="button" class="primary-button" [disabled]="!libroSeleccionado()" (click)="buscar()">
          Buscar
        </button>
        @if (criteriosAplicados()) {
          <button type="button" class="secondary-button" (click)="limpiar()">Limpiar</button>
        }
      </div>

      @if (!libroSeleccionado()) {
        <p class="caption">Elegí un libro para habilitar la búsqueda.</p>
      }
    </section>

    @if (criteriosAplicados()) {
      @if (resultados().length) {
        <section class="card listado-resumen">
          <div>
            <strong>{{ resultados().length }}</strong>
            <span class="caption"> {{ resultados().length === 1 ? 'alumno' : 'alumnos' }} en {{ descripcionBusqueda() }}</span>
          </div>
          <button type="button" class="primary-button" [disabled]="descargando()" (click)="descargar()">
            {{ descargando() ? 'Generando...' : 'Descargar Excel' }}
          </button>
        </section>

        <section class="card table-card">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Grado - División</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of resultados(); track fila.id) {
                <tr>
                  <td>{{ fila.alumno }}</td>
                  <td>{{ fila.curso }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <app-empty-state
          title="No hay pedidos para ese filtro"
          description="Probá con otro grado o división, o revisá que el curso esté cargado."
        />
      }
    }
  `,
})
export class ListadoCursoPageComponent {
  protected readonly librosFacade = inject(LibrosFacade);
  private readonly pedidosFacade = inject(PedidosFacade);
  private readonly exportarService = inject(ExportarListadoService);
  private readonly toastService = inject(ToastService);

  protected readonly libroSeleccionado = signal(TODOS);
  protected readonly gradoSeleccionado = signal(TODOS);
  protected readonly divisionSeleccionada = signal(TODOS);
  protected readonly criteriosAplicados = signal<CriteriosBusqueda | null>(null);
  protected readonly descargando = signal(false);

  /** Pedidos del libro elegido. Base para poblar los selectores de curso. */
  private readonly pedidosDelLibro = computed(() => {
    const libroId = this.libroSeleccionado();
    if (!libroId) return [];

    return this.pedidosFacade.pedidosDeLibrosActivos().filter((pedido) => pedido.libroId === libroId);
  });

  protected readonly gradosDisponibles = computed(() => {
    const grados = new Set(this.pedidosDelLibro().map((pedido) => claveGrado(parsearCurso(pedido.division))));
    return [...grados].sort(compararGrados);
  });

  /** Las divisiones se acotan al grado elegido para no ofrecer combinaciones vacías. */
  protected readonly divisionesDisponibles = computed(() => {
    const grado = this.gradoSeleccionado();
    const divisiones = new Set(
      this.pedidosDelLibro()
        .filter((pedido) => !grado || claveGrado(parsearCurso(pedido.division)) === grado)
        .map((pedido) => claveDivision(parsearCurso(pedido.division))),
    );

    return [...divisiones].sort(compararDivisiones);
  });

  protected readonly resultados = computed(() => {
    const criterios = this.criteriosAplicados();
    if (!criterios) return [];

    return this.pedidosFacade
      .pedidosDeLibrosActivos()
      .filter((pedido) => this.coincide(pedido, criterios))
      .map((pedido) => ({
        id: pedido.id,
        alumno: pedido.alumno,
        curso: etiquetaCurso(parsearCurso(pedido.division)),
      }))
      .sort((uno, otro) => uno.alumno.localeCompare(otro.alumno, 'es'));
  });

  protected readonly descripcionBusqueda = computed(() => {
    const criterios = this.criteriosAplicados();
    if (!criterios) return '';

    const curso = [criterios.grado, criterios.division].filter(Boolean).join('');
    return curso || 'todos los cursos';
  });

  constructor() {
    effect(() => {
      void this.pedidosFacade.cargar();
    });
  }

  protected cambiarLibro(valor: string): void {
    this.libroSeleccionado.set(valor);
    this.gradoSeleccionado.set(TODOS);
    this.divisionSeleccionada.set(TODOS);
    this.criteriosAplicados.set(null);
  }

  protected cambiarGrado(valor: string): void {
    this.gradoSeleccionado.set(valor);

    // La división elegida puede no existir dentro del nuevo grado.
    if (!this.divisionesDisponibles().includes(this.divisionSeleccionada())) {
      this.divisionSeleccionada.set(TODOS);
    }
  }

  protected cambiarDivision(valor: string): void {
    this.divisionSeleccionada.set(valor);
  }

  protected buscar(): void {
    if (!this.libroSeleccionado()) return;

    this.criteriosAplicados.set({
      libroId: this.libroSeleccionado(),
      grado: this.gradoSeleccionado(),
      division: this.divisionSeleccionada(),
    });
  }

  protected limpiar(): void {
    this.libroSeleccionado.set(TODOS);
    this.gradoSeleccionado.set(TODOS);
    this.divisionSeleccionada.set(TODOS);
    this.criteriosAplicados.set(null);
  }

  protected async descargar(): Promise<void> {
    const filas: FilaListado[] = this.resultados().map((fila) => ({ alumno: fila.alumno, curso: fila.curso }));
    if (!filas.length) return;

    const libro = this.librosFacade.obtenerPorId(this.criteriosAplicados()?.libroId ?? '');
    const nombreArchivo = this.exportarService.construirNombreArchivo(
      libro?.titulo ?? 'listado',
      this.descripcionBusqueda(),
    );

    this.descargando.set(true);
    try {
      await this.exportarService.descargar(filas, nombreArchivo);
      this.toastService.success(`Se descargó ${nombreArchivo}`);
    } catch (error) {
      // El usuario ve un mensaje simple, pero el detalle queda para diagnostico.
      console.error('Error al generar el listado en Excel', error);
      this.toastService.error('No se pudo generar el archivo.');
    } finally {
      this.descargando.set(false);
    }
  }

  private coincide(pedido: PedidoDetalle, criterios: CriteriosBusqueda): boolean {
    if (pedido.libroId !== criterios.libroId) return false;

    const curso = parsearCurso(pedido.division);
    if (criterios.grado && claveGrado(curso) !== criterios.grado) return false;
    if (criterios.division && claveDivision(curso) !== criterios.division) return false;

    return true;
  }
}

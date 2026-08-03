import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidoDetalle } from '../../../pedidos/domain/pedido.model';
import { PedidosFacade } from '../../../pedidos/state/pedidos.facade';
import { ExportarListadoService, FilaListado } from '../../data/exportar-listado.service';
import { CorreccionAlumno, EditarAlumnoDialogComponent } from '../components/editar-alumno-dialog.component';
import {
  claveDivision,
  claveGrado,
  compararDivisiones,
  compararGrados,
  etiquetaCurso,
  parsearCurso,
} from '../../domain/curso.util';
// compararGrados y compararDivisiones ya se usaban para poblar los selectores;
// aca se reutilizan para ordenar la tabla con el mismo criterio.

const TODOS = '';

type ColumnaOrden = 'alumno' | 'curso';

interface FilaResultado {
  readonly alumno: string;
  readonly grado: string;
  readonly division: string;
}

interface CriteriosBusqueda {
  readonly libroId: string;
  readonly grado: string;
  readonly division: string;
}

@Component({
  selector: 'app-listado-curso-page',
  standalone: true,
  imports: [EmptyStateComponent, EditarAlumnoDialogComponent],
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

        <p class="caption listado-ayuda">Doble clic en una fila para corregirla sin salir de la pantalla.</p>

        <section class="card table-card">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th [attr.aria-sort]="estadoOrden('alumno')">
                  <button type="button" class="th-orden" (click)="ordenarPor('alumno')">
                    Alumno <span class="th-orden-icono" aria-hidden="true">{{ iconoOrden('alumno') }}</span>
                  </button>
                </th>
                <th [attr.aria-sort]="estadoOrden('curso')">
                  <button type="button" class="th-orden" (click)="ordenarPor('curso')">
                    Grado - División <span class="th-orden-icono" aria-hidden="true">{{ iconoOrden('curso') }}</span>
                  </button>
                </th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (fila of resultados(); track fila.id) {
                <tr class="fila-editable" (dblclick)="abrirEdicion(fila.id)">
                  <td>{{ fila.alumno }}</td>
                  <td>{{ fila.curso }}</td>
                  <td class="celda-accion">
                    <button
                      type="button"
                      class="secondary-button boton-editar"
                      [attr.aria-label]="'Editar ' + fila.alumno"
                      (click)="abrirEdicion(fila.id)"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <app-editar-alumno-dialog
          [pedido]="pedidoEnEdicion()"
          [guardando]="guardandoEdicion()"
          (confirmado)="guardarEdicion($event)"
          (cancelado)="cerrarEdicion()"
        />
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
  protected readonly idEnEdicion = signal<string | null>(null);
  protected readonly guardandoEdicion = signal(false);
  protected readonly ordenColumna = signal<ColumnaOrden>('alumno');
  protected readonly ordenAscendente = signal(true);

  /**
   * Se resuelve contra el store en vez de guardar una copia, para que el
   * dialogo refleje el pedido actualizado despues de guardar.
   */
  protected readonly pedidoEnEdicion = computed(() => {
    const id = this.idEnEdicion();
    return id ? this.pedidosFacade.obtenerPorId(id) : null;
  });

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

    const sentido = this.ordenAscendente() ? 1 : -1;
    const columna = this.ordenColumna();

    return this.pedidosFacade
      .pedidosDeLibrosActivos()
      .filter((pedido) => this.coincide(pedido, criterios))
      .map((pedido) => {
        const curso = parsearCurso(pedido.division);
        return {
          id: pedido.id,
          alumno: pedido.alumno,
          curso: etiquetaCurso(curso),
          grado: claveGrado(curso),
          division: claveDivision(curso),
        };
      })
      .sort((uno, otro) => sentido * this.comparar(uno, otro, columna));
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

  /** Un clic en la misma columna invierte el sentido; en otra, ordena ascendente. */
  protected ordenarPor(columna: ColumnaOrden): void {
    if (this.ordenColumna() === columna) {
      this.ordenAscendente.update((asc) => !asc);
      return;
    }

    this.ordenColumna.set(columna);
    this.ordenAscendente.set(true);
  }

  /** Valor de `aria-sort` que anuncian los lectores de pantalla. */
  protected estadoOrden(columna: ColumnaOrden): 'ascending' | 'descending' | 'none' {
    if (this.ordenColumna() !== columna) return 'none';
    return this.ordenAscendente() ? 'ascending' : 'descending';
  }

  protected iconoOrden(columna: ColumnaOrden): string {
    if (this.ordenColumna() !== columna) return '';
    return this.ordenAscendente() ? '▲' : '▼';
  }

  /**
   * El curso se ordena por numero de grado y despues por letra, no como texto:
   * alfabeticamente `10A` caeria antes que `6A`.
   */
  private comparar(uno: FilaResultado, otro: FilaResultado, columna: ColumnaOrden): number {
    if (columna === 'alumno') {
      return uno.alumno.localeCompare(otro.alumno, 'es');
    }

    return (
      compararGrados(uno.grado, otro.grado) ||
      compararDivisiones(uno.division, otro.division) ||
      uno.alumno.localeCompare(otro.alumno, 'es')
    );
  }

  protected abrirEdicion(idPedido: string): void {
    this.idEnEdicion.set(idPedido);
  }

  protected cerrarEdicion(): void {
    this.idEnEdicion.set(null);
  }

  protected async guardarEdicion(correccion: CorreccionAlumno): Promise<void> {
    const pedido = this.pedidoEnEdicion();
    if (!pedido) return;

    this.guardandoEdicion.set(true);
    try {
      const resultado = await this.pedidosFacade.corregirDatosDelAlumno(
        pedido,
        correccion.alumno,
        correccion.division,
      );

      if (!resultado.success) {
        this.toastService.error(resultado.error.mensaje);
        return;
      }

      this.toastService.success('Pedido actualizado.');
      this.cerrarEdicion();
    } catch (error) {
      console.error('Error al corregir el pedido desde el listado', error);
      this.toastService.error('No se pudo guardar el cambio.');
    } finally {
      this.guardandoEdicion.set(false);
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

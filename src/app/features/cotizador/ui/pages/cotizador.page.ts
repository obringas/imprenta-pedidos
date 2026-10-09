import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog.component';
import { AppError } from '../../../../shared/errors/app-error';
import { ToastService } from '../../../../shared/services/toast.service';
import { MARGEN_LIBRO_MAXIMO } from '../../../libros/domain/libro.validator';
import { CotizadorFacade, FilaCotizacion, MARGEN_SLIDER_MAXIMO } from '../../state/cotizador.facade';
import { CambioObjetivo, FilaCotizacionComponent } from '../components/fila-cotizacion.component';
import { MargenGeneralComponent } from '../components/margen-general.component';
import { CambioOpcion, MensajeWhatsappComponent } from '../components/mensaje-whatsapp.component';

@Component({
  selector: 'app-cotizador-page',
  standalone: true,
  imports: [RouterLink, ConfirmDialogComponent, FilaCotizacionComponent, MargenGeneralComponent, MensajeWhatsappComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .cotizador-layout { display: grid; gap: 1rem; }
    .titulo-seccion { margin: 0; font-size: 1.2rem; }
    .lista-libros-cotizador { display: grid; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
    .lista-libros-cotizador .inline-check { min-height: 44px; }
    .cotizador-vacio { text-align: center; }
  `,
  template: `
    <section class="page-header page-header-compact">
      <div>
        <p class="eyebrow">Presupuestos</p>
        <h1>Cotizador</h1>
        <p class="page-description">Elegí los libros, ajustá el margen y mandá el mensaje al grupo del colegio.</p>
      </div>
    </section>

    @if (facade.faltantes().length > 0 && !facade.cargando()) {
      <div class="card note-card stack-compact" role="status">
        <strong class="warning-text">Faltan datos en Configuración &gt; Insumos</strong>
        <p class="caption">Sin ellos los costos salen mal: {{ facade.faltantes().join(', ') }}.</p>
      </div>
    }

    <div class="cotizador-layout">
      <app-margen-general
        [margen]="facade.margenGeneral()"
        [margenDefault]="facade.margenDefault()"
        [maximoSlider]="maximoSlider"
        [maximoInput]="maximoMargen"
        (cambiar)="facade.cambiarMargenGeneral($event)"
        (restablecer)="facade.volverAlMargenDefault()"
      />

      <section class="card stack-compact" aria-labelledby="titulo-libros">
        <div class="section-inline-header">
          <h2 id="titulo-libros" class="titulo-seccion">Libros</h2>
          <a class="secondary-button" routerLink="/libros/nuevo" [queryParams]="{ volver: 'cotizador' }">Nuevo libro</a>
        </div>

        @if (facade.cargando() && facade.librosActivos().length === 0) {
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-detail"></div>
        } @else if (facade.librosActivos().length === 0) {
          <p class="caption">No hay libros activos. Cargá uno nuevo o activalo desde Libros.</p>
        } @else {
          <ul class="lista-libros-cotizador">
            @for (libro of facade.librosActivos(); track libro.id) {
              <li>
                <label class="inline-check">
                  <input type="checkbox" [checked]="facade.seleccionados().has(libro.id)" (change)="facade.alternarLibro(libro.id)" />
                  <span>{{ libro.titulo }} <span class="caption">· {{ libro.paginas }} pág.</span></span>
                </label>
              </li>
            }
          </ul>
        }
      </section>

      @for (fila of facade.filas(); track fila.libro.id) {
        <app-fila-cotizacion
          [fila]="fila"
          [margenMinimo]="facade.margenMinimo()"
          [cantidadMinima]="facade.cantidadMinima()"
          [aplicando]="facade.aplicando().has(fila.libro.id)"
          (cambiarMargen)="facade.cambiarMargenLibro(fila.libro.id, $event)"
          (sincronizar)="facade.sincronizarMargen(fila.libro.id)"
          (cambiarObjetivo)="cambiarObjetivo(fila, $event)"
          (aplicar)="pedirAplicar(fila)"
          (quitar)="facade.alternarLibro(fila.libro.id)"
        />
      } @empty {
        @if (facade.librosActivos().length > 0) {
          <p class="caption cotizador-vacio">Tildá uno o más libros para ver sus precios.</p>
        }
      }

      @if (facade.filas().length > 0) {
        <app-mensaje-whatsapp
          [mensaje]="facade.mensaje()"
          [opciones]="facade.opciones()"
          [hayDescuentoCantidad]="facade.hayDescuentoCantidad()"
          (cambiarOpcion)="cambiarOpcion($event)"
        />
      }
    </div>

    <app-confirm-dialog
      [open]="filaAConfirmar() !== null"
      title="Margen por debajo del mínimo"
      [description]="descripcionConfirmacion()"
      confirmLabel="Aplicar igual"
      (confirmed)="confirmarAplicar()"
      (cancelled)="filaAConfirmar.set(null)"
    />
  `,
})
export class CotizadorPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly facade = inject(CotizadorFacade);
  protected readonly maximoSlider = MARGEN_SLIDER_MAXIMO;
  protected readonly maximoMargen = MARGEN_LIBRO_MAXIMO;
  protected readonly filaAConfirmar = signal<FilaCotizacion | null>(null);

  protected readonly descripcionConfirmacion = computed(() => {
    const fila = this.filaAConfirmar();
    if (!fila) {
      return '';
    }
    const perdida = fila.a4.ganancia < 0 || fila.a5.ganancia < 0 ? ' Con estos precios se vende a pérdida.' : '';
    return `"${fila.libro.titulo}" queda con menos del ${this.facade.margenMinimo()} % de margen.${perdida} ¿Guardar estos precios en el libro?`;
  });

  constructor() {
    void this.cargar();
  }

  protected cambiarObjetivo(fila: FilaCotizacion, cambio: CambioObjetivo): void {
    this.facade.cambiarPrecioObjetivo(fila.libro.id, cambio.tamanio, cambio.precio);
  }

  protected cambiarOpcion(cambio: CambioOpcion): void {
    this.facade.cambiarOpcion(cambio.opcion, cambio.valor);
  }

  protected pedirAplicar(fila: FilaCotizacion): void {
    if (fila.bajoMinimo) {
      this.filaAConfirmar.set(fila);
      return;
    }
    void this.aplicar(fila.libro.id);
  }

  protected confirmarAplicar(): void {
    const fila = this.filaAConfirmar();
    this.filaAConfirmar.set(null);
    if (fila) {
      void this.aplicar(fila.libro.id);
    }
  }

  private async aplicar(id: string): Promise<void> {
    try {
      const libro = await this.facade.aplicarPrecios(id);
      this.toastService.success(`Precios guardados en "${libro.titulo}". Los pedidos ya cargados no cambian.`);
    } catch (error) {
      this.toastService.error(
        error instanceof AppError && error.codigo === 'VALIDATION' ? error.mensaje : 'No se pudieron guardar los precios.',
      );
    }
  }

  /** Al volver de "Nuevo libro", el libro creado llega en ?libro= y queda tildado. */
  private async cargar(): Promise<void> {
    try {
      await this.facade.cargar();
    } catch {
      this.toastService.error('No se pudieron cargar los libros. Revisá la conexión e intentá de nuevo.');
      return;
    }

    const libroNuevo = this.route.snapshot.queryParamMap.get('libro');
    if (libroNuevo) {
      this.facade.seleccionar(libroNuevo);
      await this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }
}

import { Injectable, computed, inject } from '@angular/core';
import { AppError } from '../../../shared/errors/app-error';
import { Result } from '../../../shared/utils/result';
import { normalizarParaBusqueda } from '../../../shared/utils/text-normalizer';
import { LibrosFacade } from '../../libros/state/libros.facade';
import { PEDIDOS_REPOSITORY } from '../data/pedidos.repository.token';
import { ActualizarPedidoInput, FiltroPedidos, Pedido, PedidoDetalle } from '../domain/pedido.model';
import { actualizarPedidoSchema, crearPedidoSchema } from '../domain/pedido.validator';
import { calcularSaldo, determinarEstadoGeneral } from '../domain/estado.utils';
import { PedidosStore } from './pedidos.store';

export interface AltaMasivaAlumno {
  readonly alumno: string;
  readonly observaciones: string | null;
}

@Injectable({ providedIn: 'root' })
export class PedidosFacade {
  private readonly repository = inject(PEDIDOS_REPOSITORY);
  private readonly store = inject(PedidosStore);
  private readonly librosFacade = inject(LibrosFacade);

  readonly pedidos = this.store.pedidos.asReadonly();
  readonly loading = this.store.loading.asReadonly();
  readonly filtros = this.store.filtros.asReadonly();
  readonly pedidosFiltrados = this.store.pedidosFiltrados;
  readonly estadisticas = this.store.estadisticas;
  readonly ocultosPorLibroInactivo = this.store.ocultosPorLibroInactivo;
  readonly divisionesDisponibles = this.store.divisionesDisponibles;

  /**
   * Pedidos del catalogo vigente. A diferencia de `pedidosVisibles` del store,
   * no depende del filtro de pantalla: los informes siempre ignoran los libros
   * dados de baja.
   */
  readonly pedidosDeLibrosActivos = computed(() =>
    this.store.pedidos().filter((pedido) => pedido.libroActivo),
  );

  readonly pedidosListos = computed(() =>
    this.pedidosDeLibrosActivos().filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar'),
  );

  async cargar(): Promise<void> {
    this.store.loading.set(true);
    await this.librosFacade.cargar();
    const pedidos = await this.repository.findAll();
    this.store.pedidos.set(pedidos.map((pedido) => this.aDetalle(pedido)));
    this.store.loading.set(false);
  }

  obtenerPorId(id: string): PedidoDetalle | null {
    return this.store.pedidos().find((pedido) => pedido.id === id) ?? null;
  }

  actualizarFiltros(parcial: Partial<FiltroPedidos>): void {
    this.store.filtros.update((actual) => ({ ...actual, ...parcial }));
  }

  limpiarFiltros(): void {
    this.store.filtros.set({
      busqueda: '',
      libroId: null,
      estadoGeneral: null,
      estadoPago: null,
      division: null,
      incluirInactivos: false,
    });
  }

  async crearPedido(input: unknown) {
    const parsed = crearPedidoSchema.safeParse(input);
    if (!parsed.success) {
      return Result.error(AppError.validacion('pedido', parsed.error.issues[0]?.message ?? 'Dato inválido'));
    }

    const libro = this.librosFacade.libros().find((item) => item.id === parsed.data.libroId);
    if (!libro) {
      return Result.error(AppError.noEncontrado('Libro'));
    }

    const creado = await this.repository.create({
      ...parsed.data,
      libroTitulo: libro.titulo,
      libroHojas: libro.hojas,
    });
    const detalle = this.aDetalle(creado);
    this.store.pedidos.update((pedidos) => [detalle, ...pedidos]);
    return Result.ok(detalle);
  }

  /**
   * Alta en lote de un curso completo. Una sola escritura, y el store se
   * refresca al final para que la pantalla de pedidos ya los muestre.
   */
  async crearPedidosEnLote(libroId: string, alumnos: readonly AltaMasivaAlumno[], division: string | null) {
    const libro = this.librosFacade.obtenerPorId(libroId);
    if (!libro) {
      return Result.error(AppError.noEncontrado('Libro'));
    }

    if (!alumnos.length) {
      return Result.error(AppError.validacion('alumnos', 'No hay alumnos para cargar.'));
    }

    const creados = await this.repository.createMany(
      alumnos.map((alumno) => ({
        libroId,
        alumno: alumno.alumno,
        division,
        precioCobrado: libro.precio,
        estadoPago: 'Pendiente' as const,
        montoCobrado: 0,
        observaciones: alumno.observaciones,
        libroTitulo: libro.titulo,
        libroHojas: libro.hojas,
      })),
    );

    this.store.pedidos.update((pedidos) => [...creados.map((pedido) => this.aDetalle(pedido)), ...pedidos]);
    return Result.ok(creados.length);
  }

  /** Alumnos ya cargados para ese libro y division, normalizados para comparar. */
  alumnosYaCargados(libroId: string, division: string | null): ReadonlySet<string> {
    const divisionNormalizada = (division ?? '').trim().toLowerCase();

    return new Set(
      this.store
        .pedidos()
        .filter(
          (pedido) =>
            pedido.libroId === libroId &&
            (pedido.division ?? '').trim().toLowerCase() === divisionNormalizada,
        )
        .map((pedido) => normalizarParaBusqueda(pedido.alumno)),
    );
  }

  async actualizarPedido(id: string, input: unknown) {
    const parsed = actualizarPedidoSchema.safeParse(input);
    if (!parsed.success) {
      return Result.error(AppError.validacion('pedido', parsed.error.issues[0]?.message ?? 'Dato inválido'));
    }

    const libro = this.librosFacade.libros().find((item) => item.id === parsed.data.libroId);
    if (!libro) {
      return Result.error(AppError.noEncontrado('Libro'));
    }

    const actualizado = await this.repository.update(id, {
      ...parsed.data,
      libroTitulo: libro.titulo,
      libroHojas: libro.hojas,
    });
    const detalle = this.aDetalle(actualizado);
    this.store.pedidos.update((pedidos) => pedidos.map((pedido) => (pedido.id === id ? detalle : pedido)));
    return Result.ok(detalle);
  }

  async eliminarPedido(id: string): Promise<void> {
    await this.repository.delete(id);
    this.store.pedidos.update((pedidos) => pedidos.filter((pedido) => pedido.id !== id));
  }

  async toggleImpresion(pedido: PedidoDetalle): Promise<void> {
    const siguienteEstado = pedido.estadoImpresion === 'Impreso' ? 'Pendiente' : 'Impreso';
    await this.actualizarPedido(pedido.id, {
      libroId: pedido.libroId,
      alumno: pedido.alumno,
      division: pedido.division,
      precioCobrado: pedido.precioCobrado,
      estadoPago: pedido.estadoPago,
      montoCobrado: pedido.montoCobrado,
      fechaPago: pedido.fechaPago,
      observaciones: pedido.observaciones,
      estadoEntrega: pedido.estadoEntrega,
      fechaEntrega: pedido.fechaEntrega,
      estadoImpresion: siguienteEstado,
      fechaImpresion: siguienteEstado === 'Impreso' ? this.hoy() : null,
    } satisfies ActualizarPedidoInput);
  }

  async avanzarPago(pedido: PedidoDetalle): Promise<void> {
    const siguienteEstado = pedido.estadoPago === 'Pagado' ? 'Pendiente' : 'Pagado';
    const siguienteMonto = siguienteEstado === 'Pagado' ? pedido.precioCobrado : 0;

    await this.actualizarPedido(pedido.id, {
      libroId: pedido.libroId,
      alumno: pedido.alumno,
      division: pedido.division,
      precioCobrado: pedido.precioCobrado,
      estadoPago: siguienteEstado,
      montoCobrado: siguienteMonto,
      fechaPago: siguienteMonto > 0 ? this.hoy() : null,
      observaciones: pedido.observaciones,
      estadoEntrega: pedido.estadoEntrega,
      fechaEntrega: pedido.fechaEntrega,
      estadoImpresion: pedido.estadoImpresion,
      fechaImpresion: pedido.fechaImpresion,
    } satisfies ActualizarPedidoInput);
  }

  async marcarPagado(pedido: PedidoDetalle): Promise<void> {
    await this.actualizarPedido(pedido.id, {
      libroId: pedido.libroId,
      alumno: pedido.alumno,
      division: pedido.division,
      precioCobrado: pedido.precioCobrado,
      estadoPago: 'Pagado',
      montoCobrado: pedido.precioCobrado,
      fechaPago: this.hoy(),
      observaciones: pedido.observaciones,
      estadoEntrega: pedido.estadoEntrega,
      fechaEntrega: pedido.fechaEntrega,
      estadoImpresion: pedido.estadoImpresion,
      fechaImpresion: pedido.fechaImpresion,
    } satisfies ActualizarPedidoInput);
  }

  /**
   * Corrige alumno y division sin tocar precios ni estados. Pensado para la
   * edicion rapida desde el listado por curso, donde lo unico visible (y lo
   * que suele venir mal de una carga masiva) son esos dos datos.
   */
  async corregirDatosDelAlumno(pedido: PedidoDetalle, alumno: string, division: string | null) {
    return this.actualizarPedido(pedido.id, {
      libroId: pedido.libroId,
      alumno,
      division,
      precioCobrado: pedido.precioCobrado,
      estadoPago: pedido.estadoPago,
      montoCobrado: pedido.montoCobrado,
      fechaPago: pedido.fechaPago,
      observaciones: pedido.observaciones,
      estadoImpresion: pedido.estadoImpresion,
      fechaImpresion: pedido.fechaImpresion,
      estadoEntrega: pedido.estadoEntrega,
      fechaEntrega: pedido.fechaEntrega,
    } satisfies ActualizarPedidoInput);
  }

  async toggleEntrega(pedido: PedidoDetalle): Promise<void> {
    const siguienteEstado = pedido.estadoEntrega === 'Entregado' ? 'Pendiente' : 'Entregado';
    await this.actualizarPedido(pedido.id, {
      libroId: pedido.libroId,
      alumno: pedido.alumno,
      division: pedido.division,
      precioCobrado: pedido.precioCobrado,
      estadoPago: pedido.estadoPago,
      montoCobrado: pedido.montoCobrado,
      fechaPago: pedido.fechaPago,
      observaciones: pedido.observaciones,
      estadoImpresion: pedido.estadoImpresion,
      fechaImpresion: pedido.fechaImpresion,
      estadoEntrega: siguienteEstado,
      fechaEntrega: siguienteEstado === 'Entregado' ? this.hoy() : null,
    } satisfies ActualizarPedidoInput);
  }

  private aDetalle(pedido: Pedido): PedidoDetalle {
    const saldo = calcularSaldo(pedido.precioCobrado, pedido.montoCobrado);
    const libro = this.librosFacade.obtenerPorId(pedido.libroId);

    return {
      ...pedido,
      saldo,
      estadoGeneral: determinarEstadoGeneral(pedido),
      // Ante un libro que no figura en el catalogo cargado, se muestra el
      // pedido: es preferible ver un dato de mas que perderlo de vista.
      libroActivo: libro?.activo ?? true,
    };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

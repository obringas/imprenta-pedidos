import { Injectable, computed, inject } from '@angular/core';
import { AppError } from '../../../shared/errors/app-error';
import { Result } from '../../../shared/utils/result';
import { LibrosFacade } from '../../libros/state/libros.facade';
import { PEDIDOS_REPOSITORY } from '../data/pedidos.repository.token';
import { ActualizarPedidoInput, FiltroPedidos, Pedido, PedidoDetalle } from '../domain/pedido.model';
import { actualizarPedidoSchema, crearPedidoSchema } from '../domain/pedido.validator';
import { calcularSaldo, determinarEstadoGeneral } from '../domain/estado.utils';
import { PedidosStore } from './pedidos.store';

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
  readonly pedidosListos = computed(() => this.store.pedidos().filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar'));

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
    this.store.filtros.set({ busqueda: '', libroId: null, estadoGeneral: null, estadoPago: null });
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
    const siguienteEstado = pedido.estadoPago === 'Pendiente' ? 'Seña' : pedido.estadoPago === 'Seña' ? 'Pagado' : 'Pendiente';
    const siguienteMonto = siguienteEstado === 'Pagado' ? pedido.precioCobrado : siguienteEstado === 'Seña' ? Math.max(Math.round(pedido.precioCobrado / 2), 1) : 0;

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
    return { ...pedido, saldo, estadoGeneral: determinarEstadoGeneral(pedido) };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

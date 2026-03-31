import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { AppError } from '../../../shared/errors/app-error';
import { normalizarTextoMojibake } from '../../../shared/utils/text-normalizer';
import { PEDIDOS_INICIALES } from '../../data/mock-data';
import { ActualizarPedidoInput, CrearPedidoInput, Pedido } from '../domain/pedido.model';

const STORAGE_KEY = 'imprenta-pedidos';

export interface PedidosRepository {
  findAll(): Promise<Pedido[]>;
  findById(id: string): Promise<Pedido | null>;
  create(input: CrearPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido>;
  update(id: string, input: ActualizarPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido>;
  delete(id: string): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class LocalPedidosRepository implements PedidosRepository {
  async findAll(): Promise<Pedido[]> {
    return this.leer();
  }

  async findById(id: string): Promise<Pedido | null> {
    return this.leer().find((pedido) => pedido.id === id) ?? null;
  }

  async create(input: CrearPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido> {
    const ahora = new Date().toISOString();
    const fechaPago = input.montoCobrado > 0 ? ahora.slice(0, 10) : null;
    const pedido: Pedido = {
      id: crypto.randomUUID(),
      estadoImpresion: 'Pendiente',
      fechaImpresion: null,
      estadoEntrega: 'Pendiente',
      fechaEntrega: null,
      ...input,
      alumno: input.alumno.trim(),
      fechaPago,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const pedidos = [pedido, ...this.leer()];
    this.guardar(pedidos);
    return pedido;
  }

  async update(id: string, input: ActualizarPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido> {
    const pedidos = this.leer();
    const existente = pedidos.find((pedido) => pedido.id === id);

    if (!existente) {
      throw new Error('Pedido no encontrado');
    }

    const pedidoActualizado: Pedido = {
      ...existente,
      ...input,
      id,
      alumno: input.alumno.trim(),
      fechaImpresion: input.fechaImpresion ?? existente.fechaImpresion,
      fechaEntrega: input.fechaEntrega ?? existente.fechaEntrega,
      fechaPago: input.fechaPago ?? existente.fechaPago,
      actualizadoEn: new Date().toISOString(),
    };

    const siguiente = pedidos.map((pedido) => (pedido.id === id ? pedidoActualizado : pedido));
    this.guardar(siguiente);
    return pedidoActualizado;
  }

  async delete(id: string): Promise<void> {
    const siguiente = this.leer().filter((pedido) => pedido.id !== id);
    this.guardar(siguiente);
  }

  private leer(): Pedido[] {
    const serializado = localStorage.getItem(STORAGE_KEY);
    if (!serializado) {
      this.guardar(PEDIDOS_INICIALES);
      return PEDIDOS_INICIALES;
    }

    const pedidos = (JSON.parse(serializado) as Pedido[]).map((pedido) => ({
      ...pedido,
      libroHojas: pedido.libroHojas ?? 0,
      fechaImpresion: pedido.fechaImpresion ?? null,
      fechaEntrega: pedido.fechaEntrega ?? null,
      fechaPago: pedido.fechaPago ?? null,
      alumno: normalizarTextoMojibake(pedido.alumno),
      libroTitulo: normalizarTextoMojibake(pedido.libroTitulo),
      observaciones: pedido.observaciones ? normalizarTextoMojibake(pedido.observaciones) : null,
    }));

    this.guardar(pedidos);
    return pedidos;
  }

  private guardar(pedidos: Pedido[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
  }
}

@Injectable({ providedIn: 'root' })
export class SupabasePedidosRepository implements PedidosRepository {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async findAll(): Promise<Pedido[]> {
    const client = this.requireClient();
    const { data, error } = await client.from('pedidos_detalle').select('*').order('created_at', { ascending: false });
    if (error) {
      throw AppError.inesperado(error);
    }

    return (data ?? []).map((pedido) => this.mapDetalleRow(pedido));
  }

  async findById(id: string): Promise<Pedido | null> {
    const client = this.requireClient();
    const { data, error } = await client.from('pedidos_detalle').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw AppError.inesperado(error);
    }

    return data ? this.mapDetalleRow(data) : null;
  }

  async create(input: CrearPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido> {
    const client = this.requireClient();
    const payload = {
      libro_id: input.libroId,
      alumno: input.alumno.trim(),
      division: input.division,
      precio_cobrado: input.precioCobrado,
      estado_pago: input.estadoPago,
      monto_cobrado: input.montoCobrado,
      fecha_pago: input.montoCobrado > 0 ? new Date().toISOString().slice(0, 10) : null,
      observaciones: input.observaciones,
    };

    const { data, error } = await client.from('pedidos').insert(payload as never).select('id').single();
    if (error) {
      throw AppError.inesperado(error);
    }

    const createdRow = data as { id: string } | null;
    if (!createdRow) {
      throw AppError.noEncontrado('Pedido');
    }

    const creado = await this.findById(createdRow.id);
    if (!creado) {
      throw AppError.noEncontrado('Pedido');
    }

    return creado;
  }

  async update(id: string, input: ActualizarPedidoInput & { readonly libroTitulo: string; readonly libroHojas: number }): Promise<Pedido> {
    const client = this.requireClient();
    const payload = {
      libro_id: input.libroId,
      alumno: input.alumno.trim(),
      division: input.division,
      precio_cobrado: input.precioCobrado,
      estado_impresion: input.estadoImpresion,
      fecha_impresion: input.fechaImpresion,
      estado_entrega: input.estadoEntrega,
      fecha_entrega: input.fechaEntrega,
      estado_pago: input.estadoPago,
      monto_cobrado: input.montoCobrado,
      fecha_pago: input.fechaPago,
      observaciones: input.observaciones,
    };

    const { error } = await client.from('pedidos').update(payload as never).eq('id', id);
    if (error) {
      throw AppError.inesperado(error);
    }

    const actualizado = await this.findById(id);
    if (!actualizado) {
      throw AppError.noEncontrado('Pedido');
    }

    return actualizado;
  }

  async delete(id: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.from('pedidos').delete().eq('id', id);
    if (error) {
      throw AppError.inesperado(error);
    }
  }

  private requireClient() {
    if (!this.supabase) {
      throw AppError.inesperado('Supabase no configurado');
    }

    return this.supabase;
  }

  private mapDetalleRow(row: {
    id: string;
    libro_id: string;
    libro_titulo: string;
    libro_hojas: number;
    alumno: string;
    division: string | null;
    precio_cobrado: number;
    estado_impresion: 'Pendiente' | 'Impreso';
    fecha_impresion: string | null;
    estado_entrega: 'Pendiente' | 'Entregado';
    fecha_entrega: string | null;
    estado_pago: 'Pendiente' | 'Seña' | 'Pagado';
    monto_cobrado: number;
    fecha_pago: string | null;
    observaciones: string | null;
    created_at: string;
    updated_at: string;
  }): Pedido {
    return {
      id: row.id,
      libroId: row.libro_id,
      libroTitulo: row.libro_titulo,
      libroHojas: row.libro_hojas,
      alumno: row.alumno,
      division: row.division,
      precioCobrado: Number(row.precio_cobrado),
      estadoImpresion: row.estado_impresion,
      fechaImpresion: row.fecha_impresion,
      estadoEntrega: row.estado_entrega,
      fechaEntrega: row.fecha_entrega,
      estadoPago: row.estado_pago,
      montoCobrado: Number(row.monto_cobrado),
      fechaPago: row.fecha_pago,
      observaciones: row.observaciones,
      creadoEn: row.created_at,
      actualizadoEn: row.updated_at,
    };
  }
}

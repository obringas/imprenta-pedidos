import { computed, inject, Injectable, signal } from '@angular/core';
import { ConfiguracionInsumo, CostosUnitariosInsumos } from '../../../shared/models/configuracion-insumos.model';
import { derivarCostosUnitarios } from '../../../shared/utils/calcular-precio-sugerido.util';
import { INSUMOS_REPOSITORY } from '../repositories/insumos.repository.token';

@Injectable({ providedIn: 'root' })
export class InsumosStore {
  private readonly repo = inject(INSUMOS_REPOSITORY);

  readonly insumos = signal<ConfiguracionInsumo[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly costosUnitarios = computed<CostosUnitariosInsumos>(() => {
    const mapa = Object.fromEntries(this.insumos().map((insumo) => [insumo.clave, insumo.valor]));
    return derivarCostosUnitarios(mapa);
  });

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      this.insumos.set(await this.repo.obtenerTodos());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los insumos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async actualizarInsumo(id: string, valor: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      await this.repo.actualizar(id, valor);
      this.insumos.update((insumos) =>
        insumos.map((insumo) =>
          insumo.id === id ? { ...insumo, valor, updatedAt: new Date().toISOString() } : insumo,
        ),
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo actualizar el insumo.');
      throw error;
    } finally {
      this.cargando.set(false);
    }
  }
}

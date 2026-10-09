import { computed, inject, Injectable, signal } from '@angular/core';
import {
  aplicarValorInsumo,
  ConfiguracionInsumo,
  CostosUnitariosInsumos,
  indexarInsumos,
  ValorInsumo,
} from '../../../shared/models/configuracion-insumos.model';
import { derivarCostosUnitarios as derivarCostosLegacy } from '../../../shared/utils/calcular-precio-sugerido.util';
import { CostosUnitarios, ReglasPrecio } from '../../cotizador/domain/cotizacion.model';
import { derivarCostosUnitarios, reglasDePrecio } from '../../cotizador/domain/costos-unitarios';
import { INSUMOS_REPOSITORY } from '../repositories/insumos.repository.token';

/**
 * Unica fuente de costos, margenes y datos del mensaje. Nada de esto se
 * hardcodea: si falta una clave, queda en `faltantes` y vale 0.
 */
@Injectable({ providedIn: 'root' })
export class InsumosStore {
  private readonly repo = inject(INSUMOS_REPOSITORY);

  readonly insumos = signal<ConfiguracionInsumo[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  private readonly indexados = computed(() => indexarInsumos(this.insumos()));

  readonly valores = computed(() => this.indexados().valores);
  readonly textos = computed(() => this.indexados().textos);
  /** Claves que necesita el cotizador y no estan en la tabla (falta correr la migracion). */
  readonly faltantes = computed(() => this.indexados().faltantes);

  readonly costos = computed<CostosUnitarios>(() => derivarCostosUnitarios(this.valores()));
  readonly reglasPrecio = computed<ReglasPrecio>(() => reglasDePrecio(this.valores()));
  /** Punto de partida de cada cotizacion y de cada libro nuevo. No toca libros ya cargados. */
  readonly margenDefault = computed(() => this.valores().margen_default);

  /** @deprecated Solo para `calcularPrecioSugerido`; se elimina junto con ese util. */
  readonly costosUnitarios = computed<CostosUnitariosInsumos>(() => {
    const mapa = Object.fromEntries(this.insumos().map((insumo) => [insumo.clave, insumo.valor]));
    return derivarCostosLegacy(mapa);
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

  async actualizarInsumo(id: string, valor: ValorInsumo): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      await this.repo.actualizar(id, valor);
      this.insumos.update((insumos) =>
        insumos.map((insumo) => (insumo.id === id ? aplicarValorInsumo(insumo, valor) : insumo)),
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo actualizar el insumo.');
      throw error;
    } finally {
      this.cargando.set(false);
    }
  }
}

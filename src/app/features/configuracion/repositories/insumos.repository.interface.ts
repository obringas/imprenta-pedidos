import { ConfiguracionInsumo } from '../../../shared/models/configuracion-insumos.model';

export interface IInsumosRepository {
  obtenerTodos(): Promise<ConfiguracionInsumo[]>;
  actualizar(id: string, valor: number): Promise<void>;
}

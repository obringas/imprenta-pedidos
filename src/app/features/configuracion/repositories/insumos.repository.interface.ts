import { ConfiguracionInsumo, ValorInsumo } from '../../../shared/models/configuracion-insumos.model';

export interface IInsumosRepository {
  obtenerTodos(): Promise<ConfiguracionInsumo[]>;
  /** Un texto se guarda en `valor_texto`; un numero, en `valor`. */
  actualizar(id: string, valor: ValorInsumo): Promise<void>;
}

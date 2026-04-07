import { InjectionToken } from '@angular/core';
import { IInsumosRepository } from './insumos.repository.interface';
import { obtenerRepositorioInsumos } from './insumos.repository';

export const INSUMOS_REPOSITORY = new InjectionToken<IInsumosRepository>('INSUMOS_REPOSITORY', {
  providedIn: 'root',
  factory: obtenerRepositorioInsumos,
});

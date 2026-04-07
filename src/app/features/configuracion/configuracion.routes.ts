import { Routes } from '@angular/router';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'insumos',
  },
  {
    path: 'insumos',
    loadComponent: () =>
      import('./pages/configuracion-insumos.page').then((module) => module.ConfiguracionInsumosPageComponent),
  },
];

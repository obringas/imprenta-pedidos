import { Routes } from '@angular/router';

export const COTIZADOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ui/pages/cotizador.page').then((module) => module.CotizadorPageComponent),
  },
];

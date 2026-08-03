import { Routes } from '@angular/router';

export const CARGA_MASIVA_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/carga-masiva.page').then((module) => module.CargaMasivaPageComponent) },
];

import { Routes } from '@angular/router';

export const LISTADOS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/listado-curso.page').then((module) => module.ListadoCursoPageComponent) },
];

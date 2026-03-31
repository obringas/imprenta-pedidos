import { Routes } from '@angular/router';

export const LIBROS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ui/pages/libros-lista.page').then((module) => module.LibrosListaPageComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./ui/pages/libro-form.page').then((module) => module.LibroFormPageComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./ui/pages/libro-form.page').then((module) => module.LibroFormPageComponent),
  },
];

import { Routes } from '@angular/router';

export const INFORMES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/informes.page').then((module) => module.InformesPageComponent) },
];


import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/ui/login.page').then((module) => module.LoginPageComponent),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      {
        path: 'pedidos',
        loadChildren: () =>
          import('./features/pedidos/pedidos.routes').then((module) => module.PEDIDOS_ROUTES),
      },
      {
        path: 'libros',
        loadChildren: () =>
          import('./features/libros/libros.routes').then((module) => module.LIBROS_ROUTES),
      },
      {
        path: 'informes',
        loadChildren: () =>
          import('./features/informes/informes.routes').then((module) => module.INFORMES_ROUTES),
      },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes').then((module) => module.CONFIGURACION_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'pedidos' },
];


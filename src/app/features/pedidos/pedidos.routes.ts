import { Routes } from '@angular/router';

export const PEDIDOS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/pedidos-lista.page').then((module) => module.PedidosListaPageComponent) },
  { path: 'nuevo', loadComponent: () => import('./ui/pages/pedido-nuevo.page').then((module) => module.PedidoNuevoPageComponent) },
  {
    path: 'carga-masiva',
    loadChildren: () => import('../carga-masiva/carga-masiva.routes').then((module) => module.CARGA_MASIVA_ROUTES),
  },
  // `:id` va ultimo: si no, capturaria las rutas fijas de arriba.
  { path: ':id', loadComponent: () => import('./ui/pages/pedido-detalle.page').then((module) => module.PedidoDetallePageComponent) },
];


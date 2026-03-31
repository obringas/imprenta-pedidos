import { Routes } from '@angular/router';

export const PEDIDOS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/pedidos-lista.page').then((module) => module.PedidosListaPageComponent) },
  { path: 'nuevo', loadComponent: () => import('./ui/pages/pedido-nuevo.page').then((module) => module.PedidoNuevoPageComponent) },
  { path: ':id', loadComponent: () => import('./ui/pages/pedido-detalle.page').then((module) => module.PedidoDetallePageComponent) },
];


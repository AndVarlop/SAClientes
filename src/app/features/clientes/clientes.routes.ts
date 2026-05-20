import { Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/clientes-lista.component')
      .then(m => m.ClientesListaComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./detalle/cliente-detalle.component')
      .then(m => m.ClienteDetalleComponent)
  }
];

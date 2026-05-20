import { Routes } from '@angular/router';

export const MOVIMIENTOS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'registrar',
    pathMatch: 'full'
  },
  {
    path: 'registrar',
    loadComponent: () => import('./registrar/registrar-movimiento.component')
      .then(m => m.RegistrarMovimientoComponent)
  }
];

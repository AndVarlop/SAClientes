import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'consulta', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/clientes.routes')
          .then(m => m.CLIENTES_ROUTES)
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos.component')
          .then(m => m.ProductosComponent)
      },
      {
        path: 'movimientos',
        loadChildren: () => import('./features/movimientos/movimientos.routes')
          .then(m => m.MOVIMIENTOS_ROUTES)
      },
      {
        path: 'pagos',
        loadComponent: () => import('./features/pagos/pagos.component')
          .then(m => m.PagosComponent)
      }
    ]
  },
  {
    path: 'consulta',
    loadComponent: () => import('./features/consulta-publica/consulta-publica.component')
      .then(m => m.ConsultaPublicaComponent)
  },
  { path: '**', redirectTo: 'consulta' }
];

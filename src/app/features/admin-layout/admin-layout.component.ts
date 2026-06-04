import { Component, inject, signal, afterNextRender, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AnimationService } from '../../core/services/animation.service';
import { AuthService } from '../../core/services/auth.service';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { GlobalSearchComponent } from './global-search.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfirmDialog, GlobalSearchComponent],
  styles: [`
    aside {
      background: #111113;
      border-right: 1px solid #1f1f23;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 10px;
      color: #71717a;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.15s;
      cursor: pointer;
      text-decoration: none;
      border-left: 2px solid transparent;
    }
    .nav-item:hover {
      background: #1c1c1f;
      color: #e4e4e7;
    }
    .nav-item.active-nav {
      background: rgb(99 102 241 / 0.12);
      color: white;
      border-left-color: #6366f1;
      padding-left: 10px;
    }
    .nav-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      background: #1c1c1f;
      transition: background 0.15s;
    }
    .nav-item.active-nav .nav-icon {
      background: rgb(99 102 241 / 0.2);
    }
    .nav-item.active-nav i { color: #818cf8; }
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 10px;
      color: #71717a;
      font-size: 13.5px;
      font-weight: 500;
      width: 100%;
      cursor: pointer;
      transition: all 0.15s;
      background: transparent;
      border: none;
    }
    .logout-btn:hover {
      background: rgb(239 68 68 / 0.08);
      color: #f87171;
    }
  `],
  template: `
    <p-toast position="top-right" />
    <p-confirmDialog />
    <app-global-search #globalSearch />

    <div class="flex h-screen bg-zinc-950 overflow-hidden">

      <!-- Mobile overlay -->
      @if (menuAbierto()) {
        <div class="fixed inset-0 bg-black/70 z-20 lg:hidden backdrop-blur-sm"
             (click)="menuAbierto.set(false)"></div>
      }

      <!-- Sidebar -->
      <aside [class]="menuAbierto() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
             class="fixed lg:relative z-30 w-60 h-full flex flex-col
                    transition-transform duration-300 ease-in-out shrink-0">

        <!-- Logo -->
        <div class="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/60">
          <img src="S&A-Clientes-logo.png" alt="S&A Clientes"
               style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #6366f1;flex-shrink:0">
          <div>
            <p class="text-white font-bold text-sm leading-none">S&A Clientes</p>
            <p class="text-zinc-500 text-[11px] mt-0.5">Panel admin</p>
          </div>
        </div>

        <!-- Search trigger -->
        <div class="px-3 pb-3">
          <button (click)="globalSearch.abrir()"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                         bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300
                         hover:border-zinc-700 transition-colors text-sm">
            <i class="pi pi-search text-xs"></i>
            <span class="flex-1 text-left">Buscar...</span>
            <kbd class="text-zinc-700 text-xs font-mono">⌘K</kbd>
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p class="text-zinc-600 text-[10px] uppercase tracking-widest font-semibold px-3 mb-2">
            Menú
          </p>
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path"
               routerLinkActive="active-nav"
               class="nav-item"
               (click)="menuAbierto.set(false)">
              <span class="nav-icon">
                <i [class]="item.icon"></i>
              </span>
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- Bottom -->
        <div class="px-3 pb-4 pt-3 border-t border-zinc-800/60">
          <div class="px-3 py-2 mb-2">
            <p class="text-zinc-300 text-xs font-medium truncate">Administradora</p>
            <p class="text-zinc-500 text-[11px] truncate">{{ userEmail() }}</p>
          </div>
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">
              <i class="pi pi-sign-out"></i>
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Content area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Top bar (mobile only) -->
        <header class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60
                        bg-zinc-950 shrink-0">
          <button (click)="menuAbierto.set(!menuAbierto())"
                  class="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center
                         text-zinc-400 hover:text-white transition-colors border border-zinc-800">
            <i class="pi pi-bars"></i>
          </button>
          <div class="flex items-center gap-2">
            <img src="S&A-Clientes-logo.png" alt="S&A Clientes"
                 style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid #6366f1">
            <span class="text-white font-semibold text-sm">S&A Clientes</span>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private anim = inject(AnimationService);

  @ViewChild('globalSearch') globalSearch!: GlobalSearchComponent;

  menuAbierto = signal(false);

  constructor() {
    afterNextRender(() => {
      this.anim.staggerFadeUp('.nav-item', 50, 150);
    });
  }
  userEmail = this.auth.user;

  navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'pi pi-home' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'pi pi-users' },
    { path: '/admin/productos', label: 'Productos', icon: 'pi pi-box' },
    { path: '/admin/movimientos', label: 'Movimientos', icon: 'pi pi-list' },
    { path: '/admin/pagos', label: 'Pagos', icon: 'pi pi-wallet' },
    { path: '/admin/inventario', label: 'Inventario', icon: 'pi pi-warehouse' },
  ];

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}

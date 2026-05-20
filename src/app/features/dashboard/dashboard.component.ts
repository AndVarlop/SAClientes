import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientesService } from '../../core/services/clientes.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { SaldoCliente } from '../../core/models/cliente.model';
import { MovimientoConCliente } from '../../core/models/movimiento.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  styles: [`
    .stat-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 20px;
    }
    .list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 10px;
      transition: background 0.15s;
      cursor: pointer;
    }
    .list-row:hover { background: #1c1c1f; }
    .mov-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }
    .skeleton {
      background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
  template: `
    <div class="p-5 md:p-7 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-7">
        <div>
          <h2 class="text-2xl font-bold text-white">Dashboard</h2>
          <p class="text-zinc-500 text-sm mt-0.5">Resumen del negocio</p>
        </div>
        <a routerLink="/admin/clientes"
           class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white
                  text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <i class="pi pi-plus text-sm"></i>
          Nueva compra
        </a>
      </div>

      @if (cargando()) {
        <!-- Skeletons -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton h-24"></div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="skeleton h-72"></div>
          <div class="skeleton h-72"></div>
        </div>
      } @else {

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <div class="stat-card">
            <div class="stat-icon" style="background: rgb(99 102 241 / 0.12)">
              <i class="pi pi-chart-line" style="color: #818cf8"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Total vendido</p>
              <p class="text-xl font-bold text-white mt-1">
                {{ stats().totalVendido | currency:'COP':'$ ':'1.0-0' }}
              </p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: rgb(245 158 11 / 0.12)">
              <i class="pi pi-clock" style="color: #fbbf24"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Pendiente</p>
              <p class="text-xl font-bold text-amber-400 mt-1">
                {{ stats().totalPendiente | currency:'COP':'$ ':'1.0-0' }}
              </p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: rgb(34 197 94 / 0.1)">
              <i class="pi pi-users" style="color: #4ade80"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Clientes</p>
              <p class="text-xl font-bold text-white mt-1">{{ stats().clientesActivos }}</p>
            </div>
          </div>
        </div>

        <!-- Panels -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <!-- Top deudores -->
          <div class="card-dark">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white font-semibold text-sm flex items-center gap-2">
                <span class="w-6 h-6 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <i class="pi pi-exclamation-circle text-amber-400 text-xs"></i>
                </span>
                Mayor deuda
              </h3>
              <a routerLink="/admin/clientes" class="text-indigo-400 text-xs hover:text-indigo-300">
                Ver todos →
              </a>
            </div>

            @if (topDeudores().length === 0) {
              <div class="text-center py-10">
                <i class="pi pi-check-circle text-3xl text-green-500/40 block mb-2"></i>
                <p class="text-zinc-500 text-sm">Todos al día</p>
              </div>
            } @else {
              <div class="space-y-0.5">
                @for (c of topDeudores(); track c.id; let idx = $index) {
                  <a [routerLink]="['/admin/clientes', c.id]" class="list-row block">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3 min-w-0 flex-1">
                        <span class="text-zinc-600 text-xs font-mono w-4 shrink-0">{{ idx + 1 }}</span>
                        <div class="min-w-0">
                          <p class="text-white text-sm font-medium truncate">{{ c.nombre }}</p>
                          <p class="text-zinc-500 text-xs">{{ c.telefono || '–' }}</p>
                        </div>
                      </div>
                      <span class="text-amber-400 font-bold text-sm shrink-0 ml-4">
                        {{ c.saldo | currency:'COP':'$ ':'1.0-0' }}
                      </span>
                    </div>
                  </a>
                }
              </div>
            }
          </div>

          <!-- Últimos movimientos -->
          <div class="card-dark">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white font-semibold text-sm flex items-center gap-2">
                <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                  <i class="pi pi-history text-indigo-400 text-xs"></i>
                </span>
                Últimos movimientos
              </h3>
            </div>

            @if (movimientos().length === 0) {
              <div class="text-center py-10">
                <i class="pi pi-inbox text-3xl text-zinc-700 block mb-2"></i>
                <p class="text-zinc-500 text-sm">Sin movimientos</p>
              </div>
            } @else {
              <div class="space-y-0.5">
                @for (m of movimientos(); track m.id) {
                  <div class="list-row">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="mov-icon"
                           [style]="m.tipo === 'COMPRA'
                             ? 'background: rgb(239 68 68 / 0.1)'
                             : 'background: rgb(34 197 94 / 0.1)'">
                        <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                           [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="text-white text-sm font-medium truncate">
                          {{ m.clientes?.nombre ?? '—' }}
                        </p>
                        <p class="text-zinc-500 text-xs truncate">
                          {{ m.descripcion || m.tipo }}
                        </p>
                      </div>
                    </div>
                    <div class="ml-3 text-right shrink-0">
                      <p class="text-sm font-bold"
                         [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'">
                        {{ m.tipo === 'COMPRA' ? '+' : '−' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                      </p>
                      <p class="text-zinc-600 text-xs">{{ m.fecha | date:'dd/MM HH:mm' }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private clientesSvc = inject(ClientesService);
  private movSvc = inject(MovimientosService);

  cargando = signal(true);
  clientes = signal<SaldoCliente[]>([]);
  movimientos = signal<MovimientoConCliente[]>([]);

  stats = computed(() => ({
    totalVendido: this.clientes().reduce((s, c) => s + c.total_compras, 0),
    totalPendiente: this.clientes().filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0),
    clientesActivos: this.clientes().filter(c => c.activo).length
  }));

  topDeudores = computed(() =>
    [...this.clientes()]
      .filter(c => c.saldo > 0 && c.activo)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 6)
  );

  async ngOnInit() {
    try {
      const [clientes, movs] = await Promise.all([
        this.clientesSvc.getAll(),
        this.movSvc.getRecientes(8)
      ]);
      this.clientes.set(clientes);
      this.movimientos.set(movs);
    } finally {
      this.cargando.set(false);
    }
  }
}

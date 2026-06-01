import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientesService } from '../../core/services/clientes.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { AnimationService } from '../../core/services/animation.service';
import { SaldoCliente } from '../../core/models/cliente.model';
import { MovimientoConCliente } from '../../core/models/movimiento.model';

const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-2xl font-bold text-white">Dashboard</h2>
          <p class="text-zinc-500 text-sm mt-0.5">Resumen del negocio</p>
        </div>
        <a routerLink="/admin/clientes"
           class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white
                  text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <i class="pi pi-plus text-sm"></i> Nueva compra
        </a>
      </div>

      <!-- Navegador de mes -->
      <div class="flex items-center justify-center gap-4 mb-6
                  bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-5">
        <button (click)="mesAnterior()"
                class="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                       flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <i class="pi pi-chevron-left text-xs"></i>
        </button>
        <span class="text-white font-semibold text-base min-w-36 text-center">
          {{ nombreMes() }} {{ mesDash().anio }}
        </span>
        <button (click)="mesSiguiente()" [disabled]="esMesActual()"
                class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                [class]="esMesActual()
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-white'">
          <i class="pi pi-chevron-right text-xs"></i>
        </button>
      </div>

      @if (cargando()) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          @for (i of [1,2,3]; track i) { <div class="skeleton h-24"></div> }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="skeleton h-72"></div>
          <div class="skeleton h-72"></div>
        </div>
      } @else {

        <!-- Stats del mes -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 stagger">
          <div class="stat-card" style="opacity:0">
            <div class="stat-icon" style="background: rgb(99 102 241 / 0.12)">
              <i class="pi pi-shopping-cart" style="color: #818cf8"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Vendido</p>
              <p class="text-xl font-bold text-white mt-1">
                {{ statsMes().vendido | currency:'COP':'$ ':'1.0-0' }}
              </p>
              <p class="text-zinc-600 text-xs mt-0.5">{{ statsMes().nCompras }} compras</p>
            </div>
          </div>

          <div class="stat-card" style="opacity:0">
            <div class="stat-icon" style="background: rgb(34 197 94 / 0.1)">
              <i class="pi pi-check-circle" style="color: #4ade80"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Cobrado</p>
              <p class="text-xl font-bold text-green-400 mt-1">
                {{ statsMes().cobrado | currency:'COP':'$ ':'1.0-0' }}
              </p>
              <p class="text-zinc-600 text-xs mt-0.5">{{ statsMes().nAbonos }} abonos</p>
            </div>
          </div>

          <div class="stat-card" style="opacity:0">
            <div class="stat-icon" style="background: rgb(245 158 11 / 0.12)">
              <i class="pi pi-clock" style="color: #fbbf24"></i>
            </div>
            <div>
              <p class="text-zinc-500 text-xs font-medium uppercase tracking-wider">Pendiente total</p>
              <p class="text-xl font-bold text-amber-400 mt-1">
                {{ stats().totalPendiente | currency:'COP':'$ ':'1.0-0' }}
              </p>
              <p class="text-zinc-600 text-xs mt-0.5">{{ stats().clientesPendientes }} clientes</p>
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
              <a routerLink="/admin/clientes" class="text-indigo-400 text-xs hover:text-indigo-300">Ver todos →</a>
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

          <!-- Movimientos del mes -->
          <div class="card-dark">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white font-semibold text-sm flex items-center gap-2">
                <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                  <i class="pi pi-history text-indigo-400 text-xs"></i>
                </span>
                Movimientos · {{ nombreMes() }}
              </h3>
            </div>
            @if (movsDelMes().length === 0) {
              <div class="text-center py-10">
                <i class="pi pi-inbox text-3xl text-zinc-700 block mb-2"></i>
                <p class="text-zinc-500 text-sm">Sin movimientos este mes</p>
              </div>
            } @else {
              <div class="space-y-0.5 max-h-72 overflow-y-auto">
                @for (m of movsDelMes(); track m.id) {
                  <div class="list-row">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="mov-icon"
                           [style]="m.tipo === 'COMPRA' ? 'background:rgb(239 68 68/0.1)' : 'background:rgb(34 197 94/0.1)'">
                        <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                           [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="text-white text-sm font-medium truncate">{{ m.clientes?.nombre ?? '—' }}</p>
                        <p class="text-zinc-500 text-xs truncate">{{ m.descripcion || m.tipo }}</p>
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
  private anim = inject(AnimationService);

  cargando = signal(true);
  clientes = signal<SaldoCliente[]>([]);
  todosMovs = signal<MovimientoConCliente[]>([]);

  mesDash = signal({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });

  nombreMes = computed(() => MESES_NOMBRE[this.mesDash().mes - 1]);

  esMesActual = computed(() => {
    const hoy = new Date();
    return this.mesDash().mes === hoy.getMonth() + 1 && this.mesDash().anio === hoy.getFullYear();
  });

  movsDelMes = computed(() => {
    const { mes, anio } = this.mesDash();
    return this.todosMovs().filter(m => {
      const f = new Date(m.fecha);
      return f.getMonth() + 1 === mes && f.getFullYear() === anio;
    });
  });

  statsMes = computed(() => {
    const movs = this.movsDelMes();
    const compras = movs.filter(m => m.tipo === 'COMPRA');
    const abonos  = movs.filter(m => m.tipo === 'ABONO');
    return {
      vendido:  compras.reduce((s, m) => s + m.monto, 0),
      cobrado:  abonos.reduce((s, m)  => s + m.monto, 0),
      nCompras: compras.length,
      nAbonos:  abonos.length,
    };
  });

  stats = computed(() => ({
    totalPendiente: this.clientes().filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0),
    clientesPendientes: this.clientes().filter(c => c.saldo > 0 && c.activo).length,
  }));

  topDeudores = computed(() =>
    [...this.clientes()]
      .filter(c => c.saldo > 0 && c.activo)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 6)
  );

  mesAnterior() {
    const { mes, anio } = this.mesDash();
    this.mesDash.set(mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio });
  }

  mesSiguiente() {
    if (this.esMesActual()) return;
    const { mes, anio } = this.mesDash();
    this.mesDash.set(mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio });
  }

  constructor() {
    effect(() => {
      if (!this.cargando()) {
        setTimeout(() => {
          this.anim.staggerFadeUp('.stat-card', 80);
          this.anim.fadeUp('.card-dark', 200, 500);
        }, 20);
      }
    });
  }

  async ngOnInit() {
    try {
      const [clientes, movs] = await Promise.all([
        this.clientesSvc.getAll(),
        this.movSvc.getAllConClientes()
      ]);
      this.clientes.set(clientes);
      this.todosMovs.set(movs);
    } finally {
      this.cargando.set(false);
    }
  }
}

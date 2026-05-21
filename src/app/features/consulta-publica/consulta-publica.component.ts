import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ClientesService } from '../../core/services/clientes.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { SaldoCliente } from '../../core/models/cliente.model';
import { Movimiento } from '../../core/models/movimiento.model';

@Component({
  selector: 'app-consulta-publica',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  styles: [`
    .search-input {
      width: 100%; background: #18181b; border: 1px solid #27272a;
      border-radius: 12px; padding: 13px 16px 13px 44px;
      color: white; font-size: 15px; outline: none; transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgb(99 102 241/0.12); }
    .search-input::placeholder { color: #52525b; }
    .search-btn {
      background: #6366f1; color: white; border: none; border-radius: 12px;
      padding: 13px 20px; font-weight: 600; font-size: 14px; cursor: pointer;
      transition: background 0.2s; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
    }
    .search-btn:hover { background: #4f46e5; }
    .search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .result-card {
      background: #18181b; border: 1px solid #27272a; border-radius: 14px;
      padding: 16px; cursor: pointer; transition: border-color 0.15s, background 0.15s;
    }
    .result-card:hover { border-color: #6366f1; background: #1c1c1f; }
    .mov-row {
      padding: 10px 0; border-bottom: 1px solid #27272a; cursor: pointer;
      transition: background 0.15s; border-radius: 8px;
    }
    .mov-row:last-child { border-bottom: none; }
    .mov-row:hover { background: #1c1c1f; padding-left: 8px; padding-right: 8px; }
    .mov-dot {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0;
    }
    .detalle-panel {
      background: #111113; border: 1px solid #27272a; border-radius: 12px;
      padding: 14px; margin-top: 4px; margin-bottom: 4px;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  `],
  template: `
    <div class="min-h-screen bg-zinc-950">

      <!-- Hero -->
      <div style="background: linear-gradient(135deg, #0f0f12 0%, #18113a 100%)"
           class="pt-12 pb-10 px-4">
        <div class="max-w-xl mx-auto text-center">
          <img src="S&A-Clientes-logo.png" alt="S&A Clientes"
               style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #6366f1;margin:0 auto 20px;display:block">
          <h1 class="text-3xl font-bold text-white">S&A Clientes</h1>
          <p class="text-zinc-400 text-sm mt-2">Consulta tu saldo y movimientos</p>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 py-6">

        <!-- Búsqueda -->
        <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px"
             class="mb-5">
          <label class="text-white text-sm font-semibold block mb-3">Buscar por nombre o teléfono</label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
              <input class="search-input" [(ngModel)]="busqueda"
                     placeholder="Nombre o número de teléfono..." (keyup.enter)="buscar()" />
            </div>
            <button class="search-btn" [disabled]="buscando()" (click)="buscar()">
              @if (buscando()) { <i class="pi pi-spinner pi-spin"></i> }
              @else { <i class="pi pi-search"></i> }
              Buscar
            </button>
          </div>
        </div>

        <!-- Resultados -->
        @if (resultados().length > 0 && !clienteSeleccionado()) {
          <div class="mb-5">
            <p class="text-zinc-500 text-xs mb-3 px-1">{{ resultados().length }} resultado(s)</p>
            <div class="flex flex-col gap-2">
              @for (c of resultados(); track c.id) {
                <div class="result-card" (click)="seleccionar(c)">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-white font-semibold">{{ c.nombre }}</p>
                      <p class="text-zinc-500 text-xs mt-0.5">{{ c.telefono || 'Sin teléfono' }}</p>
                    </div>
                    <div class="text-right">
                      <p class="font-bold"
                         [style]="c.saldo > 0 ? 'color:#fbbf24' : 'color:#4ade80'">
                        {{ c.saldo | currency:'COP':'$ ':'1.0-0' }}
                      </p>
                      <p class="text-xs mt-0.5" [style]="c.saldo > 0 ? 'color:#92400e' : 'color:#166534'">
                        {{ c.saldo > 0 ? 'Pendiente' : 'Al día ✓' }}
                      </p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (buscado() && !buscando() && resultados().length === 0) {
          <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:32px"
               class="text-center mb-5">
            <i class="pi pi-search text-3xl text-zinc-700 block mb-3"></i>
            <p class="text-zinc-400 text-sm">No encontramos ningún cliente con ese nombre</p>
          </div>
        }

        <!-- Cliente seleccionado -->
        @if (clienteSeleccionado()) {
          <div>
            <button (click)="clienteSeleccionado.set(null)"
                    class="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-4 transition-colors">
              <i class="pi pi-arrow-left text-xs"></i> Volver
            </button>

            <!-- Saldo card -->
            <div style="background:linear-gradient(135deg,#1a1040,#18181b); border:1px solid #3730a3; border-radius:20px; padding:24px"
                 class="mb-4">
              <p class="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
                {{ clienteSeleccionado()!.nombre }}
              </p>
              <p class="text-4xl font-bold mt-2"
                 [style]="clienteSeleccionado()!.saldo > 0 ? 'color:#fbbf24' : 'color:#4ade80'">
                {{ clienteSeleccionado()!.saldo | currency:'COP':'$ ':'1.0-0' }}
              </p>
              <p class="text-xs mt-1" [style]="clienteSeleccionado()!.saldo > 0 ? 'color:#92400e' : 'color:#166534'">
                {{ clienteSeleccionado()!.saldo > 0 ? '⚠ Tienes deuda pendiente' : '✓ Estás al día' }}
              </p>
              <div style="border-top:1px solid #27272a; margin-top:20px; padding-top:16px"
                   class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-zinc-500 text-xs">Compras totales</p>
                  <p class="text-white font-semibold text-sm mt-0.5">
                    {{ clienteSeleccionado()!.total_compras | currency:'COP':'$ ':'1.0-0' }}
                  </p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs">Abonos totales</p>
                  <p class="text-green-400 font-semibold text-sm mt-0.5">
                    {{ clienteSeleccionado()!.total_abonos | currency:'COP':'$ ':'1.0-0' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Historial con detalle expandible -->
            <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px">
              <h3 class="text-white font-semibold text-sm mb-1">Historial de movimientos</h3>
              <p class="text-zinc-600 text-xs mb-4">Toca un movimiento para ver el detalle</p>

              @if (cargandoMovs()) {
                <div class="text-center py-8 text-zinc-500 text-sm">
                  <i class="pi pi-spinner pi-spin block text-2xl mb-2"></i> Cargando...
                </div>
              } @else if (movimientos().length === 0) {
                <p class="text-zinc-500 text-sm text-center py-6">Sin movimientos</p>
              } @else {
                @for (m of movimientos(); track m.id) {
                  <!-- Fila principal del movimiento -->
                  <div class="mov-row" (click)="toggleDetalle(m.id)">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="mov-dot"
                             [style]="m.tipo === 'COMPRA' ? 'background:rgb(239 68 68/0.1)' : 'background:rgb(34 197 94/0.1)'">
                          <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                             [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                        </div>
                        <div class="min-w-0">
                          <p class="text-white text-sm font-medium truncate">
                            {{ m.descripcion || (m.tipo === 'COMPRA' ? 'Compra' : 'Abono') }}
                          </p>
                          <p class="text-zinc-500 text-xs">{{ m.fecha | date:'dd/MM/yyyy · HH:mm' }}</p>
                        </div>
                      </div>
                      <div class="ml-3 text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p class="font-bold text-sm"
                             [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'">
                            {{ m.tipo === 'COMPRA' ? '+' : '−' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                          </p>
                        </div>
                        <i class="pi text-zinc-600 text-xs transition-transform"
                           [class]="detalleAbierto === m.id ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                      </div>
                    </div>
                  </div>

                  <!-- Panel de detalle expandible -->
                  @if (detalleAbierto === m.id) {
                    <div class="detalle-panel">
                      <p class="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-2">
                        Detalle del movimiento
                      </p>

                      <!-- Items de la compra (uno por línea) -->
                      @if (tieneItems(m.descripcion)) {
                        <div class="mb-3">
                          <p class="text-zinc-400 text-xs mb-1">Productos:</p>
                          @for (item of parseItems(m.descripcion); track item) {
                            <div class="flex items-center gap-2 py-1">
                              <i class="pi pi-box text-indigo-400 text-xs"></i>
                              <p class="text-white text-sm">{{ item }}</p>
                            </div>
                          }
                        </div>
                      } @else if (m.descripcion) {
                        <p class="text-white text-sm mb-3">{{ m.descripcion }}</p>
                      }

                      <!-- Info adicional -->
                      <div class="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p class="text-zinc-500">Tipo</p>
                          <p class="font-semibold"
                             [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'">
                            {{ m.tipo }}
                          </p>
                        </div>
                        <div>
                          <p class="text-zinc-500">Monto</p>
                          <p class="text-white font-semibold">
                            {{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                          </p>
                        </div>
                        <div>
                          <p class="text-zinc-500">Fecha</p>
                          <p class="text-white">{{ m.fecha | date:'dd/MM/yyyy' }}</p>
                        </div>
                        <div>
                          <p class="text-zinc-500">Hora</p>
                          <p class="text-white">{{ m.fecha | date:'HH:mm' }}</p>
                        </div>
                      </div>

                      @if (m.foto_url) {
                        <div class="mt-3 pt-3 border-t border-zinc-800">
                          <p class="text-zinc-500 text-xs mb-2">Foto evidencia:</p>
                          <a [href]="m.foto_url" target="_blank">
                            <img [src]="m.foto_url" alt="Evidencia"
                                 class="w-full max-h-48 object-cover rounded-xl border border-zinc-700" />
                          </a>
                        </div>
                      }
                    </div>
                  }
                }
              }
            </div>
          </div>
        }

        <p class="text-center mt-8 text-zinc-700 text-xs">
          ¿Eres administradora?
          <a href="/login" style="color:#6366f1" class="ml-1 hover:underline">Iniciar sesión</a>
        </p>
      </div>
    </div>
  `
})
export class ConsultaPublicaComponent {
  private clientesSvc = inject(ClientesService);
  private movSvc = inject(MovimientosService);

  busqueda = '';
  buscado = signal(false);
  buscando = signal(false);
  cargandoMovs = signal(false);
  resultados = signal<SaldoCliente[]>([]);
  clienteSeleccionado = signal<SaldoCliente | null>(null);
  movimientos = signal<Movimiento[]>([]);
  detalleAbierto: string | null = null;

  async buscar() {
    const q = this.busqueda.trim();
    if (!q) return;
    this.buscando.set(true);
    this.clienteSeleccionado.set(null);
    try {
      this.resultados.set(await this.clientesSvc.buscarPorNombre(q));
      this.buscado.set(true);
    } finally {
      this.buscando.set(false);
    }
  }

  async seleccionar(c: SaldoCliente) {
    this.clienteSeleccionado.set(c);
    this.detalleAbierto = null;
    this.cargandoMovs.set(true);
    try {
      this.movimientos.set(await this.movSvc.getByCliente(c.id));
    } finally {
      this.cargandoMovs.set(false);
    }
  }

  toggleDetalle(id: string) {
    this.detalleAbierto = this.detalleAbierto === id ? null : id;
  }

  tieneItems(desc?: string): boolean {
    return !!desc && desc.includes(',');
  }

  parseItems(desc: string | undefined): string[] {
    if (!desc) return [];
    return desc.split(', ').filter(Boolean);
  }
}

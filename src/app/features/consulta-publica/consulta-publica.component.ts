import { Component, computed, inject, signal, afterNextRender, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ClientesService } from '../../core/services/clientes.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { StorageService } from '../../core/services/storage.service';
import { SolicitudesPagoService } from '../../core/services/solicitudes-pago.service';
import { AnimationService } from '../../core/services/animation.service';
import { SaldoCliente } from '../../core/models/cliente.model';
import { Movimiento } from '../../core/models/movimiento.model';
import { SolicitudPago } from '../../core/services/solicitudes-pago.service';

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
    .monto-input {
      width: 100%; background: #18181b; border: 1px solid #27272a;
      border-radius: 12px; padding: 13px 16px;
      color: white; font-size: 15px; outline: none; transition: border-color 0.2s;
    }
    .monto-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgb(99 102 241/0.12); }
    .monto-input::placeholder { color: #52525b; }
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
    .tipo-btn {
      flex: 1; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
      border: 1px solid #27272a; background: #111; color: #71717a;
      cursor: pointer; transition: all 0.15s;
    }
    .tipo-activo {
      background: rgb(99 102 241/0.15); border-color: #6366f1; color: white;
    }
    .upload-area {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #111; border: 2px dashed #27272a; border-radius: 14px;
      padding: 32px 16px; cursor: pointer; transition: border-color 0.15s; width: 100%;
    }
    .upload-area:hover { border-color: #6366f1; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  `],
  template: `
    <div class="min-h-screen bg-zinc-950">

      <!-- Hero -->
      <div style="background: linear-gradient(135deg, #0f0f12 0%, #18113a 100%)"
           class="pt-12 pb-10 px-4">
        <div class="max-w-xl mx-auto text-center">
          <img id="hero-logo" src="S&A-Clientes-logo.png" alt="S&A Clientes"
               style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #6366f1;margin:0 auto 20px;display:block;opacity:0"
               class="anim-float">
          <h1 id="hero-title" class="text-3xl font-bold text-white" style="opacity:0">S&A Clientes</h1>
          <p id="hero-sub" class="text-zinc-400 text-sm mt-2" style="opacity:0">Consulta tu saldo y movimientos</p>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 py-6">

        <!-- Búsqueda -->
        <div id="search-box" style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px; opacity:0"
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

            <!-- Estado de solicitud existente -->
            @if (ultimaSolicitud() && !enviado()) {
              @if (ultimaSolicitud()!.estado === 'PENDIENTE') {
                <div style="background:rgb(234 179 8/0.08); border:1px solid rgb(234 179 8/0.3); border-radius:20px; padding:24px"
                     class="mb-4 text-center">
                  <i class="pi pi-clock text-4xl text-yellow-400 block mb-3"></i>
                  <p class="text-white font-semibold">Solicitud en revisión</p>
                  <p class="text-zinc-400 text-sm mt-1">
                    Enviaste un pago de
                    <span class="text-yellow-300 font-semibold">{{ ultimaSolicitud()!.monto | currency:'COP':'$ ':'1.0-0' }}</span>.
                    El administrador lo está revisando.
                  </p>
                </div>
              }
              @if (ultimaSolicitud()!.estado === 'APROBADO') {
                <div style="background:rgb(34 197 94/0.08); border:1px solid rgb(34 197 94/0.3); border-radius:20px; padding:24px"
                     class="mb-4 text-center">
                  <i class="pi pi-check-circle text-4xl text-green-400 block mb-3"></i>
                  <p class="text-white font-semibold">¡Pago aprobado!</p>
                  <p class="text-zinc-400 text-sm mt-1">
                    Tu pago de
                    <span class="text-green-300 font-semibold">{{ ultimaSolicitud()!.monto | currency:'COP':'$ ':'1.0-0' }}</span>
                    fue confirmado.
                  </p>
                </div>
              }
              @if (ultimaSolicitud()!.estado === 'RECHAZADO') {
                <div style="background:rgb(239 68 68/0.08); border:1px solid rgb(239 68 68/0.3); border-radius:20px; padding:24px"
                     class="mb-4">
                  <div class="text-center mb-3">
                    <i class="pi pi-times-circle text-4xl text-red-400 block mb-2"></i>
                    <p class="text-white font-semibold">Pago no aprobado</p>
                  </div>
                  @if (ultimaSolicitud()!.admin_nota) {
                    <div style="background:rgb(239 68 68/0.1); border-radius:10px; padding:10px" class="mb-3">
                      <p class="text-red-300 text-sm text-center">{{ ultimaSolicitud()!.admin_nota }}</p>
                    </div>
                  }
                  <p class="text-zinc-400 text-xs text-center">Puedes intentar de nuevo con un nuevo comprobante.</p>
                </div>
              }
            }

            <!-- Sección de pago -->
            @if (clienteSeleccionado()!.saldo > 0 && mostrarFormPago()) {
              @if (!enviado()) {
                <div style="background:#1a1025; border:1px solid #3730a3; border-radius:20px; padding:24px"
                     class="mb-4">
                  <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
                    <i class="pi pi-credit-card text-indigo-400"></i> Realizar pago
                  </h3>

                  <!-- Tipo de pago -->
                  <div class="flex gap-2 mb-4">
                    <button class="tipo-btn" [class.tipo-activo]="tipoPago === 'TOTAL'"
                            (click)="tipoPago = 'TOTAL'">
                      Pago total
                    </button>
                    <button class="tipo-btn" [class.tipo-activo]="tipoPago === 'ABONO'"
                            (click)="tipoPago = 'ABONO'">
                      Abono parcial
                    </button>
                  </div>

                  <!-- Monto -->
                  @if (tipoPago === 'TOTAL') {
                    <div style="background:#111; border:1px solid #1f1f23; border-radius:12px; padding:14px"
                         class="mb-4">
                      <p class="text-zinc-500 text-xs mb-1">Monto a pagar</p>
                      <p class="text-2xl font-bold text-yellow-400">
                        {{ clienteSeleccionado()!.saldo | currency:'COP':'$ ':'1.0-0' }}
                      </p>
                    </div>
                  } @else {
                    <div class="mb-4">
                      <label class="text-zinc-400 text-xs block mb-1">Monto a abonar (COP)</label>
                      <input type="number" class="monto-input" [(ngModel)]="montoPago"
                             placeholder="Ej: 50000" min="1"
                             [max]="clienteSeleccionado()!.saldo" />
                    </div>
                  }

                  <!-- Info Nequi -->
                  <div style="background:#111; border:1px solid #1f1f23; border-radius:14px; padding:16px"
                       class="mb-4">
                    <p class="text-zinc-500 text-xs uppercase tracking-wider mb-2">Paga a este número Nequi</p>
                    <div class="flex items-center justify-between">
                      <p class="text-white text-2xl font-bold tracking-widest">3014030939</p>
                      <button (click)="copiarNequi()"
                              style="color:#818cf8; font-size:12px; border:1px solid #3730a3; background:transparent; border-radius:8px; padding:6px 12px; cursor:pointer">
                        <i class="pi pi-copy mr-1"></i>{{ copiado ? 'Copiado' : 'Copiar' }}
                      </button>
                    </div>
                    <p class="text-zinc-600 text-xs mt-2">Envía el pago y toma captura de pantalla</p>
                  </div>

                  <!-- Foto comprobante -->
                  <div class="mb-4">
                    <label class="text-zinc-400 text-xs block mb-2">
                      Foto del comprobante <span class="text-red-500">*</span>
                    </label>
                    @if (!fotoFile) {
                      <label for="foto-comprobante" class="upload-area">
                        <i class="pi pi-camera text-3xl text-zinc-600 block mb-2"></i>
                        <p class="text-zinc-400 text-sm font-medium">Adjuntar captura de pago</p>
                        <p class="text-zinc-600 text-xs mt-1">Toca para seleccionar o tomar foto</p>
                        <input id="foto-comprobante" type="file" accept="image/*" class="hidden"
                               (change)="onFotoChange($event)" />
                      </label>
                    } @else {
                      <div style="position:relative">
                        <img [src]="fotoPreview" alt="Comprobante"
                             style="width:100%; max-height:220px; object-fit:cover; border-radius:14px; border:1px solid #3730a3" />
                        <button (click)="quitarFoto()"
                                style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.75); color:#f87171; border:1px solid #f87171; border-radius:8px; padding:4px 12px; font-size:12px; cursor:pointer">
                          Cambiar
                        </button>
                      </div>
                    }
                  </div>

                  @if (errorEnvio()) {
                    <div style="background:rgb(239 68 68/0.1); border:1px solid rgb(239 68 68/0.3); border-radius:10px; padding:10px 14px"
                         class="mb-3">
                      <p class="text-red-400 text-sm">{{ errorEnvio() }}</p>
                    </div>
                  }

                  <button (click)="enviarPago()" [disabled]="enviando() || !puedeEnviar()"
                          class="search-btn" style="width:100%; justify-content:center">
                    @if (enviando()) { <i class="pi pi-spinner pi-spin"></i> Enviando... }
                    @else { <i class="pi pi-send"></i> Enviar comprobante }
                  </button>
                </div>
              } @else {
                <!-- Éxito -->
                <div style="background:rgb(34 197 94/0.08); border:1px solid rgb(34 197 94/0.3); border-radius:20px; padding:40px 24px"
                     class="mb-4 text-center">
                  <i class="pi pi-check-circle text-5xl text-green-400 block mb-3"></i>
                  <p class="text-white font-semibold text-lg">¡Comprobante enviado!</p>
                  <p class="text-zinc-400 text-sm mt-1">El administrador revisará y confirmará tu pago pronto.</p>
                </div>
              }
            }

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
  private storageSvc = inject(StorageService);
  private solicitudesSvc = inject(SolicitudesPagoService);
  private anim = inject(AnimationService);

  busqueda = '';
  buscado = signal(false);
  buscando = signal(false);
  cargandoMovs = signal(false);
  resultados = signal<SaldoCliente[]>([]);
  clienteSeleccionado = signal<SaldoCliente | null>(null);
  movimientos = signal<Movimiento[]>([]);
  solicitudesCliente = signal<SolicitudPago[]>([]);
  detalleAbierto: string | null = null;

  ultimaSolicitud = computed(() => this.solicitudesCliente()[0] ?? null);
  mostrarFormPago = computed(() => {
    const s = this.ultimaSolicitud();
    return !s || s.estado !== 'PENDIENTE';
  });

  constructor() {
    afterNextRender(() => {
      // Hero entrance
      this.anim.scaleIn('#hero-logo', 0);
      this.anim.fadeUp('#hero-title', 120);
      this.anim.fadeUp('#hero-sub', 220);
      this.anim.fadeUp('#search-box', 320);
    });

    // Animate results when they change
    effect(() => {
      const results = this.resultados();
      if (results.length > 0) {
        setTimeout(() => this.anim.staggerFadeUp('.result-card', 60, 0), 10);
      }
    });
  }

  // Payment state
  tipoPago: 'TOTAL' | 'ABONO' = 'TOTAL';
  montoPago = '';
  fotoFile: File | null = null;
  fotoPreview = '';
  copiado = false;
  enviando = signal(false);
  enviado = signal(false);
  errorEnvio = signal('');

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
    this.tipoPago = 'TOTAL';
    this.montoPago = '';
    this.quitarFoto();
    this.enviado.set(false);
    this.errorEnvio.set('');
    this.solicitudesCliente.set([]);
    this.cargandoMovs.set(true);
    try {
      const [movs, solicitudes] = await Promise.all([
        this.movSvc.getByCliente(c.id),
        this.solicitudesSvc.getByCliente(c.id)
      ]);
      this.movimientos.set(movs);
      this.solicitudesCliente.set(solicitudes);
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

  onFotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.quitarFoto();
    this.fotoFile = file;
    this.fotoPreview = URL.createObjectURL(file);
  }

  quitarFoto() {
    if (this.fotoPreview) URL.revokeObjectURL(this.fotoPreview);
    this.fotoFile = null;
    this.fotoPreview = '';
  }

  copiarNequi() {
    navigator.clipboard.writeText('3014030939').catch(() => {});
    this.copiado = true;
    setTimeout(() => (this.copiado = false), 2000);
  }

  puedeEnviar(): boolean {
    if (!this.fotoFile) return false;
    if (this.tipoPago === 'ABONO') {
      const v = Number(this.montoPago);
      return v > 0 && v <= (this.clienteSeleccionado()?.saldo ?? 0);
    }
    return true;
  }

  async enviarPago() {
    const cliente = this.clienteSeleccionado();
    if (!cliente || !this.fotoFile) return;

    const monto = this.tipoPago === 'TOTAL' ? cliente.saldo : Number(this.montoPago);
    if (monto <= 0) return;

    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
      const foto_url = await this.storageSvc.subirComprobante(cliente.id, this.fotoFile);
      await this.solicitudesSvc.crear({ cliente_id: cliente.id, monto, tipo: this.tipoPago, foto_url });
      this.solicitudesCliente.set(await this.solicitudesSvc.getByCliente(cliente.id));
      this.enviado.set(true);
    } catch (e: any) {
      this.errorEnvio.set(e?.message || 'Error al enviar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }
}

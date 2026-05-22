import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { SolicitudesPagoService, SolicitudPago } from '../../core/services/solicitudes-pago.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  styles: [`
    .filtro-tab {
      padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;
      border: 1px solid #27272a; background: transparent; color: #71717a;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
    }
    .filtro-tab:hover { color: #e4e4e7; border-color: #3f3f46; }
    .filtro-activo { background: rgb(99 102 241/0.15); border-color: #6366f1; color: white; }
    .badge-count {
      background: #6366f1; color: white; border-radius: 20px;
      padding: 1px 8px; font-size: 11px;
    }
    .solicitud-card {
      background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 20px;
      transition: border-color 0.15s;
    }
    .pendiente-card { border-color: rgb(234 179 8/0.35); }
    .estado-badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
    }
    .estado-pendiente { background: rgb(234 179 8/0.15); color: #fbbf24; }
    .estado-aprobado { background: rgb(34 197 94/0.15); color: #4ade80; }
    .estado-rechazado { background: rgb(239 68 68/0.15); color: #f87171; }
    .btn-aprobar {
      flex: 1; background: rgb(34 197 94/0.12); border: 1px solid rgb(34 197 94/0.3);
      color: #4ade80; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-aprobar:hover { background: rgb(34 197 94/0.22); }
    .btn-aprobar:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-rechazar-outline {
      background: transparent; border: 1px solid #27272a; color: #f87171;
      border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px;
    }
    .btn-rechazar-outline:hover { border-color: rgb(239 68 68/0.4); background: rgb(239 68 68/0.05); }
    .btn-rechazar-outline:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-confirmar-rechazo {
      flex: 1; background: rgb(239 68 68/0.12); border: 1px solid rgb(239 68 68/0.3);
      color: #f87171; border-radius: 10px; padding: 9px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-confirmar-rechazo:hover { background: rgb(239 68 68/0.22); }
    .btn-confirmar-rechazo:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancelar {
      background: transparent; border: 1px solid #27272a; color: #71717a;
      border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancelar:hover { color: #e4e4e7; border-color: #3f3f46; }
    .rechazo-input {
      width: 100%; background: #111; border: 1px solid #27272a; border-radius: 10px;
      padding: 10px; color: white; font-size: 13px; resize: none; outline: none;
      transition: border-color 0.2s;
    }
    .rechazo-input:focus { border-color: #6366f1; }
    .rechazo-input::placeholder { color: #52525b; }
  `],
  template: `
    <div class="p-5 max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-white text-xl font-bold">Solicitudes de Pago</h1>
          <p class="text-zinc-500 text-sm mt-0.5">Revisa y aprueba los pagos de clientes</p>
        </div>
        <div class="flex items-center gap-3">
          @if (pendientes() > 0) {
            <div style="background:rgb(234 179 8/0.12); border:1px solid rgb(234 179 8/0.3); border-radius:20px; padding:4px 14px">
              <p class="text-yellow-400 text-sm font-semibold">{{ pendientes() }} pendiente(s)</p>
            </div>
          }
          <button (click)="cargar()"
                  style="background:#18181b; border:1px solid #27272a; color:#71717a; border-radius:10px; padding:8px 12px; cursor:pointer; font-size:13px; transition:all 0.15s"
                  [disabled]="cargando()">
            <i class="pi" [class]="cargando() ? 'pi-spinner pi-spin' : 'pi-refresh'"></i>
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-5 overflow-x-auto pb-1">
        @for (tab of tabs; track tab.value) {
          <button class="filtro-tab" [class.filtro-activo]="filtro() === tab.value"
                  (click)="filtro.set(tab.value)">
            {{ tab.label }}
            @if (tab.value === 'PENDIENTE' && pendientes() > 0) {
              <span class="badge-count">{{ pendientes() }}</span>
            }
          </button>
        }
      </div>

      <!-- Contenido -->
      @if (cargando()) {
        <div class="text-center py-20 text-zinc-500">
          <i class="pi pi-spinner pi-spin text-3xl block mb-3"></i>
          <p class="text-sm">Cargando...</p>
        </div>
      } @else if (filtradas().length === 0) {
        <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:56px 24px"
             class="text-center">
          <i class="pi pi-inbox text-4xl text-zinc-700 block mb-3"></i>
          <p class="text-zinc-400 text-sm">No hay solicitudes {{ filtro() !== 'TODAS' ? 'en este estado' : '' }}</p>
        </div>
      } @else {
        <div class="flex flex-col gap-4">
          @for (s of filtradas(); track s.id) {
            <div class="solicitud-card" [class.pendiente-card]="s.estado === 'PENDIENTE'">

              <!-- Cabecera -->
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="text-white font-semibold">{{ s.clientes?.nombre ?? 'Cliente' }}</p>
                  @if (s.clientes?.telefono) {
                    <p class="text-zinc-500 text-xs mt-0.5">{{ s.clientes!.telefono }}</p>
                  }
                </div>
                <span class="estado-badge" [class]="'estado-' + s.estado.toLowerCase()">
                  {{ s.estado }}
                </span>
              </div>

              <!-- Datos -->
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p class="text-zinc-500 text-xs">Monto</p>
                  <p class="text-white font-bold text-base mt-0.5">
                    {{ s.monto | currency:'COP':'$ ':'1.0-0' }}
                  </p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs">Tipo</p>
                  <p class="text-white font-semibold text-sm mt-0.5">{{ s.tipo }}</p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs">Fecha</p>
                  <p class="text-white text-sm mt-0.5">{{ s.created_at | date:'dd/MM/yy HH:mm' }}</p>
                </div>
              </div>

              <!-- Foto comprobante -->
              @if (s.foto_url) {
                <div class="mb-3">
                  <a [href]="s.foto_url" target="_blank" title="Ver comprobante completo">
                    <img [src]="s.foto_url" alt="Comprobante"
                         style="width:100%; max-height:200px; object-fit:cover; border-radius:12px; border:1px solid #27272a; cursor:zoom-in" />
                  </a>
                  <p class="text-zinc-600 text-xs mt-1 text-center">Toca para ampliar</p>
                </div>
              } @else {
                <div style="background:#111; border:1px dashed #27272a; border-radius:10px; padding:16px"
                     class="mb-3 text-center">
                  <p class="text-zinc-600 text-xs">Sin foto adjunta</p>
                </div>
              }

              <!-- Nota de rechazo -->
              @if (s.admin_nota) {
                <div style="background:rgb(239 68 68/0.08); border:1px solid rgb(239 68 68/0.2); border-radius:10px; padding:10px"
                     class="mb-3">
                  <p class="text-red-400 text-xs font-semibold mb-0.5">Motivo del rechazo:</p>
                  <p class="text-red-300 text-sm">{{ s.admin_nota }}</p>
                </div>
              }

              <!-- WhatsApp (si ya resuelto y tiene teléfono) -->
              @if (s.estado !== 'PENDIENTE' && s.clientes?.telefono) {
                <a [href]="getWhatsAppUrl(s)" target="_blank"
                   style="display:flex; align-items:center; justify-content:center; gap:8px;
                          background:rgb(34 197 94/0.1); border:1px solid rgb(34 197 94/0.25);
                          color:#4ade80; border-radius:10px; padding:10px; font-size:13px;
                          font-weight:600; text-decoration:none; transition:all 0.15s; margin-top:4px"
                   onmouseover="this.style.background='rgb(34 197 94/0.2)'"
                   onmouseout="this.style.background='rgb(34 197 94/0.1)'">
                  <i class="pi pi-whatsapp"></i>
                  Notificar por WhatsApp
                </a>
              }

              <!-- Acciones -->
              @if (s.estado === 'PENDIENTE') {
                @if (rechazandoId() === s.id) {
                  <div style="background:#111; border:1px solid #27272a; border-radius:12px; padding:14px" class="mt-1">
                    <label class="text-zinc-400 text-xs block mb-2">Motivo del rechazo (opcional)</label>
                    <textarea [(ngModel)]="notaRechazo" rows="2" class="rechazo-input"
                              placeholder="Ej: El comprobante no es legible..."></textarea>
                    <div class="flex gap-2 mt-2">
                      <button (click)="confirmarRechazo(s)"
                              [disabled]="procesando() === s.id"
                              class="btn-confirmar-rechazo">
                        @if (procesando() === s.id) { <i class="pi pi-spinner pi-spin"></i> }
                        Confirmar rechazo
                      </button>
                      <button (click)="cancelarRechazo()" class="btn-cancelar">Cancelar</button>
                    </div>
                  </div>
                } @else {
                  <div class="flex gap-2 mt-1">
                    <button (click)="aprobar(s)" [disabled]="!!procesando()" class="btn-aprobar">
                      @if (procesando() === s.id) { <i class="pi pi-spinner pi-spin"></i> }
                      @else { <i class="pi pi-check"></i> }
                      Aprobar pago
                    </button>
                    <button (click)="iniciarRechazo(s.id)" [disabled]="!!procesando()"
                            class="btn-rechazar-outline">
                      <i class="pi pi-times"></i> Rechazar
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class PagosComponent implements OnInit {
  private solicitudesSvc = inject(SolicitudesPagoService);
  private auth = inject(AuthService);

  cargando = signal(true);
  solicitudes = signal<SolicitudPago[]>([]);
  filtro = signal<'TODAS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('PENDIENTE');
  procesando = signal<string | null>(null);
  rechazandoId = signal<string | null>(null);
  notaRechazo = '';

  tabs = [
    { label: 'Pendientes', value: 'PENDIENTE' as const },
    { label: 'Aprobados', value: 'APROBADO' as const },
    { label: 'Rechazados', value: 'RECHAZADO' as const },
    { label: 'Todas', value: 'TODAS' as const },
  ];

  pendientes = computed(() => this.solicitudes().filter(s => s.estado === 'PENDIENTE').length);
  filtradas = computed(() => {
    const f = this.filtro();
    if (f === 'TODAS') return this.solicitudes();
    return this.solicitudes().filter(s => s.estado === f);
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.solicitudes.set(await this.solicitudesSvc.getAll());
    } finally {
      this.cargando.set(false);
    }
  }

  async aprobar(s: SolicitudPago) {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.procesando.set(s.id);
    try {
      await this.solicitudesSvc.aprobar(s.id, s.cliente_id, s.monto, userId);
      await this.cargar();
    } finally {
      this.procesando.set(null);
    }
  }

  iniciarRechazo(id: string) {
    this.rechazandoId.set(id);
    this.notaRechazo = '';
  }

  async confirmarRechazo(s: SolicitudPago) {
    this.procesando.set(s.id);
    try {
      await this.solicitudesSvc.rechazar(s.id, this.notaRechazo);
      this.rechazandoId.set(null);
      await this.cargar();
    } finally {
      this.procesando.set(null);
    }
  }

  cancelarRechazo() {
    this.rechazandoId.set(null);
    this.notaRechazo = '';
  }

  getWhatsAppUrl(s: SolicitudPago): string {
    const phone = (s.clientes?.telefono ?? '').replace(/\D/g, '');
    const fullPhone = phone.startsWith('57') ? phone : `57${phone}`;
    const nombre = s.clientes?.nombre ?? 'cliente';
    const monto = s.monto.toLocaleString('es-CO');
    const msg = s.estado === 'APROBADO'
      ? `Hola ${nombre}, tu pago de $${monto} COP fue aprobado exitosamente. ¡Gracias!`
      : `Hola ${nombre}, tu solicitud de pago de $${monto} COP no pudo ser aprobada.${s.admin_nota ? ' Motivo: ' + s.admin_nota : ''} Por favor contáctanos.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  }
}

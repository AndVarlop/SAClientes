import { Component, inject, signal, computed, OnInit, input, effect } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientesService } from '../../../core/services/clientes.service';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ProductosService } from '../../../core/services/productos.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { SaldoCliente } from '../../../core/models/cliente.model';
import { Movimiento } from '../../../core/models/movimiento.model';
import { Producto } from '../../../core/models/producto.model';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, ReactiveFormsModule,
            ButtonModule, DialogModule, InputTextModule, InputNumberModule,
            TextareaModule, ProgressSpinnerModule],
  styles: [`
    .qty-btn {
      width: 28px; height: 28px;
      border-radius: 8px;
      border: 1px solid #3f3f46;
      background: #27272a;
      color: white;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: bold;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .qty-btn:hover { background: #6366f1; border-color: #6366f1; }
    .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .product-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #27272a;
      background: #09090b;
      transition: border-color 0.15s;
    }
    .product-row.activo { border-color: #6366f1; background: rgb(99 102 241 / 0.05); }
    .mov-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #27272a;
    }
    .mov-row:last-child { border-bottom: none; }
    .mov-dot {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0;
    }
    .file-input {
      font-size: 13px; color: #71717a;
      width: 100%;
    }
    .file-input::file-selector-button {
      background: #27272a; color: white; border: 1px solid #3f3f46;
      padding: 6px 12px; border-radius: 8px; cursor: pointer;
      font-size: 12px; margin-right: 10px;
    }
    .file-input::file-selector-button:hover { background: #3f3f46; }
  `],
  template: `
    <div class="p-5 md:p-8 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/admin/clientes"
           class="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center
                  text-zinc-400 hover:text-white transition-colors border border-zinc-700">
          <i class="pi pi-arrow-left text-sm"></i>
        </a>
        <div class="min-w-0">
          <h2 class="text-2xl font-bold text-white truncate">{{ cliente()?.nombre }}</h2>
          <p class="text-zinc-500 text-sm">{{ cliente()?.telefono || 'Sin teléfono' }}</p>
        </div>
      </div>

      @if (cargando()) {
        <div class="flex justify-center py-20">
          <p-progressSpinner strokeWidth="3" [style]="{width:'48px',height:'48px'}" />
        </div>
      } @else {

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Total compras</p>
            <p class="text-xl font-bold text-white mt-1">
              {{ cliente()?.total_compras | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Total abonos</p>
            <p class="text-xl font-bold text-green-400 mt-1">
              {{ cliente()?.total_abonos | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="rounded-2xl p-5 border-2"
               [class]="(cliente()?.saldo ?? 0) > 0
                 ? 'bg-amber-950/20 border-amber-500/30'
                 : 'bg-green-950/20 border-green-500/30'">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Saldo actual</p>
            <p class="text-xl font-bold mt-1"
               [class]="(cliente()?.saldo ?? 0) > 0 ? 'text-amber-400' : 'text-green-400'">
              {{ cliente()?.saldo | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-3 mb-6 flex-wrap">
          <button pButton label="Registrar compra" icon="pi pi-shopping-cart"
                  (click)="abrirCompra()"></button>
          <button pButton label="Registrar abono" icon="pi pi-check-circle"
                  severity="success" (click)="mostrarAbono = true"></button>
        </div>

        <!-- Compra rápida (1 producto, 1 toque) -->
        @if (productos().length > 0) {
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-6 h-6 bg-yellow-500/15 rounded-lg flex items-center justify-center">
                <i class="pi pi-bolt text-yellow-400 text-xs"></i>
              </span>
              <h3 class="text-white font-semibold text-sm">Toque rápido</h3>
              <span class="text-zinc-500 text-xs ml-1">· 1 unidad por producto</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              @for (p of productos(); track p.id) {
                <button (click)="compraRapida(p)"
                        [disabled]="procesando()"
                        class="flex flex-col items-center justify-center bg-zinc-800
                               hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500
                               rounded-xl p-3 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                  <span class="text-white font-medium text-sm">{{ p.nombre }}</span>
                  <span class="text-indigo-300 text-xs mt-0.5">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Historial -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 class="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <i class="pi pi-history text-indigo-400 text-xs"></i>
            </span>
            Historial de movimientos
          </h3>

          @if (movimientos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-8">Sin movimientos registrados</p>
          } @else {
            @for (m of movimientos(); track m.id) {
              <div class="mov-row">
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
                <div class="ml-3 text-right shrink-0">
                  <p [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"
                     class="font-bold text-sm">
                    {{ m.tipo === 'COMPRA' ? '+' : '−' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                  </p>
                  @if (m.foto_url) {
                    <a [href]="m.foto_url" target="_blank"
                       class="text-indigo-400 text-xs hover:underline">Ver foto</a>
                  }
                </div>
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- ─── DIALOG COMPRA (carrito de productos) ─── -->
    <p-dialog [(visible)]="mostrarCompra" header="Registrar Compra"
              [modal]="true" [style]="{width:'460px'}" [draggable]="false"
              [maximizable]="false">
      <div class="flex flex-col gap-4 pt-2">

        <!-- Producto list -->
        <div>
          <p class="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
            Selecciona productos y cantidad
          </p>
          @if (productos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-4">
              Sin productos. Agrégalos en la sección Productos.
            </p>
          } @else {
            <div class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              @for (p of productos(); track p.id) {
                <div class="product-row" [class.activo]="(carrito()[p.id] ?? 0) > 0">
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-medium truncate">{{ p.nombre }}</p>
                    <p class="text-indigo-400 text-xs">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <button class="qty-btn" (click)="cambiarQty(p.id, -1)"
                            [disabled]="(carrito()[p.id] ?? 0) === 0">−</button>
                    <span class="text-white font-bold text-sm w-6 text-center">
                      {{ carrito()[p.id] ?? 0 }}
                    </span>
                    <button class="qty-btn" (click)="cambiarQty(p.id, 1)">+</button>
                    @if ((carrito()[p.id] ?? 0) > 0) {
                      <span class="text-zinc-400 text-xs w-20 text-right">
                        = {{ p.precio * (carrito()[p.id] ?? 0) | currency:'COP':'$ ':'1.0-0' }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Total -->
        <div class="flex items-center justify-between py-3 border-t border-zinc-800">
          <span class="text-zinc-400 font-medium">Total a cobrar</span>
          <span class="text-2xl font-bold"
                [class]="totalCarrito() > 0 ? 'text-white' : 'text-zinc-600'">
            {{ totalCarrito() | currency:'COP':'$ ':'1.0-0' }}
          </span>
        </div>

        <!-- Foto -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-camera text-zinc-400"></i>
            Foto evidencia
            <span class="text-zinc-600 font-normal">(opcional)</span>
          </label>
          <input type="file" accept="image/*" capture="environment"
                 class="file-input" (change)="onFoto($event)" />
          @if (fotoSeleccionada) {
            <p class="text-green-400 text-xs flex items-center gap-1">
              <i class="pi pi-check"></i> {{ fotoSeleccionada.name }}
            </p>
          }
        </div>

        <!-- Fecha/hora -->
        <div class="flex items-center gap-2 text-zinc-500 text-xs py-2 border-t border-zinc-800">
          <i class="pi pi-clock"></i>
          <span>Fecha y hora registrada automáticamente: <strong class="text-zinc-300">{{ ahora() | date:'dd/MM/yyyy · HH:mm' }}</strong></span>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarCompra()"></button>
        <button pButton label="Registrar compra"
                [disabled]="totalCarrito() === 0"
                [loading]="guardando()"
                (click)="registrarCompra()"></button>
      </ng-template>
    </p-dialog>

    <!-- ─── DIALOG ABONO ─── -->
    <p-dialog [(visible)]="mostrarAbono" header="Registrar Abono / Pago"
              [modal]="true" [style]="{width:'380px'}" [draggable]="false">
      <form [formGroup]="formAbono" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Monto del abono *</label>
          <p-inputnumber formControlName="monto" mode="currency" currency="COP"
                         locale="es-CO" placeholder="$ 0" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Descripción</label>
          <textarea pTextarea formControlName="descripcion" rows="2"
                    placeholder="Abono en efectivo, transferencia..." class="w-full resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-camera text-zinc-400"></i>
            Foto evidencia
            <span class="text-zinc-600 font-normal">(opcional)</span>
          </label>
          <input type="file" accept="image/*" capture="environment"
                 class="file-input" (change)="onFoto($event)" />
          @if (fotoSeleccionada) {
            <p class="text-green-400 text-xs flex items-center gap-1">
              <i class="pi pi-check"></i> {{ fotoSeleccionada.name }}
            </p>
          }
        </div>
        <div class="flex items-center gap-2 text-zinc-500 text-xs py-2 border-t border-zinc-800">
          <i class="pi pi-clock"></i>
          <span>Fecha: <strong class="text-zinc-300">{{ ahora() | date:'dd/MM/yyyy · HH:mm' }}</strong></span>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarAbono()"></button>
        <button pButton label="Registrar abono" severity="success"
                [loading]="guardando()" (click)="registrarAbono()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class ClienteDetalleComponent implements OnInit {
  id = input.required<string>();

  private clientesSvc = inject(ClientesService);
  private movSvc = inject(MovimientosService);
  private productosSvc = inject(ProductosService);
  private storageSvc = inject(StorageService);
  private auth = inject(AuthService);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  cargando = signal(true);
  guardando = signal(false);
  procesando = signal(false);
  mostrarAbono = false;
  mostrarCompra = false;
  fotoSeleccionada: File | null = null;

  cliente = signal<SaldoCliente | null>(null);
  movimientos = signal<Movimiento[]>([]);
  productos = signal<Producto[]>([]);

  // Carrito: { productoId: cantidad }
  carrito = signal<Record<string, number>>({});

  totalCarrito = computed(() =>
    this.productos().reduce((sum, p) =>
      sum + p.precio * (this.carrito()[p.id] ?? 0), 0)
  );

  descripcionCompra = computed(() =>
    this.productos()
      .filter(p => (this.carrito()[p.id] ?? 0) > 0)
      .map(p => `${p.nombre} x${this.carrito()[p.id]}`)
      .join(', ')
  );

  ahora = signal(new Date());

  formAbono = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['']
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) this.cargar(id);
    });

    // Actualiza la hora cada minuto
    setInterval(() => this.ahora.set(new Date()), 60000);
  }

  async ngOnInit() {}

  async cargar(id: string) {
    this.cargando.set(true);
    try {
      const [cliente, movs, prods] = await Promise.all([
        this.clientesSvc.getById(id),
        this.movSvc.getByCliente(id),
        this.productosSvc.getAll()
      ]);
      this.cliente.set(cliente);
      this.movimientos.set(movs);
      this.productos.set(prods);
    } finally {
      this.cargando.set(false);
    }
  }

  abrirCompra() {
    this.carrito.set({});
    this.fotoSeleccionada = null;
    this.ahora.set(new Date());
    this.mostrarCompra = true;
  }

  cerrarCompra() {
    this.mostrarCompra = false;
    this.carrito.set({});
    this.fotoSeleccionada = null;
  }

  cerrarAbono() {
    this.mostrarAbono = false;
    this.formAbono.reset();
    this.fotoSeleccionada = null;
  }

  cambiarQty(productoId: string, delta: number) {
    const actual = this.carrito()[productoId] ?? 0;
    const nuevo = Math.max(0, actual + delta);
    this.carrito.update(c => ({ ...c, [productoId]: nuevo }));
  }

  onFoto(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fotoSeleccionada = input.files?.[0] ?? null;
  }

  async compraRapida(producto: Producto) {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.procesando.set(true);
    try {
      await this.movSvc.compraRapida(this.id(), producto.nombre, producto.precio, userId);
      this.msg.add({ severity: 'success', summary: producto.nombre, detail: 'Registrado' });
      await this.cargar(this.id());
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.procesando.set(false);
    }
  }

  async registrarCompra() {
    if (this.totalCarrito() === 0) return;
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoSeleccionada) {
        foto_url = await this.storageSvc.subirEvidencia(this.id(), this.fotoSeleccionada);
      }
      await this.movSvc.registrar({
        cliente_id: this.id(),
        tipo: 'COMPRA',
        monto: this.totalCarrito(),
        descripcion: this.descripcionCompra(),
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: new Date().toISOString()
      });
      this.msg.add({ severity: 'success', summary: 'Compra registrada',
                     detail: this.descripcionCompra() });
      this.cerrarCompra();
      await this.cargar(this.id());
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }

  async registrarAbono() {
    if (this.formAbono.invalid) return;
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoSeleccionada) {
        foto_url = await this.storageSvc.subirEvidencia(this.id(), this.fotoSeleccionada);
      }
      await this.movSvc.registrar({
        cliente_id: this.id(),
        tipo: 'ABONO',
        monto: this.formAbono.value.monto!,
        descripcion: this.formAbono.value.descripcion ?? undefined,
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: new Date().toISOString()
      });
      this.msg.add({ severity: 'success', summary: 'Abono registrado' });
      this.cerrarAbono();
      await this.cargar(this.id());
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }
}

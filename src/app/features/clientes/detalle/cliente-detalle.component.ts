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
  template: `
    <div class="p-5 md:p-8 max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/admin/clientes"
           class="text-zinc-400 hover:text-white transition-colors">
          <i class="pi pi-arrow-left"></i>
        </a>
        <div>
          <h2 class="text-2xl font-bold text-white">{{ cliente()?.nombre }}</h2>
          <p class="text-zinc-500 text-sm">{{ cliente()?.telefono || 'Sin teléfono' }}</p>
        </div>
      </div>

      @if (cargando()) {
        <div class="flex justify-center py-20">
          <p-progressSpinner strokeWidth="3" [style]="{width:'48px',height:'48px'}" />
        </div>
      } @else {
        <!-- Saldo -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="card-dark">
            <p class="text-zinc-500 text-xs uppercase tracking-widest">Total compras</p>
            <p class="text-xl font-bold text-white mt-1">
              {{ cliente()?.total_compras | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="card-dark">
            <p class="text-zinc-500 text-xs uppercase tracking-widest">Total abonos</p>
            <p class="text-xl font-bold text-green-400 mt-1">
              {{ cliente()?.total_abonos | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="card-dark border-2" [class]="(cliente()?.saldo ?? 0) > 0 ? 'border-amber-500/40' : 'border-green-500/40'">
            <p class="text-zinc-500 text-xs uppercase tracking-widest">Saldo actual</p>
            <p class="text-xl font-bold mt-1" [class]="(cliente()?.saldo ?? 0) > 0 ? 'text-amber-400' : 'text-green-400'">
              {{ cliente()?.saldo | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-3 mb-6 flex-wrap">
          <button pButton label="Registrar abono" icon="pi pi-check-circle"
                  severity="success" (click)="mostrarAbono = true"></button>
          <button pButton label="Registrar compra" icon="pi pi-shopping-cart"
                  severity="secondary" (click)="mostrarCompra = true"></button>
        </div>

        <!-- Compra rápida -->
        @if (productos().length > 0) {
          <div class="card-dark mb-6">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="pi pi-bolt text-yellow-400"></i>
              Compra rápida
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              @for (p of productos(); track p.id) {
                <button (click)="compraRapida(p)"
                        [disabled]="procesando()"
                        class="flex flex-col items-center justify-center bg-zinc-800
                               hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500
                               rounded-xl p-3 transition-all active:scale-95 disabled:opacity-50">
                  <span class="text-white font-medium text-sm">{{ p.nombre }}</span>
                  <span class="text-indigo-300 text-xs mt-0.5">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Historial -->
        <div class="card-dark">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="pi pi-history text-indigo-400"></i>
            Historial
          </h3>
          @if (movimientos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-8">Sin movimientos</p>
          } @else {
            <div class="space-y-2">
              @for (m of movimientos(); track m.id) {
                <div class="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-800 transition-colors">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div [class]="m.tipo === 'COMPRA' ? 'bg-red-500/10' : 'bg-green-500/10'"
                         class="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart text-red-400' : 'pi pi-check text-green-400'"
                         class="text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-white text-sm font-medium truncate">{{ m.descripcion || m.tipo }}</p>
                      <p class="text-zinc-500 text-xs">{{ m.fecha | date:'dd/MM/yyyy HH:mm' }}</p>
                    </div>
                  </div>
                  <div class="ml-4 text-right shrink-0">
                    <p [class]="m.tipo === 'COMPRA' ? 'text-red-400' : 'text-green-400'"
                       class="font-bold text-sm">
                      {{ m.tipo === 'COMPRA' ? '+' : '-' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                    </p>
                    @if (m.foto_url) {
                      <a [href]="m.foto_url" target="_blank"
                         class="text-indigo-400 text-xs hover:underline">Ver foto</a>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Dialog Abono -->
    <p-dialog [(visible)]="mostrarAbono" header="Registrar Abono"
              [modal]="true" [style]="{width:'380px'}" [draggable]="false">
      <form [formGroup]="formAbono" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Monto *</label>
          <p-inputnumber formControlName="monto" mode="currency" currency="COP"
                         locale="es-CO" placeholder="0" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Descripción</label>
          <textarea pTextarea formControlName="descripcion" rows="2"
                    placeholder="Abono en efectivo..." class="w-full resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Foto evidencia</label>
          <input type="file" accept="image/*" (change)="onFoto($event)"
                 class="text-zinc-400 text-sm" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="mostrarAbono = false"></button>
        <button pButton label="Registrar" severity="success" [loading]="guardando()"
                (click)="registrarAbono()"></button>
      </ng-template>
    </p-dialog>

    <!-- Dialog Compra manual -->
    <p-dialog [(visible)]="mostrarCompra" header="Registrar Compra"
              [modal]="true" [style]="{width:'380px'}" [draggable]="false">
      <form [formGroup]="formCompra" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Monto *</label>
          <p-inputnumber formControlName="monto" mode="currency" currency="COP"
                         locale="es-CO" placeholder="0" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Descripción *</label>
          <textarea pTextarea formControlName="descripcion" rows="2"
                    placeholder="Detalle de la compra..." class="w-full resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Foto evidencia</label>
          <input type="file" accept="image/*" (change)="onFoto($event)"
                 class="text-zinc-400 text-sm" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="mostrarCompra = false"></button>
        <button pButton label="Registrar" [loading]="guardando()" (click)="registrarCompra()"></button>
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

  formAbono = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['']
  });

  formCompra = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['', Validators.required]
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) this.cargar(id);
    });
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
      this.mostrarAbono = false;
      this.formAbono.reset();
      this.fotoSeleccionada = null;
      await this.cargar(this.id());
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }

  async registrarCompra() {
    if (this.formCompra.invalid) return;
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoSeleccionada) {
        foto_url = await this.storageSvc.subirEvidencia(this.id(), this.fotoSeleccionada);
      }
      await this.movSvc.registrar({
        cliente_id: this.id(),
        tipo: 'COMPRA',
        monto: this.formCompra.value.monto!,
        descripcion: this.formCompra.value.descripcion ?? undefined,
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: new Date().toISOString()
      });
      this.msg.add({ severity: 'success', summary: 'Compra registrada' });
      this.mostrarCompra = false;
      this.formCompra.reset();
      this.fotoSeleccionada = null;
      await this.cargar(this.id());
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }
}

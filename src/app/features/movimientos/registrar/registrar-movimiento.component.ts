import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ClientesService } from '../../../core/services/clientes.service';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ProductosService } from '../../../core/services/productos.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { SaldoCliente } from '../../../core/models/cliente.model';
import { Movimiento, MovimientoConCliente } from '../../../core/models/movimiento.model';
import { Producto } from '../../../core/models/producto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-registrar-movimiento',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe,
            ButtonModule, DialogModule, InputTextModule, InputNumberModule,
            TextareaModule, SelectModule, ProgressSpinnerModule],
  styles: [`
    .qty-btn {
      width: 28px; height: 28px; border-radius: 8px;
      border: 1px solid #3f3f46; background: #27272a; color: white;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: bold; transition: background 0.15s; flex-shrink: 0;
    }
    .qty-btn:hover { background: #6366f1; border-color: #6366f1; }
    .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .product-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-radius: 10px;
      border: 1px solid #27272a; background: #09090b; transition: border-color 0.15s;
    }
    .product-row.activo { border-color: #6366f1; background: rgb(99 102 241 / 0.05); }
    .mov-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #27272a; cursor: default;
    }
    .mov-row:last-child { border-bottom: none; }
    .mov-dot {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; margin-top: 2px;
    }
    .delete-btn {
      width: 28px; height: 28px; border-radius: 8px;
      background: transparent; border: 1px solid #3f3f46;
      color: #71717a; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      font-size: 11px; transition: all 0.15s; flex-shrink: 0; opacity: 0;
    }
    .mov-row:hover .delete-btn { opacity: 1; }
    .delete-btn:hover { background: rgb(239 68 68/0.1); border-color: #ef4444; color: #f87171; }
    .file-input { font-size: 13px; color: #71717a; width: 100%; }
    .file-input::file-selector-button {
      background: #27272a; color: white; border: 1px solid #3f3f46;
      padding: 6px 12px; border-radius: 8px; cursor: pointer;
      font-size: 12px; margin-right: 10px;
    }
    .file-input::file-selector-button:hover { background: #3f3f46; }
    .fecha-input {
      width: 100%; background: #09090b; border: 1px solid #3f3f46;
      color: white; border-radius: 8px; padding: 10px 12px;
      font-size: 14px; outline: none; transition: border-color 0.2s; color-scheme: dark;
    }
    .fecha-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgb(99 102 241/0.2); }
    .week-nav-btn {
      width: 32px; height: 32px; border-radius: 9px; background: #27272a; border: 1px solid #3f3f46;
      color: #a1a1aa; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; transition: all 0.15s; flex-shrink: 0;
    }
    .week-nav-btn:hover { border-color: #6366f1; color: white; }
    .pag-btn {
      padding: 6px 14px; border-radius: 8px; background: #27272a; border: 1px solid #3f3f46;
      color: #a1a1aa; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s;
    }
    .pag-btn:hover:not(:disabled) { border-color: #6366f1; color: white; }
    .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .chip-tipo {
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
    }
    .chip-compra { background: rgb(239 68 68/0.1); color: #f87171; }
    .chip-abono  { background: rgb(34 197 94/0.1);  color: #4ade80; }
  `],
  template: `
    <div class="p-5 md:p-8 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-white">Movimientos</h2>
        <p class="text-zinc-500 text-sm mt-0.5">Selecciona un cliente para registrar o ver su historial</p>
      </div>

      <!-- Selector de cliente -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <label class="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-3">
          Cliente
        </label>
        <p-select [options]="todosClientes()" [(ngModel)]="clienteIdSeleccionado"
                  optionLabel="nombre" optionValue="id"
                  placeholder="Buscar cliente por nombre..."
                  styleClass="w-full" [filter]="true" filterBy="nombre"
                  (onChange)="onClienteChange($event.value)" />
      </div>

      <!-- ══ TODOS LOS MOVIMIENTOS ══ -->
      <div class="mt-2 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-semibold text-base flex items-center gap-2">
            <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <i class="pi pi-list text-indigo-400 text-xs"></i>
            </span>
            Todos los movimientos
          </h3>
          <span class="text-zinc-500 text-xs">{{ todosMovsFiltrados().length }} registros</span>
        </div>

        <!-- Filtro semana -->
        <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:14px 16px;margin-bottom:16px">
          <div class="flex items-center gap-2 mb-3">
            <button class="week-nav-btn" (click)="allSemAnterior()">←</button>
            <div class="flex-1 text-center">
              <span class="text-white font-semibold text-sm">{{ allSemLabel() }}</span>
              @if (allCustom()) {
                <span style="font-size:10px;margin-left:6px;padding:1px 8px;border-radius:20px;
                             background:rgb(99 102 241/0.15);color:#818cf8">custom</span>
              }
            </div>
            <button class="week-nav-btn" (click)="allSemSiguiente()">→</button>
            @if (allOffset() !== 0 || allCustom()) {
              <button (click)="allSemActual()"
                      style="padding:4px 12px;border-radius:8px;background:rgb(99 102 241/0.1);
                             border:1px solid rgb(99 102 241/0.3);color:#818cf8;cursor:pointer;
                             font-size:12px;font-weight:600;white-space:nowrap">
                Hoy
              </button>
            }
          </div>
          <div class="flex gap-2 items-center">
            <input type="date" class="fecha-input" style="flex:1;font-size:13px;padding:8px 10px"
                   [value]="allDesdeStr()"
                   (change)="allDesdeStr.set($any($event.target).value)" />
            <span class="text-zinc-600 text-xs shrink-0">→</span>
            <input type="date" class="fecha-input" style="flex:1;font-size:13px;padding:8px 10px"
                   [value]="allHastaStr()"
                   (change)="allHastaStr.set($any($event.target).value)" />
            <button (click)="allAplicarCustom()"
                    [disabled]="!allDesdeStr() || !allHastaStr()"
                    [style.opacity]="!allDesdeStr() || !allHastaStr() ? '0.4' : '1'"
                    style="padding:8px 14px;border-radius:9px;background:rgb(99 102 241/0.1);
                           border:1px solid rgb(99 102 241/0.3);color:#818cf8;cursor:pointer;
                           font-size:12px;font-weight:600;white-space:nowrap">
              Aplicar
            </button>
          </div>
        </div>

        <!-- Lista -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          @if (cargandoAll()) {
            <div class="text-center py-10 text-zinc-500">
              <i class="pi pi-spinner pi-spin text-2xl block mb-2"></i>
            </div>
          } @else if (todosMovsPaginados().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-8">Sin movimientos en este periodo</p>
          } @else {
            @for (m of todosMovsPaginados(); track m.id) {
              <div class="mov-row">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="mov-dot"
                       [style]="m.tipo === 'COMPRA' ? 'background:rgb(239 68 68/0.1)' : 'background:rgb(34 197 94/0.1)'">
                    <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                       [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-semibold leading-5">
                      {{ m.clientes?.nombre ?? '–' }}
                    </p>
                    <p class="text-zinc-400 text-xs leading-5">{{ m.descripcion || m.tipo }}</p>
                    <p class="text-zinc-600 text-xs">{{ m.fecha | date:'dd/MM/yyyy · HH:mm' }}</p>
                  </div>
                </div>
                <div class="text-right ml-3 shrink-0">
                  <p class="font-bold text-sm"
                     [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'">
                    {{ m.tipo === 'COMPRA' ? '+' : '−' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                  </p>
                  <span class="chip-tipo" [class]="m.tipo === 'COMPRA' ? 'chip-compra' : 'chip-abono'">
                    {{ m.tipo }}
                  </span>
                </div>
              </div>
            }
            @if (allTotalPags() > 1) {
              <div class="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800">
                <button class="pag-btn" (click)="allPrevPag()" [disabled]="allPag() === 1">← Anterior</button>
                <span class="text-zinc-500 text-xs">Pág {{ allPag() }} de {{ allTotalPags() }}</span>
                <button class="pag-btn" (click)="allNextPag()" [disabled]="allPag() >= allTotalPags()">Siguiente →</button>
              </div>
            }
          }
        </div>
      </div>

      @if (cargando()) {
        <div class="flex justify-center py-20">
          <p-progressSpinner strokeWidth="3" [style]="{width:'48px',height:'48px'}" />
        </div>
      } @else if (cliente()) {

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Total compras</p>
            <p class="text-xl font-bold text-white mt-1">
              {{ cliente()!.total_compras | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Total abonos</p>
            <p class="text-xl font-bold text-green-400 mt-1">
              {{ cliente()!.total_abonos | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
          <div class="rounded-2xl p-5 border-2"
               [class]="(cliente()!.saldo) > 0
                 ? 'bg-amber-950/20 border-amber-500/30'
                 : 'bg-green-950/20 border-green-500/30'">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Saldo actual</p>
            <p class="text-xl font-bold mt-1"
               [class]="cliente()!.saldo > 0 ? 'text-amber-400' : 'text-green-400'">
              {{ cliente()!.saldo | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-3 mb-6 flex-wrap">
          <button pButton label="Registrar compra" icon="pi pi-shopping-cart"
                  (click)="abrirCompra()"></button>
          <button pButton label="Registrar abono" icon="pi pi-check-circle"
                  severity="success" (click)="abrirAbono()"></button>
        </div>

        <!-- Toque rápido -->
        @if (productos().length > 0) {
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-6 h-6 bg-yellow-500/15 rounded-lg flex items-center justify-center">
                <i class="pi pi-bolt text-yellow-400 text-xs"></i>
              </span>
              <h3 class="text-white font-semibold text-sm">Toque rápido</h3>
              <span class="text-zinc-500 text-xs ml-1">· 1 unidad por tap</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              @for (p of productos(); track p.id) {
                <button (click)="compraRapida(p)" [disabled]="procesando()"
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
            Historial
            <span class="text-zinc-600 text-xs font-normal ml-1">· pasa el cursor para eliminar</span>
          </h3>

          @if (movimientos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-8">Sin movimientos</p>
          } @else {
            @for (m of movimientos(); track m.id) {
              <div class="mov-row">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="mov-dot"
                       [style]="m.tipo === 'COMPRA' ? 'background:rgb(239 68 68/0.1)' : 'background:rgb(34 197 94/0.1)'">
                    <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                       [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    @if (tieneItems(m.descripcion)) {
                      @for (item of parseItems(m.descripcion); track item) {
                        <p class="text-white text-sm leading-5">{{ item }}</p>
                      }
                    } @else {
                      <p class="text-white text-sm">{{ m.descripcion || m.tipo }}</p>
                    }
                    <p class="text-zinc-500 text-xs mt-0.5">{{ m.fecha | date:'dd/MM/yyyy · HH:mm' }}</p>
                    @if (m.foto_url) {
                      <a [href]="m.foto_url" target="_blank"
                         class="text-indigo-400 text-xs hover:underline mt-0.5 inline-block">
                        <i class="pi pi-image mr-1"></i>Ver foto
                      </a>
                    }
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-3 shrink-0">
                  <div class="text-right">
                    <p [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"
                       class="font-bold text-sm">
                      {{ m.tipo === 'COMPRA' ? '+' : '−' }}{{ m.monto | currency:'COP':'$ ':'1.0-0' }}
                    </p>
                    <span class="text-zinc-600 text-xs">{{ m.tipo }}</span>
                  </div>
                  <button class="delete-btn" (click)="eliminarMovimiento(m)" title="Eliminar">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- ─── DIALOG COMPRA ─── -->
    <p-dialog [(visible)]="mostrarCompra" header="Registrar Compra"
              [modal]="true" [style]="{width:'460px'}" [draggable]="false">
      <div class="flex flex-col gap-4 pt-2">
        <div>
          <p class="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
            Productos y cantidades
          </p>
          @if (productos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-4">Sin productos. Agrégalos en Productos.</p>
          } @else {
            <div class="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              @for (p of productos(); track p.id) {
                <div class="product-row" [class.activo]="(carrito()[p.id] ?? 0) > 0">
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-medium truncate">{{ p.nombre }}</p>
                    <p class="text-indigo-400 text-xs">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <button class="qty-btn" (click)="cambiarQty(p.id, -1)"
                            [disabled]="(carrito()[p.id] ?? 0) === 0">−</button>
                    <span class="text-white font-bold text-sm w-5 text-center">
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

        <div class="flex items-center justify-between py-3 border-t border-zinc-800">
          <span class="text-zinc-400 font-medium">Total</span>
          <span class="text-2xl font-bold"
                [class]="totalCarrito() > 0 ? 'text-white' : 'text-zinc-600'">
            {{ totalCarrito() | currency:'COP':'$ ':'1.0-0' }}
          </span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-calendar text-zinc-400"></i> Fecha y hora de la compra
          </label>
          <input type="datetime-local" class="fecha-input" [(ngModel)]="fechaCompra" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-image text-zinc-400"></i> Foto evidencia
            <span class="text-zinc-600 font-normal text-xs">(cámara o galería)</span>
          </label>
          <input type="file" accept="image/*" class="file-input" (change)="onFotoCompra($event)" />
          @if (fotoCompra) {
            <p class="text-green-400 text-xs flex items-center gap-1">
              <i class="pi pi-check"></i> {{ fotoCompra.name }}
            </p>
          }
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarCompra()"></button>
        <button pButton label="Registrar compra"
                [disabled]="totalCarrito() === 0" [loading]="guardando()"
                (click)="registrarCompra()"></button>
      </ng-template>
    </p-dialog>

    <!-- ─── DIALOG ABONO ─── -->
    <p-dialog [(visible)]="mostrarAbono" header="Registrar Abono / Pago"
              [modal]="true" [style]="{width:'400px'}" [draggable]="false">
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
            <i class="pi pi-calendar text-zinc-400"></i> Fecha y hora del abono
          </label>
          <input type="datetime-local" class="fecha-input" [(ngModel)]="fechaAbono"
                 [ngModelOptions]="{standalone: true}" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-image text-zinc-400"></i> Foto evidencia
            <span class="text-zinc-600 font-normal text-xs">(cámara o galería)</span>
          </label>
          <input type="file" accept="image/*" class="file-input" (change)="onFotoAbono($event)" />
          @if (fotoAbono) {
            <p class="text-green-400 text-xs flex items-center gap-1">
              <i class="pi pi-check"></i> {{ fotoAbono.name }}
            </p>
          }
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
export class RegistrarMovimientoComponent implements OnInit {
  private clientesSvc = inject(ClientesService);
  private movSvc = inject(MovimientosService);
  private productosSvc = inject(ProductosService);
  private storageSvc = inject(StorageService);
  private auth = inject(AuthService);
  private invSvc = inject(InventarioService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  cargando = signal(false);
  guardando = signal(false);
  procesando = signal(false);
  cargandoAll = signal(false);
  mostrarCompra = false;
  mostrarAbono = false;

  todosClientes = signal<SaldoCliente[]>([]);
  clienteIdSeleccionado: string | null = null;
  cliente = signal<SaldoCliente | null>(null);
  movimientos = signal<Movimiento[]>([]);
  todosMovs = signal<MovimientoConCliente[]>([]);
  productos = signal<Producto[]>([]);
  carrito = signal<Partial<Record<string, number>>>({});

  // ── Filtro fecha todos los movimientos ──
  readonly ALL_PAGE_SIZE = 15;
  allOffset = signal(0);
  allCustom = signal(false);
  allDesdeStr = signal('');
  allHastaStr = signal('');
  allPag = signal(1);

  private getAllLunes(offset = 0): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() + diff + offset * 7);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
  }

  allSemIni = computed(() => this.getAllLunes(this.allOffset()));
  allSemFin = computed(() => {
    const fin = new Date(this.allSemIni());
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return fin;
  });
  allSemLabel = computed(() => {
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    if (this.allCustom()) return this.allDesdeStr() && this.allHastaStr()
      ? `${this.allDesdeStr()} – ${this.allHastaStr()}` : 'Rango personalizado';
    const ini = this.allSemIni(), fin = this.allSemFin();
    if (this.allOffset() === 0) return `Esta semana · ${fmt(ini)} – ${fmt(fin)}`;
    if (this.allOffset() === -1) return `Sem. pasada · ${fmt(ini)} – ${fmt(fin)}`;
    return `${fmt(ini)} – ${fmt(fin)}`;
  });
  allDesde = computed(() => this.allCustom() && this.allDesdeStr()
    ? new Date(this.allDesdeStr() + 'T00:00:00') : this.allSemIni());
  allHasta = computed(() => this.allCustom() && this.allHastaStr()
    ? new Date(this.allHastaStr() + 'T23:59:59') : this.allSemFin());

  todosMovsFiltrados = computed(() => {
    const desde = this.allDesde(), hasta = this.allHasta();
    return this.todosMovs().filter(m => {
      const f = new Date(m.fecha);
      return f >= desde && f <= hasta;
    });
  });
  todosMovsPaginados = computed(() => {
    const start = (this.allPag() - 1) * this.ALL_PAGE_SIZE;
    return this.todosMovsFiltrados().slice(start, start + this.ALL_PAGE_SIZE);
  });
  allTotalPags = computed(() =>
    Math.max(1, Math.ceil(this.todosMovsFiltrados().length / this.ALL_PAGE_SIZE))
  );

  fotoCompra: File | null = null;
  fotoAbono: File | null = null;
  fechaCompra = '';
  fechaAbono = '';

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

  formAbono = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['']
  });

  async ngOnInit() {
    const [clientes, productos] = await Promise.all([
      this.clientesSvc.getAll(),
      this.productosSvc.getAll()
    ]);
    this.todosClientes.set(clientes);
    this.productos.set(productos);
    this.cargarTodosMovs();
  }

  async cargarTodosMovs() {
    this.cargandoAll.set(true);
    try {
      this.todosMovs.set(await this.movSvc.getAllConClientes());
    } finally {
      this.cargandoAll.set(false);
    }
  }

  allSemAnterior() { this.allOffset.update(v => v - 1); this.allCustom.set(false); this.allPag.set(1); }
  allSemSiguiente() { this.allOffset.update(v => v + 1); this.allCustom.set(false); this.allPag.set(1); }
  allSemActual() { this.allOffset.set(0); this.allCustom.set(false); this.allDesdeStr.set(''); this.allHastaStr.set(''); this.allPag.set(1); }
  allAplicarCustom() { if (!this.allDesdeStr() || !this.allHastaStr()) return; this.allCustom.set(true); this.allPag.set(1); }
  allPrevPag() { if (this.allPag() > 1) this.allPag.update(v => v - 1); }
  allNextPag() { if (this.allPag() < this.allTotalPags()) this.allPag.update(v => v + 1); }

  async onClienteChange(id: string) {
    const cliente = this.todosClientes().find(c => c.id === id) ?? null;
    this.cliente.set(cliente);
    if (!cliente) return;
    this.cargando.set(true);
    try {
      this.movimientos.set(await this.movSvc.getByCliente(id));
    } finally {
      this.cargando.set(false);
    }
  }

  private fechaDefault(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private async recargar() {
    const id = this.cliente()?.id;
    if (!id) return;
    const [clientes, movs, todos] = await Promise.all([
      this.clientesSvc.getAll(),
      this.movSvc.getByCliente(id),
      this.movSvc.getAllConClientes()
    ]);
    this.todosClientes.set(clientes);
    const clienteActualizado = clientes.find(c => c.id === id) ?? null;
    this.cliente.set(clienteActualizado);
    this.movimientos.set(movs);
    this.todosMovs.set(todos);
  }

  tieneItems(desc?: string): boolean { return !!desc && desc.includes(','); }
  parseItems(desc: string | undefined): string[] {
    if (!desc) return [];
    return desc.split(', ').filter(Boolean);
  }

  abrirCompra() {
    this.carrito.set({});
    this.fotoCompra = null;
    this.fechaCompra = this.fechaDefault();
    this.mostrarCompra = true;
  }
  cerrarCompra() { this.mostrarCompra = false; this.carrito.set({}); this.fotoCompra = null; }

  abrirAbono() {
    this.formAbono.reset();
    this.fotoAbono = null;
    this.fechaAbono = this.fechaDefault();
    this.mostrarAbono = true;
  }
  cerrarAbono() { this.mostrarAbono = false; this.formAbono.reset(); this.fotoAbono = null; }

  estaTrackeado(p: Producto): boolean {
    return !!(p.precio_costo && p.precio_costo > 0);
  }

  cambiarQty(productoId: string, delta: number) {
    if (delta > 0) {
      const prod = this.productos().find(p => p.id === productoId);
      if (prod && this.estaTrackeado(prod)) {
        const enCarrito = this.carrito()[productoId] ?? 0;
        if (enCarrito >= (prod.stock_actual ?? 0)) {
          this.msg.add({ severity: 'warn', summary: 'Sin stock', detail: `${prod.nombre} no tiene más unidades disponibles` });
          return;
        }
      }
    }
    const actual = this.carrito()[productoId] ?? 0;
    this.carrito.update(c => ({ ...c, [productoId]: Math.max(0, actual + delta) }));
  }

  onFotoCompra(event: Event) {
    this.fotoCompra = (event.target as HTMLInputElement).files?.[0] ?? null;
  }
  onFotoAbono(event: Event) {
    this.fotoAbono = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  async compraRapida(producto: Producto) {
    if (this.estaTrackeado(producto) && (producto.stock_actual ?? 0) <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Sin stock', detail: `${producto.nombre} no tiene unidades disponibles` });
      return;
    }
    const id = this.cliente()?.id;
    const userId = this.auth.user()?.id;
    if (!id || !userId) return;
    this.procesando.set(true);
    try {
      const movResult = await this.movSvc.compraRapida(id, producto.nombre, producto.precio, userId);
      if (this.estaTrackeado(producto)) {
        await this.invSvc.registrarSalida({ producto_id: producto.id, cantidad: 1, precio_unit: producto.precio, fecha: new Date().toISOString(), cliente_id: id, movimiento_id: movResult?.id });
      }
      this.msg.add({ severity: 'success', summary: producto.nombre, detail: 'Registrado' });
      await this.recargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.procesando.set(false);
    }
  }

  async registrarCompra() {
    if (this.totalCarrito() === 0) return;
    const id = this.cliente()?.id;
    if (!id) return;
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoCompra) foto_url = await this.storageSvc.subirEvidencia(id, this.fotoCompra);
      const fecha = this.fechaCompra ? new Date(this.fechaCompra).toISOString() : new Date().toISOString();
      const movData = await this.movSvc.registrar({
        cliente_id: id,
        tipo: 'COMPRA',
        monto: this.totalCarrito(),
        descripcion: this.descripcionCompra(),
        foto_url,
        created_by: this.auth.user()?.id,
        fecha
      });
      const salidas = this.productos()
        .filter(p => (this.carrito()[p.id] ?? 0) > 0 && this.estaTrackeado(p))
        .map(p => this.invSvc.registrarSalida({ producto_id: p.id, cantidad: this.carrito()[p.id] ?? 0, precio_unit: p.precio, fecha, cliente_id: id, movimiento_id: movData?.id }));
      await Promise.allSettled(salidas);
      this.msg.add({ severity: 'success', summary: 'Compra registrada', detail: this.descripcionCompra() });
      this.cerrarCompra();
      await this.recargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }

  async registrarAbono() {
    if (this.formAbono.invalid) return;
    const id = this.cliente()?.id;
    if (!id) return;
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoAbono) foto_url = await this.storageSvc.subirEvidencia(id, this.fotoAbono);
      await this.movSvc.registrar({
        cliente_id: id,
        tipo: 'ABONO',
        monto: this.formAbono.value.monto!,
        descripcion: this.formAbono.value.descripcion ?? undefined,
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: this.fechaAbono ? new Date(this.fechaAbono).toISOString() : new Date().toISOString()
      });
      this.msg.add({ severity: 'success', summary: 'Abono registrado' });
      this.cerrarAbono();
      await this.recargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }

  eliminarMovimiento(m: Movimiento) {
    this.confirm.confirm({
      message: `¿Eliminar este ${m.tipo.toLowerCase()} de ${m.monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}?`,
      header: 'Eliminar movimiento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.invSvc.eliminarSalidasPorMovimiento(m.id);
          await this.movSvc.eliminar(m.id);
          this.msg.add({ severity: 'info', summary: 'Eliminado' });
          await this.recargar();
        } catch {
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      }
    });
  }
}

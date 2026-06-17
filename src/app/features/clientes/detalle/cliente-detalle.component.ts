import { Component, inject, signal, computed, OnInit, input, effect } from '@angular/core';

const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ClientesService } from '../../../core/services/clientes.service';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ProductosService } from '../../../core/services/productos.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { PdfService } from '../../../core/services/pdf.service';
import { AuditService, AuditEntry } from '../../../core/services/audit.service';
import { SaldoCliente } from '../../../core/models/cliente.model';
import { Movimiento } from '../../../core/models/movimiento.model';
import { Producto } from '../../../core/models/producto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, ReactiveFormsModule, FormsModule,
            ButtonModule, DialogModule, InputTextModule, InputNumberModule,
            TextareaModule, ProgressSpinnerModule],
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
      font-size: 11px; transition: all 0.15s; flex-shrink: 0;
      opacity: 0;
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
      font-size: 14px; outline: none; transition: border-color 0.2s;
      color-scheme: dark;
    }
    .fecha-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgb(99 102 241/0.2); }
  `],
  template: `
    <div class="p-5 md:p-8 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/admin/clientes"
           class="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center
                  text-zinc-400 hover:text-white transition-colors border border-zinc-700 shrink-0">
          <i class="pi pi-arrow-left text-sm"></i>
        </a>
        @if (cliente()?.foto_url) {
          <img [src]="cliente()!.foto_url!" alt=""
               style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #6366f1">
        } @else {
          <div style="width:48px;height:48px;border-radius:50%;background:#27272a;flex-shrink:0;
                      display:flex;align-items:center;justify-content:center;border:2px solid #3f3f46;
                      color:#a1a1aa;font-weight:700;font-size:18px">
            {{ cliente()?.nombre?.charAt(0)?.toUpperCase() }}
          </div>
        }
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
               [class]="limiteExcedido()
                 ? 'bg-red-950/20 border-red-500/40'
                 : (cliente()?.saldo ?? 0) > 0
                   ? 'bg-amber-950/20 border-amber-500/30'
                   : 'bg-green-950/20 border-green-500/30'">
            <p class="text-zinc-500 text-xs uppercase tracking-widest font-medium">Saldo actual</p>
            <p class="text-xl font-bold mt-1"
               [class]="limiteExcedido() ? 'text-red-400' : (cliente()?.saldo ?? 0) > 0 ? 'text-amber-400' : 'text-green-400'">
              {{ cliente()?.saldo | currency:'COP':'$ ':'1.0-0' }}
            </p>
            @if (cliente()?.limite_credito) {
              <p class="text-zinc-600 text-xs mt-0.5">
                Límite: {{ cliente()!.limite_credito | currency:'COP':'$ ':'1.0-0' }}
                @if (limiteExcedido()) {
                  <span class="text-red-400 font-bold ml-1">⚠ Excedido</span>
                }
              </p>
            }
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-3 mb-4 flex-wrap">
          <button pButton label="Registrar compra" icon="pi pi-shopping-cart"
                  (click)="abrirCompra()"></button>
          <button pButton label="Registrar abono" icon="pi pi-check-circle"
                  severity="success" (click)="abrirAbono()"></button>
        </div>

        <!-- Factura mensual -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <i class="pi pi-file-pdf text-indigo-400 text-xs"></i>
            </span>
            <h3 class="text-white font-semibold text-sm">Factura mensual</h3>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <select [(ngModel)]="mesFiltro"
                    class="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
              @for (m of mesesOpciones; track m.valor) {
                <option [value]="m.valor">{{ m.label }}</option>
              }
            </select>
            <select [(ngModel)]="anioFiltro"
                    class="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
              @for (a of aniosOpciones; track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
            <button pButton label="Descargar PDF" icon="pi pi-download" severity="secondary"
                    [loading]="generandoPdf()"
                    (click)="descargarFactura()"></button>
            <button pButton label="Enviar WhatsApp" icon="pi pi-whatsapp"
                    [loading]="enviandoPdf()"
                    [disabled]="!cliente()?.telefono"
                    [title]="!cliente()?.telefono ? 'El cliente no tiene teléfono registrado' : ''"
                    (click)="enviarWhatsApp()"></button>
          </div>
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
                <button (click)="compraRapida(p)"
                        [disabled]="procesando() || (estaTrackeado(p) && (p.stock_actual ?? 0) <= 0)"
                        class="flex flex-col items-center justify-center bg-zinc-800
                               hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500
                               rounded-xl p-3 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        [class.border-orange-500]="p.en_promocion" [class.bg-orange-950]="p.en_promocion">
                  <span class="text-white font-medium text-sm">{{ p.nombre }}</span>
                  @if (p.en_promocion && p.precio_promocion) {
                    <span class="text-orange-300 text-xs font-bold mt-0.5">
                      🏷 {{ p.precio_promocion | currency:'COP':'$ ':'1.0-0' }}
                    </span>
                    <span class="text-zinc-500 text-xs line-through">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
                  } @else {
                    <span class="text-indigo-300 text-xs mt-0.5">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
                  }
                  @if (estaTrackeado(p)) {
                    <span class="text-xs mt-0.5 font-semibold"
                          [style]="(p.stock_actual ?? 0) > 0 ? 'color:#4ade80' : 'color:#f87171'">
                      {{ (p.stock_actual ?? 0) > 0 ? (p.stock_actual + ' disp.') : 'Sin stock' }}
                    </span>
                  }
                </button>
              }
            </div>
          </div>
        }

        <!-- Historial de cambios -->
        @if (auditLog().length > 0) {
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5">
            <h3 class="text-white font-semibold text-sm flex items-center gap-2 mb-3">
              <span class="w-6 h-6 bg-zinc-700/40 rounded-lg flex items-center justify-center">
                <i class="pi pi-shield text-zinc-400 text-xs"></i>
              </span>
              Historial de cambios
            </h3>
            <div class="space-y-1.5">
              @for (e of auditLog(); track e.id) {
                <div class="flex items-center gap-3 text-xs py-1.5 border-b border-zinc-800 last:border-0">
                  <span class="px-2 py-0.5 rounded font-semibold"
                        [style]="e.accion === 'CREAR' ? 'background:rgb(34 197 94/0.1);color:#4ade80'
                               : e.accion === 'EDITAR' ? 'background:rgb(99 102 241/0.1);color:#818cf8'
                               : 'background:rgb(239 68 68/0.1);color:#f87171'">
                    {{ e.accion }}
                  </span>
                  <span class="text-zinc-500">{{ e.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Historial -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 class="text-white font-semibold text-sm flex items-center gap-2">
              <span class="w-6 h-6 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                <i class="pi pi-history text-indigo-400 text-xs"></i>
              </span>
              Historial
              <span class="text-zinc-600 text-xs font-normal">· pasa el cursor para eliminar</span>
            </h3>
            <div class="flex items-center gap-2">
              <button (click)="mesHistorialAnterior()"
                      class="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                             flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <i class="pi pi-chevron-left text-xs"></i>
              </button>
              <span class="text-white text-sm font-semibold min-w-36 text-center">
                {{ nombreMesHistorial() }} {{ mesHistorial().anio }}
              </span>
              <button (click)="mesHistorialSiguiente()" [disabled]="esMesActualHistorial()"
                      class="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors"
                      [class]="esMesActualHistorial()
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-white'">
                <i class="pi pi-chevron-right text-xs"></i>
              </button>
            </div>
          </div>

          @if (movimientosMes().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-8">Sin movimientos en este mes</p>
          } @else {
            @for (m of movimientosMes(); track m.id) {
              <div class="mov-row">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="mov-dot"
                       [style]="m.tipo === 'COMPRA' ? 'background:rgb(239 68 68/0.1)' : 'background:rgb(34 197 94/0.1)'">
                    <i [class]="m.tipo === 'COMPRA' ? 'pi pi-shopping-cart' : 'pi pi-check'"
                       [style]="m.tipo === 'COMPRA' ? 'color:#f87171' : 'color:#4ade80'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <!-- Descripción detallada: cada item en su línea -->
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
                  <button class="delete-btn" (click)="eliminarMovimiento(m)"
                          title="Eliminar">
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

        <!-- Productos + cantidades -->
        <div>
          <p class="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
            Productos y cantidades
          </p>
          @if (productos().length === 0) {
            <p class="text-zinc-500 text-sm text-center py-4">
              Sin productos. Agrégalos en Productos.
            </p>
          } @else {
            <div class="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              @for (p of productos(); track p.id) {
                <div class="product-row" [class.activo]="(carrito()[p.id] ?? 0) > 0">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <p class="text-white text-sm font-medium truncate">{{ p.nombre }}</p>
                      @if (p.en_promocion) {
                        <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:rgb(249 115 22/0.15);color:#fb923c">OFERTA</span>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      @if (p.en_promocion && p.precio_promocion) {
                        <p class="text-orange-400 text-xs font-bold">{{ p.precio_promocion | currency:'COP':'$ ':'1.0-0' }}</p>
                        <p class="text-zinc-600 text-xs line-through">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</p>
                      } @else {
                        <p class="text-indigo-400 text-xs">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</p>
                      }
                      @if (estaTrackeado(p)) {
                        <span class="text-xs font-semibold"
                              [style]="(p.stock_actual ?? 0) > 0 ? 'color:#4ade80' : 'color:#f87171'">
                          · {{ (p.stock_actual ?? 0) > 0 ? (p.stock_actual + ' en stock') : 'Sin stock' }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <button class="qty-btn" (click)="cambiarQty(p.id, -1)"
                            [disabled]="(carrito()[p.id] ?? 0) === 0">−</button>
                    <span class="text-white font-bold text-sm w-5 text-center">
                      {{ carrito()[p.id] ?? 0 }}
                    </span>
                    <button class="qty-btn" (click)="cambiarQty(p.id, 1)"
                            [disabled]="estaTrackeado(p) && (carrito()[p.id] ?? 0) >= (p.stock_actual ?? 0)">+</button>
                    @if ((carrito()[p.id] ?? 0) > 0) {
                      <span class="text-zinc-400 text-xs w-20 text-right">
                        = {{ precioEfectivo(p) * (carrito()[p.id] ?? 0) | currency:'COP':'$ ':'1.0-0' }}
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
          <span class="text-zinc-400 font-medium">Total</span>
          <span class="text-2xl font-bold"
                [class]="totalCarrito() > 0 ? 'text-white' : 'text-zinc-600'">
            {{ totalCarrito() | currency:'COP':'$ ':'1.0-0' }}
          </span>
        </div>

        <!-- Fecha manual -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-calendar text-zinc-400"></i>
            Fecha y hora de la compra
          </label>
          <input type="datetime-local" class="fecha-input" [(ngModel)]="fechaCompra" />
        </div>

        <!-- Foto (cámara + galería) -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-image text-zinc-400"></i>
            Foto evidencia
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
                [disabled]="totalCarrito() === 0"
                [loading]="guardando()"
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

        <!-- Fecha manual -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-calendar text-zinc-400"></i>
            Fecha y hora del abono
          </label>
          <input type="datetime-local" class="fecha-input" [(ngModel)]="fechaAbono"
                 [ngModelOptions]="{standalone: true}" />
        </div>

        <!-- Foto (cámara + galería) -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-image text-zinc-400"></i>
            Foto evidencia
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
export class ClienteDetalleComponent implements OnInit {
  id = input.required<string>();

  private clientesSvc = inject(ClientesService);
  private movSvc = inject(MovimientosService);
  private productosSvc = inject(ProductosService);
  private storageSvc = inject(StorageService);
  private auth = inject(AuthService);
  private invSvc = inject(InventarioService);
  private pdfSvc = inject(PdfService);
  private auditSvc = inject(AuditService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  cargando = signal(true);
  guardando = signal(false);
  procesando = signal(false);
  generandoPdf = signal(false);
  enviandoPdf = signal(false);
  mostrarAbono = false;
  mostrarCompra = false;

  readonly mesesOpciones = [
    { valor: 1, label: 'Enero' }, { valor: 2, label: 'Febrero' },
    { valor: 3, label: 'Marzo' }, { valor: 4, label: 'Abril' },
    { valor: 5, label: 'Mayo' }, { valor: 6, label: 'Junio' },
    { valor: 7, label: 'Julio' }, { valor: 8, label: 'Agosto' },
    { valor: 9, label: 'Septiembre' }, { valor: 10, label: 'Octubre' },
    { valor: 11, label: 'Noviembre' }, { valor: 12, label: 'Diciembre' },
  ];
  readonly aniosOpciones = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  mesFiltro = new Date().getMonth() + 1;
  anioFiltro = new Date().getFullYear();

  fotoCompra: File | null = null;
  fotoAbono: File | null = null;
  fechaCompra = '';
  fechaAbono = '';

  cliente = signal<SaldoCliente | null>(null);
  movimientos = signal<Movimiento[]>([]);
  productos = signal<Producto[]>([]);
  auditLog = signal<AuditEntry[]>([]);

  limiteExcedido = computed(() => {
    const c = this.cliente();
    return !!(c?.limite_credito && c.saldo > c.limite_credito);
  });

  mesHistorial = signal({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });
  nombreMesHistorial = computed(() => MESES_NOMBRE[this.mesHistorial().mes - 1]);
  esMesActualHistorial = computed(() => {
    const hoy = new Date();
    return this.mesHistorial().mes === hoy.getMonth() + 1 && this.mesHistorial().anio === hoy.getFullYear();
  });
  movimientosMes = computed(() => {
    const { mes, anio } = this.mesHistorial();
    return this.movimientos().filter(m => {
      const f = new Date(m.fecha);
      return f.getMonth() + 1 === mes && f.getFullYear() === anio;
    });
  });

  mesHistorialAnterior() {
    const { mes, anio } = this.mesHistorial();
    this.mesHistorial.set(mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio });
  }
  mesHistorialSiguiente() {
    if (this.esMesActualHistorial()) return;
    const { mes, anio } = this.mesHistorial();
    this.mesHistorial.set(mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio });
  }
  carrito = signal<Partial<Record<string, number>>>({});

  precioEfectivo(p: Producto): number {
    return p.en_promocion && p.precio_promocion ? p.precio_promocion : p.precio;
  }

  totalCarrito = computed(() =>
    this.productos().reduce((sum, p) =>
      sum + this.precioEfectivo(p) * (this.carrito()[p.id] ?? 0), 0)
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

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) this.cargar(id);
    });
  }

  async ngOnInit() {}

  private fechaDefault(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async cargar(id: string) {
    this.cargando.set(true);
    try {
      const [cliente, movs, prods, audit] = await Promise.all([
        this.clientesSvc.getById(id),
        this.movSvc.getByCliente(id),
        this.productosSvc.getAll(),
        this.auditSvc.getByRegistro('clientes', id).catch(() => [])
      ]);
      this.cliente.set(cliente);
      this.movimientos.set(movs);
      this.productos.set(prods);
      this.auditLog.set(audit);
    } finally {
      this.cargando.set(false);
    }
  }

  tieneItems(desc?: string): boolean {
    return !!desc && desc.includes(',');
  }

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

  cerrarCompra() {
    this.mostrarCompra = false;
    this.carrito.set({});
    this.fotoCompra = null;
  }

  abrirAbono() {
    this.formAbono.reset();
    this.fotoAbono = null;
    this.fechaAbono = this.fechaDefault();
    this.mostrarAbono = true;
  }

  cerrarAbono() {
    this.mostrarAbono = false;
    this.formAbono.reset();
    this.fotoAbono = null;
  }

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
    const input = event.target as HTMLInputElement;
    this.fotoCompra = input.files?.[0] ?? null;
  }

  onFotoAbono(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fotoAbono = input.files?.[0] ?? null;
  }

  async compraRapida(producto: Producto) {
    if (this.estaTrackeado(producto) && (producto.stock_actual ?? 0) <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Sin stock', detail: `${producto.nombre} no tiene unidades disponibles` });
      return;
    }
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.procesando.set(true);
    try {
      const precioFinal = this.precioEfectivo(producto);
      const movResult = await this.movSvc.compraRapida(this.id(), producto.nombre, precioFinal, userId);
      if (this.estaTrackeado(producto)) {
        await this.invSvc.registrarSalida({ producto_id: producto.id, cantidad: 1, precio_unit: precioFinal, fecha: new Date().toISOString(), cliente_id: this.id(), movimiento_id: movResult?.id });
      }
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
    const c = this.cliente();
    if (c?.limite_credito && (c.saldo + this.totalCarrito()) > c.limite_credito) {
      this.msg.add({
        severity: 'warn',
        summary: 'Límite de crédito',
        detail: `Esta compra superaría el límite de ${c.limite_credito.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`
      });
    }
    this.guardando.set(true);
    try {
      let foto_url: string | undefined;
      if (this.fotoCompra) {
        foto_url = await this.storageSvc.subirEvidencia(this.id(), this.fotoCompra);
      }
      const fecha = this.fechaCompra ? new Date(this.fechaCompra).toISOString() : new Date().toISOString();
      const movData = await this.movSvc.registrar({
        cliente_id: this.id(),
        tipo: 'COMPRA',
        monto: this.totalCarrito(),
        descripcion: this.descripcionCompra(),
        foto_url,
        created_by: this.auth.user()?.id,
        fecha
      });
      const salidas = this.productos()
        .filter(p => (this.carrito()[p.id] ?? 0) > 0 && this.estaTrackeado(p))
        .map(p => this.invSvc.registrarSalida({ producto_id: p.id, cantidad: this.carrito()[p.id] ?? 0, precio_unit: this.precioEfectivo(p), fecha, cliente_id: this.id(), movimiento_id: movData?.id }));
      await Promise.allSettled(salidas);
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
      if (this.fotoAbono) {
        foto_url = await this.storageSvc.subirEvidencia(this.id(), this.fotoAbono);
      }
      await this.movSvc.registrar({
        cliente_id: this.id(),
        tipo: 'ABONO',
        monto: this.formAbono.value.monto!,
        descripcion: this.formAbono.value.descripcion ?? undefined,
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: this.fechaAbono ? new Date(this.fechaAbono).toISOString() : new Date().toISOString()
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

  async descargarFactura() {
    const cliente = this.cliente();
    if (!cliente) return;
    this.generandoPdf.set(true);
    try {
      const blob = await this.pdfSvc.generarFactura(cliente, this.movimientos(), this.mesFiltro, this.anioFiltro);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_${cliente.nombre.replace(/\s+/g, '_')}_${this.anioFiltro}-${String(this.mesFiltro).padStart(2,'0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF' });
    } finally {
      this.generandoPdf.set(false);
    }
  }

  async enviarWhatsApp() {
    const cliente = this.cliente();
    if (!cliente?.telefono) return;
    this.enviandoPdf.set(true);
    try {
      const blob = await this.pdfSvc.generarFactura(cliente, this.movimientos(), this.mesFiltro, this.anioFiltro);
      const urlPdf = await this.storageSvc.subirFactura(cliente.id, blob, this.mesFiltro, this.anioFiltro);
      const telefono = cliente.telefono.replace(/\D/g, '');

      const movsMes = this.movimientos().filter(m => {
        const f = new Date(m.fecha);
        return f.getMonth() + 1 === this.mesFiltro && f.getFullYear() === this.anioFiltro;
      });
      const deuda = movsMes.filter(m => m.tipo === 'COMPRA').reduce((s, m) => s + m.monto, 0);
      const abono = movsMes.filter(m => m.tipo === 'ABONO').reduce((s, m) => s + m.monto, 0);
      const total = deuda - abono;
      const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

      const texto = encodeURIComponent(
`Hola ${cliente.nombre}! Pasó por aquí para mandar tu factura jeje

Total de compra: ${fmt(deuda)}
Abono: ${fmt(abono)}

Total a pagar: ${fmt(total)}

Detalle:
${urlPdf}

Nequi o llave: 3014030939
Gracias!`
      );
      window.open(`https://wa.me/${telefono}?text=${texto}`, '_blank');
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar la factura' });
    } finally {
      this.enviandoPdf.set(false);
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
          await this.cargar(this.id());
        } catch {
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      }
    });
  }
}

import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventarioService, MovimientoInv } from '../../core/services/inventario.service';
import { ClientesService } from '../../core/services/clientes.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { AuthService } from '../../core/services/auth.service';
import { Producto } from '../../core/models/producto.model';
import { SaldoCliente } from '../../core/models/cliente.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

type Tab = 'productos' | 'movimientos' | 'ganancias';
type ModoMov = 'ENTRADA' | 'SALIDA';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule,
    ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    SelectModule, TextareaModule],
  styles: [`
    .tab-btn {
      padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 600;
      border: 1px solid #27272a; background: transparent; color: #71717a;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .tab-btn:hover { color: #e4e4e7; border-color: #3f3f46; }
    .tab-activo { background: rgb(99 102 241/0.15); border-color: #6366f1; color: white; }
    .prod-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 12px; border: 1px solid #27272a;
      background: #111; transition: border-color 0.15s;
    }
    .prod-row:hover { border-color: #3f3f46; }
    .mov-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #1f1f23;
    }
    .mov-row:last-child { border-bottom: none; }
    .mov-dot {
      width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 13px;
    }
    .stock-badge {
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 20px; white-space: nowrap;
    }
    .stock-ok   { background: rgb(34 197 94/0.12); color: #4ade80; }
    .stock-low  { background: rgb(234 179 8/0.12); color: #fbbf24; }
    .stock-zero { background: rgb(239 68 68/0.12); color: #f87171; }
    .modo-btn {
      flex: 1; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
      border: 1px solid #27272a; background: #111; color: #71717a;
      cursor: pointer; transition: all 0.15s;
    }
    .modo-entrada { background: rgb(99 102 241/0.15); border-color: #6366f1; color: white; }
    .modo-salida  { background: rgb(34 197 94/0.12); border-color: #22c55e; color: #4ade80; }
    .stat-inv {
      background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .stat-inv:hover { border-color: #3f3f46; box-shadow: 0 4px 20px rgb(0 0 0/0.2); }
    .gain-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 12px; background: #111; border: 1px solid #1f1f23;
    }
    .fecha-input {
      width: 100%; background: #09090b; border: 1px solid #3f3f46;
      color: white; border-radius: 8px; padding: 10px 12px;
      font-size: 14px; outline: none; transition: border-color 0.2s; color-scheme: dark;
    }
    .fecha-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgb(99 102 241/0.2); }
    /* ── Dialog extras ── */
    .chip-sel {
      padding: 5px 13px; border-radius: 20px; font-size: 12px; font-weight: 600;
      border: 1px solid #27272a; background: transparent; color: #71717a;
      cursor: pointer; transition: all 0.15s;
    }
    .chip-sel:hover { border-color: #3f3f46; color: #e4e4e7; }
    .chip-activo { background: rgb(99 102 241/0.15) !important; border-color: #6366f1 !important; color: white !important; }
    .qty-btn {
      width: 38px; height: 38px; border-radius: 9px; border: 1px solid #3f3f46;
      background: #111; color: #a1a1aa; cursor: pointer; transition: all 0.15s;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; flex-shrink: 0;
    }
    .qty-btn:hover { border-color: #6366f1; color: white; background: rgb(99 102 241/0.1); }
    .prod-preview {
      background: #0d0d10; border: 1px solid #27272a; border-radius: 12px; padding: 12px 14px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      transition: border-color 0.2s;
    }
    .total-preview {
      background: rgb(99 102 241/0.06); border: 1px solid rgb(99 102 241/0.18);
      border-radius: 10px; padding: 14px 16px;
    }
    .client-hint {
      border-left: 3px solid #6366f1; border-radius: 0 8px 8px 0;
      background: rgb(99 102 241/0.06); padding: 8px 12px; margin-top: 6px;
    }
    .dialog-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    }
  `],
  template: `
    <div class="p-5 md:p-8 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Inventario</h2>
          <p class="text-zinc-500 text-sm mt-0.5">Control de stock y ganancias</p>
        </div>
        @if (tab() === 'productos') {
          <button pButton label="Nuevo producto" icon="pi pi-plus"
                  (click)="abrirFormProducto()"></button>
        }
        @if (tab() === 'movimientos') {
          <button pButton [label]="modoMov() === 'ENTRADA' ? 'Registrar entrada' : 'Registrar salida'"
                  [icon]="modoMov() === 'ENTRADA' ? 'pi pi-arrow-down' : 'pi pi-arrow-up'"
                  [severity]="modoMov() === 'ENTRADA' ? 'primary' : 'success'"
                  (click)="abrirFormMov()"></button>
        }
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button class="tab-btn" [class.tab-activo]="tab() === 'productos'"
                (click)="tab.set('productos')">
          <i class="pi pi-box mr-1.5"></i>Productos
        </button>
        <button class="tab-btn" [class.tab-activo]="tab() === 'movimientos'"
                (click)="tab.set('movimientos')">
          <i class="pi pi-arrows-v mr-1.5"></i>Movimientos
        </button>
        <button class="tab-btn" [class.tab-activo]="tab() === 'ganancias'"
                (click)="tab.set('ganancias')">
          <i class="pi pi-chart-bar mr-1.5"></i>Ganancias
        </button>
      </div>

      @if (cargando()) {
        <div class="text-center py-20 text-zinc-500">
          <i class="pi pi-spinner pi-spin text-3xl block mb-3"></i>
        </div>
      } @else {

        <!-- ── TAB: PRODUCTOS ── -->
        @if (tab() === 'productos') {
          @if (productos().length === 0) {
            <div class="card-dark text-center py-16">
              <i class="pi pi-box text-4xl text-zinc-700 block mb-3"></i>
              <p class="text-zinc-400">Sin productos. Agrega uno.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              @for (p of productos(); track p.id) {
                <div class="prod-row" [style]="!p.activo ? 'opacity:0.5' : ''">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                      <p class="text-white font-semibold">{{ p.nombre }}</p>
                      <span class="stock-badge"
                            [class]="(p.stock_actual ?? 0) > 3 ? 'stock-ok' : (p.stock_actual ?? 0) > 0 ? 'stock-low' : 'stock-zero'">
                        {{ p.stock_actual ?? 0 }} {{ p.unidad ?? 'u' }}{{ (p.stock_actual ?? 0) !== 1 ? 's' : '' }}
                      </span>
                      @if (!p.activo) {
                        <span style="font-size:11px; color:#52525b">Inactivo</span>
                      }
                    </div>
                    <div class="flex gap-3 text-xs flex-wrap">
                      @if (p.unidad === 'paquete' && (p.unidades_por_paquete ?? 1) > 1) {
                        <span class="text-zinc-500">Paquete: <span class="text-white">{{ p.precio_costo | currency:'COP':'$ ':'1.0-0' }}</span></span>
                        <span class="text-zinc-500">C/u: <span class="text-amber-300">{{ costoUnitario(p) | currency:'COP':'$ ':'1.0-0' }}</span></span>
                      } @else {
                        <span class="text-zinc-500">Costo: <span class="text-white">{{ p.precio_costo | currency:'COP':'$ ':'1.0-0' }}</span></span>
                      }
                      <span class="text-zinc-500">Venta: <span class="text-green-400">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span></span>
                      <span class="text-zinc-500">Margen: <span class="text-indigo-400">{{ margen(p) }}</span></span>
                    </div>
                  </div>
                  <div class="flex gap-2 ml-4 shrink-0">
                    <button pButton icon="pi pi-pencil" severity="secondary" size="small"
                            (click)="abrirEditarProducto(p)"></button>
                    <button pButton [icon]="p.activo ? 'pi pi-ban' : 'pi pi-check'" size="small"
                            [severity]="p.activo ? 'danger' : 'success'"
                            (click)="toggleActivo(p)"></button>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- ── TAB: MOVIMIENTOS ── -->
        @if (tab() === 'movimientos') {
          <div class="flex gap-2 mb-5">
            <button class="modo-btn" [class.modo-entrada]="modoMov() === 'ENTRADA'"
                    (click)="cambiarModo('ENTRADA')">
              <i class="pi pi-arrow-down mr-1.5"></i>Entradas (compras)
            </button>
            <button class="modo-btn" [class.modo-salida]="modoMov() === 'SALIDA'"
                    (click)="cambiarModo('SALIDA')">
              <i class="pi pi-arrow-up mr-1.5"></i>Salidas (ventas)
            </button>
          </div>

          <div class="card-dark">
            <p class="text-white font-semibold text-sm mb-4">
              Historial de {{ modoMov() === 'ENTRADA' ? 'entradas' : 'salidas' }}
            </p>
            @if (movimientosFiltrados().length === 0) {
              <p class="text-zinc-500 text-sm text-center py-8">Sin registros</p>
            } @else {
              @for (m of movimientosFiltrados(); track m.id) {
                <div class="mov-row">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="mov-dot"
                         [style]="m.tipo === 'ENTRADA' ? 'background:rgb(99 102 241/0.12)' : 'background:rgb(34 197 94/0.1)'">
                      <i [class]="m.tipo === 'ENTRADA' ? 'pi pi-arrow-down' : 'pi pi-arrow-up'"
                         [style]="m.tipo === 'ENTRADA' ? 'color:#818cf8' : 'color:#4ade80'"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-white text-sm font-medium">
                        {{ m.productos?.nombre ?? '–' }}
                        <span class="text-zinc-500 font-normal">× {{ m.cantidad }}</span>
                      </p>
                      <p class="text-zinc-500 text-xs">
                        {{ m.fecha | date:'dd/MM/yyyy · HH:mm' }}
                        @if (m.nota) { · {{ m.nota }} }
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 ml-3 shrink-0">
                    <div class="text-right">
                      <p class="font-bold text-sm"
                         [style]="m.tipo === 'ENTRADA' ? 'color:#818cf8' : 'color:#4ade80'">
                        {{ (m.cantidad * m.precio_unit) | currency:'COP':'$ ':'1.0-0' }}
                      </p>
                      <p class="text-zinc-600 text-xs">{{ m.precio_unit | currency:'COP':'$ ':'1.0-0' }} c/u</p>
                    </div>
                    <button (click)="eliminarMov(m)"
                            style="width:28px;height:28px;border-radius:8px;background:transparent;border:1px solid #3f3f46;
                                   color:#71717a;cursor:pointer;display:flex;align-items:center;justify-content:center;
                                   font-size:11px;transition:all 0.15s"
                            onmouseover="this.style.background='rgb(239 68 68/0.1)';this.style.borderColor='#ef4444';this.style.color='#f87171'"
                            onmouseout="this.style.background='transparent';this.style.borderColor='#3f3f46';this.style.color='#71717a'">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- ── TAB: GANANCIAS ── -->
        @if (tab() === 'ganancias') {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="stat-inv">
              <p class="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-1">Total invertido</p>
              <p class="text-xl font-bold text-indigo-400">{{ stats().invertido | currency:'COP':'$ ':'1.0-0' }}</p>
              <p class="text-zinc-600 text-xs mt-0.5">En mercancía comprada</p>
            </div>
            <div class="stat-inv">
              <p class="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-1">Total vendido</p>
              <p class="text-xl font-bold text-green-400">{{ stats().vendido | currency:'COP':'$ ':'1.0-0' }}</p>
              <p class="text-zinc-600 text-xs mt-0.5">En ventas registradas</p>
            </div>
            <div class="stat-inv"
                 [style]="stats().ganancia >= 0 ? 'border-color:rgb(34 197 94/0.3)' : 'border-color:rgb(239 68 68/0.3)'">
              <p class="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-1">Ganancia neta</p>
              <p class="text-xl font-bold"
                 [style]="stats().ganancia >= 0 ? 'color:#4ade80' : 'color:#f87171'">
                {{ stats().ganancia | currency:'COP':'$ ':'1.0-0' }}
              </p>
              <p class="text-zinc-600 text-xs mt-0.5">Vendido − Invertido</p>
            </div>
          </div>

          <div class="card-dark">
            <p class="text-white font-semibold text-sm mb-4">Desglose por producto</p>
            @if (statsProductos().length === 0) {
              <p class="text-zinc-500 text-sm text-center py-6">Sin datos aún</p>
            } @else {
              <div class="flex flex-col gap-2">
                @for (s of statsProductos(); track s.nombre) {
                  <div class="gain-row">
                    <div class="min-w-0 flex-1">
                      <p class="text-white font-medium text-sm">{{ s.nombre }}</p>
                      <div class="flex gap-3 text-xs mt-0.5">
                        <span class="text-zinc-500">Inv: <span class="text-indigo-400">{{ s.invertido | currency:'COP':'$ ':'1.0-0' }}</span></span>
                        <span class="text-zinc-500">Vta: <span class="text-green-400">{{ s.vendido | currency:'COP':'$ ':'1.0-0' }}</span></span>
                      </div>
                    </div>
                    <div class="text-right shrink-0 ml-4">
                      <p class="font-bold text-sm" [style]="s.ganancia >= 0 ? 'color:#4ade80' : 'color:#f87171'">
                        {{ s.ganancia | currency:'COP':'$ ':'1.0-0' }}
                      </p>
                      <p class="text-zinc-600 text-xs">ganancia</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- ════════════════════════════════════════
         DIALOG: NUEVO / EDITAR PRODUCTO
    ════════════════════════════════════════ -->
    <p-dialog [(visible)]="mostrarFormProd" [modal]="true"
              [style]="{width:'440px'}" [draggable]="false" [closable]="true">

      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <div class="dialog-icon" style="background:rgb(99 102 241/0.12)">
            <i class="pi pi-box" style="color:#818cf8"></i>
          </div>
          <div>
            <p class="text-white font-semibold text-base leading-none">
              {{ prodEdit ? 'Editar producto' : 'Nuevo producto' }}
            </p>
            <p class="text-zinc-500 text-xs mt-0.5">
              {{ prodEdit ? 'Modifica los datos del catálogo' : 'Se agrega al catálogo unificado' }}
            </p>
          </div>
        </div>
      </ng-template>

      <form [formGroup]="formProd" class="flex flex-col gap-4 pt-1">

        <!-- Nombre -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Nombre *</label>
          <input pInputText formControlName="nombre"
                 placeholder="Ej: Oreo, Coca-Cola, Snickers..." class="w-full" />
        </div>

        <!-- Precios -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
              <i class="pi pi-arrow-down text-indigo-400" style="font-size:10px"></i> Precio costo *
            </label>
            <p-inputnumber formControlName="precio_costo" mode="currency" currency="COP"
                           locale="es-CO" placeholder="$ 0" styleClass="w-full" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
              <i class="pi pi-arrow-up text-green-400" style="font-size:10px"></i> Precio venta *
            </label>
            <p-inputnumber formControlName="precio" mode="currency" currency="COP"
                           locale="es-CO" placeholder="$ 0" styleClass="w-full" />
          </div>
        </div>

        <!-- Preview de costo/ganancia -->
        @if (formProd.value.precio_costo && formProd.value.precio) {
          <div style="background:linear-gradient(135deg,rgb(99 102 241/0.08),rgb(99 102 241/0.04));
                      border:1px solid rgb(99 102 241/0.2); border-radius:12px; padding:14px 16px;">

            @if (formProd.value.unidad === 'paquete' && (formProd.value.unidades_por_paquete ?? 0) > 1) {
              <!-- Desglose paquete -->
              <div class="flex flex-col gap-2 text-xs mb-3 pb-3" style="border-bottom:1px solid rgb(99 102 241/0.15)">
                <div class="flex justify-between">
                  <span class="text-zinc-500">Costo paquete</span>
                  <span class="text-white font-semibold">{{ formProd.value.precio_costo | currency:'COP':'$ ':'1.0-0' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-500">Unidades en paquete</span>
                  <span class="text-white font-semibold">{{ formProd.value.unidades_por_paquete }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-amber-400 font-semibold">Costo por unidad</span>
                  <span class="text-amber-300 font-bold">{{ costoUnitarioForm() | currency:'COP':'$ ':'1.0-0' }}</span>
                </div>
              </div>
            }

            <div class="flex items-center justify-between">
              <span class="text-zinc-400 text-xs">Ganancia por unidad</span>
              <span class="text-indigo-300 text-xs font-bold">{{ margenForm() }} markup</span>
            </div>
            <p class="text-indigo-200 font-bold text-lg mt-0.5">
              {{ (formProd.value.precio - costoUnitarioForm()) | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
        }

        <!-- Unidad -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Tipo de entrada</label>
          <div class="flex gap-2">
            @for (u of unidades; track u) {
              <button type="button" class="chip-sel" style="flex:1; text-align:center"
                      [class.chip-activo]="formProd.value.unidad === u"
                      (click)="formProd.patchValue({unidad: u, unidades_por_paquete: u === 'unidad' ? null : formProd.value.unidades_por_paquete})">
                <i [class]="u === 'paquete' ? 'pi pi-th-large mr-1' : 'pi pi-box mr-1'"></i>{{ u | titlecase }}
              </button>
            }
          </div>
        </div>

        <!-- Unidades por paquete (solo si paquete) -->
        @if (formProd.value.unidad === 'paquete') {
          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
              <i class="pi pi-list text-zinc-400"></i>
              Unidades por paquete *
            </label>
            <p-inputnumber formControlName="unidades_por_paquete"
                           placeholder="Ej: 12" [min]="1" styleClass="w-full" />
            <p class="text-zinc-600 text-xs">Cuántas unidades trae cada paquete que compras</p>
          </div>
        }

      </form>

      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarFormProd()"></button>
        <button pButton [label]="prodEdit ? 'Guardar cambios' : 'Crear producto'"
                [loading]="guardando()" [disabled]="formProd.invalid"
                (click)="guardarProducto()"></button>
      </ng-template>
    </p-dialog>

    <!-- ════════════════════════════════════════
         DIALOG: REGISTRAR MOVIMIENTO
    ════════════════════════════════════════ -->
    <p-dialog [(visible)]="mostrarFormMov" [modal]="true"
              [style]="{width:'460px'}" [draggable]="false" [closable]="true">

      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <div class="dialog-icon"
               [style]="modoMov()==='ENTRADA'
                 ? 'background:rgb(99 102 241/0.12)'
                 : 'background:rgb(34 197 94/0.1)'">
            <i [class]="modoMov()==='ENTRADA' ? 'pi pi-arrow-down' : 'pi pi-arrow-up'"
               [style]="modoMov()==='ENTRADA' ? 'color:#818cf8' : 'color:#4ade80'"></i>
          </div>
          <div>
            <p class="text-white font-semibold text-base leading-none">
              {{ modoMov() === 'ENTRADA' ? 'Registrar entrada' : 'Registrar salida' }}
            </p>
            <p class="text-zinc-500 text-xs mt-0.5">
              {{ modoMov() === 'ENTRADA' ? 'Mercancía que ingresa al stock' : 'Mercancía que sale del stock' }}
            </p>
          </div>
        </div>
      </ng-template>

      <form [formGroup]="formMov" class="flex flex-col gap-4 pt-1">

        <!-- Modo toggle dentro del dialog -->
        <div class="flex gap-2">
          <button type="button" class="modo-btn" [class.modo-entrada]="modoMov() === 'ENTRADA'"
                  (click)="cambiarModo('ENTRADA')">
            <i class="pi pi-arrow-down mr-1.5"></i>Entrada
          </button>
          <button type="button" class="modo-btn" [class.modo-salida]="modoMov() === 'SALIDA'"
                  (click)="cambiarModo('SALIDA')">
            <i class="pi pi-arrow-up mr-1.5"></i>Salida
          </button>
        </div>

        <!-- Producto selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Producto *</label>
          <p-select [options]="productosActivos()" formControlName="producto_id"
                    optionLabel="nombre" optionValue="id"
                    placeholder="Seleccionar producto" styleClass="w-full"
                    [filter]="true" filterBy="nombre"
                    (onChange)="onProductoMov($event.value)" />
        </div>

        <!-- Product preview card -->
        @if (productoMovActual()) {
          <div class="prod-preview">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-white font-semibold text-sm">{{ productoMovActual()!.nombre }}</p>
                @if (productoMovActual()!.en_promocion) {
                  <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:rgb(249 115 22/0.15);color:#fb923c">OFERTA</span>
                }
              </div>
              <div class="flex gap-3 text-xs mt-1">
                <span class="text-zinc-500">Costo:
                  <span class="text-white">{{ productoMovActual()!.precio_costo | currency:'COP':'$ ':'1.0-0' }}</span>
                </span>
                @if (productoMovActual()!.en_promocion && productoMovActual()!.precio_promocion) {
                  <span class="text-zinc-500">Oferta: <span class="text-orange-400 font-bold">{{ productoMovActual()!.precio_promocion | currency:'COP':'$ ':'1.0-0' }}</span></span>
                  <span class="text-zinc-500">Normal: <span class="text-zinc-400 line-through">{{ productoMovActual()!.precio | currency:'COP':'$ ':'1.0-0' }}</span></span>
                } @else {
                  <span class="text-zinc-500">Venta:
                    <span class="text-green-400">{{ productoMovActual()!.precio | currency:'COP':'$ ':'1.0-0' }}</span>
                  </span>
                }
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="stock-badge"
                    [class]="(productoMovActual()!.stock_actual ?? 0) > 3 ? 'stock-ok'
                           : (productoMovActual()!.stock_actual ?? 0) > 0 ? 'stock-low' : 'stock-zero'">
                {{ productoMovActual()!.stock_actual ?? 0 }} en stock
              </span>
            </div>
          </div>
        }

        <!-- Cantidad con +/- -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Cantidad *</label>
          <div class="flex items-center gap-2">
            <button type="button" class="qty-btn" (click)="decCantidad()">−</button>
            <p-inputnumber formControlName="cantidad" placeholder="0" styleClass="flex-1"
                           [min]="1" [showButtons]="false" />
            <button type="button" class="qty-btn" (click)="incCantidad()">+</button>
          </div>
        </div>

        <!-- Precio unitario -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">
            Precio {{ modoMov() === 'ENTRADA' ? 'costo' : 'venta' }} unitario *
          </label>
          <p-inputnumber formControlName="precio_unit" mode="currency" currency="COP"
                         locale="es-CO" placeholder="$ 0" styleClass="w-full" />
        </div>

        <!-- Total -->
        @if (formMov.value.cantidad && formMov.value.precio_unit) {
          <div class="total-preview">
            <p class="text-zinc-400 text-xs mb-0.5">Total del movimiento</p>
            <p class="font-bold text-xl"
               [style]="modoMov()==='ENTRADA' ? 'color:#818cf8' : 'color:#4ade80'">
              {{ (formMov.value.cantidad * formMov.value.precio_unit) | currency:'COP':'$ ':'1.0-0' }}
            </p>
            <p class="text-zinc-600 text-xs mt-0.5">
              {{ formMov.value.cantidad }} × {{ formMov.value.precio_unit | currency:'COP':'$ ':'1.0-0' }}
            </p>
          </div>
        }

        <!-- Solo SALIDA: cargar a cliente -->
        @if (modoMov() === 'SALIDA') {
          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
              <i class="pi pi-user text-zinc-400"></i>
              Cargar a cliente
              <span class="text-zinc-600 font-normal text-xs ml-1">(opcional)</span>
            </label>
            <p-select [options]="clientes()" [ngModel]="clienteIdMov"
                      (ngModelChange)="clienteIdMov = $event"
                      [ngModelOptions]="{standalone: true}"
                      optionLabel="nombre" optionValue="id"
                      placeholder="Sin cliente — solo descuenta stock"
                      styleClass="w-full" [filter]="true" filterBy="nombre"
                      [showClear]="true" />
            @if (clienteIdMov) {
              <div class="client-hint">
                <p class="text-indigo-300 text-xs font-medium">
                  <i class="pi pi-info-circle mr-1"></i>
                  Se registrará una COMPRA en la deuda del cliente.
                </p>
              </div>
            }
          </div>
        }

        <!-- Fecha -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            <i class="pi pi-calendar text-zinc-400"></i> Fecha y hora
          </label>
          <input type="datetime-local" class="fecha-input" [(ngModel)]="fechaMov"
                 [ngModelOptions]="{standalone: true}" />
        </div>

        <!-- Nota -->
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Nota</label>
          <input pInputText formControlName="nota" placeholder="Opcional..." class="w-full" />
        </div>

      </form>

      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarFormMov()"></button>
        <button pButton
                [label]="modoMov() === 'ENTRADA' ? 'Registrar entrada' : 'Registrar salida'"
                [severity]="modoMov() === 'ENTRADA' ? 'primary' : 'success'"
                [loading]="guardando()" [disabled]="formMov.invalid"
                (click)="guardarMov()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class InventarioComponent implements OnInit {
  private svc = inject(InventarioService);
  private clientesSvc = inject(ClientesService);
  private movsSvc = inject(MovimientosService);
  private auth = inject(AuthService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  tab = signal<Tab>('productos');
  modoMov = signal<ModoMov>('ENTRADA');
  cargando = signal(true);
  guardando = signal(false);
  mostrarFormProd = false;
  mostrarFormMov = false;
  prodEdit: Producto | null = null;
  fechaMov = '';
  clienteIdMov: string | null = null;
  productoMovActual = signal<Producto | null>(null);

  productos = signal<Producto[]>([]);
  movimientos = signal<MovimientoInv[]>([]);
  clientes = signal<SaldoCliente[]>([]);

  unidades = ['unidad', 'paquete'];

  productosActivos = computed(() => this.productos().filter(p => p.activo));

  movimientosFiltrados = computed(() =>
    this.movimientos().filter(m => m.tipo === this.modoMov())
  );

  stats = computed(() => {
    const movs = this.movimientos();
    const invertido = movs.filter(m => m.tipo === 'ENTRADA')
      .reduce((s, m) => s + m.cantidad * m.precio_unit, 0);
    const vendido = movs.filter(m => m.tipo === 'SALIDA')
      .reduce((s, m) => s + m.cantidad * m.precio_unit, 0);
    return { invertido, vendido, ganancia: vendido - invertido };
  });

  statsProductos = computed(() => {
    const movs = this.movimientos();
    const map = new Map<string, { nombre: string; invertido: number; vendido: number }>();
    movs.forEach(m => {
      const nombre = m.productos?.nombre ?? m.producto_id;
      const entry = map.get(m.producto_id) ?? { nombre, invertido: 0, vendido: 0 };
      const total = m.cantidad * m.precio_unit;
      if (m.tipo === 'ENTRADA') entry.invertido += total;
      else entry.vendido += total;
      map.set(m.producto_id, entry);
    });
    return Array.from(map.values())
      .map(e => ({ ...e, ganancia: e.vendido - e.invertido }))
      .sort((a, b) => b.ganancia - a.ganancia);
  });

  formProd = this.fb.group({
    nombre: ['', Validators.required],
    precio_costo: [null as number | null, [Validators.required, Validators.min(1)]],
    precio: [null as number | null, [Validators.required, Validators.min(1)]],
    unidad: ['unidad'],
    unidades_por_paquete: [null as number | null]
  });

  formMov = this.fb.group({
    producto_id: ['', Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(1)]],
    precio_unit: [null as number | null, [Validators.required, Validators.min(0)]],
    nota: ['']
  });

  async ngOnInit() {
    await this.cargar();
    this.clientesSvc.getAll().then(c => this.clientes.set(c)).catch(() => { });
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [prods, movs] = await Promise.all([
        this.svc.getProductos(),
        this.svc.getMovimientos()
      ]);
      this.productos.set(prods);
      this.movimientos.set(movs);
    } finally {
      this.cargando.set(false);
    }
  }

  costoUnitario(p: Producto): number {
    if (!p.precio_costo) return 0;
    if (p.unidad === 'paquete' && (p.unidades_por_paquete ?? 1) > 1) {
      return p.precio_costo / p.unidades_por_paquete!;
    }
    return p.precio_costo;
  }

  margen(p: Producto): string {
    const cu = this.costoUnitario(p);
    if (!cu) return '0%';
    return ((p.precio - cu) / cu * 100).toFixed(0) + '%';
  }

  costoUnitarioForm(): number {
    const c = this.formProd.value.precio_costo ?? 0;
    const upq = this.formProd.value.unidades_por_paquete;
    if (this.formProd.value.unidad === 'paquete' && upq && upq > 1) return c / upq;
    return c;
  }

  margenForm(): string {
    const cu = this.costoUnitarioForm();
    const v = this.formProd.value.precio ?? 0;
    if (!cu) return '0%';
    return ((v - cu) / cu * 100).toFixed(0) + '%';
  }

  private fechaDefault(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Productos ──
  abrirFormProducto() {
    this.prodEdit = null;
    this.formProd.reset({ unidad: 'unidad' });
    this.mostrarFormProd = true;
  }

  abrirEditarProducto(p: Producto) {
    this.prodEdit = p;
    this.formProd.patchValue({
      nombre: p.nombre,
      precio_costo: p.precio_costo ?? null,
      precio: p.precio,
      unidad: p.unidad ?? 'unidad',
      unidades_por_paquete: p.unidades_por_paquete ?? null
    });
    this.mostrarFormProd = true;
  }

  cerrarFormProd() { this.mostrarFormProd = false; this.prodEdit = null; this.formProd.reset(); }

  async guardarProducto() {
    if (this.formProd.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.formProd.value;
      const esPaquete = val.unidad === 'paquete';
      const data = {
        nombre: val.nombre!,
        precio_costo: val.precio_costo!,
        precio: val.precio!,
        unidad: val.unidad || 'unidad',
        unidades_por_paquete: esPaquete ? (val.unidades_por_paquete ?? null) : null
      };
      if (this.prodEdit) await this.svc.editarProducto(this.prodEdit.id, data);
      else await this.svc.crearProducto(data);
      this.msg.add({ severity: 'success', summary: this.prodEdit ? 'Actualizado' : 'Creado' });
      this.cerrarFormProd();
      await this.cargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.guardando.set(false);
    }
  }

  async toggleActivo(p: Producto) {
    try {
      await this.svc.toggleActivo(p.id, !p.activo);
      await this.cargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error' });
    }
  }

  // ── Movimientos ──
  abrirFormMov() {
    this.formMov.reset();
    this.fechaMov = this.fechaDefault();
    this.clienteIdMov = null;
    this.productoMovActual.set(null);
    this.mostrarFormMov = true;
  }

  cerrarFormMov() {
    this.mostrarFormMov = false;
    this.formMov.reset();
    this.clienteIdMov = null;
    this.productoMovActual.set(null);
  }

  cambiarModo(modo: ModoMov) {
    this.modoMov.set(modo);
    const prodId = this.formMov.value.producto_id;
    if (prodId) this.onProductoMov(prodId);
  }

  incCantidad() {
    this.formMov.patchValue({ cantidad: (this.formMov.value.cantidad ?? 0) + 1 });
  }

  decCantidad() {
    const c = this.formMov.value.cantidad ?? 0;
    if (c > 1) this.formMov.patchValue({ cantidad: c - 1 });
  }

  precioEfectivo(p: Producto): number {
    return p.en_promocion && p.precio_promocion ? p.precio_promocion : p.precio;
  }

  onProductoMov(id: string) {
    const prod = this.productos().find(p => p.id === id);
    if (!prod) return;
    this.productoMovActual.set(prod);
    const precio = this.modoMov() === 'ENTRADA' ? (prod.precio_costo ?? prod.precio) : this.precioEfectivo(prod);
    this.formMov.patchValue({ precio_unit: precio });
  }

  async guardarMov() {
    if (this.formMov.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.formMov.value;
      const data = {
        producto_id: val.producto_id!,
        cantidad: val.cantidad!,
        precio_unit: val.precio_unit!,
        nota: val.nota || undefined,
        fecha: this.fechaMov ? new Date(this.fechaMov).toISOString() : new Date().toISOString()
      };

      if (this.modoMov() === 'ENTRADA') {
        await this.svc.registrarEntrada(data);
      } else {
        await this.svc.registrarSalida(data);
        if (this.clienteIdMov) {
          const prod = this.productoMovActual();
          await this.movsSvc.registrar({
            cliente_id: this.clienteIdMov,
            tipo: 'COMPRA',
            descripcion: `${prod?.nombre ?? 'Producto'} ×${data.cantidad}`,
            monto: data.cantidad * data.precio_unit,
            created_by: this.auth.user()?.id,
            fecha: data.fecha
          });
        }
      }

      this.msg.add({
        severity: 'success',
        summary: this.modoMov() === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada',
        detail: this.clienteIdMov ? 'Cargado a la deuda del cliente' : undefined
      });
      this.cerrarFormMov();
      await this.cargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }

  eliminarMov(m: MovimientoInv) {
    this.confirm.confirm({
      message: `¿Eliminar este movimiento? Se ajustará el stock.`,
      header: 'Eliminar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.svc.eliminarMovimiento(m.id, m.tipo, m.producto_id, m.cantidad);
          this.msg.add({ severity: 'info', summary: 'Eliminado' });
          await this.cargar();
        } catch {
          this.msg.add({ severity: 'error', summary: 'Error' });
        }
      }
    });
  }
}

import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ClientesService } from '../../../core/services/clientes.service';
import { StorageService } from '../../../core/services/storage.service';
import { SaldoCliente, Cliente } from '../../../core/models/cliente.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-clientes-lista',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, CurrencyPipe,
    InputTextModule, InputNumberModule, ButtonModule, DialogModule],
  template: `
    <div class="p-5 md:p-8 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Clientes</h2>
          <p class="text-zinc-500 text-sm mt-0.5">{{ totalClientes() }} registrados</p>
        </div>
        <div class="flex gap-2">
          <button pButton icon="pi pi-file-excel" label="Excel"
                  severity="secondary" size="small"
                  (click)="exportarExcel()"></button>
          <button pButton icon="pi pi-whatsapp" label="Cobro masivo"
                  severity="success" size="small"
                  title="Enviar recordatorio de deuda por WhatsApp a todos los pendientes"
                  (click)="whatsappMasivo()"></button>
          <button pButton icon="pi pi-plus" label="Nuevo" (click)="abrirFormulario()"></button>
        </div>
      </div>

      <div class="mb-3">
        <input pInputText [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)"
               placeholder="Buscar cliente..." class="w-full" />
      </div>

      <div class="flex gap-2 mb-3">
        @for (f of filtros; track f.valor) {
          <button (click)="filtroEstado.set(f.valor)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  [class]="filtroEstado() === f.valor
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'">
            {{ f.label }}
          </button>
        }
      </div>

      <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button (click)="filtroMes.set(null)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0"
                [class]="filtroMes() === null
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'">
          Todo el año
        </button>
        @for (m of meses; track m.valor) {
          <button (click)="filtroMes.set(m.valor)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0"
                  [class]="filtroMes() === m.valor
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'">
            {{ m.label }}
          </button>
        }
      </div>

      @if (filtroMes() !== null) {
        <p class="text-zinc-500 text-xs mb-3">
          <i class="pi pi-info-circle mr-1"></i>
          Deuda de {{ meses[filtroMes()! - 1].label }} {{ anioActual }} (compras menos abonos del mes)
        </p>
      }

      @if (cargando()) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="card-dark animate-pulse h-16 bg-zinc-800"></div>
          }
        </div>
      } @else if (clientes().length === 0) {
        <div class="text-center py-16">
          <i class="pi pi-users text-4xl text-zinc-700 mb-3 block"></i>
          <p class="text-zinc-500">Sin clientes encontrados</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (c of clientes(); track c.id) {
            <div class="card-dark flex items-center justify-between hover:border-zinc-600
                        transition-colors cursor-pointer group"
                 [routerLink]="['/admin/clientes', c.id]">
              <div class="min-w-0 flex-1 flex items-center gap-3">
                @if (c.foto_url) {
                  <img [src]="c.foto_url" alt=""
                       style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #3f3f46">
                } @else {
                  <div style="width:36px;height:36px;border-radius:50%;background:#27272a;
                              display:flex;align-items:center;justify-content:center;flex-shrink:0;
                              color:#71717a;font-weight:700;font-size:14px">
                    {{ c.nombre.charAt(0).toUpperCase() }}
                  </div>
                }
                <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-white font-medium truncate">{{ c.nombre }}</p>
                  @if (!c.activo) {
                    <span class="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Inactivo</span>
                  }
                </div>
                <p class="text-zinc-500 text-sm">{{ c.telefono || 'Sin teléfono' }}</p>
                </div>
              </div>
              <div class="text-right ml-4 shrink-0">
                <p [class]="c.saldo > 0 ? 'text-amber-400' : 'text-green-400'"
                   class="font-bold text-sm">
                  {{ c.saldo | currency:'COP':'$ ':'1.0-0' }}
                </p>
                <p class="text-zinc-600 text-xs">{{ c.saldo > 0 ? 'Pendiente' : 'Al día' }}</p>
              </div>
              <div class="ml-4 flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                   (click)="$event.stopPropagation()">
                <button pButton icon="pi pi-pencil" severity="secondary" size="small"
                        (click)="editar(c)"></button>
                <button pButton icon="pi pi-ban" severity="danger" size="small"
                        (click)="desactivar(c)"></button>
              </div>
            </div>
          }
        </div>

        @if (filtroMes() === null && totalPags() > 1) {
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
            <button (click)="prevPag()" [disabled]="pagina() === 1"
                    class="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400
                           hover:text-white hover:border-zinc-600 transition-colors text-sm font-medium
                           disabled:opacity-30 disabled:cursor-not-allowed">
              ← Anterior
            </button>
            <span class="text-zinc-500 text-xs">
              Pág {{ pagina() }} de {{ totalPags() }} · {{ totalClientes() }} clientes
            </span>
            <button (click)="nextPag()" [disabled]="pagina() >= totalPags()"
                    class="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400
                           hover:text-white hover:border-zinc-600 transition-colors text-sm font-medium
                           disabled:opacity-30 disabled:cursor-not-allowed">
              Siguiente →
            </button>
          </div>
        }
      }
    </div>

    <p-dialog [(visible)]="mostrarForm"
              [header]="clienteEdit ? 'Editar cliente' : 'Nuevo cliente'"
              [modal]="true" [style]="{width:'400px'}" [draggable]="false">
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Nombre *</label>
          <input pInputText formControlName="nombre" placeholder="Nombre completo" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Teléfono</label>
          <input pInputText formControlName="telefono" placeholder="300 123 4567" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            Límite de crédito
            <span class="text-zinc-600 font-normal text-xs">(opcional)</span>
          </label>
          <p-inputnumber formControlName="limite_credito" mode="currency" currency="COP"
                         locale="es-CO" placeholder="Sin límite" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
            Foto de perfil
            <span class="text-zinc-600 font-normal text-xs">(opcional)</span>
          </label>
          <input type="file" accept="image/*"
                 style="font-size:13px;color:#71717a;width:100%"
                 (change)="onFotoPerfil($event)" />
          @if (fotoPerfil) {
            <p class="text-green-400 text-xs"><i class="pi pi-check mr-1"></i>{{ fotoPerfil.name }}</p>
          }
        </div>
      </form>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarForm()"></button>
        <button pButton label="Guardar" [loading]="guardando()" (click)="guardar()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class ClientesListaComponent implements OnInit {
  private svc = inject(ClientesService);
  private storageSvc = inject(StorageService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  fotoPerfil: File | null = null;

  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = false;
  busqueda = signal('');
  filtroEstado = signal<'todos' | 'al-dia' | 'pendiente'>('todos');
  filtroMes = signal<number | null>(null); // 1-12 o null = todo el año
  readonly anioActual = new Date().getFullYear();
  readonly meses = [
    { valor: 1, label: 'Ene' }, { valor: 2, label: 'Feb' }, { valor: 3, label: 'Mar' },
    { valor: 4, label: 'Abr' }, { valor: 5, label: 'May' }, { valor: 6, label: 'Jun' },
    { valor: 7, label: 'Jul' }, { valor: 8, label: 'Ago' }, { valor: 9, label: 'Sep' },
    { valor: 10, label: 'Oct' }, { valor: 11, label: 'Nov' }, { valor: 12, label: 'Dic' },
  ];
  clientes = signal<SaldoCliente[]>([]);
  clienteEdit: SaldoCliente | null = null;
  pagina = signal(1);
  totalClientes = signal(0);
  readonly PAGE_SIZE = 30;

  totalPags = computed(() => Math.max(1, Math.ceil(this.totalClientes() / this.PAGE_SIZE)));

  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filtros = [
    { valor: 'todos' as const, label: 'Todos' },
    { valor: 'pendiente' as const, label: 'Pendiente' },
    { valor: 'al-dia' as const, label: 'Al día' },
  ];

  form = this.fb.group({
    nombre: ['', Validators.required],
    telefono: [''],
    limite_credito: [null as number | null]
  });

  constructor() {
    effect(() => {
      this.busqueda();
      this.filtroEstado();
      this.filtroMes();
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.pagina.set(1);
        this.cargar();
      }, 300);
    });
  }

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const mes = this.filtroMes();
      const { data, count } = mes !== null
        ? await this.svc.getDeudaPorMes({
            anio: this.anioActual,
            mes,
            q: this.busqueda(),
            estado: this.filtroEstado()
          })
        : await this.svc.getPaginado({
            page: this.pagina(),
            pageSize: this.PAGE_SIZE,
            q: this.busqueda(),
            estado: this.filtroEstado()
          });
      this.clientes.set(data);
      this.totalClientes.set(count);
    } finally {
      this.cargando.set(false);
    }
  }

  prevPag() { if (this.pagina() > 1) { this.pagina.update(v => v - 1); this.cargar(); } }
  nextPag() { if (this.pagina() < this.totalPags()) { this.pagina.update(v => v + 1); this.cargar(); } }

  onFotoPerfil(e: Event) {
    this.fotoPerfil = (e.target as HTMLInputElement).files?.[0] ?? null;
  }

  abrirFormulario() {
    this.clienteEdit = null;
    this.fotoPerfil = null;
    this.form.reset();
    this.mostrarForm = true;
  }

  editar(c: SaldoCliente) {
    this.clienteEdit = c;
    this.fotoPerfil = null;
    this.form.patchValue({ nombre: c.nombre, telefono: c.telefono ?? '', limite_credito: c.limite_credito ?? null });
    this.mostrarForm = true;
  }

  cerrarForm() {
    this.mostrarForm = false;
    this.clienteEdit = null;
    this.fotoPerfil = null;
    this.form.reset();
  }

  async guardar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.form.value;
      let foto_url: string | undefined;
      const datos: Partial<Cliente> = {
        nombre: val.nombre!,
        telefono: val.telefono || undefined,
        limite_credito: val.limite_credito ?? null
      };
      if (this.clienteEdit) {
        if (this.fotoPerfil) foto_url = await this.storageSvc.subirFotoPerfil(this.clienteEdit.id, this.fotoPerfil);
        await this.svc.actualizar(this.clienteEdit.id, { ...datos, ...(foto_url ? { foto_url } : {}) });
        this.msg.add({ severity: 'success', summary: 'Actualizado', detail: this.clienteEdit.nombre });
      } else {
        const nuevo = await this.svc.crear({ ...datos, activo: true });
        if (this.fotoPerfil && nuevo?.id) {
          foto_url = await this.storageSvc.subirFotoPerfil(nuevo.id, this.fotoPerfil);
          await this.svc.actualizar(nuevo.id, { foto_url });
        }
        this.msg.add({ severity: 'success', summary: 'Creado', detail: val.nombre! });
      }
      this.cerrarForm();
      await this.cargar();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.guardando.set(false);
    }
  }

  async exportarExcel() {
    const { data } = await this.svc.getPaginado({ page: 1, pageSize: 9999 });
    const filas = data.map(c => ({
      Nombre: c.nombre,
      Teléfono: c.telefono ?? '',
      'Total Compras': c.total_compras,
      'Total Abonos': c.total_abonos,
      'Saldo Pendiente': c.saldo,
      Estado: c.activo ? 'Activo' : 'Inactivo'
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.msg.add({ severity: 'success', summary: 'Excel exportado', detail: `${filas.length} clientes` });
  }

  async whatsappMasivo() {
    const { data: pendientes } = await this.svc.getPaginado({ page: 1, pageSize: 200, estado: 'pendiente' });
    const conTel = pendientes.filter(c => c.telefono && c.activo);
    if (conTel.length === 0) {
      this.msg.add({ severity: 'info', summary: 'Sin pendientes con teléfono' });
      return;
    }
    const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    for (const c of conTel) {
      const tel = c.telefono!.replace(/\D/g, '');
      const texto = encodeURIComponent(
        `Hola ${c.nombre}! Un cordial saludo 👋
Tienes un saldo pendiente de ${fmt(c.saldo)}.

Si ya realizaste el pago, por favor ignora este mensaje.
¡Gracias! 🙏`);
      window.open(`https://wa.me/${tel}?text=${texto}`, '_blank');
      await new Promise(r => setTimeout(r, 500));
    }
    this.msg.add({ severity: 'success', summary: 'WhatsApp masivo', detail: `${conTel.length} mensajes abiertos` });
  }

  desactivar(c: SaldoCliente) {
    this.confirm.confirm({
      message: `¿Desactivar a ${c.nombre}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.svc.desactivar(c.id);
        this.msg.add({ severity: 'info', summary: 'Desactivado', detail: c.nombre });
        await this.cargar();
      }
    });
  }
}

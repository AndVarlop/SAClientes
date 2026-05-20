import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ClientesService } from '../../../core/services/clientes.service';
import { SaldoCliente, Cliente } from '../../../core/models/cliente.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-clientes-lista',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, CurrencyPipe,
            InputTextModule, ButtonModule, DialogModule],
  template: `
    <div class="p-5 md:p-8 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Clientes</h2>
          <p class="text-zinc-500 text-sm mt-0.5">{{ clientes().length }} registrados</p>
        </div>
        <button pButton icon="pi pi-plus" label="Nuevo" (click)="abrirFormulario()"></button>
      </div>

      <div class="mb-4">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="busqueda" placeholder="Buscar cliente..."
                 class="w-full" (input)="filtrar()" />
        </span>
      </div>

      @if (cargando()) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="card-dark animate-pulse h-16 bg-zinc-800"></div>
          }
        </div>
      } @else if (clientesFiltrados().length === 0) {
        <div class="text-center py-16">
          <i class="pi pi-users text-4xl text-zinc-700 mb-3 block"></i>
          <p class="text-zinc-500">Sin clientes encontrados</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (c of clientesFiltrados(); track c.id) {
            <div class="card-dark flex items-center justify-between hover:border-zinc-600
                        transition-colors cursor-pointer group"
                 [routerLink]="['/admin/clientes', c.id]">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-white font-medium truncate">{{ c.nombre }}</p>
                  @if (!c.activo) {
                    <span class="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Inactivo</span>
                  }
                </div>
                <p class="text-zinc-500 text-sm">{{ c.telefono || 'Sin teléfono' }}</p>
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
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = false;
  busqueda = '';
  clientes = signal<SaldoCliente[]>([]);
  clienteEdit: SaldoCliente | null = null;

  clientesFiltrados = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.clientes();
    return this.clientes().filter(c => c.nombre.toLowerCase().includes(q));
  });

  form = this.fb.group({
    nombre: ['', Validators.required],
    telefono: ['']
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.clientes.set(await this.svc.getAll());
    } finally {
      this.cargando.set(false);
    }
  }

  filtrar() {}

  abrirFormulario() {
    this.clienteEdit = null;
    this.form.reset();
    this.mostrarForm = true;
  }

  editar(c: SaldoCliente) {
    this.clienteEdit = c;
    this.form.patchValue({ nombre: c.nombre, telefono: c.telefono ?? '' });
    this.mostrarForm = true;
  }

  cerrarForm() {
    this.mostrarForm = false;
    this.clienteEdit = null;
    this.form.reset();
  }

  async guardar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.form.value;
      if (this.clienteEdit) {
        await this.svc.actualizar(this.clienteEdit.id, { nombre: val.nombre!, telefono: val.telefono ?? undefined });
        this.msg.add({ severity: 'success', summary: 'Actualizado', detail: this.clienteEdit.nombre });
      } else {
        await this.svc.crear({ nombre: val.nombre!, telefono: val.telefono ?? undefined, activo: true });
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

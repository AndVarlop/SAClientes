import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ProductosService } from '../../core/services/productos.service';
import { Producto } from '../../core/models/producto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe,
            ButtonModule, DialogModule, InputTextModule, InputNumberModule],
  template: `
    <div class="p-5 md:p-8 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Productos</h2>
          <p class="text-zinc-500 text-sm mt-0.5">{{ productos().length }} activos</p>
        </div>
        <button pButton icon="pi pi-plus" label="Nuevo" (click)="abrirForm()"></button>
      </div>

      @if (cargando()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card-dark animate-pulse h-20 bg-zinc-800"></div>
          }
        </div>
      } @else if (productos().length === 0) {
        <div class="text-center py-16">
          <i class="pi pi-box text-4xl text-zinc-700 mb-3 block"></i>
          <p class="text-zinc-500">Sin productos. Agrega el primero.</p>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          @for (p of productos(); track p.id) {
            <div class="card-dark flex flex-col gap-2 group">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-white font-medium text-sm">{{ p.nombre }}</p>
                  <p class="text-indigo-400 font-bold">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</p>
                  @if (p.precio_costo) {
                    <p class="text-zinc-500 text-xs">Costo: {{ p.precio_costo | currency:'COP':'$ ':'1.0-0' }}</p>
                  }
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button pButton icon="pi pi-pencil" size="small" severity="secondary"
                          (click)="editar(p)"></button>
                  <button pButton icon="pi pi-trash" size="small" severity="danger"
                          (click)="eliminar(p)"></button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <p-dialog [(visible)]="mostrarForm"
              [header]="productoEdit ? 'Editar producto' : 'Nuevo producto'"
              [modal]="true" [style]="{width:'360px'}" [draggable]="false">
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Nombre *</label>
          <input pInputText formControlName="nombre" placeholder="Ej: Coca Cola" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Precio venta *</label>
          <p-inputnumber formControlName="precio" mode="currency" currency="COP"
                         locale="es-CO" placeholder="0" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Precio costo</label>
          <p-inputnumber formControlName="precio_costo" mode="currency" currency="COP"
                         locale="es-CO" placeholder="0 (opcional)" styleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-zinc-300 text-sm font-medium">Unidad</label>
          <input pInputText formControlName="unidad" placeholder="unidad, caja, paquete..." class="w-full" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="cerrarForm()"></button>
        <button pButton label="Guardar" [loading]="guardando()" (click)="guardar()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class ProductosComponent implements OnInit {
  private svc = inject(ProductosService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = false;
  productos = signal<Producto[]>([]);
  productoEdit: Producto | null = null;

  form = this.fb.group({
    nombre: ['', Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0)]],
    precio_costo: [null as number | null],
    unidad: ['unidad']
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.productos.set(await this.svc.getAll());
    } finally {
      this.cargando.set(false);
    }
  }

  abrirForm() {
    this.productoEdit = null;
    this.form.reset();
    this.mostrarForm = true;
  }

  editar(p: Producto) {
    this.productoEdit = p;
    this.form.patchValue({ nombre: p.nombre, precio: p.precio, precio_costo: p.precio_costo ?? null, unidad: p.unidad ?? 'unidad' });
    this.mostrarForm = true;
  }

  cerrarForm() {
    this.mostrarForm = false;
    this.productoEdit = null;
    this.form.reset();
  }

  async guardar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.form.value;
      const payload: Partial<Producto> = {
        nombre: val.nombre!,
        precio: val.precio!,
        ...(val.precio_costo != null && { precio_costo: val.precio_costo }),
        unidad: val.unidad || 'unidad'
      };
      if (this.productoEdit) {
        await this.svc.actualizar(this.productoEdit.id, payload);
        this.msg.add({ severity: 'success', summary: 'Actualizado', detail: val.nombre! });
      } else {
        await this.svc.crear({ ...payload, activo: true });
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

  eliminar(p: Producto) {
    this.confirm.confirm({
      message: `¿Eliminar ${p.nombre}?`,
      header: 'Confirmar',
      icon: 'pi pi-trash',
      accept: async () => {
        await this.svc.desactivar(p.id);
        this.msg.add({ severity: 'info', summary: 'Eliminado', detail: p.nombre });
        await this.cargar();
      }
    });
  }
}

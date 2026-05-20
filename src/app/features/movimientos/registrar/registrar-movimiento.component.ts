import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { SaldoCliente } from '../../../core/models/cliente.model';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-registrar-movimiento',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule,
            ButtonModule, InputTextModule, InputNumberModule, TextareaModule, SelectModule],
  template: `
    <div class="p-5 md:p-8 max-w-lg mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-white">Registrar Movimiento</h2>
        <p class="text-zinc-500 text-sm mt-0.5">Compra o abono manual</p>
      </div>

      <div class="card-dark">
        <form [formGroup]="form" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium">Cliente *</label>
            <p-select [options]="clientes()" formControlName="cliente_id"
                      optionLabel="nombre" optionValue="id"
                      placeholder="Seleccionar cliente" styleClass="w-full"
                      [filter]="true" filterBy="nombre" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium">Tipo *</label>
            <p-select [options]="tipos" formControlName="tipo"
                      optionLabel="label" optionValue="value"
                      placeholder="Tipo de movimiento" styleClass="w-full" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium">Monto *</label>
            <p-inputnumber formControlName="monto" mode="currency" currency="COP"
                           locale="es-CO" placeholder="0" styleClass="w-full" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium">Descripción</label>
            <textarea pTextarea formControlName="descripcion" rows="3"
                      placeholder="Descripción del movimiento..." class="w-full resize-none"></textarea>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-zinc-300 text-sm font-medium">Foto evidencia</label>
            <input type="file" accept="image/*" (change)="onFoto($event)"
                   class="text-zinc-400 text-sm" />
          </div>

          <button pButton label="Registrar movimiento" [loading]="guardando()"
                  (click)="registrar()" class="w-full mt-2"></button>
        </form>
      </div>
    </div>
  `
})
export class RegistrarMovimientoComponent implements OnInit {
  private movSvc = inject(MovimientosService);
  private clientesSvc = inject(ClientesService);
  private storageSvc = inject(StorageService);
  private auth = inject(AuthService);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  guardando = signal(false);
  clientes = signal<SaldoCliente[]>([]);
  fotoSeleccionada: File | null = null;

  tipos = [
    { label: 'Compra', value: 'COMPRA' },
    { label: 'Abono / Pago', value: 'ABONO' }
  ];

  form = this.fb.group({
    cliente_id: ['', Validators.required],
    tipo: ['COMPRA', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['']
  });

  async ngOnInit() {
    this.clientes.set(await this.clientesSvc.getAll());
  }

  onFoto(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fotoSeleccionada = input.files?.[0] ?? null;
  }

  async registrar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    try {
      const val = this.form.value;
      let foto_url: string | undefined;
      if (this.fotoSeleccionada && val.cliente_id) {
        foto_url = await this.storageSvc.subirEvidencia(val.cliente_id, this.fotoSeleccionada);
      }
      await this.movSvc.registrar({
        cliente_id: val.cliente_id!,
        tipo: val.tipo as 'COMPRA' | 'ABONO',
        monto: val.monto!,
        descripcion: val.descripcion ?? undefined,
        foto_url,
        created_by: this.auth.user()?.id,
        fecha: new Date().toISOString()
      });
      this.msg.add({ severity: 'success', summary: 'Movimiento registrado' });
      this.form.reset({ tipo: 'COMPRA' });
      this.fotoSeleccionada = null;
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.guardando.set(false);
    }
  }
}

import { Component, inject, input, signal, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../../../core/models/producto.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-compra-rapida',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      @for (p of productos(); track p.id) {
        <button (click)="comprar(p)"
                [disabled]="procesando()"
                class="flex flex-col items-center justify-center bg-zinc-800
                       hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500
                       rounded-xl p-3 transition-all active:scale-95 disabled:opacity-50
                       text-left cursor-pointer">
          <span class="text-white font-medium text-sm w-full">{{ p.nombre }}</span>
          @if (p.en_promocion && p.precio_promocion) {
            <span class="text-orange-300 text-xs font-bold mt-0.5 w-full">🏷 {{ p.precio_promocion | currency:'COP':'$ ':'1.0-0' }}</span>
            <span class="text-zinc-500 text-xs line-through w-full">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
          } @else {
            <span class="text-indigo-300 text-xs mt-0.5 w-full">{{ p.precio | currency:'COP':'$ ':'1.0-0' }}</span>
          }
        </button>
      }
    </div>
  `
})
export class CompraRapidaComponent {
  clienteId = input.required<string>();
  productos = input.required<Producto[]>();
  compraRegistrada = output<void>();

  private movSvc = inject(MovimientosService);
  private auth = inject(AuthService);
  private msg = inject(MessageService);

  procesando = signal(false);

  async comprar(producto: Producto) {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.procesando.set(true);
    try {
      const precio = producto.en_promocion && producto.precio_promocion ? producto.precio_promocion : producto.precio;
      await this.movSvc.compraRapida(this.clienteId(), producto.nombre, precio, userId);
      this.msg.add({ severity: 'success', summary: producto.nombre, detail: 'Registrado' });
      this.compraRegistrada.emit();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar' });
    } finally {
      this.procesando.set(false);
    }
  }
}

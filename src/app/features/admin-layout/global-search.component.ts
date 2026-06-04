import { Component, inject, signal, computed, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ClientesService } from '../../core/services/clientes.service';
import { ProductosService } from '../../core/services/productos.service';
import { SaldoCliente } from '../../core/models/cliente.model';
import { Producto } from '../../core/models/producto.model';

type Resultado = { tipo: 'cliente'; item: SaldoCliente } | { tipo: 'producto'; item: Producto };

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      z-index: 9999; display: flex; align-items: flex-start;
      justify-content: center; padding-top: 80px;
      backdrop-filter: blur(4px);
    }
    .box {
      width: 100%; max-width: 560px; margin: 0 16px;
      background: #18181b; border: 1px solid #3f3f46;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
    }
    .search-input {
      width: 100%; background: transparent; border: none; outline: none;
      color: white; font-size: 16px; padding: 16px; caret-color: #6366f1;
    }
    .search-input::placeholder { color: #52525b; }
    .result-item {
      display: flex; align-items: center; gap-12px; padding: 10px 16px;
      cursor: pointer; transition: background 0.1s; gap: 12px;
    }
    .result-item:hover, .result-item.active { background: #27272a; }
    .result-icon {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 13px;
    }
  `],
  template: `
    @if (abierto()) {
      <div class="overlay" (click)="cerrar()">
        <div class="box" (click)="$event.stopPropagation()">

          <!-- Input -->
          <div class="flex items-center border-b border-zinc-800">
            <i class="pi pi-search text-zinc-500 ml-4 text-sm flex-shrink-0"></i>
            <input #inputRef class="search-input" [(ngModel)]="query"
                   (ngModelChange)="onQuery($event)"
                   (keydown)="onKey($event)"
                   placeholder="Buscar clientes o productos..." />
            <kbd class="text-zinc-600 text-xs mr-3 flex-shrink-0 font-mono">Esc</kbd>
          </div>

          <!-- Resultados -->
          @if (buscando()) {
            <div class="py-6 text-center text-zinc-500 text-sm">
              <i class="pi pi-spinner pi-spin mr-2"></i>Buscando...
            </div>
          } @else if (query.length > 0 && resultados().length === 0) {
            <div class="py-6 text-center text-zinc-500 text-sm">Sin resultados para "{{ query }}"</div>
          } @else {

            @if (clientes().length > 0) {
              <p class="text-zinc-600 text-xs uppercase tracking-widest px-4 pt-3 pb-1 font-semibold">Clientes</p>
              @for (r of clientes(); track r.item.id; let i = $index) {
                <div class="result-item" [class.active]="cursor() === i"
                     (click)="navegar(r)" (mouseenter)="cursor.set(i)">
                  <div class="result-icon" style="background:rgb(99 102 241/0.12)">
                    <i class="pi pi-user" style="color:#818cf8"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-medium truncate">{{ r.item.nombre }}</p>
                    <p class="text-zinc-500 text-xs">{{ r.item.telefono || 'Sin teléfono' }}</p>
                  </div>
                  <span class="text-xs font-bold flex-shrink-0"
                        [style]="r.item.saldo > 0 ? 'color:#fbbf24' : 'color:#4ade80'">
                    {{ r.item.saldo | currency:'COP':'$ ':'1.0-0' }}
                  </span>
                </div>
              }
            }

            @if (productos().length > 0) {
              <p class="text-zinc-600 text-xs uppercase tracking-widest px-4 pt-3 pb-1 font-semibold">Productos</p>
              @for (r of productos(); track r.item.id; let i = $index) {
                <div class="result-item" [class.active]="cursor() === clientes().length + i"
                     (click)="navegar(r)" (mouseenter)="cursor.set(clientes().length + i)">
                  <div class="result-icon" style="background:rgb(34 197 94/0.1)">
                    <i class="pi pi-box" style="color:#4ade80"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-medium truncate">{{ r.item.nombre }}</p>
                    <p class="text-zinc-500 text-xs">Stock: {{ r.item.stock_actual ?? 0 }}</p>
                  </div>
                  <span class="text-green-400 text-xs font-bold flex-shrink-0">
                    {{ r.item.precio | currency:'COP':'$ ':'1.0-0' }}
                  </span>
                </div>
              }
            }
          }

          <!-- Footer hint -->
          <div class="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-800 text-zinc-600 text-xs">
            <span><kbd class="font-mono">↑↓</kbd> navegar</span>
            <span><kbd class="font-mono">↵</kbd> ir</span>
            <span><kbd class="font-mono">Esc</kbd> cerrar</span>
            <span class="ml-auto"><kbd class="font-mono">⌘K</kbd> abrir</span>
          </div>
        </div>
      </div>
    }
  `
})
export class GlobalSearchComponent implements OnDestroy, AfterViewInit {
  private clientesSvc = inject(ClientesService);
  private productosSvc = inject(ProductosService);
  private router = inject(Router);

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  abierto = signal(false);
  buscando = signal(false);
  query = '';
  cursor = signal(0);

  private _resultados = signal<Resultado[]>([]);
  resultados = computed(() => this._resultados());
  clientes = computed(() => this._resultados().filter(r => r.tipo === 'cliente') as { tipo: 'cliente'; item: SaldoCliente }[]);
  productos = computed(() => this._resultados().filter(r => r.tipo === 'producto') as { tipo: 'producto'; item: Producto }[]);

  private _debounce: ReturnType<typeof setTimeout> | null = null;
  private _keyHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.abrir();
    }
  };

  ngAfterViewInit() {
    window.addEventListener('keydown', this._keyHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this._keyHandler);
  }

  abrir() {
    this.abierto.set(true);
    this.query = '';
    this._resultados.set([]);
    this.cursor.set(0);
    setTimeout(() => this.inputRef?.nativeElement.focus(), 50);
  }

  cerrar() {
    this.abierto.set(false);
    this.query = '';
    this._resultados.set([]);
  }

  onQuery(q: string) {
    this.cursor.set(0);
    if (this._debounce) clearTimeout(this._debounce);
    if (!q.trim()) { this._resultados.set([]); return; }
    this._debounce = setTimeout(() => this.buscar(q), 250);
  }

  async buscar(q: string) {
    this.buscando.set(true);
    try {
      const [clientes, productos] = await Promise.all([
        this.clientesSvc.buscarPorNombre(q),
        this.productosSvc.getAll()
      ]);
      const ql = q.toLowerCase();
      const prodsFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(ql)).slice(0, 5);
      const resultados: Resultado[] = [
        ...clientes.slice(0, 6).map(c => ({ tipo: 'cliente' as const, item: c })),
        ...prodsFiltrados.map(p => ({ tipo: 'producto' as const, item: p }))
      ];
      this._resultados.set(resultados);
    } finally {
      this.buscando.set(false);
    }
  }

  onKey(e: KeyboardEvent) {
    const total = this._resultados().length;
    if (e.key === 'Escape') { this.cerrar(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.cursor.update(v => Math.min(v + 1, total - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this.cursor.update(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter') {
      const r = this._resultados()[this.cursor()];
      if (r) this.navegar(r);
    }
  }

  navegar(r: Resultado) {
    if (r.tipo === 'cliente') this.router.navigate(['/admin/clientes', r.item.id]);
    else this.router.navigate(['/admin/productos']);
    this.cerrar();
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private sb = inject(SupabaseService).client;

  async getAll(): Promise<Producto[]> {
    const { data, error } = await this.sb
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []) as Producto[];
  }

  async crear(producto: Partial<Producto>) {
    const { data, error } = await this.sb
      .from('productos')
      .insert(producto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async actualizar(id: string, producto: Partial<Producto>) {
    const { data, error } = await this.sb
      .from('productos')
      .update(producto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async desactivar(id: string) {
    return this.actualizar(id, { activo: false });
  }

  async togglePromocion(id: string, payload: { en_promocion: boolean; precio_promocion?: number }) {
    return this.actualizar(id, payload);
  }
}

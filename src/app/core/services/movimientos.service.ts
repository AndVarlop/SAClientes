import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Movimiento, MovimientoConCliente } from '../models/movimiento.model';

@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private sb = inject(SupabaseService).client;

  async getByCliente(clienteId: string): Promise<Movimiento[]> {
    const { data, error } = await this.sb
      .from('movimientos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Movimiento[];
  }

  async getRecientes(limit = 10): Promise<MovimientoConCliente[]> {
    const { data, error } = await this.sb
      .from('movimientos')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as MovimientoConCliente[];
  }

  async getAllConClientes(): Promise<MovimientoConCliente[]> {
    const { data, error } = await this.sb
      .from('movimientos')
      .select('*, clientes(nombre)')
      .order('fecha', { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as MovimientoConCliente[];
  }

  async registrar(mov: Partial<Movimiento>) {
    const { data, error } = await this.sb
      .from('movimientos')
      .insert(mov)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async eliminar(id: string) {
    const { error } = await this.sb
      .from('movimientos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async compraRapida(clienteId: string, productoNombre: string, monto: number, userId: string) {
    return this.registrar({
      cliente_id: clienteId,
      tipo: 'COMPRA',
      descripcion: productoNombre,
      monto,
      created_by: userId,
      fecha: new Date().toISOString()
    });
  }
}

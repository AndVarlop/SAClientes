import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cliente, SaldoCliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private sb = inject(SupabaseService).client;

  async getAll(): Promise<SaldoCliente[]> {
    const { data, error } = await this.sb
      .from('saldos_clientes')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return (data ?? []) as SaldoCliente[];
  }

  async getById(id: string): Promise<SaldoCliente> {
    const { data, error } = await this.sb
      .from('saldos_clientes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as SaldoCliente;
  }

  async buscarPorNombre(nombre: string): Promise<SaldoCliente[]> {
    const { data, error } = await this.sb
      .from('saldos_clientes')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .eq('activo', true);
    if (error) throw error;
    return (data ?? []) as SaldoCliente[];
  }

  async crear(cliente: Partial<Cliente>) {
    const { data, error } = await this.sb
      .from('clientes')
      .insert(cliente)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async actualizar(id: string, cliente: Partial<Cliente>) {
    const { data, error } = await this.sb
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async desactivar(id: string) {
    return this.actualizar(id, { activo: false });
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cliente, SaldoCliente } from '../models/cliente.model';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private sb = inject(SupabaseService).client;
  private audit = inject(AuditService);

  async getAll(): Promise<SaldoCliente[]> {
    const { data, error } = await this.sb
      .from('saldos_clientes')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return (data ?? []) as SaldoCliente[];
  }

  async getPaginado(params: {
    page: number;
    pageSize: number;
    q?: string;
    estado?: 'todos' | 'pendiente' | 'al-dia';
  }): Promise<{ data: SaldoCliente[]; count: number }> {
    const { page, pageSize, q, estado } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.sb
      .from('saldos_clientes')
      .select('*', { count: 'exact' })
      .order('nombre')
      .range(from, to);

    if (q?.trim()) {
      query = query.or(`nombre.ilike.%${q.trim()}%,telefono.ilike.%${q.trim()}%`);
    }
    if (estado === 'pendiente') query = query.gt('saldo', 0);
    if (estado === 'al-dia')    query = query.lte('saldo', 0);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as SaldoCliente[], count: count ?? 0 };
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

  async buscarPorNombre(query: string): Promise<SaldoCliente[]> {
    const { data, error } = await this.sb
      .from('saldos_clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
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
    await this.audit.log('clientes', data.id, 'CREAR', null, cliente);
    return data;
  }

  async actualizar(id: string, cliente: Partial<Cliente>) {
    const anterior = await this.getById(id).catch(() => null);
    const { data, error } = await this.sb
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await this.audit.log('clientes', id, 'EDITAR', anterior, cliente);
    return data;
  }

  async desactivar(id: string) {
    return this.actualizar(id, { activo: false });
  }
}

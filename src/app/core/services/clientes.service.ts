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

  async getDeudaPorMes(params: {
    anio: number;
    mes: number; // 1-12
    q?: string;
    estado?: 'todos' | 'pendiente' | 'al-dia';
  }): Promise<{ data: SaldoCliente[]; count: number }> {
    const { anio, mes, q, estado } = params;
    const desde = new Date(anio, mes - 1, 1).toISOString();
    const hasta = new Date(anio, mes, 1).toISOString();

    const { data: movs, error } = await this.sb
      .from('movimientos')
      .select('cliente_id, tipo, monto, clientes(nombre, telefono, foto_url, activo, limite_credito, created_at)')
      .gte('fecha', desde)
      .lt('fecha', hasta);
    if (error) throw error;

    const mapa = new Map<string, SaldoCliente>();
    for (const m of (movs ?? []) as any[]) {
      const cli = m.clientes;
      if (!cli) continue;
      let acc = mapa.get(m.cliente_id);
      if (!acc) {
        acc = {
          id: m.cliente_id,
          nombre: cli.nombre,
          telefono: cli.telefono,
          activo: cli.activo,
          limite_credito: cli.limite_credito,
          foto_url: cli.foto_url,
          created_at: cli.created_at,
          total_compras: 0,
          total_abonos: 0,
          saldo: 0
        };
        mapa.set(m.cliente_id, acc);
      }
      if (m.tipo === 'COMPRA') acc.total_compras += m.monto;
      else if (m.tipo === 'ABONO') acc.total_abonos += m.monto;
    }

    let lista = [...mapa.values()];
    for (const c of lista) c.saldo = c.total_compras - c.total_abonos;

    if (q?.trim()) {
      const t = q.trim().toLowerCase();
      lista = lista.filter(c =>
        c.nombre.toLowerCase().includes(t) || (c.telefono ?? '').toLowerCase().includes(t));
    }
    if (estado === 'pendiente') lista = lista.filter(c => c.saldo > 0);
    if (estado === 'al-dia')    lista = lista.filter(c => c.saldo <= 0);

    lista.sort((a, b) => b.saldo - a.saldo);
    return { data: lista, count: lista.length };
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

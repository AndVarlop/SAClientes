import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SolicitudPago {
  id: string;
  cliente_id: string;
  monto: number;
  tipo: 'TOTAL' | 'ABONO';
  foto_url?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  admin_nota?: string;
  created_at: string;
  updated_at: string;
  clientes?: { nombre: string; telefono?: string };
}

@Injectable({ providedIn: 'root' })
export class SolicitudesPagoService {
  private sb = inject(SupabaseService).client;

  async getByCliente(clienteId: string): Promise<SolicitudPago[]> {
    const { data, error } = await this.sb
      .from('solicitudes_pago')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SolicitudPago[];
  }

  async crear(data: { cliente_id: string; monto: number; tipo: 'TOTAL' | 'ABONO'; foto_url?: string }) {
    const { data: result, error } = await this.sb
      .from('solicitudes_pago')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async getAll(): Promise<SolicitudPago[]> {
    const { data, error } = await this.sb
      .from('solicitudes_pago')
      .select('*, clientes(nombre, telefono)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SolicitudPago[];
  }

  async aprobar(id: string, clienteId: string, monto: number, userId: string) {
    const { error: movError } = await this.sb
      .from('movimientos')
      .insert({
        cliente_id: clienteId,
        tipo: 'ABONO',
        descripcion: 'Abono vía Nequi (aprobado)',
        monto,
        created_by: userId,
        fecha: new Date().toISOString()
      });
    if (movError) throw movError;

    const { error } = await this.sb
      .from('solicitudes_pago')
      .update({ estado: 'APROBADO', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async rechazar(id: string, nota?: string) {
    const { error } = await this.sb
      .from('solicitudes_pago')
      .update({ estado: 'RECHAZADO', admin_nota: nota || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
}

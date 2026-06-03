import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto } from '../models/producto.model';

export interface MovimientoInv {
  id: string;
  producto_id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  precio_unit: number;
  nota?: string;
  fecha: string;
  created_at: string;
  cliente_id?: string;
  movimiento_id?: string;
  productos?: { nombre: string; unidad?: string };
  clientes?: { nombre: string } | null;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private sb = inject(SupabaseService).client;

  // ── Productos ──
  async getProductos(): Promise<Producto[]> {
    const { data, error } = await this.sb
      .from('productos')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return (data ?? []) as Producto[];
  }

  async crearProducto(p: { nombre: string; precio_costo: number; precio: number; unidad: string; unidades_por_paquete?: number | null }) {
    const { error } = await this.sb.from('productos').insert({ ...p, activo: true });
    if (error) throw error;
  }

  async editarProducto(id: string, p: { nombre?: string; precio_costo?: number; precio?: number; unidad?: string; unidades_por_paquete?: number | null }) {
    const { error } = await this.sb.from('productos').update(p).eq('id', id);
    if (error) throw error;
  }

  async toggleActivo(id: string, activo: boolean) {
    const { error } = await this.sb.from('productos').update({ activo }).eq('id', id);
    if (error) throw error;
  }

  // ── Movimientos ──
  async getMovimientos(): Promise<MovimientoInv[]> {
    const { data, error } = await this.sb
      .from('movimientos_inv')
      .select('*, productos(nombre, unidad), clientes(nombre)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MovimientoInv[];
  }

  async registrarEntrada(p: { producto_id: string; cantidad: number; precio_unit: number; nota?: string; fecha: string }) {
    const { error: movErr } = await this.sb.from('movimientos_inv').insert({ ...p, tipo: 'ENTRADA' });
    if (movErr) throw movErr;
    const { error: stockErr } = await this.sb.rpc('incrementar_stock', {
      p_id: p.producto_id,
      p_delta: p.cantidad
    });
    if (stockErr) throw stockErr;
  }

  async registrarSalida(p: { producto_id: string; cantidad: number; precio_unit: number; nota?: string; fecha: string; cliente_id?: string; movimiento_id?: string }) {
    const { error: movErr } = await this.sb.from('movimientos_inv').insert({ ...p, tipo: 'SALIDA' });
    if (movErr) throw movErr;
    const { error: stockErr } = await this.sb.rpc('incrementar_stock', {
      p_id: p.producto_id,
      p_delta: -p.cantidad
    });
    if (stockErr) throw stockErr;
  }

  async decrementarStock(productoId: string, cantidad: number) {
    await this.sb.rpc('incrementar_stock', { p_id: productoId, p_delta: -cantidad });
  }

  async eliminarMovimiento(id: string, tipo: 'ENTRADA' | 'SALIDA', productoId: string, cantidad: number) {
    const { error } = await this.sb.from('movimientos_inv').delete().eq('id', id);
    if (error) throw error;
    const delta = tipo === 'ENTRADA' ? -cantidad : cantidad;
    await this.sb.rpc('incrementar_stock', { p_id: productoId, p_delta: delta });
  }

  async eliminarSalidasPorMovimiento(movimientoId: string) {
    const { data } = await this.sb
      .from('movimientos_inv')
      .select('id, tipo, producto_id, cantidad')
      .eq('movimiento_id', movimientoId);
    if (!data || data.length === 0) return;
    for (const inv of data as { id: string; tipo: 'ENTRADA' | 'SALIDA'; producto_id: string; cantidad: number }[]) {
      await this.eliminarMovimiento(inv.id, inv.tipo, inv.producto_id, inv.cantidad);
    }
  }
}

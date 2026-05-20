export type TipoMovimiento = 'COMPRA' | 'ABONO';

export interface Movimiento {
  id: string;
  cliente_id: string;
  tipo: TipoMovimiento;
  descripcion?: string;
  monto: number;
  foto_url?: string;
  fecha: string;
  created_by?: string;
  created_at: string;
}

export interface MovimientoConCliente extends Movimiento {
  clientes: { nombre: string } | null;
}

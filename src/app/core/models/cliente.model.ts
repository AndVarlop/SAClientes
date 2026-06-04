export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  limite_credito?: number | null;
  foto_url?: string | null;
  created_at: string;
}

export interface SaldoCliente extends Cliente {
  total_compras: number;
  total_abonos: number;
  saldo: number;
}

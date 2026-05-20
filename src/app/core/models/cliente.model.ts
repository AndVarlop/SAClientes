export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
}

export interface SaldoCliente extends Cliente {
  total_compras: number;
  total_abonos: number;
  saldo: number;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  foto?: string;
  activo: boolean;
  created_at: string;
  precio_costo?: number;
  stock_actual?: number;
  unidad?: string;
  unidades_por_paquete?: number;
}

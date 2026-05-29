import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private sb = inject(SupabaseService).client;

  async subirComprobante(clienteId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `pagos/${clienteId}/${Date.now()}.${ext}`;
    const { error } = await this.sb.storage
      .from('evidencias')
      .upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = this.sb.storage.from('evidencias').getPublicUrl(path);
    return data.publicUrl;
  }

  async subirEvidencia(clienteId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${clienteId}/${Date.now()}.${ext}`;
    const { error } = await this.sb.storage
      .from('evidencias')
      .upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = this.sb.storage.from('evidencias').getPublicUrl(path);
    return data.publicUrl;
  }

  async subirFactura(clienteId: string, blob: Blob, mes: number, anio: number): Promise<string> {
    const mesStr = String(mes).padStart(2, '0');
    const path = `facturas/${clienteId}/${anio}-${mesStr}.pdf`;
    const { error } = await this.sb.storage
      .from('evidencias')
      .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
    if (error) throw error;
    const { data } = this.sb.storage.from('evidencias').getPublicUrl(path);
    return data.publicUrl;
  }
}

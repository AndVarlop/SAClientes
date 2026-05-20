import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private sb = inject(SupabaseService).client;

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
}

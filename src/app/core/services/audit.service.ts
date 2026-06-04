import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface AuditEntry {
  id: string;
  tabla: string;
  registro_id: string;
  accion: string;
  datos_anteriores?: Record<string, unknown>;
  datos_nuevos?: Record<string, unknown>;
  usuario_id?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private sb = inject(SupabaseService).client;
  private auth = inject(AuthService);

  async log(tabla: string, registroId: string, accion: string, anterior?: unknown, nuevo?: unknown) {
    try {
      await this.sb.from('audit_log').insert({
        tabla,
        registro_id: registroId,
        accion,
        datos_anteriores: anterior ?? null,
        datos_nuevos: nuevo ?? null,
        usuario_id: this.auth.user()?.id ?? null
      });
    } catch { /* audit failures are silent */ }
  }

  async getByRegistro(tabla: string, registroId: string): Promise<AuditEntry[]> {
    const { data, error } = await this.sb
      .from('audit_log')
      .select('*')
      .eq('tabla', tabla)
      .eq('registro_id', registroId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AuditEntry[];
  }
}

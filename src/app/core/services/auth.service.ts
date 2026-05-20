import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sb = inject(SupabaseService).client;

  session = signal<Session | null>(null);
  user = computed(() => this.session()?.user ?? null);
  isLoggedIn = computed(() => !!this.session());

  async init() {
    const { data } = await this.sb.auth.getSession();
    this.session.set(data.session);
    this.sb.auth.onAuthStateChange((_, s) => this.session.set(s));
  }

  async login(email: string, password: string) {
    return this.sb.auth.signInWithPassword({ email, password });
  }

  async logout() {
    await this.sb.auth.signOut();
    this.session.set(null);
  }
}

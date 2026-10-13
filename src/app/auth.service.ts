import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';

export interface User { email: string; nome: string; setor: string; cargo: string; admin: boolean; ativo: boolean; ultimo_acesso?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  user = signal<User | null>(null);
  picture = signal('');
  get token() { return sessionStorage.getItem('vision_token') || ''; }

  /** Apps Script não responde preflight CORS: enviar como text/plain. */
  async call<T = any>(action: string, data: object = {}): Promise<T> {
    const res = await fetch(environment.apiUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: this.token, ...data })
    });
    return res.json();
  }

  async loginWithGoogle(idToken: string) {
    const r = await this.call('login', { idToken });
    if (r.ok) { sessionStorage.setItem('vision_token', r.token); this.user.set(r.user); this.picture.set(r.picture); }
    return r;
  }

  async restore(): Promise<boolean> {
    if (this.user()) return true;
    if (!this.token) return false;
    try { const r = await this.call('me'); if (r.ok) { this.user.set(r.user); return true; } } catch {}
    sessionStorage.removeItem('vision_token'); return false;
  }

  async logout() {
    try { await this.call('logout'); } catch {}
    sessionStorage.removeItem('vision_token'); this.user.set(null); this.router.navigate(['/login']);
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  tema = signal<'dark' | 'light'>(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  alternar() {
    const novo = this.tema() === 'dark' ? 'light' : 'dark';
    this.tema.set(novo);
    const c = document.documentElement.classList; c.remove('light', 'dark'); c.add(novo);
    try { localStorage.setItem('vision_tema', novo); } catch { /* sem persistência */ }
  }
}

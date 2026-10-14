import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService, User } from './auth.service';
import { AVATARES, avatarPorId } from './avatares';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-admin', standalone: true, imports: [FormsModule, DatePipe, AvatarComponent],
  template: `
  <h2 class="text-2xl font-bold">Controle de acesso</h2>
  <p class="mt-1 text-white/60 text-sm">Defina setor, cargo e avatar de cada pessoa e libere ou bloqueie o acesso.</p>

  <div class="mt-6 overflow-x-auto rounded-xl border border-white/10">
    <table class="w-full text-sm text-left">
      <thead class="bg-white/5 text-white/60"><tr>
        <th class="p-3">Usuário</th><th class="p-3">Avatar</th><th class="p-3">Setor</th><th class="p-3">Cargo</th>
        <th class="p-3">Admin</th><th class="p-3">Acesso</th><th class="p-3">Último acesso</th><th class="p-3"></th></tr></thead>
      <tbody>
      @for (u of users(); track u.email) {
        <tr class="border-t border-white/10" [class]="u.ativo ? '' : 'bg-vision-500/10'">
          <td class="p-3"><div class="font-semibold">{{ u.nome }}</div><div class="text-xs text-white/50">{{ u.email }}</div></td>
          <td class="p-3">
            <button (click)="abrir(u)" class="group flex items-center gap-2 rounded-full pr-3 hover:bg-white/10" [attr.aria-label]="'Escolher avatar de ' + u.nome">
              <app-avatar [nome]="u.nome" [avatar]="u.avatar" [tam]="40" />
              <span class="text-xs text-vision-400 group-hover:underline">{{ u.avatar ? 'Trocar' : 'Escolher' }}</span></button></td>
          <td class="p-3"><select [(ngModel)]="u.setor" class="bg-vision-900 rounded px-2 py-1">
            <option value="">Sem setor</option>@for (s of setores(); track s) { <option [value]="s">{{ s }}</option> }</select></td>
          <td class="p-3"><select [(ngModel)]="u.cargo" class="bg-vision-900 rounded px-2 py-1">
            @for (c of cargos(); track c) { <option [value]="c">{{ c }}</option> }</select></td>
          <td class="p-3"><input type="checkbox" [(ngModel)]="u.admin" aria-label="Administrador"></td>
          <td class="p-3"><input type="checkbox" [(ngModel)]="u.ativo" aria-label="Acesso liberado"></td>
          <td class="p-3 text-white/50">{{ u.ultimo_acesso ? (u.ultimo_acesso | date:'dd/MM/yy HH:mm') : 'Nunca' }}</td>
          <td class="p-3"><button (click)="salvar(u)" class="rounded-lg bg-vision-500 hover:bg-vision-400 px-3 py-1.5 font-semibold">Salvar</button></td>
        </tr>
      } @empty { <tr><td colspan="8" class="p-6 text-center text-white/50">Nenhum usuário registrado ainda.</td></tr> }
      </tbody>
    </table>
  </div>
  @if (msg()) { <p class="mt-3 text-sm text-vision-400" role="status">{{ msg() }}</p> }

  <h3 class="mt-10 text-lg font-semibold">Últimas entradas</h3>
  <ul class="mt-3 text-sm divide-y divide-white/10 max-h-80 overflow-auto rounded-xl border border-white/10">
    @for (l of logs(); track $index) {
      <li class="flex gap-4 p-3"><span class="text-white/50 w-36 shrink-0">{{ l.data | date:'dd/MM/yy HH:mm:ss' }}</span><span class="flex-1 truncate">{{ l.email }}</span><span class="text-white/70">{{ l.acao }}</span></li>
    }
  </ul>

  @if (alvo(); as a) {
    <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" (click)="fechar()" role="presentation">
      <div role="dialog" aria-modal="true" [attr.aria-label]="'Escolher avatar de ' + a.nome" (click)="$event.stopPropagation()"
           class="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-vision-950 p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3"><app-avatar [nome]="a.nome" [avatar]="a.avatar" [tam]="56" />
            <div><h3 class="text-lg font-semibold">Avatar de {{ a.nome }}</h3>
              <p class="text-xs text-white/60">{{ a.avatar ? (nomeAvatar(a.avatar)) : 'Sem avatar (mostra as iniciais)' }}</p></div></div>
          <button (click)="fechar()" class="rounded-lg px-3 py-1.5 text-sm hover:bg-white/10" aria-label="Fechar">Fechar</button>
        </div>
        <ul class="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
          @for (v of avatares; track v.id) {
            <li><button (click)="escolher(a, v.id)" [disabled]="salvando()" [attr.aria-pressed]="a.avatar === v.id" [title]="v.nome"
              class="w-full rounded-2xl border p-1.5 transition hover:-translate-y-0.5 hover:border-vision-400 disabled:opacity-50"
              [class]="a.avatar === v.id ? 'border-vision-400 bg-vision-500/20 shadow-[0_0_22px_-8px_rgba(6,109,255,.95)]' : 'border-white/10 bg-white/5'">
              <img [src]="v.caminho" [alt]="v.nome" class="aspect-square w-full rounded-xl bg-vision-500/15 object-cover" loading="lazy">
              <span class="mt-1 block text-center text-[0.7rem] text-white/60">{{ v.nome }}</span></button></li>
          }
        </ul>
        <div class="mt-6 flex items-center justify-between">
          <button (click)="escolher(a, '')" [disabled]="salvando() || !a.avatar" class="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40">Remover avatar</button>
          @if (erroAvatar()) { <span class="text-sm text-red-300" role="alert">{{ erroAvatar() }}</span> }
        </div>
      </div>
    </div>
  }`
})
export class AdminComponent implements OnInit {
  private auth = inject(AuthService);
  avatares = AVATARES;
  users = signal<User[]>([]); setores = signal<string[]>([]); cargos = signal<string[]>([]);
  logs = signal<{ data: string; email: string; acao: string }[]>([]); msg = signal('');
  alvo = signal<User | null>(null); salvando = signal(false); erroAvatar = signal('');

  async ngOnInit() { await this.carregar(); }
  async carregar() {
    const [u, l] = await Promise.all([this.auth.call('listUsers'), this.auth.call('listLogs')]);
    if (u.ok) { this.users.set(u.users); this.setores.set(u.setores); this.cargos.set(u.cargos); }
    if (l.ok) this.logs.set(l.logs);
  }
  async salvar(u: User) {
    const r = await this.auth.call('saveUser', { user: u });
    this.msg.set(r.ok ? `Alterações de ${u.nome} salvas.` : 'Não foi possível salvar. Confira os campos e tente de novo.');
    if (r.ok) this.carregar();
  }

  nomeAvatar = (id: string) => avatarPorId(id)?.nome ?? id;
  abrir(u: User) { this.erroAvatar.set(''); this.alvo.set(u); }
  fechar() { this.alvo.set(null); }
  @HostListener('document:keydown.escape') esc() { this.fechar(); }

  /** O avatar é salvo na hora; o restante do cadastro continua no botão Salvar da linha. */
  async escolher(u: User, id: string) {
    this.salvando.set(true); this.erroAvatar.set('');
    try {
      const r = await this.auth.call('avatarSalvar', { email: u.email, avatar: id });
      if (!r.ok) throw r;
      u.avatar = id; this.users.update(l => [...l]);
      const eu = this.auth.user(); if (eu && eu.email.toLowerCase() === u.email.toLowerCase()) this.auth.user.set({ ...eu, avatar: id });   // atualiza a barra superior
      this.msg.set(id ? `Avatar de ${u.nome} atualizado.` : `Avatar de ${u.nome} removido.`); this.fechar();
    } catch (e: any) {
      const c = String(e?.error || e?.detail || e);
      this.erroAvatar.set(c.includes('COLUNA_AVATAR_AUSENTE') ? 'Falta incluir "avatar" em USER_COLS no Code.gs.' : c.includes('AÇÃO_INVÁLIDA') ? 'Servidor desatualizado: publique uma nova versão do Apps Script.' : 'Não foi possível salvar o avatar.');
    }
    this.salvando.set(false);
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService, User } from './auth.service';

@Component({
  selector: 'app-admin', standalone: true, imports: [FormsModule, DatePipe],
  template: `
  <h2 class="text-2xl font-bold">Controle de acesso</h2>
  <p class="mt-1 text-white/60 text-sm">Defina setor e cargo de cada pessoa e libere ou bloqueie o acesso.</p>

  <div class="mt-6 overflow-x-auto rounded-xl border border-white/10">
    <table class="w-full text-sm text-left">
      <thead class="bg-white/5 text-white/60"><tr>
        <th class="p-3">Usuário</th><th class="p-3">Setor</th><th class="p-3">Cargo</th>
        <th class="p-3">Admin</th><th class="p-3">Acesso</th><th class="p-3">Último acesso</th><th class="p-3"></th></tr></thead>
      <tbody>
      @for (u of users(); track u.email) {
        <tr class="border-t border-white/10" [class]="u.ativo ? '' : 'bg-vision-500/10'">
          <td class="p-3"><div class="font-semibold">{{ u.nome }}</div><div class="text-xs text-white/50">{{ u.email }}</div></td>
          <td class="p-3"><select [(ngModel)]="u.setor" class="bg-vision-900 rounded px-2 py-1">
            <option value="">Sem setor</option>@for (s of setores(); track s) { <option [value]="s">{{ s }}</option> }</select></td>
          <td class="p-3"><select [(ngModel)]="u.cargo" class="bg-vision-900 rounded px-2 py-1">
            @for (c of cargos(); track c) { <option [value]="c">{{ c }}</option> }</select></td>
          <td class="p-3"><input type="checkbox" [(ngModel)]="u.admin" aria-label="Administrador"></td>
          <td class="p-3"><input type="checkbox" [(ngModel)]="u.ativo" aria-label="Acesso liberado"></td>
          <td class="p-3 text-white/50">{{ u.ultimo_acesso ? (u.ultimo_acesso | date:'dd/MM/yy HH:mm') : 'Nunca' }}</td>
          <td class="p-3"><button (click)="salvar(u)" class="rounded-lg bg-vision-500 hover:bg-vision-400 px-3 py-1.5 font-semibold">Salvar</button></td>
        </tr>
      } @empty { <tr><td colspan="7" class="p-6 text-center text-white/50">Nenhum usuário registrado ainda.</td></tr> }
      </tbody>
    </table>
  </div>
  @if (msg()) { <p class="mt-3 text-sm text-vision-400" role="status">{{ msg() }}</p> }

  <h3 class="mt-10 text-lg font-semibold">Últimas entradas</h3>
  <ul class="mt-3 text-sm divide-y divide-white/10 max-h-80 overflow-auto rounded-xl border border-white/10">
    @for (l of logs(); track $index) {
      <li class="flex gap-4 p-3"><span class="text-white/50 w-36 shrink-0">{{ l.data | date:'dd/MM/yy HH:mm:ss' }}</span><span class="flex-1 truncate">{{ l.email }}</span><span class="text-white/70">{{ l.acao }}</span></li>
    }
  </ul>`
})
export class AdminComponent implements OnInit {
  private auth = inject(AuthService);
  users = signal<User[]>([]); setores = signal<string[]>([]); cargos = signal<string[]>([]);
  logs = signal<{ data: string; email: string; acao: string }[]>([]); msg = signal('');

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
}

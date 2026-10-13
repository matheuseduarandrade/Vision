import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';

const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const hoje = fmt(new Date()), ano = hoje.slice(0, 4);
const trinta = fmt(new Date(Date.now() - 29 * 864e5));

@Component({
  selector: 'app-encerramento', standalone: true, imports: [FormsModule, DatePipe],
  template: `
  <h2 class="text-2xl font-bold">Tempo de encerramento</h2>
  <p class="mt-1 text-sm text-white/60">Tempo entre o agendamento e a resolução do chamado. Período dentro de {{ ano }}.</p>

  <div class="mt-6 flex flex-wrap items-end gap-3 text-sm">
    <label class="flex flex-col gap-1">De <input type="date" [min]="ano + '-01-01'" [max]="ano + '-12-31'" [ngModel]="ini()" (ngModelChange)="ini.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <label class="flex flex-col gap-1">Até <input type="date" [min]="ano + '-01-01'" [max]="ano + '-12-31'" [ngModel]="fim()" (ngModelChange)="fim.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <button (click)="gerar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 font-semibold">
      {{ carregando() ? 'Calculando…' : 'Calcular' }}</button>
  </div>
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (r(); as r) {
    <div class="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-px rounded-xl overflow-hidden bg-white/10 text-center">
      @for (k of kpis(); track k.rotulo) {
        <div class="bg-vision-950 p-4"><p class="text-3xl font-bold tabular-nums">{{ k.valor }}</p><p class="mt-1 text-xs text-white/60">{{ k.rotulo }}</p></div>
      }
    </div>

    <h3 class="mt-8 font-semibold">Por operador</h3>
    <p class="text-sm text-white/60">Clique em um operador para ver os dias.</p>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Operador</th><th class="p-3">Chamados</th>
          <th class="p-3">Média geral</th><th class="p-3">Com reagendamento</th><th class="p-3">Sem reagendamento</th></tr></thead>
        <tbody>
        @for (o of r.operadores; track o.operador) {
          <tr class="border-t border-white/10" [class]="o.operador === opSel()?.operador ? 'bg-vision-500/15' : ''">
            <td class="p-3"><button (click)="abrirOperador(o)" class="font-semibold text-left hover:text-vision-400">{{ o.operador }}</button></td>
            <td class="p-3">{{ o.chamados }}</td><td class="p-3 tabular-nums">{{ hms(o.media) }}</td>
            <td class="p-3 tabular-nums">{{ hms(o.mediaCom) }}</td><td class="p-3 tabular-nums">{{ hms(o.mediaSem) }}</td>
          </tr>
        } @empty { <tr><td colspan="5" class="p-6 text-center text-white/50">Nenhum chamado encerrado neste período.</td></tr> }
        </tbody>
      </table>
    </div>
  }

  @if (opSel(); as o) {
    <h3 class="mt-8 font-semibold">{{ o.operador }} — chamados por dia</h3>
    <ul class="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
      @for (d of o.dias; track d.data) {
        <li><button (click)="abrirDia(d.data)" [class]="d.data === diaSel() ? 'bg-vision-500/15' : 'hover:bg-white/5'" class="w-full flex gap-6 p-3 text-left">
          <span class="w-28">{{ fd(d.data) }}</span><span class="w-28">{{ d.chamados }} {{ d.chamados === 1 ? 'chamado' : 'chamados' }}</span>
          <span class="tabular-nums text-white/70">média {{ hms(d.media) }}</span></button></li>
      }
    </ul>
  }

  @if (diaCarregando()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando o dia…</p> }
  @if (dia(); as x) {
    <h3 class="mt-8 font-semibold">Chamados de {{ fd(x.data) }}</h3>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Chamado</th><th class="p-3">Agendamento</th>
          <th class="p-3">Encerramento</th><th class="p-3">Status</th><th class="p-3">Tempo</th></tr></thead>
        <tbody>
        @for (c of x.chamados; track c.chamado) {
          <tr class="border-t border-white/10"><td class="p-3 font-semibold">{{ c.chamado }}</td>
            <td class="p-3 whitespace-nowrap">{{ c.agendamento | date:'dd/MM/yy HH:mm' }}</td>
            <td class="p-3 whitespace-nowrap">{{ c.resolvido | date:'dd/MM/yy HH:mm' }}</td>
            <td class="p-3">{{ c.status }}</td><td class="p-3 tabular-nums">{{ hms(c.seg) }}</td></tr>
        }
        </tbody>
      </table>
    </div>
  }`
})
export class EncerramentoComponent {
  private auth = inject(AuthService);
  ano = ano; ini = signal(trinta < ano + '-01-01' ? ano + '-01-01' : trinta); fim = signal(hoje);
  r = signal<any>(null); opSel = signal<any>(null); diaSel = signal(''); dia = signal<any>(null);
  carregando = signal(false); diaCarregando = signal(false); erro = signal('');

  kpis = () => { const r = this.r(); return [
    { rotulo: 'Chamados encerrados', valor: r.chamados }, { rotulo: 'Média geral', valor: this.hms(r.media) },
    { rotulo: 'Média com reagendamento', valor: this.hms(r.mediaCom) }, { rotulo: 'Média sem reagendamento', valor: this.hms(r.mediaSem) },
    { rotulo: 'Operadores envolvidos', valor: r.operadoresEnvolvidos }]; };

  hms = (s: number | null) => s == null ? '—' : [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
  fd = (d: string) => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
  private msg(e: any) { const m = String(e?.detail || e?.error || e); return m.includes('PERÍODO_INVÁLIDO') || m.includes('ANO_NÃO_PERMITIDO') || m.includes('DATA_INVÁLIDA')
    ? 'Escolha um período válido dentro de ' + ano + '.' : 'Não foi possível calcular. Detalhe: ' + m.slice(0, 300); }

  async gerar() {
    this.carregando.set(true); this.erro.set(''); this.opSel.set(null); this.dia.set(null); this.diaSel.set('');
    try { const r = await this.auth.call('relEncerramento', { inicio: this.ini(), fim: this.fim() }); if (!r.ok) throw r; this.r.set(r); }
    catch (e) { this.erro.set(this.msg(e)); }
    this.carregando.set(false);
  }
  abrirOperador(o: any) { this.opSel.set(o); this.dia.set(null); this.diaSel.set(''); }
  async abrirDia(d: string) {
    this.diaSel.set(d); this.diaCarregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('relEncerramentoDia', { data: d, operador: this.opSel().operador }); if (!r.ok) throw r; this.dia.set(r); }
    catch (e) { this.erro.set(this.msg(e)); }
    this.diaCarregando.set(false);
  }
}

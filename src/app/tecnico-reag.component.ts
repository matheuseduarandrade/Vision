import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { BarrasComponent } from './barras.component';

const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

@Component({
  selector: 'app-tecnico-reag', standalone: true, imports: [FormsModule, BarrasComponent],
  template: `
  <h2 class="text-2xl font-bold">Reagendamentos por técnico</h2>
  <p class="mt-1 text-sm text-white/60">Só chamados com necessidade do cliente ou da Queo, pela data de agendamento.</p>
  <div class="mt-6 flex flex-wrap items-end gap-3 text-sm">
    <label class="flex flex-col gap-1">De <input type="date" [ngModel]="ini()" (ngModelChange)="ini.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <label class="flex flex-col gap-1">Até <input type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <button (click)="gerar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 font-semibold">{{ carregando() ? 'Gerando…' : 'Gerar' }}</button>
  </div>
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (r(); as r) {
    <div class="mt-8 grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-white/10 text-center max-w-md">
      <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ r.total }}</p><p class="mt-1 text-xs text-white/60">Reagendamentos no período</p></div>
      <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ r.nTecnicos }}</p><p class="mt-1 text-xs text-white/60">Técnicos envolvidos</p></div>
    </div>
    @if (r.semTecnico) { <p class="mt-2 text-xs text-white/50">{{ r.semTecnico }} reagendamentos sem técnico em campo informado ficam fora do ranking.</p> }

    <h3 class="mt-8 font-semibold">Top 10 técnicos com mais reagendamentos</h3>
    <div class="mt-3"><app-barras [itens]="top10()" [ouroPrimeiro]="true" /></div>

    <h3 class="mt-10 font-semibold">Ranking completo</h3>
    <p class="text-sm text-white/60">Clique em um técnico para ver os detalhes.</p>
    <div class="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="sticky top-0 bg-vision-900 text-white/60"><tr><th class="p-3 w-12">#</th><th class="p-3">Técnico</th><th class="p-3">Tipo</th><th class="p-3">Reagendamentos</th></tr></thead>
        <tbody>
        @for (t of r.ranking; track t.key; let i = $index) {
          <tr class="border-t border-white/10" [class]="t.key === sel()?.key ? 'bg-vision-500/15' : ''">
            <td class="p-3 text-white/50">{{ i + 1 }}</td>
            <td class="p-3"><button (click)="sel.set(t)" class="font-semibold text-left hover:text-vision-400">{{ t.nome }}</button></td>
            <td class="p-3"><span class="rounded-full px-2.5 py-1 text-xs" [class]="t.tipo === 'PROPRIO' ? 'bg-vision-400/20 text-vision-50' : 'bg-amber-400/20 text-amber-200'">{{ t.tipo === 'PROPRIO' ? 'Próprio' : 'Terceiro' }}</span></td>
            <td class="p-3 tabular-nums">{{ t.total }}</td></tr>
        }
        </tbody>
      </table>
    </div>
  }

  @if (sel(); as t) {
    <h3 class="mt-10 text-lg font-semibold">{{ t.nome }}</h3>
    <p class="text-sm text-white/70">{{ t.total }} reagendamentos · {{ t.cliente }} por necessidade do cliente · {{ t.queo }} por necessidade da Queo</p>
    <div class="mt-4 grid lg:grid-cols-2 gap-10">
      <section><h4 class="font-semibold mb-3">Motivos (necessidade do cliente)</h4><app-barras [itens]="t.motivosCliente" /></section>
      <section><h4 class="font-semibold mb-3">Motivos (necessidade da Queo)</h4><app-barras [itens]="t.motivosQueo" /></section>
      <section><h4 class="font-semibold mb-3">Reagendamentos por mês</h4><app-barras [itens]="meses()" /></section>
    </div>
  }`
})
export class TecnicoReagComponent {
  private auth = inject(AuthService);
  ini = signal(fmt(new Date(Date.now() - 29 * 864e5))); fim = signal(fmt(new Date()));
  r = signal<any>(null); sel = signal<any>(null); carregando = signal(false); erro = signal('');
  top10 = computed(() => (this.r()?.ranking ?? []).slice(0, 10).map((t: any) => ({ nome: t.nome, total: t.total })));
  meses = computed(() => (this.sel()?.meses ?? []).map((m: any) => ({ nome: MES[+m.mes.slice(5) - 1] + '/' + m.mes.slice(2, 4), total: m.total })));

  async gerar() {
    this.carregando.set(true); this.erro.set(''); this.sel.set(null);
    try { const r = await this.auth.call('tecReag', { inicio: this.ini(), fim: this.fim() }); if (!r.ok) throw r; this.r.set(r); }
    catch (e: any) { const m = String(e?.detail || e?.error || e);
      this.erro.set(m.includes('PERÍODO_INVÁLIDO') ? 'Escolha um período válido de até 1 ano.' : 'Não foi possível gerar. Detalhe: ' + m.slice(0, 300)); }
    this.carregando.set(false);
  }
}

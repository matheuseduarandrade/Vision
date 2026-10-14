import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';

const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

@Component({
  selector: 'app-desempenho', standalone: true, imports: [FormsModule, DatePipe],
  template: `
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold">Desempenho dos operadores</h2>
      <p class="text-sm text-white/60">Atendimentos de janeiro até hoje, pela data de agendamento. Meta: {{ d()?.meta || 15 }} por dia.
        @if (d()?.atualizadoEm) { Dados de {{ d().atualizadoEm | date:'dd/MM HH:mm' }}. }</p>
    </div>
    <label class="text-sm flex items-center gap-3">Operador
      <select [ngModel]="operador()" (ngModelChange)="trocar($event)" class="bg-vision-900 rounded px-3 py-2">
        <option value="">Todos</option>
        @for (o of d()?.operadores ?? []; track o) { <option [value]="o">{{ o }}</option> }
      </select>
    </label>
  </header>

  @if (carregando()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando…</p> }
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }
  @if (d()?.vazio) { <p class="mt-6 text-white/70">Os dados do ano ainda não foram carregados. Rode <code>reconstruirAno()</code> no Apps Script.</p> }

  @if (d(); as d) {
   @if (!d.vazio) {
    <div class="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-px rounded-xl overflow-hidden bg-white/10 text-center">
      @for (k of kpis(); track k.rotulo) {
        <div class="bg-vision-950 p-4"><p class="text-2xl font-bold tabular-nums">{{ k.valor }}</p><p class="mt-1 text-xs text-white/60">{{ k.rotulo }}</p></div>
      }
    </div>

    <h3 class="mt-10 font-semibold">Desempenho por operador</h3>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Operador</th><th class="p-3">Meta/dia</th><th class="p-3">Atendimento/dia</th>
          <th class="p-3">Reagendamentos</th><th class="p-3">Pend. encerramento</th><th class="p-3">NEWFLOW</th><th class="p-3 w-64">Total de atendimentos</th>
          <th class="p-3">Média diária</th><th class="p-3">% da meta</th></tr></thead>
        <tbody>
        @for (o of d.operadoresTabela; track o.operador) {
          <tr class="border-t border-white/10">
            <td class="p-3 font-semibold">{{ o.operador }}</td><td class="p-3">{{ d.meta }}</td>
            <td class="p-3 tabular-nums" [class]="o.saldoDia >= 0 ? 'text-emerald-300' : 'text-red-300'">{{ o.saldoDia > 0 ? '+' : '' }}{{ o.saldoDia }}</td>
            <td class="p-3">{{ o.reagendados }}</td><td class="p-3">{{ o.pendEnc }}</td><td class="p-3">{{ o.newflow }}</td>
            <td class="p-3"><div class="flex items-center gap-2"><span class="w-12 tabular-nums">{{ o.total }}</span>
              <span class="flex-1 h-2 rounded bg-white/10"><span class="block h-2 rounded" [class]="cor(o.pctMeta)" [style.width.%]="min100(o.pctMeta)"></span></span></div></td>
            <td class="p-3 tabular-nums">{{ o.mediaDia }}</td><td class="p-3 tabular-nums">{{ o.pctMeta }}%</td>
          </tr>
        }
        </tbody>
      </table>
    </div>

    <div class="mt-10 grid lg:grid-cols-2 gap-10">
      <section>
        <h3 class="font-semibold">Atendimentos por mês</h3>
        <div class="mt-4 flex gap-2">
          @for (m of colMeses(); track m.nome) {
            <div class="flex-1 text-center"><p class="text-xs tabular-nums">{{ m.total }}</p>
              <div class="h-40 flex items-end"><div class="w-full rounded-t bg-vision-500" [style.height.%]="m.pct"></div></div>
              <p class="mt-1 text-xs text-white/60">{{ m.nome }}</p></div>
          }
        </div>
      </section>
      <section>
        <h3 class="font-semibold">Demanda por dia da semana</h3>
        <div class="mt-4 flex gap-2">
          @for (s of colSemana().cols; track s.nome) {
            <div class="flex-1 text-center"><p class="text-xs tabular-nums">{{ s.total }}</p>
              <div class="h-40 flex items-end"><div class="w-full rounded-t" [class]="s.nome === colSemana().maior ? 'bg-amber-400' : 'bg-vision-500'" [style.height.%]="s.pct"></div></div>
              <p class="mt-1 text-xs text-white/60">{{ s.nome.slice(0, 3) }}</p></div>
          }
        </div>
        <p class="mt-3 text-sm text-white/70">Maior demanda: {{ colSemana().maior }} · Menor demanda: {{ colSemana().menor }}</p>
      </section>
    </div>

    <section class="mt-10">
      <h3 class="font-semibold">NEWFLOW — atendimentos por mês</h3>
      <p class="text-sm text-white/60">Lançados manualmente em Configurações. Entram nos totais e índices dos operadores.</p>
      @if (d.newflow.total > 0) {
        <div class="mt-4 flex flex-wrap gap-4 text-xs">
          @for (p of d.newflow.projetos; track p.nome) { <span class="flex items-center gap-2"><span class="h-3 w-3 rounded-[3px]" [class]="corNf(p.nome)"></span>{{ p.nome }}: <strong>{{ p.total }}</strong></span> }
        </div>
        <div class="mt-4 flex gap-2">
          @for (m of colNf(); track m.nome) {
            <div class="flex-1 text-center"><p class="text-xs tabular-nums">{{ m.total }}</p>
              <div class="flex h-40 flex-col-reverse justify-start overflow-hidden rounded-t">
                @for (s of m.segs; track s.nome) { <div [class]="s.cor" [style.height.%]="s.pct" [title]="s.nome + ': ' + s.valor"></div> }
              </div><p class="mt-1 text-xs text-white/60">{{ m.nome }}</p></div>
          }
        </div>
      } @else { <p class="mt-3 text-sm text-white/50">Nenhum lançamento NEWFLOW neste ano{{ operador() ? ' para este operador' : '' }}.</p> }
    </section>

    <h3 class="mt-10 font-semibold">Demanda por turno</h3>
    <p class="text-xs text-white/50">Turnos e clientes consideram apenas os chamados do Jira (o NEWFLOW não tem horário nem cliente).</p>
    <div class="mt-3 grid lg:grid-cols-2 gap-6">
      @for (t of d.turnos; track t.nome) {
        <div class="rounded-xl border border-white/10 p-4">
          <p class="font-semibold">{{ t.nome }}</p>
          <p class="mt-1 text-sm text-white/70">{{ t.operadores }} operadores · {{ t.chamados }} chamados · média {{ t.mediaOperador }} por operador</p>
          <div class="mt-3 flex items-center gap-3 text-sm"><span class="flex-1 h-3 rounded bg-white/10"><span class="block h-3 rounded" [class]="cor(t.ocupacao)" [style.width.%]="min100(t.ocupacao)"></span></span>
            <span class="tabular-nums">Ocupação estimada: {{ t.ocupacao }}%</span></div>
        </div>
      }
    </div>

    <h3 class="mt-10 font-semibold">Clientes mais atendidos</h3>
    <ul class="mt-3 max-h-96 overflow-auto space-y-1.5 pr-2">
      @for (c of barrasCli(); track c.nome) {
        <li class="flex items-center gap-3 text-sm"><span class="w-64 truncate" [title]="c.nome">{{ c.nome }}</span>
          <span class="flex-1 h-4 rounded bg-white/5"><span class="block h-4 rounded bg-vision-500" [style.width.%]="c.pct"></span></span>
          <span class="w-12 text-right tabular-nums">{{ c.total }}</span></li>
      }
    </ul>
   }
  }`
})
export class DesempenhoComponent implements OnInit {
  private auth = inject(AuthService);
  d = signal<any>(null); operador = signal(''); carregando = signal(false); erro = signal('');

  min100 = (n: number) => Math.min(100, n);
  cor = (p: number) => p >= 100 ? 'bg-emerald-400' : p >= 60 ? 'bg-vision-500' : 'bg-amber-400';
  hms = (s: number | null) => s == null ? '—' : [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');

  kpis = computed(() => { const d = this.d(); if (!d || d.vazio) return []; return [
    { rotulo: 'Total de atendimentos', valor: d.total }, { rotulo: 'Média por dia', valor: d.mediaDia },
    { rotulo: 'Tempo médio (estimativa)', valor: this.hms(d.tempoMedioSeg) }, { rotulo: 'Taxa de reagendamento', valor: d.taxa + '%' },
    { rotulo: 'Média vs meta', valor: d.mediaPorOperador + '/' + d.meta + ' = ' + d.pctMeta + '%' },
    { rotulo: 'Atendimentos NEWFLOW', valor: d.newflow.total }]; });
  colMeses = computed(() => { const l = this.d()?.meses ?? [], max = Math.max(1, ...l.map((x: any) => x.total));
    return l.map((x: any) => ({ nome: MES[+x.mes.slice(5) - 1], total: x.total, pct: x.total * 100 / max })); });
  corNf = (p: string) => p.includes('SOLAR') ? 'bg-amber-400' : p.includes('ANDINA') ? 'bg-vision-500' : 'bg-emerald-400';
  colNf = computed(() => { const l: any[] = this.d()?.newflow?.meses ?? [], max = Math.max(1, ...l.map(x => x.total));
    return l.map(x => ({ nome: MES[+x.mes.slice(5) - 1], total: x.total,
      segs: Object.keys(x.porProjeto).filter(k => x.porProjeto[k] > 0).map(k => ({ nome: k, valor: x.porProjeto[k], pct: x.porProjeto[k] * 100 / max, cor: this.corNf(k) })) })); });
  colSemana = computed(() => { const l: any[] = this.d()?.semana ?? [], max = Math.max(1, ...l.map(x => x.total));
    const ord = [...l].sort((a, b) => b.total - a.total);
    return { cols: l.map(x => ({ ...x, pct: x.total * 100 / max })), maior: ord[0]?.nome ?? '—', menor: ord[ord.length - 1]?.nome ?? '—' }; });
  barrasCli = computed(() => { const l = this.d()?.clientes ?? [], max = Math.max(1, ...l.map((x: any) => x.total));
    return l.map((x: any) => ({ ...x, pct: x.total * 100 / max })); });

  ngOnInit() { this.carregar(); }
  trocar(o: string) { this.operador.set(o); this.carregar(); }
  async carregar() {
    this.carregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('relDesempenho', { operador: this.operador() }); if (!r.ok) throw r; this.d.set(r); }
    catch (e: any) { this.erro.set('Não foi possível carregar. Detalhe: ' + String(e?.detail || e?.error || e).slice(0, 300)); }
    this.carregando.set(false);
  }
}

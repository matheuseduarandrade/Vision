import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';

interface Chamado { chamado: string; descricao: string; agendamento: string; tecnico: string; responsavel: string;
  status: string; grupo: string; cliente: string; reagendado: boolean; }
type Aba = 'dia' | 'data' | 'pend';
const hojeStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const ROTULO: Record<string, string> = { PEND_ATEND: 'Pendente de atendimento', PEND_ENC: 'Pendente de encerramento', CONCLUIDO: 'Concluído', OUTRO: 'Outro' };
const COR: Record<string, string> = { PEND_ATEND: 'bg-amber-400/20 text-amber-200', PEND_ENC: 'bg-vision-400/20 text-vision-50',
  CONCLUIDO: 'bg-emerald-400/20 text-emerald-200', OUTRO: 'bg-white/10 text-white/70' };

@Component({
  selector: 'app-monitoramento', standalone: true, imports: [FormsModule, DatePipe],
  template: `
  <header class="flex items-end justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold">Monitoramento</h2>
      <p class="text-sm text-white/50">@if (atualizado()) { Atualizado às {{ atualizado() | date:'HH:mm' }} }</p>
    </div>
    <button (click)="carregar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold">
      {{ carregando() ? 'Atualizando…' : 'Atualizar' }}</button>
  </header>

  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (kpis().length) {
    <div class="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-px rounded-xl overflow-hidden bg-white/10 text-center">
      @for (k of kpis(); track k.rotulo) {
        <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ k.valor }}</p><p class="mt-1 text-xs text-white/60">{{ k.rotulo }}</p></div>
      }
    </div>
  }

  <nav class="mt-8 flex gap-2 text-sm" aria-label="Visões do monitoramento">
    @for (t of abasTopo; track t.id) {
      <button (click)="mudarAba(t.id)" [class]="aba() === t.id ? 'bg-vision-500 font-semibold' : 'bg-white/5 hover:bg-white/10'" class="rounded-lg px-4 py-2">{{ t.nome }}</button>
    }
  </nav>

  @if (aba() === 'data') {
    <label class="mt-6 flex items-center gap-3 text-sm">Data de agendamento
      <input type="date" [ngModel]="data()" (ngModelChange)="mudarData($event)" class="bg-vision-900 rounded px-3 py-1.5">
    </label>
  }

  @if (aba() !== 'pend' && dia(); as d) {
    <p class="mt-6 text-sm text-white/70">{{ d.totais.total }} chamados · {{ d.totais.pendAtend }} pendentes de atendimento · {{ d.totais.pendEnc }} pendentes de encerramento · {{ d.totais.concluidos }} concluídos</p>
  }

  @if (barras().length) {
    <h3 class="mt-8 font-semibold">{{ aba() === 'pend' ? 'Pendentes de encerramento por operador' : 'Chamados por cliente' }}</h3>
    <ul class="mt-3 space-y-1.5">
      @for (b of barras(); track b.nome) {
        <li><button (click)="abrirOperador(b.nome)" [disabled]="aba() !== 'pend'" class="group w-full flex items-center gap-3 text-left text-sm">
          <span class="w-56 truncate" [class]="b.nome === operSel() ? 'text-vision-400 font-semibold' : ''">{{ b.nome }}</span>
          <span class="flex-1 h-5 rounded bg-white/5"><span class="block h-5 rounded" [class]="b.ouro ? 'bg-amber-400' : 'bg-vision-500'" [style.width.%]="b.pct"></span></span>
          <span class="w-10 text-right tabular-nums">{{ b.total }}</span>
        </button></li>
      }
    </ul>
  }

  @if (aba() !== 'pend' || operSel()) {
    <h3 class="mt-8 font-semibold">{{ aba() === 'pend' ? 'Chamados pendentes de ' + operSel() : 'Lista de chamados' }}</h3>
    <div class="mt-3 flex flex-wrap gap-3 text-sm">
      <input [ngModel]="busca()" (ngModelChange)="busca.set($event)" placeholder="Buscar chamado, descrição ou técnico" class="bg-vision-900 rounded px-3 py-2 w-72">
      <select [ngModel]="fStatus()" (ngModelChange)="fStatus.set($event)" class="bg-vision-900 rounded px-3 py-2">
        <option value="">Todos os status</option>
        @if (aba() === 'pend') {
          @for (s of statusPend(); track s) { <option [value]="s">{{ s }}</option> }
        } @else {
          @for (g of grupos; track g) { <option [value]="g">{{ rotulo(g) }}</option> }
        }
      </select>
      @if (aba() !== 'pend') {
        <select [ngModel]="fOper()" (ngModelChange)="fOper.set($event)" class="bg-vision-900 rounded px-3 py-2">
          <option value="">Todos os operadores</option>
          @for (o of operadores(); track o) { <option [value]="o">{{ o }}</option> }
        </select>
      }
    </div>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr>
          <th class="p-3">Chamado</th><th class="p-3">Descrição</th><th class="p-3">Agendamento</th><th class="p-3">Técnico</th>
          @if (aba() !== 'pend') { <th class="p-3">Responsável</th> }<th class="p-3">Status</th></tr></thead>
        <tbody>
        @for (c of linhas(); track c.chamado) {
          <tr class="border-t border-white/10">
            <td class="p-3 font-semibold whitespace-nowrap">{{ c.chamado }}</td>
            <td class="p-3 max-w-md truncate" [title]="c.descricao">{{ c.descricao }}</td>
            <td class="p-3 whitespace-nowrap">{{ c.agendamento ? (c.agendamento | date:'dd/MM/yy HH:mm') : '—' }}</td>
            <td class="p-3">{{ c.tecnico || '—' }}</td>
            @if (aba() !== 'pend') { <td class="p-3">{{ c.responsavel }}</td> }
            <td class="p-3"><span class="rounded-full px-2.5 py-1 text-xs whitespace-nowrap" [class]="cor(c.grupo)">{{ c.status }}</span></td>
          </tr>
        } @empty { <tr><td colspan="6" class="p-6 text-center text-white/50">Nenhum chamado encontrado com esses filtros.</td></tr> }
        </tbody>
      </table>
    </div>
  } @else if (aba() === 'pend' && pend()) {
    <p class="mt-6 text-sm text-white/60">Clique em um operador para ver os chamados pendentes de encerramento dele.</p>
  }`
})
export class MonitoramentoComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  abasTopo: { id: Aba; nome: string }[] = [{ id: 'dia', nome: 'Chamados do dia' }, { id: 'data', nome: 'Por data' }, { id: 'pend', nome: 'Pendentes por operador' }];
  grupos = ['PEND_ATEND', 'PEND_ENC', 'CONCLUIDO'];
  aba = signal<Aba>('dia'); data = signal(hojeStr());
  resumo = signal<any>(null); dia = signal<any>(null); pend = signal<any>(null);
  carregando = signal(false); erro = signal(''); atualizado = signal<Date | null>(null);
  busca = signal(''); fStatus = signal(''); fOper = signal(''); operSel = signal<string | null>(null);
  private timer: any;

  rotulo = (g: string) => ROTULO[g]; cor = (g: string) => COR[g] || COR['OUTRO'];

  kpis = computed(() => {
    const r = this.resumo(); if (!r) return [];
    return [{ rotulo: 'Chamados de hoje', valor: r.hoje }, { rotulo: 'Pendentes de atendimento', valor: r.pendAtend },
      { rotulo: 'Pendentes de encerramento', valor: r.pendEnc }, { rotulo: 'Concluídos', valor: r.concluidos },
      { rotulo: 'Reagendamento (30 dias)', valor: r.taxa30 + '%' }];
  });
  barras = computed(() => {
    const l: { nome: string; total: number }[] = this.aba() === 'pend' ? (this.pend()?.operadores ?? []) : (this.dia()?.clientes ?? []);
    const max = Math.max(1, ...l.map(x => x.total));
    return l.map((x, i) => ({ ...x, pct: x.total * 100 / max, ouro: this.aba() === 'pend' && i === 0 }));
  });
  private base = computed<Chamado[]>(() => this.aba() === 'pend'
    ? (this.pend()?.operadores.find((o: any) => o.nome === this.operSel())?.chamados ?? []) : (this.dia()?.chamados ?? []));
  operadores = computed(() => [...new Set(this.base().map(c => c.responsavel))].sort());
  statusPend = computed(() => [...new Set(this.base().map(c => c.status))].sort());
  linhas = computed(() => {
    const b = this.busca().toLowerCase(), s = this.fStatus(), o = this.fOper(), pend = this.aba() === 'pend';
    return this.base().filter(c => (!s || (pend ? c.status === s : c.grupo === s)) && (!o || c.responsavel === o) &&
      (!b || (c.chamado + ' ' + c.descricao + ' ' + c.tecnico).toLowerCase().includes(b)));
  });

  ngOnInit() { this.carregar(); this.timer = setInterval(() => this.carregar(), 3600000); }
  ngOnDestroy() { clearInterval(this.timer); }

  mudarAba(a: Aba) { this.aba.set(a); this.busca.set(''); this.fStatus.set(''); this.fOper.set(''); this.operSel.set(null); this.carregar(); }
  mudarData(d: string) { if (d) { this.data.set(d); this.carregar(); } }
  abrirOperador(nome: string) { if (this.aba() === 'pend') { this.operSel.set(nome); this.fStatus.set(''); } }

  async carregar() {
    this.carregando.set(true); this.erro.set('');
    try {
      const r = await this.auth.call('monResumo'); if (!r.ok) throw r; this.resumo.set(r);
      if (this.aba() === 'pend') { const p = await this.auth.call('monPendentes'); if (!p.ok) throw p; this.pend.set(p); }
      else { const d = await this.auth.call('monDia', { data: this.aba() === 'dia' ? hojeStr() : this.data() }); if (!d.ok) throw d; this.dia.set(d); }
      this.atualizado.set(new Date());
    } catch (e: any) {
      const motivo = String(e?.detail || e?.error || e);
      this.erro.set(motivo.includes('SEM_PERMISSÃO') ? 'Seu perfil não tem acesso ao Monitoramento.'
        : 'Não foi possível carregar os dados do Jira. Detalhe: ' + motivo.slice(0, 300));
    }
    this.carregando.set(false);
  }
}

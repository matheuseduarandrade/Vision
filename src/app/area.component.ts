import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { BarrasComponent } from './barras.component';
import { TabelaChamadosComponent } from './tabela-chamados.component';

type Visao = 'status' | 'projeto' | 'resp' | 'cliente' | 'cruzado';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const grupo = (l: any[], fn: (c: any) => string) => { const m: Record<string, number> = {};
  l.forEach(c => { const k = fn(c) || '—'; m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map(n => ({ nome: n, total: m[n] })).sort((a, b) => b.total - a.total); };

@Component({
  selector: 'app-area', standalone: true, imports: [DatePipe, BarrasComponent, TabelaChamadosComponent],
  template: `
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold">{{ titulo }}</h2>
      <p class="text-sm text-white/60">{{ subtitulo() }} @if (d()?.atualizadoEm) { Atualizado às {{ d().atualizadoEm | date:'HH:mm':'-0300' }}. }</p>
    </div>
    <button (click)="carregar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold">{{ carregando() ? 'Atualizando…' : 'Atualizar' }}</button>
  </header>
  @if (categoria()) {
    <p class="mt-3 inline-flex items-center gap-2 rounded-full border border-vision-400/40 bg-vision-500/10 px-3 py-1 text-xs">Filtro: somente "a fazer"
      <button (click)="categoria.set('')" class="font-bold hover:text-vision-400" aria-label="Remover filtro">×</button></p>
  }
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }
  @if (carregando() && !d()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando chamados do Jira…</p> }

  @if (d(); as d) {
    <div class="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden bg-white/10 text-center">
      @for (k of kpis(); track k.rotulo) { <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ k.valor }}</p><p class="mt-1 text-xs text-white/60">{{ k.rotulo }}</p></div> }
    </div>

    <nav class="mt-8 flex flex-wrap gap-2 text-sm" aria-label="Visões">
      @for (v of visoes(); track v.id) {
        <button (click)="mudar(v.id)" [class]="visao() === v.id ? 'bg-vision-500 font-semibold' : 'bg-white/5 hover:bg-white/10'" class="rounded-lg px-4 py-2">{{ v.nome }}</button>
      }
    </nav>

    @if (visao() === 'cruzado') {
      <div class="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table class="w-full text-sm text-left">
          <thead class="bg-white/5 text-white/60"><tr><th class="p-3">{{ rotResp }}</th>
            @for (p of d.projetos; track p) { <th class="p-3">{{ p }}</th> }<th class="p-3">Total</th></tr></thead>
          <tbody>
          @for (l of cruzado(); track l.nome) {
            <tr class="border-t border-white/10"><td class="p-3 font-semibold">{{ l.nome }}</td>
              @for (n of l.celulas; track $index) { <td class="p-3 tabular-nums">{{ n }}</td> }<td class="p-3 font-semibold tabular-nums">{{ l.total }}</td></tr>
          }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="mt-6 text-sm text-white/60">Clique em um item para ver os chamados.</p>
      <ul class="mt-3 space-y-1.5">
        @for (i of itens(); track i.nome) {
          <li><button (click)="sel.set(i.nome)" class="w-full flex items-center gap-3 text-left text-sm rounded px-1 py-0.5" [class]="i.nome === sel() ? 'bg-vision-500/20' : 'hover:bg-white/5'">
            <span class="w-64 shrink-0 truncate" [title]="i.nome">{{ i.nome }}</span>
            <span class="flex-1 h-4 rounded bg-white/5"><span class="block h-4 rounded bg-vision-500" [style.width.%]="i.pct"></span></span>
            <span class="w-12 text-right tabular-nums">{{ i.total }}</span></button>
            @if (visao() === 'cliente') { <p class="pl-1 text-xs text-white/50">{{ detalheCliente(i.nome) }}</p> }</li>
        }
      </ul>

      @if (sel()) {
        <h3 class="mt-10 text-lg font-semibold">{{ sel() }} <span class="text-white/50 text-sm">({{ filtrados().length }} chamados)</span></h3>
        <div class="mt-4 grid lg:grid-cols-2 gap-10">
          @for (q of quebras(); track q.titulo) { <section><h4 class="font-semibold mb-3">{{ q.titulo }}</h4><app-barras [itens]="q.itens" /></section> }
        </div>
        <div class="mt-8"><app-tabela-chamados [linhas]="filtrados()" /></div>
      }
    }
  }`
})
export class AreaComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService); private rota = inject(ActivatedRoute);
  area = this.rota.snapshot.data['area'] as 'PLANEJAMENTO' | 'CREDENCIAMENTO';
  titulo = this.area === 'PLANEJAMENTO' ? 'Planejamento' : 'Credenciamento';
  rotResp = this.area === 'PLANEJAMENTO' ? 'Planejadora' : 'Responsável';
  d = signal<any>(null); visao = signal<Visao>('status'); sel = signal<string | null>(null);
  periodo = signal(''); categoria = signal(''); carregando = signal(false); erro = signal('');
  private timer: any; private sub?: Subscription; private inicial: { visao?: Visao; sel?: string } = {};

  subtitulo = computed(() => this.periodo() === 'mes'
    ? 'Chamados criados em ' + MESES[new Date().getMonth()] + ' (qualquer status).' : 'Chamados em aberto.');
  private chamados = computed<any[]>(() => { const l: any[] = this.d()?.chamados ?? [], c = this.categoria(); return c ? l.filter(x => x.categoria === c) : l; });
  kpis = computed(() => { const l = this.chamados(); return [
    { rotulo: this.periodo() === 'mes' ? 'Chamados do mês' : 'Chamados em aberto', valor: l.length }, { rotulo: 'Status diferentes', valor: new Set(l.map(c => c.status)).size },
    { rotulo: this.rotResp + 's', valor: new Set(l.map(c => c.responsavel)).size }, { rotulo: 'Clientes', valor: new Set(l.map(c => c.cliente)).size }]; });
  visoes = computed(() => {
    const l: { id: Visao; nome: string }[] = [{ id: 'status', nome: 'Por status' }], multi = (this.d()?.projetos?.length ?? 0) > 1;
    if (multi) l.push({ id: 'projeto', nome: 'Por projeto' });
    l.push({ id: 'resp', nome: 'Por ' + this.rotResp.toLowerCase() }, { id: 'cliente', nome: 'Por cliente' });
    if (multi) l.push({ id: 'cruzado', nome: this.rotResp + ' x projeto' });
    return l; });
  private chave = (v: Visao) => (c: any) => v === 'status' ? c.status : v === 'projeto' ? c.projeto : v === 'resp' ? c.responsavel : c.cliente;
  itens = computed(() => { const l = grupo(this.chamados(), this.chave(this.visao())), max = Math.max(1, ...l.map(x => x.total));
    return l.map(x => ({ ...x, pct: x.total * 100 / max })); });
  filtrados = computed(() => this.chamados().filter(c => this.chave(this.visao())(c) === this.sel()));
  quebras = computed(() => { const l = this.filtrados(), v = this.visao(); const g = (t: string, f: (c: any) => string) => ({ titulo: t, itens: grupo(l, f) });
    return v === 'status' ? [g('Clientes', c => c.cliente), g(this.rotResp + 's', c => c.responsavel)]
      : v === 'projeto' ? [g('Status', c => c.status), g(this.rotResp + 's', c => c.responsavel)] : [g('Projetos', c => c.projeto), g('Status', c => c.status)]; });
  cruzado = computed(() => { const ps: string[] = this.d()?.projetos ?? [];
    return grupo(this.chamados(), c => c.responsavel).map(r => { const doResp = this.chamados().filter(c => c.responsavel === r.nome);
      return { nome: r.nome, total: r.total, celulas: ps.map(p => doResp.filter(c => c.projeto === p).length) }; }); });

  detalheCliente(nome: string) { const l = this.chamados().filter(c => c.cliente === nome);
    const f = (g: { nome: string; total: number }[]) => g.map(x => x.nome + ' ' + x.total).join(' · ');
    return (this.d()?.projetos?.length > 1 ? f(grupo(l, c => c.projeto)) + '  |  ' : '') + f(grupo(l, c => c.status)); }

  mudar(v: Visao) { this.visao.set(v); this.sel.set(null); }

  ngOnInit() {
    // filtros vindos da tela inicial: ?periodo=mes&visao=projeto&sel=REAGENDAR&categoria=new
    this.sub = this.rota.queryParamMap.subscribe(p => {
      this.periodo.set(p.get('periodo') === 'mes' ? 'mes' : ''); this.categoria.set(p.get('categoria') ?? '');
      const v = p.get('visao') as Visao | null; this.inicial = { visao: v && ['status', 'projeto', 'resp', 'cliente'].includes(v) ? v : undefined, sel: p.get('sel') ?? undefined };
      this.visao.set('status'); this.sel.set(null); this.carregar();
    });
    this.timer = setInterval(() => this.carregar(), 3600000);
  }
  ngOnDestroy() { clearInterval(this.timer); this.sub?.unsubscribe(); }

  async carregar() {
    this.carregando.set(true); this.erro.set('');
    try {
      const r = await this.auth.call('areaDados', { area: this.area, periodo: this.periodo() }); if (!r.ok) throw r; this.d.set(r);
      if (this.inicial.visao && this.visoes().some(v => v.id === this.inicial.visao)) { this.visao.set(this.inicial.visao); if (this.inicial.sel) this.sel.set(this.inicial.sel); }
      this.inicial = {};
    } catch (e: any) { const m = String(e?.detail || e?.error || e);
      this.erro.set(m.includes('SEM_PERMISSÃO') ? 'Seu perfil não tem acesso a esta aba.' : 'Não foi possível carregar. Detalhe: ' + m.slice(0, 300)); }
    this.carregando.set(false);
  }
}

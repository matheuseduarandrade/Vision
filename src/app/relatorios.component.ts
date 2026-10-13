import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { NavService } from './nav.service';
import { IconComponent } from './icon.component';
import { CATALOGO, MESES, Params, Relatorio, Secao } from './relatorios.catalogo';
import { Formato, Meta, exportar } from './exportador';

const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const ROTULO_AREA: Record<string, string> = { MONITORAMENTO: 'Monitoramento', TECNICO: 'Técnico', PLANEJAMENTO: 'Planejamento', CREDENCIAMENTO: 'Credenciamento', GERAL: 'Dados gerais' };
const FORMATOS: { id: Formato; nome: string }[] = [{ id: 'pdf', nome: 'PDF' }, { id: 'html', nome: 'HTML' }, { id: 'csv', nome: 'CSV' }, { id: 'json', nome: 'JSON' }];

@Component({
  selector: 'app-relatorios', standalone: true, imports: [FormsModule, IconComponent],
  template: `
  <h2 class="text-2xl font-bold">Relatórios</h2>
  <p class="mt-1 text-sm text-white/60">Escolha o relatório, os dados que deseja incluir e o formato do arquivo.</p>

  <div class="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
    <aside class="space-y-5">
      @for (g of grupos(); track g.area) {
        <div>
          <p class="px-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">{{ g.nome }}</p>
          <ul class="mt-2 space-y-1.5">
            @for (r of g.itens; track r.id) {
              <li><button (click)="escolher(r)" class="w-full rounded-xl border px-4 py-3 text-left text-sm"
                [class]="sel()?.id === r.id ? 'border-vision-400 bg-vision-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'">
                <span class="block font-semibold">{{ r.titulo }}</span></button></li>
            }
          </ul>
        </div>
      } @empty { <p class="text-sm text-white/60">Seu perfil ainda não tem relatórios disponíveis.</p> }
    </aside>

    <section>
      @if (sel(); as r) {
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 class="text-xl font-semibold">{{ r.titulo }}</h3>
          <p class="mt-1 text-sm text-white/60">{{ r.descricao }}</p>

          @if (r.params.length) {
            <h4 class="mt-6 text-sm font-semibold">Parâmetros</h4>
            <div class="mt-2 flex flex-wrap items-end gap-4 text-sm">
              @if (r.params.includes('data')) { <label class="flex flex-col gap-1">Data <input type="date" [ngModel]="p().data" (ngModelChange)="mudarParam({ data: $event })" class="rounded-lg bg-vision-900 px-3 py-2"></label> }
              @if (r.params.includes('periodo')) {
                <label class="flex flex-col gap-1">De <input type="date" [ngModel]="p().inicio" (ngModelChange)="mudarParam({ inicio: $event })" class="rounded-lg bg-vision-900 px-3 py-2"></label>
                <label class="flex flex-col gap-1">Até <input type="date" [ngModel]="p().fim" (ngModelChange)="mudarParam({ fim: $event })" class="rounded-lg bg-vision-900 px-3 py-2"></label>
              }
              @if (r.params.includes('mes')) {
                <label class="flex flex-col gap-1">Mês ({{ ano }})
                  <select [ngModel]="p().mes" (ngModelChange)="mudarParam({ mes: +$event })" class="rounded-lg bg-vision-900 px-3 py-2">
                    @for (m of meses; track $index) { <option [ngValue]="$index + 1">{{ m }}</option> }</select></label>
              }
              @if (r.params.includes('operador')) {
                <label class="flex flex-col gap-1">Operador
                  <select [ngModel]="p().operador" (ngModelChange)="mudarParam({ operador: $event })" class="min-w-56 rounded-lg bg-vision-900 px-3 py-2">
                    <option value="">Todos</option>@for (o of operadores(); track o) { <option [value]="o">{{ o }}</option> }</select></label>
              }
              @if (r.params.includes('tecnico')) {
                <label class="flex flex-col gap-1">Técnico
                  <select [ngModel]="p().tecnico" (ngModelChange)="mudarParam({ tecnico: $event })" class="min-w-64 rounded-lg bg-vision-900 px-3 py-2">
                    <option value="">Escolha um técnico</option>@for (t of tecnicos(); track t.key) { <option [value]="t.key">{{ t.nome }}</option> }</select></label>
              }
            </div>
          }

          <div class="mt-6 flex items-center justify-between">
            <h4 class="text-sm font-semibold">Dados do relatório</h4>
            <button (click)="todos(r)" class="text-xs text-vision-400 hover:underline">{{ marcados().size === r.secoes.length ? 'Desmarcar todos' : 'Marcar todos' }}</button>
          </div>
          <ul class="mt-2 grid gap-2 sm:grid-cols-2">
            @for (s of r.secoes; track s.id) {
              <li><label class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
                <input type="checkbox" [checked]="marcados().has(s.id)" (change)="alternarSecao(s.id)"> {{ s.titulo }}</label></li>
            }
          </ul>

          <h4 class="mt-6 text-sm font-semibold">Gerar arquivo</h4>
          <div class="mt-2 flex flex-wrap gap-3">
            @for (f of formatos; track f.id) {
              <button (click)="gerar(f.id)" [disabled]="ocupado() || !marcados().size"
                class="inline-flex items-center gap-2 rounded-lg bg-vision-500 px-5 py-2.5 text-sm font-semibold hover:bg-vision-400 disabled:opacity-50">
                <app-icon nome="baixar" [tam]="16" /> {{ ocupado() === f.id ? 'Gerando…' : f.nome }}</button>
            }
          </div>
          @if (!marcados().size) { <p class="mt-2 text-xs text-white/50">Marque ao menos um dado para gerar.</p> }
          @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200" role="alert">{{ erro() }}</p> }
          @if (ok()) { <p class="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300" role="status">{{ ok() }}</p> }
        </div>

        @if (previa(); as pv) {
          <h3 class="mt-8 font-semibold">Pré-visualização</h3>
          @for (s of pv; track s.id) {
            <h4 class="mt-5 text-sm font-semibold text-vision-400">{{ s.titulo }} <span class="text-white/40">({{ s.linhas.length }} linhas)</span></h4>
            <div class="mt-2 overflow-x-auto rounded-xl border border-white/10">
              <table class="w-full text-left text-sm">
                <thead class="bg-white/5 text-white/60"><tr>@for (c of s.colunas; track $index) { <th class="p-3">{{ c }}</th> }</tr></thead>
                <tbody>
                @for (l of s.linhas.slice(0, 8); track $index) { <tr class="border-t border-white/10">@for (v of l; track $index) { <td class="max-w-xs truncate p-3">{{ v }}</td> }</tr> }
                @if (!s.linhas.length) { <tr><td [attr.colspan]="s.colunas.length" class="p-4 text-center text-white/50">Sem dados.</td></tr> }
                </tbody>
              </table>
            </div>
            @if (s.linhas.length > 8) { <p class="mt-1 text-xs text-white/50">Mostrando 8 de {{ s.linhas.length }}. O arquivo traz todas as linhas.</p> }
          }
        }
      } @else {
        <div class="grid place-items-center rounded-2xl border border-dashed border-white/15 p-16 text-center text-white/50">
          <app-icon nome="relatorio" [tam]="36" /><p class="mt-3">Escolha um relatório na lista ao lado.</p></div>
      }
    </section>
  </div>`
})
export class RelatoriosComponent implements OnInit {
  private auth = inject(AuthService); private nav = inject(NavService);
  meses = MESES; formatos = FORMATOS; ano = fmt(new Date()).slice(0, 4);
  sel = signal<Relatorio | null>(null);
  p = signal<Params>(this.padrao());
  marcados = signal<Set<string>>(new Set());
  operadores = signal<string[]>([]); tecnicos = signal<{ key: string; nome: string }[]>([]);
  ocupado = signal<Formato | ''>(''); erro = signal(''); ok = signal('');
  private cache: { chave: string; secoes: Secao[] } | null = null;
  previa = signal<Secao[] | null>(null);

  grupos = computed(() => {
    const u = this.auth.user(), out: { area: string; nome: string; itens: Relatorio[] }[] = [];
    CATALOGO.filter(r => this.nav.pode(r.area, u)).forEach(r => {
      let g = out.find(x => x.area === r.area); if (!g) { g = { area: r.area, nome: ROTULO_AREA[r.area], itens: [] }; out.push(g); } g.itens.push(r); });
    return out;
  });

  private padrao(): Params {
    const hoje = new Date();
    return { data: fmt(hoje), inicio: fmt(new Date(Date.now() - 29 * 864e5)), fim: fmt(hoje), mes: +fmt(hoje).slice(5, 7), operador: '', tecnico: '' };
  }
  ngOnInit() { /* listas de operador e técnico são carregadas sob demanda */ }

  async escolher(r: Relatorio) {
    this.sel.set(r); this.marcados.set(new Set(r.secoes.map(s => s.id))); this.p.set(this.padrao()); this.limpar();
    if (r.params.includes('operador') && !this.operadores().length) {
      try { const x = await this.auth.call('relDesempenho', { operador: '' }); if (x.ok && x.operadores) this.operadores.set(x.operadores); } catch { /* lista opcional */ }
    }
    if (r.params.includes('tecnico') && !this.tecnicos().length) {
      try { const x = await this.auth.call('tecDesempenho', { tecnico: '' }); if (x.ok && x.tecnicos) this.tecnicos.set(x.tecnicos); } catch { /* lista opcional */ }
    }
  }
  private limpar() { this.cache = null; this.previa.set(null); this.erro.set(''); this.ok.set(''); }
  mudarParam(v: Partial<Params>) { this.p.set({ ...this.p(), ...v }); this.limpar(); }
  alternarSecao(id: string) { const s = new Set(this.marcados()); s.has(id) ? s.delete(id) : s.add(id); this.marcados.set(s); this.atualizarPrevia(); }
  todos(r: Relatorio) { this.marcados.set(this.marcados().size === r.secoes.length ? new Set() : new Set(r.secoes.map(s => s.id))); this.atualizarPrevia(); }
  private atualizarPrevia() { if (this.cache) this.previa.set(this.cache.secoes.filter(s => this.marcados().has(s.id))); }

  private descreverParametros(r: Relatorio): [string, string][] {
    const p = this.p(), l: [string, string][] = [];
    if (r.params.includes('data')) l.push(['Data', p.data.split('-').reverse().join('/')]);
    if (r.params.includes('periodo')) l.push(['Período', p.inicio.split('-').reverse().join('/') + ' a ' + p.fim.split('-').reverse().join('/')]);
    if (r.params.includes('mes')) l.push(['Mês', MESES[p.mes - 1] + '/' + this.ano]);
    if (r.params.includes('operador')) l.push(['Operador', p.operador || 'Todos']);
    if (r.params.includes('tecnico')) l.push(['Técnico', this.tecnicos().find(t => t.key === p.tecnico)?.nome || '—']);
    return l;
  }

  async gerar(f: Formato) {
    const r = this.sel(); if (!r || this.ocupado()) return;
    this.ocupado.set(f); this.erro.set(''); this.ok.set('');
    try {
      const chave = JSON.stringify([r.id, this.p()]);
      if (!this.cache || this.cache.chave !== chave) this.cache = { chave, secoes: await r.gerar((a, d) => this.auth.call(a, d), this.p()) };
      const secoes = this.cache.secoes.filter(s => this.marcados().has(s.id));
      this.previa.set(secoes);
      const meta: Meta = { titulo: r.titulo, parametros: this.descreverParametros(r), geradoEm: new Date() };
      await exportar(f, meta, secoes, r.id);
      this.ok.set('Arquivo ' + f.toUpperCase() + ' gerado.');
    } catch (e: any) { this.erro.set('Não foi possível gerar o relatório. ' + String(e?.message || e).slice(0, 300)); }
    this.ocupado.set('');
  }
}

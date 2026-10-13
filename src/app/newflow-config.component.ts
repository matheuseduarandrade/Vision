import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const ERROS: Record<string, string> = {
  'DATA_INVÁLIDA': 'Data inválida.', 'ANO_NÃO_PERMITIDO': 'Use uma data do ano atual.', 'DATA_FUTURA': 'A data não pode ser futura.',
  'OPERADOR_OBRIGATÓRIO': 'Informe o operador.', 'PROJETO_INVÁLIDO': 'Escolha NEWFLOW SOLAR, NEWFLOW ANDINA ou NEWFLOW FEMSA.', 'QUANTIDADE_INVÁLIDA': 'A quantidade deve ser um número inteiro de 1 a 9999.',
  'LINHAS_INVÁLIDAS': 'Envie de 1 a 500 linhas.'
};
interface Linha { data: string; quantidade: number; operador: string; projeto: string; }

@Component({
  selector: 'app-newflow-config', standalone: true, imports: [FormsModule],
  template: `
  <section class="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
    <h3 class="text-lg font-semibold">NEWFLOW — lançamento de atendimentos</h3>
    <p class="mt-1 max-w-3xl text-sm text-white/60">Atendimentos do NEWFLOW não vêm do Jira. Lance aqui a quantidade por data, operador e projeto: ela entra no gráfico e nos índices da tela Desempenho dos operadores.
      Se já existir um lançamento com a mesma data, operador e projeto, o novo valor <strong>substitui</strong> o anterior.</p>

    <form (submit)="$event.preventDefault(); salvar()" class="mt-5 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_8rem_1fr_14rem_auto]">
      <label class="flex flex-col gap-1 text-sm">Data
        <input type="date" name="data" [ngModel]="f().data" (ngModelChange)="campo({ data: $event })" [max]="hojeStr" class="rounded-lg bg-vision-900 px-3 py-2" required></label>
      <label class="flex flex-col gap-1 text-sm">Quantidade
        <input type="number" name="quantidade" min="1" max="9999" step="1" [ngModel]="f().quantidade" (ngModelChange)="campo({ quantidade: $event })" class="rounded-lg bg-vision-900 px-3 py-2" required></label>
      <label class="flex flex-col gap-1 text-sm">Operador
        <input type="text" name="operador" list="nf-operadores" autocomplete="off" [ngModel]="f().operador" (ngModelChange)="campo({ operador: $event })" placeholder="Nome do operador" class="rounded-lg bg-vision-900 px-3 py-2" required>
        <datalist id="nf-operadores">@for (o of operadores(); track o) { <option [value]="o"></option> }</datalist></label>
      <label class="flex flex-col gap-1 text-sm">Projeto
        <select name="projeto" [ngModel]="f().projeto" (ngModelChange)="campo({ projeto: $event })" class="rounded-lg bg-vision-900 px-3 py-2">
          @for (p of projetos(); track p) { <option [value]="p">{{ p }}</option> }</select></label>
      <div class="flex gap-2">
        <button type="submit" [disabled]="ocupado()" class="rounded-lg bg-vision-500 px-5 py-2.5 text-sm font-semibold hover:bg-vision-400 disabled:opacity-50">{{ editando() ? 'Atualizar' : 'Salvar' }}</button>
        @if (editando()) { <button type="button" (click)="limpar()" class="rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/10">Cancelar</button> }
      </div>
    </form>
    @if (erro()) { <p class="mt-3 rounded-lg bg-red-500/15 p-3 text-sm text-red-200" role="alert">{{ erro() }}</p> }
    @if (ok()) { <p class="mt-3 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300" role="status">{{ ok() }}</p> }

    <details class="mt-6 rounded-xl border border-white/10 p-4">
      <summary class="cursor-pointer text-sm font-semibold">Importar várias linhas de uma vez</summary>
      <p class="mt-2 text-xs text-white/60">Cole linhas de uma planilha, uma por linha, na ordem <strong>Data; Quantidade; Operador; Projeto</strong> (separadas por tabulação ou ponto e vírgula). A data pode ser 25/09/2026 ou 2026-09-25. O projeto pode ser SOLAR, ANDINA ou FEMSA.</p>
      <textarea [ngModel]="texto()" (ngModelChange)="texto.set($event); previa.set(null)" name="texto" rows="6" placeholder="25/09/2026;12;Ana Silva;NEWFLOW SOLAR" class="mt-3 w-full rounded-lg bg-vision-900 p-3 font-mono text-xs"></textarea>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" (click)="conferir()" [disabled]="!texto().trim()" class="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50">Conferir</button>
        @if (previa(); as p) {
          <span class="text-sm">{{ p.linhas.length }} linhas válidas · {{ p.erros.length }} com problema</span>
          <button type="button" (click)="importar()" [disabled]="ocupado() || !p.linhas.length" class="rounded-lg bg-vision-500 px-4 py-2 text-sm font-semibold hover:bg-vision-400 disabled:opacity-50">Importar {{ p.linhas.length }} linhas</button>
        }
      </div>
      @if (previa()?.erros?.length) { <ul class="mt-3 max-h-40 list-disc overflow-auto pl-5 text-xs text-red-300">@for (e of previa()!.erros; track e) { <li>{{ e }}</li> }</ul> }
    </details>

    <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
      <h4 class="font-semibold">Lançamentos de
        <select [ngModel]="mes()" (ngModelChange)="trocarMes($event)" name="mes" class="mx-1 rounded-lg bg-vision-900 px-2 py-1 text-sm">
          @for (m of meses; track $index) { <option [ngValue]="$index + 1">{{ m }}</option> }</select> de {{ ano }}</h4>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded-full border border-white/10 px-3 py-1">Total: <strong>{{ d()?.total ?? 0 }}</strong></span>
        @for (t of d()?.totais ?? []; track t.projeto) { <span class="rounded-full border border-white/10 px-3 py-1">{{ t.projeto }}: <strong>{{ t.total }}</strong></span> }
      </div>
    </div>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-left text-sm">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Data</th><th class="p-3">Operador</th><th class="p-3">Projeto</th><th class="p-3">Quantidade</th><th class="p-3"></th></tr></thead>
        <tbody>
        @for (l of d()?.lancamentos ?? []; track l.chave) {
          <tr class="border-t border-white/10"><td class="p-3 whitespace-nowrap">{{ fd(l.data) }}</td><td class="p-3">{{ l.operador }}</td><td class="p-3">{{ l.projeto }}</td>
            <td class="p-3 font-semibold tabular-nums">{{ l.quantidade }}</td>
            <td class="p-3 text-right whitespace-nowrap"><button (click)="editar(l)" class="mr-3 text-vision-400 hover:underline">Editar</button><button (click)="excluir(l)" class="text-red-400 hover:underline">Excluir</button></td></tr>
        } @empty { <tr><td colspan="5" class="p-6 text-center text-white/50">Nenhum lançamento neste mês.</td></tr> }
        </tbody>
      </table>
    </div>
  </section>`
})
export class NewflowConfigComponent implements OnInit {
  private auth = inject(AuthService);
  meses = MESES; hojeStr = hoje(); ano = +hoje().slice(0, 4);
  mes = signal(+hoje().slice(5, 7)); d = signal<any>(null);
  f = signal<{ data: string; quantidade: number | null; operador: string; projeto: string }>({ data: hoje(), quantidade: null, operador: '', projeto: 'NEWFLOW SOLAR' });
  texto = signal(''); previa = signal<{ linhas: Linha[]; erros: string[] } | null>(null);
  ocupado = signal(false); erro = signal(''); ok = signal('');
  projetos = computed<string[]>(() => this.d()?.projetos ?? ['NEWFLOW SOLAR', 'NEWFLOW ANDINA', 'NEWFLOW FEMSA']);
  operadores = computed<string[]>(() => this.d()?.operadores ?? []);
  editando = signal(false);

  fd = (s: string) => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  campo(v: Partial<{ data: string; quantidade: number | null; operador: string; projeto: string }>) { this.f.set({ ...this.f(), ...v }); this.erro.set(''); this.ok.set(''); }
  private msg(e: any) { const c = String(e?.error || e?.detail || e?.message || e); return ERROS[c] || ('Não foi possível concluir. ' + c.slice(0, 200)); }

  ngOnInit() { this.carregar(); }
  trocarMes(m: number) { this.mes.set(m); this.carregar(); }
  async carregar() {
    try { const r = await this.auth.call('nfListar', { mes: `${this.ano}-${String(this.mes()).padStart(2, '0')}` }); if (r.ok) this.d.set(r); else this.erro.set(this.msg(r)); }
    catch (e) { this.erro.set(this.msg(e)); }
  }

  limpar() { this.editando.set(false); this.f.set({ ...this.f(), quantidade: null, operador: '' }); this.erro.set(''); }
  editar(l: any) { this.editando.set(true); this.f.set({ data: l.data, quantidade: l.quantidade, operador: l.operador, projeto: l.projeto }); this.erro.set(''); this.ok.set(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async salvar() {
    if (this.ocupado()) return; this.ocupado.set(true); this.erro.set(''); this.ok.set('');
    try {
      const r = await this.auth.call('nfSalvar', { lancamento: this.f() }); if (!r.ok) throw r;
      this.ok.set(r.atualizado ? 'Lançamento atualizado.' : 'Lançamento salvo.'); this.editando.set(false);
      this.f.set({ ...this.f(), quantidade: null }); this.mes.set(+this.f().data.slice(5, 7)); await this.carregar();
    } catch (e) { this.erro.set(this.msg(e)); }
    this.ocupado.set(false);
  }

  async excluir(l: any) {
    if (!confirm(`Excluir o lançamento de ${l.quantidade} em ${this.fd(l.data)} (${l.operador} · ${l.projeto})?`)) return;
    try { const r = await this.auth.call('nfExcluir', { chave: l.chave }); if (!r.ok) throw r; this.ok.set('Lançamento excluído.'); await this.carregar(); }
    catch (e) { this.erro.set(this.msg(e)); }
  }

  /** Lê o texto colado: Data; Quantidade; Operador; Projeto. */
  conferir() {
    const linhas: Linha[] = [], erros: string[] = [];
    this.texto().split(/\r?\n/).forEach((bruta, i) => {
      const t = bruta.trim(); if (!t) return;
      const c = t.split(/\t|;/).map(x => x.trim());
      if (i === 0 && /data/i.test(c[0]) && !/\d/.test(c[0])) return;   // cabeçalho
      if (c.length < 4) { erros.push(`Linha ${i + 1}: faltam colunas (Data; Quantidade; Operador; Projeto).`); return; }
      const m = c[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/), iso = /^\d{4}-\d{2}-\d{2}$/.test(c[0]);
      const data = iso ? c[0] : m ? `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
      const qtd = Number(c[1].replace(',', '.'));
      if (!data) { erros.push(`Linha ${i + 1}: data inválida (“${c[0]}”).`); return; }
      if (!Number.isInteger(qtd) || qtd < 1) { erros.push(`Linha ${i + 1}: quantidade inválida (“${c[1]}”).`); return; }
      linhas.push({ data, quantidade: qtd, operador: c[2], projeto: c[3] });
    });
    this.previa.set({ linhas, erros });
  }

  async importar() {
    const p = this.previa(); if (!p || !p.linhas.length || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.ok.set('');
    try {
      const r = await this.auth.call('nfImportar', { linhas: p.linhas }); if (!r.ok) throw r;
      const rej = (r.erros as { linha: number; motivo: string }[]).map(e => `Linha ${e.linha}: ${ERROS[e.motivo] || e.motivo}`);
      this.ok.set(`Importação concluída: ${r.novas} novos e ${r.atualizadas} atualizados.` + (rej.length ? ` ${rej.length} linhas recusadas.` : ''));
      this.previa.set(rej.length ? { linhas: [], erros: rej } : null); if (!rej.length) this.texto.set('');
      await this.carregar();
    } catch (e) { this.erro.set(this.msg(e)); }
    this.ocupado.set(false);
  }
}
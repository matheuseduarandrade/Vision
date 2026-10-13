import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { BarrasComponent } from './barras.component';

@Component({
  selector: 'app-tecnico-desempenho', standalone: true, imports: [FormsModule, BarrasComponent],
  template: `
  <h2 class="text-2xl font-bold">Desempenho dos técnicos</h2>
  <p class="mt-1 text-sm text-white/60">Dados de janeiro até hoje, pela data de agendamento.</p>
  <label class="mt-6 flex items-center gap-3 text-sm">Técnico
    <select [ngModel]="key()" (ngModelChange)="escolher($event)" class="bg-vision-900 rounded px-3 py-2 min-w-72">
      <option value="">Escolha um técnico</option>
      @for (t of d()?.tecnicos ?? []; track t.key) { <option [value]="t.key">{{ t.nome }} ({{ t.tipo === 'PROPRIO' ? 'próprio' : 'terceiro' }})</option> }
    </select>
  </label>
  @if (carregando()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando…</p> }
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }
  @if (d()?.vazio) { <p class="mt-6 text-white/70">Os dados dos técnicos ainda não foram carregados. Rode <code>reconstruirTecnicos()</code> no Apps Script.</p> }

  @if (d()?.tecnico; as t) {
    <div class="mt-8 grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-white/10 text-center max-w-xl">
      <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ d().total }}</p><p class="mt-1 text-xs text-white/60">Chamados</p></div>
      <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ d().reag }}</p><p class="mt-1 text-xs text-white/60">Com reagendamento</p></div>
      <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ d().sem }}</p><p class="mt-1 text-xs text-white/60">Sem reagendamento</p></div>
    </div>
    @if (d().operadorTop; as o) { <p class="mt-4 text-sm text-white/80">Operador que mais o atendeu: <strong>{{ o.nome }}</strong> ({{ o.total }} atendimentos)</p> }
    <div class="mt-8 grid lg:grid-cols-2 gap-10">
      <section><h3 class="font-semibold mb-3">Clientes atendidos</h3><div class="max-h-96 overflow-auto pr-2"><app-barras [itens]="d().clientes" /></div></section>
      <section><h3 class="font-semibold mb-3">Tipos de requisição</h3><app-barras [itens]="d().requisicoes" /></section>
      <section><h3 class="font-semibold mb-3">Operadores que o atenderam</h3><app-barras [itens]="d().operadores" [ouroPrimeiro]="true" /></section>
    </div>
  }`
})
export class TecnicoDesempenhoComponent implements OnInit {
  private auth = inject(AuthService);
  d = signal<any>(null); key = signal(''); carregando = signal(false); erro = signal('');
  ngOnInit() { this.carregar(); }
  escolher(k: string) { this.key.set(k); this.carregar(); }
  async carregar() {
    this.carregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('tecDesempenho', { tecnico: this.key() }); if (!r.ok) throw r; this.d.set(r); }
    catch (e: any) { this.erro.set('Não foi possível carregar. Detalhe: ' + String(e?.detail || e?.error || e).slice(0, 300)); }
    this.carregando.set(false);
  }
}

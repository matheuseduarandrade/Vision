import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

const FAIXAS_PADRAO = [{ id: '19-29', nome: '19 a 29 dias', min: 19, max: 29 }, { id: '30-50', nome: '30 a 50 dias', min: 30, max: 50 }, { id: '50+', nome: 'Mais de 50 dias', min: 51, max: null }];
const VISUAL = [
  { cor: 'bg-yellow-400/20 text-yellow-100', linha: 'bg-yellow-400/10', ponto: 'bg-amber-400' },
  { cor: 'bg-orange-500/25 text-orange-100', linha: 'bg-orange-500/15', ponto: 'bg-orange-500' },
  { cor: 'bg-red-500/25 text-red-100', linha: 'bg-red-500/15', ponto: 'bg-red-500' }];

@Component({
  selector: 'app-geral', standalone: true, imports: [DatePipe, FormsModule],
  template: `
  <h2 class="text-2xl font-bold">Dados gerais — chamados críticos</h2>
  <p class="mt-1 text-sm text-white/60">Chamados PROMONITOR e MONITORAR criados há mais de {{ d()?.limite || 19 }} dias e ainda pendentes (de atendimento ou de encerramento).
    @if (d()?.atualizadoEm) { Atualizado às {{ d().atualizadoEm | date:'HH:mm':'-0300' }}. }</p>
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }
  @if (carregando()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando…</p> }

  @if (d(); as d) {
    <div class="mt-6 flex flex-wrap items-stretch gap-3">
      <button (click)="escolher('')" [class]="faixaSel() === '' ? 'border-vision-400 bg-vision-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'" class="rounded-xl border px-6 py-4 text-left">
        <p class="text-4xl font-bold tabular-nums">{{ d.total }}</p><p class="text-sm text-white/70">no total</p></button>
      @for (f of contagens(); track f.id) {
        <button (click)="escolher(f.id)" [class]="faixaSel() === f.id ? 'border-vision-400 bg-vision-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'" class="rounded-xl border px-5 py-4 text-left">
          <p class="text-3xl font-bold tabular-nums">{{ f.total }}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-xs text-white/70"><span class="h-2 w-2 rounded-full" [class]="f.visual.ponto"></span>{{ f.nome }}</p></button>
      }
    </div>

    <input [ngModel]="busca()" (ngModelChange)="busca.set($event)" placeholder="Buscar chamado, descrição, responsável ou cliente" class="mt-6 bg-vision-900 rounded px-3 py-2 text-sm w-96 max-w-full">
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Dias</th><th class="p-3">Chamado</th><th class="p-3">Descrição</th>
          <th class="p-3">Projeto</th><th class="p-3">Status</th><th class="p-3">Responsável</th><th class="p-3">Cliente</th><th class="p-3">Criador</th><th class="p-3">Criado em</th></tr></thead>
        <tbody>
        @for (c of visiveis(); track c.chamado) {
          <tr class="border-t border-white/10" [class]="visual(c.dias).linha">
            <td class="p-3 font-bold tabular-nums">{{ c.dias }}</td><td class="p-3 font-semibold whitespace-nowrap">{{ c.chamado }}</td>
            <td class="p-3 max-w-xs truncate" [title]="c.descricao">{{ c.descricao }}</td><td class="p-3">{{ c.projeto }}</td><td class="p-3">{{ c.status }}</td>
            <td class="p-3">{{ c.responsavel }}</td><td class="p-3 max-w-[14rem] truncate" [title]="c.cliente">{{ c.cliente }}</td>
            <td class="p-3">{{ c.criador || '—' }}</td><td class="p-3 whitespace-nowrap">{{ c.criado | date:'dd/MM/yy':'-0300' }}</td></tr>
        } @empty { <tr><td colspan="9" class="p-6 text-center text-white/50">Nenhum chamado encontrado.</td></tr> }
        </tbody>
      </table>
    </div>
    @if (filtradas().length > 500) { <p class="mt-2 text-xs text-white/50">Mostrando 500 de {{ filtradas().length }}. Use a busca para refinar.</p> }
  }`
})
export class GeralComponent implements OnInit {
  private auth = inject(AuthService); private rota = inject(ActivatedRoute);
  d = signal<any>(null); faixaSel = signal(this.rota.snapshot.queryParamMap.get('faixa') ?? ''); busca = signal(''); carregando = signal(false); erro = signal('');

  private faixas = computed<any[]>(() => this.d()?.faixas ?? FAIXAS_PADRAO);
  private indice(dias: number) { const l = this.faixas(), i = l.findIndex(f => dias >= f.min && (f.max == null || dias <= f.max)); return i < 0 ? l.length - 1 : i; }
  visual = (dias: number) => VISUAL[Math.min(this.indice(dias), 2)];
  contagens = computed(() => { const l: any[] = this.d()?.chamados ?? [];
    return this.faixas().map((f, i) => ({ id: f.id, nome: f.nome, visual: VISUAL[Math.min(i, 2)], total: l.filter(c => c.dias >= f.min && (f.max == null || c.dias <= f.max)).length })); });
  filtradas = computed(() => { const b = this.busca().toLowerCase(), f = this.faixas().find(x => x.id === this.faixaSel()), l: any[] = this.d()?.chamados ?? [];
    return l.filter(c => (!f || (c.dias >= f.min && (f.max == null || c.dias <= f.max))) &&
      (!b || (c.chamado + ' ' + c.descricao + ' ' + c.responsavel + ' ' + c.cliente + ' ' + c.criador).toLowerCase().includes(b))); });
  visiveis = computed(() => this.filtradas().slice(0, 500));
  escolher(id: string) { this.faixaSel.set(this.faixaSel() === id ? '' : id); }

  async ngOnInit() {
    this.carregando.set(true);
    try { const r = await this.auth.call('geralAbertos'); if (!r.ok) throw r; this.d.set(r); }
    catch (e: any) { const m = String(e?.detail || e?.error || e);
      this.erro.set(m.includes('SEM_PERMISSÃO') ? 'Seu perfil não tem acesso a esta tela.' : 'Não foi possível carregar. Detalhe: ' + m.slice(0, 300)); }
    this.carregando.set(false);
  }
}

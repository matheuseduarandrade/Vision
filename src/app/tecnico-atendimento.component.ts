import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { BarrasComponent } from './barras.component';

const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', hour12: false }) + 'h';
type Tipo = '' | 'PROPRIO' | 'TERCEIRO';

@Component({
  selector: 'app-tecnico-atendimento', standalone: true, imports: [FormsModule, DatePipe, BarrasComponent],
  template: `
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold">{{ modo === 'hoje' ? 'Técnicos em atendimento' : 'Atendimentos por data' }}</h2>
      @if (d(); as d) {
        <p class="mt-1 text-white/80">{{ d.tecnicos.length }} {{ d.tecnicos.length === 1 ? 'técnico' : 'técnicos' }} {{ modo === 'hoje' ? 'em atendimento hoje' : 'com chamados em ' + fd(d.data) }}
          · <span class="text-vision-400">{{ d.proprios }} próprios</span> · <span class="text-amber-300">{{ d.terceiros }} terceiros</span></p>
      }
    </div>
    <div class="flex items-end gap-3 text-sm">
      @if (modo === 'data') { <label class="flex flex-col gap-1">Data <input type="date" [ngModel]="data()" (ngModelChange)="mudarData($event)" class="bg-vision-900 rounded px-3 py-2"></label> }
      <button (click)="carregar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 font-semibold">{{ carregando() ? 'Atualizando…' : 'Atualizar' }}</button>
    </div>
  </header>
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (d(); as d) {
    <div class="mt-5 inline-flex rounded-lg border border-white/10 p-1 text-sm" role="group" aria-label="Filtrar por tipo de técnico">
      @for (o of opcoes; track o.id) {
        <button (click)="tipo.set(o.id)" [class]="tipo() === o.id ? 'bg-vision-500 font-semibold' : 'hover:bg-white/10'" class="rounded-md px-4 py-1.5">{{ o.nome }}</button>
      }
    </div>
    <ul class="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      @for (t of visiveis(); track t.key) {
        <li><button (click)="sel.set(t.key)" [class]="t.key === sel() ? 'border-vision-400 bg-vision-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'"
          class="w-full rounded-lg border px-4 py-3 text-left flex items-center justify-between gap-3">
          <span class="min-w-0"><span class="block font-semibold truncate">{{ t.nome }}</span>
            <span class="text-xs" [class]="t.tipo === 'PROPRIO' ? 'text-vision-400' : 'text-amber-300'">{{ t.tipo === 'PROPRIO' ? 'Próprio' : 'Terceiro' }}</span></span>
          <span class="text-2xl font-bold tabular-nums">{{ t.total }}</span></button></li>
      } @empty { <li class="text-white/50">Nenhum técnico com chamados nesta seleção.</li> }
    </ul>
  }

  @if (sel() && chamadosSel().length) {
    <h3 class="mt-10 text-lg font-semibold">{{ nomeSel() }}</h3>
    <div class="mt-4 grid lg:grid-cols-2 gap-10">
      <section><h4 class="font-semibold mb-3">Tipos de requisição</h4><app-barras [itens]="reqs()" /></section>
      <section><h4 class="font-semibold mb-3">Clientes que vai atender</h4><app-barras [itens]="clientes()" /></section>
      @if (servs().length) { <section><h4 class="font-semibold mb-3">Tipos de serviço</h4><app-barras [itens]="servs()" /></section> }
      <section><h4 class="font-semibold mb-3">Chamados por horário</h4><app-barras [itens]="horas()" /></section>
    </div>
    <div class="mt-8 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Chamado</th><th class="p-3">Descrição</th><th class="p-3">Agendamento</th><th class="p-3">Status</th></tr></thead>
        <tbody>
        @for (c of chamadosSel(); track c.chamado) {
          <tr class="border-t border-white/10"><td class="p-3 font-semibold whitespace-nowrap">{{ c.chamado }}</td>
            <td class="p-3 max-w-md truncate" [title]="c.descricao">{{ c.descricao }}</td>
            <td class="p-3 whitespace-nowrap">{{ c.agendamento | date:'dd/MM/yy HH:mm' }}</td><td class="p-3">{{ c.status }}</td></tr>
        }
        </tbody>
      </table>
    </div>
  }`
})
export class TecnicoAtendimentoComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService); private rota = inject(ActivatedRoute);
  modo = this.rota.snapshot.data['modo'] as 'hoje' | 'data';
  opcoes: { id: Tipo; nome: string }[] = [{ id: '', nome: 'Todos' }, { id: 'PROPRIO', nome: 'Próprios' }, { id: 'TERCEIRO', nome: 'Terceiros' }];
  data = signal(hoje()); d = signal<any>(null); sel = signal<string | null>(null); tipo = signal<Tipo>('');
  carregando = signal(false); erro = signal(''); private timer: any; private sub?: Subscription;

  fd = (s: string) => s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  visiveis = computed<any[]>(() => { const t = this.tipo(), l: any[] = this.d()?.tecnicos ?? []; return t ? l.filter(x => x.tipo === t) : l; });
  chamadosSel = computed<any[]>(() => (this.d()?.chamados ?? []).filter((c: any) => c.tec === this.sel()));
  nomeSel = computed(() => this.d()?.tecnicos.find((t: any) => t.key === this.sel())?.nome ?? '');
  private conta(fn: (c: any) => string, porNome = false) {
    const m: Record<string, number> = {}; this.chamadosSel().forEach(c => { const k = fn(c); if (k) m[k] = (m[k] || 0) + 1; });
    const l = Object.keys(m).map(n => ({ nome: n, total: m[n] }));
    return porNome ? l.sort((a, b) => a.nome.localeCompare(b.nome)) : l.sort((a, b) => b.total - a.total);
  }
  reqs = computed(() => this.conta(c => c.tipoReq || 'Não informado'));
  clientes = computed(() => this.conta(c => c.cliente));
  /** Tipo de serviço é multisseleção: o backend envia os valores separados por " | ". */
  servs = computed(() => { const m: Record<string, number> = {};
    this.chamadosSel().forEach(c => String(c.tipoServ || '').split(' | ').filter(Boolean).forEach(x => m[x] = (m[x] || 0) + 1));
    return Object.keys(m).map(n => ({ nome: n, total: m[n] })).sort((a, b) => b.total - a.total); });
  horas = computed(() => this.conta(c => hora(c.agendamento), true));

  ngOnInit() {
    // ?tipo=PROPRIO ou ?tipo=TERCEIRO (vindo da tela inicial)
    this.sub = this.rota.queryParamMap.subscribe(p => { const t = p.get('tipo'); this.tipo.set(t === 'PROPRIO' || t === 'TERCEIRO' ? t : ''); });
    this.carregar(); if (this.modo === 'hoje') this.timer = setInterval(() => this.carregar(), 3600000);
  }
  ngOnDestroy() { clearInterval(this.timer); this.sub?.unsubscribe(); }
  mudarData(v: string) { if (v) { this.data.set(v); this.sel.set(null); this.carregar(); } }

  async carregar() {
    this.carregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('tecDia', { data: this.modo === 'hoje' ? hoje() : this.data() }); if (!r.ok) throw r; this.d.set(r); }
    catch (e: any) { const m = String(e?.detail || e?.error || e);
      this.erro.set(m.includes('SEM_PERMISSÃO') ? 'Seu perfil não tem acesso à aba Técnico.' : 'Não foi possível carregar. Detalhe: ' + m.slice(0, 300)); }
    this.carregando.set(false);
  }
}

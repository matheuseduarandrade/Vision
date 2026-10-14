import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './avatar.component';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NEUTRO = 'border-white/10 from-white/[0.06]';
const mesAno = (m: string) => MESES[+m.slice(5) - 1] + '/' + m.slice(0, 4);
const fn = (n: number) => (n ?? 0).toLocaleString('pt-BR');

interface Num { valor: string; rotulo: string; sub?: string; rota: string; q?: Record<string, string>; ponto?: string; }
interface Painel { chave: string; titulo: string; icone: string; tom: string; card: string; periodo: string; cols: string; span: string; nums: Num[]; rodape: string; rota: string; erro?: string; }

@Component({
  selector: 'app-home', standalone: true, imports: [RouterLink, DatePipe, IconComponent, AvatarComponent],
  template: `
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex items-center gap-4">
      <app-avatar [nome]="auth.user()?.nome ?? ''" [avatar]="auth.user()?.avatar" [tam]="64" />
      <div>
        <h2 class="text-3xl font-bold tracking-tight">{{ saudacao() }}, {{ primeiroNome() }}</h2>
        <p class="mt-1 text-white/60">Acompanhe os indicadores e a saúde da operação de Serviços.</p>
      </div>
    </div>
    <div class="flex items-center gap-3 text-sm text-white/60">
      <app-icon nome="relogio" [tam]="16" />
      @if (geradoEm()) { <span>Dados atualizados em {{ geradoEm() | date:"dd/MM/yyyy 'às' HH:mm":'-0300' }}</span> }
      @else if (!carregando()) { <span>Dados ainda não carregados</span> }
      <button (click)="carregar(true)" [disabled]="carregando()" class="rounded-lg border border-white/10 p-2 hover:bg-white/10 disabled:opacity-50"
              aria-label="Atualizar indicadores" title="Atualizar indicadores"><app-icon nome="atualizar" [tam]="16" /></button>
    </div>
  </header>

  @if (erro()) { <p class="mt-5 rounded-lg bg-red-500/15 p-3 text-sm text-red-200" role="alert">{{ erro() }}</p> }

  <div class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
    @for (p of paineis(); track p.chave) {
      <article class="flex flex-col rounded-2xl border bg-gradient-to-br to-white/[0.02] p-5 shadow-lg backdrop-blur" [class]="p.card + ' ' + p.span">
        <header class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl ring-1" [class]="p.tom"><app-icon [nome]="p.icone" [tam]="20" /></span>
            <h3 class="font-semibold leading-tight">{{ p.titulo }}</h3>
          </div>
          <span class="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-white/60">{{ p.periodo }}</span>
        </header>

        @if (p.erro) {
          <p class="mt-5 text-sm text-white/60">Não foi possível carregar este painel. <button (click)="carregar(true)" class="text-vision-400 underline">Tentar novamente</button></p>
        } @else {
          <div class="mt-5 grid gap-3" [class]="p.cols">
            @for (n of p.nums; track n.rotulo) {
              <a [routerLink]="n.rota" [queryParams]="n.q" class="group rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-vision-400/60 hover:bg-white/10">
                <p class="text-3xl font-bold tabular-nums tracking-tight">{{ n.valor }}</p>
                <p class="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                  @if (n.ponto) { <span class="h-2 w-2 rounded-full" [class]="n.ponto"></span> }{{ n.rotulo }}</p>
                @if (n.sub) { <p class="mt-0.5 text-[0.7rem] text-white/40">{{ n.sub }}</p> }
              </a>
            }
          </div>
        }
        <a [routerLink]="p.rota" class="mt-auto pt-5 text-xs font-medium text-vision-400 hover:underline">{{ p.rodape }} →</a>
      </article>
    } @empty {
      @if (carregando()) { @for (i of [1, 2, 3, 4, 5]; track i) { <div class="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5 xl:col-span-2"></div> } }
      @else { <p class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 md:col-span-2 xl:col-span-6">Seu setor ainda não foi definido. Peça ao administrador para configurar seu acesso.</p> }
    }
  </div>`
})
export class HomeComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  d = signal<any>(null); carregando = signal(false); erro = signal(''); relogio = signal(new Date()); private timer: any;

  primeiroNome = () => (this.auth.user()?.nome || '').split(' ')[0];
  geradoEm = computed<string>(() => this.d()?.geradoEm ?? '');
  saudacao = computed(() => {
    const h = +new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Fortaleza' }).format(this.relogio()) % 24;
    return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
  });

  paineis = computed<Painel[]>(() => {
    const s = this.d()?.secoes; if (!s) return [];
    const out: Painel[] = [], base = { card: NEUTRO, span: 'xl:col-span-2' };
    const ok = (x: any) => x && x.ok;

    if (s.monitoramento) { const m = s.monitoramento, ok_ = ok(m);
      out.push({ ...base, chave: 'mon', titulo: 'Monitoramento', icone: 'monitor', tom: 'bg-vision-500/20 text-vision-400 ring-vision-400/40', periodo: ok_ ? mesAno(m.mes) : 'Mês atual',
        cols: 'grid-cols-2', rodape: 'Ver resultados do mês', rota: '/monitoramento/resultados', erro: ok_ ? undefined : m.erro,
        nums: ok_ ? [{ valor: fn(m.total), rotulo: 'Chamados do mês', rota: '/monitoramento/resultados' },
          { valor: fn(m.reagendados), rotulo: 'Reagendamentos', sub: String(m.taxa).replace('.', ',') + '% dos chamados', rota: '/monitoramento/resultados' }] : [] }); }

    if (s.tecnico) { const t = s.tecnico, ok_ = ok(t);
      out.push({ ...base, chave: 'tec', titulo: 'Técnicos', icone: 'tecnico', tom: 'bg-purple-500/20 text-purple-400 ring-purple-400/40', periodo: ok_ ? 'Hoje · ' + t.data.slice(8) + '/' + t.data.slice(5, 7) : 'Hoje',
        cols: 'grid-cols-3', rodape: 'Ver técnicos em atendimento', rota: '/tecnico', erro: ok_ ? undefined : t.erro,
        nums: ok_ ? [{ valor: fn(t.total), rotulo: 'Em atendimento', rota: '/tecnico' },
          { valor: fn(t.proprios), rotulo: 'Próprios', rota: '/tecnico', q: { tipo: 'PROPRIO' }, ponto: 'bg-vision-400' },
          { valor: fn(t.terceiros), rotulo: 'Terceiros', rota: '/tecnico', q: { tipo: 'TERCEIRO' }, ponto: 'bg-amber-400' }] : [] }); }

    if (s.planejamento) { const p = s.planejamento, ok_ = ok(p);
      out.push({ ...base, chave: 'plan', titulo: 'Planejamento', icone: 'plano', tom: 'bg-emerald-500/20 text-emerald-400 ring-emerald-400/40', periodo: ok_ ? mesAno(p.mes) + ' · criados' : 'Mês atual',
        cols: 'grid-cols-3', rodape: 'Ver chamados do mês', rota: '/planejamento', erro: ok_ ? undefined : p.erro,
        nums: ok_ ? p.projetos.map((x: any) => ({ valor: fn(x.total), rotulo: x.projeto, rota: '/planejamento', q: { periodo: 'mes', visao: 'projeto', sel: x.projeto } })) : [] }); }

    if (s.credenciamento) { const c = s.credenciamento, ok_ = ok(c);
      out.push({ card: NEUTRO, span: 'xl:col-span-3', chave: 'cred', titulo: 'Credenciamento', icone: 'cred', tom: 'bg-amber-500/20 text-amber-500 ring-amber-400/40', periodo: 'Situação atual',
        cols: 'grid-cols-1', rodape: 'Ver chamados de credenciamento', rota: '/credenciamento', erro: ok_ ? undefined : c.erro,
        nums: ok_ ? [{ valor: fn(c.aFazer), rotulo: 'Chamados a fazer', rota: '/credenciamento', q: { categoria: 'new' } }] : [] }); }

    if (s.criticos) { const k = s.criticos, ok_ = ok(k), pontos = ['bg-amber-400', 'bg-orange-500', 'bg-red-500'];
      out.push({ card: 'border-red-400/30 from-red-500/10', span: 'xl:col-span-3', chave: 'crit', titulo: 'Chamados críticos', icone: 'alerta', tom: 'bg-red-500/20 text-red-400 ring-red-400/40',
        periodo: ok_ ? 'Pendentes há mais de ' + k.limite + ' dias' : 'Pendentes', cols: 'grid-cols-3',
        rodape: ok_ ? 'Ver os ' + fn(k.total) + ' chamados críticos' : 'Ver chamados críticos', rota: '/geral', erro: ok_ ? undefined : k.erro,
        nums: ok_ ? k.faixas.map((f: any, i: number) => ({ valor: fn(f.total), rotulo: f.nome, rota: '/geral', q: { faixa: f.id }, ponto: pontos[i] || pontos[2] })) : [] }); }
    return out;
  });

  ngOnInit() { this.carregar(false); this.timer = setInterval(() => this.relogio.set(new Date()), 60000); }
  ngOnDestroy() { clearInterval(this.timer); }

  async carregar(forcar: boolean) {
    this.carregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('homeResumo', { forcar }); if (!r.ok) throw r; this.d.set(r); }
    catch (e: any) { this.erro.set('Não foi possível carregar os indicadores. ' + String(e?.detail || e?.error || e).slice(0, 200)); }
    this.carregando.set(false);
  }
}

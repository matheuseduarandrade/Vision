import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';
import { BlocoComponent } from './bloco.component';
import { IconComponent } from './icon.component';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
const COR: Record<string, string> = { PEND_ATEND: 'bg-amber-400/20 text-amber-200', PEND_ENC: 'bg-vision-400/20 text-vision-50', CONCLUIDO: 'bg-emerald-400/20 text-emerald-200' };

@Component({
  selector: 'app-resultados', standalone: true, imports: [FormsModule, DatePipe, BlocoComponent, IconComponent],
  template: `
  <header>
    <h2 class="text-3xl font-bold tracking-tight">Resultados de {{ ano }}</h2>
    <p class="mt-1 text-sm text-white/60">Todos os chamados agendados no mês escolhido. Concluídos: status “Sem reagendamento” ou “Com reagendamento”.</p>
    <label class="mt-5 inline-flex items-center gap-3 text-sm"><span class="text-white/60">Mês</span>
      <span class="relative">
        <select [ngModel]="mes()" (ngModelChange)="trocarMes($event)" class="appearance-none rounded-xl border-vision-400/30 bg-white/5 py-2.5 pl-4 pr-11 font-medium backdrop-blur">
          @for (m of meses; track $index) { <option [ngValue]="$index + 1">{{ m }}</option> }
        </select>
        <app-icon nome="calendario" [tam]="16" class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-vision-400" />
      </span>
    </label>
  </header>
  @if (carregando()) { <p class="mt-4 text-sm text-vision-400" role="status">Carregando dados do mês…</p> }
  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (dados(); as d) {
    <div class="mt-6"><app-bloco [b]="d.bloco" /></div>

    <section class="mt-10">
      <h3 class="text-lg font-semibold">Calendário de {{ meses[mes() - 1] }}</h3>
      <p class="text-sm text-white/60">Em cada dia: <span class="text-vision-400">agendados</span>, <span class="text-emerald-400">concluídos</span> e <span class="text-red-400">reagendados</span>. Clique para ver o detalhe.</p>
      <div class="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium text-white/50">
        @for (s of semana; track s) { <div>{{ s }}</div> }
      </div>
      <div class="mt-2 grid grid-cols-7 gap-2">
        @for (c of celulas(); track $index) {
          @if (c) {
            <button (click)="abrirDia(c.k)" class="min-h-[5.75rem] rounded-xl border p-2.5 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-vision-400/60"
              [class]="c.k === diaSel() ? 'border-vision-400 bg-vision-500/20 shadow-[0_0_26px_-8px_rgba(6,109,255,.95)]' : c.k === hojeStr ? 'border-vision-400/50 bg-vision-500/10' : 'border-white/10 bg-white/[0.04]'">
              <span class="text-sm font-semibold" [class]="c.k === hojeStr ? 'text-vision-400' : 'text-white/80'">{{ c.d }}</span>
              @if (c.v) {
                <ul class="mt-1.5 space-y-0.5 text-[0.68rem] leading-tight text-white/80">
                  <li class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-vision-400"></span>{{ c.v.agendados }} agend.</li>
                  <li class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>{{ c.v.concluidos }} concl.</li>
                  @if (c.v.reagendados) { <li class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-red-400"></span>{{ c.v.reagendados }} reag.</li> }
                </ul>
              }
            </button>
          } @else { <div></div> }
        }
      </div>
    </section>
  }

  @if (diaCarregando()) { <p class="mt-6 text-sm text-vision-400" role="status">Carregando o dia…</p> }
  @if (dia(); as x) {
    <h3 class="mt-12 text-xl font-semibold">Dia {{ x.data.slice(8) }}/{{ x.data.slice(5, 7) }}</h3>
    <div class="mt-4"><app-bloco [b]="x.bloco" [mostrarPend]="true" /></div>

    <div class="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <table class="w-full text-left text-sm">
        <thead class="bg-white/5 text-white/60"><tr>
          <th class="p-3">Chamado</th><th class="p-3">Descrição</th><th class="p-3">Agendamento</th><th class="p-3">Técnico</th>
          <th class="p-3">Responsável</th><th class="p-3">Status</th><th class="p-3">Necessidade</th></tr></thead>
        <tbody>
        @for (c of x.chamados; track c.chamado) {
          <tr class="border-t border-white/10">
            <td class="p-3 font-semibold whitespace-nowrap">{{ c.chamado }}</td>
            <td class="p-3 max-w-xs truncate" [title]="c.descricao">{{ c.descricao }}</td>
            <td class="p-3 whitespace-nowrap">{{ c.agendamento | date:'dd/MM HH:mm' }}</td>
            <td class="p-3">{{ c.tecnico || '—' }}</td><td class="p-3">{{ c.responsavel }}</td>
            <td class="p-3"><span class="rounded-full px-2.5 py-1 text-xs whitespace-nowrap" [class]="cor(c.grupo)">{{ c.status }}</span></td>
            <td class="p-3">{{ necessidade(c) }}</td>
          </tr>
        } @empty { <tr><td colspan="7" class="p-6 text-center text-white/50">Nenhum chamado neste dia.</td></tr> }
        </tbody>
      </table>
    </div>
  }`
})
export class ResultadosComponent implements OnInit {
  private auth = inject(AuthService);
  meses = MESES; semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  hojeStr = hoje(); ano = +hoje().slice(0, 4); mes = signal(+hoje().slice(5, 7));
  dados = signal<any>(null); dia = signal<any>(null); diaSel = signal(''); erro = signal('');
  carregando = signal(false); diaCarregando = signal(false);
  cor = (g: string) => COR[g] || 'bg-white/10 text-white/70';

  celulas = computed(() => {
    const m = this.mes(), y = this.ano, v = this.dados()?.dias ?? {};
    const out: any[] = Array(new Date(Date.UTC(y, m - 1, 1)).getUTCDay()).fill(null);
    for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) {
      const k = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; out.push({ d, k, v: v[k] });
    }
    return out;
  });

  ngOnInit() { this.carregar(); }
  trocarMes(m: number) { this.mes.set(m); this.dia.set(null); this.diaSel.set(''); this.carregar(); }

  necessidade(c: any) {
    if (!c.comReag) return '—';
    if (c.necessidade !== 'Necessidade do cliente' && c.necessidade !== 'Necessidade da trix') return 'Reagendado (necessidade não informada)';
    return (c.necessidade === 'Necessidade do cliente' ? 'Cliente' : 'Queo') + ': ' + (c.motivo || 'não informada') + (c.outro ? ' (' + c.outro + ')' : '');
  }
  private msg(e: any) { return 'Não foi possível carregar. Detalhe: ' + String(e?.detail || e?.error || e).slice(0, 300); }

  async carregar() {
    this.carregando.set(true); this.erro.set(''); this.dados.set(null);
    try { const r = await this.auth.call('relResultados', { mes: `${this.ano}-${String(this.mes()).padStart(2, '0')}` }); if (!r.ok) throw r; this.dados.set(r); }
    catch (e) { this.erro.set(this.msg(e)); }
    this.carregando.set(false);
  }
  async abrirDia(k: string) {
    this.diaSel.set(k); this.diaCarregando.set(true); this.erro.set('');
    try { const r = await this.auth.call('relResultadoDia', { data: k }); if (!r.ok) throw r; this.dia.set(r); }
    catch (e) { this.erro.set(this.msg(e)); }
    this.diaCarregando.set(false);
  }
}
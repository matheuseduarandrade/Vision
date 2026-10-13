import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });

@Component({
  selector: 'app-periodo', standalone: true, imports: [FormsModule],
  template: `
  <h2 class="text-2xl font-bold">Relatório por período</h2>
  <p class="mt-1 text-sm text-white/60">Considera a data de agendamento dos chamados.</p>

  <div class="mt-6 flex flex-wrap items-end gap-3 text-sm">
    <label class="flex flex-col gap-1">De <input type="date" [ngModel]="ini()" (ngModelChange)="ini.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <label class="flex flex-col gap-1">Até <input type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event)" class="bg-vision-900 rounded px-3 py-2"></label>
    <button (click)="gerar()" [disabled]="carregando()" class="rounded-lg bg-vision-500 hover:bg-vision-400 disabled:opacity-50 px-4 py-2 font-semibold">
      {{ carregando() ? 'Gerando…' : 'Gerar relatório' }}</button>
  </div>

  @if (erro()) { <p class="mt-4 rounded-lg bg-red-500/15 text-red-200 p-3 text-sm" role="alert">{{ erro() }}</p> }

  @if (r(); as r) {
    <div class="mt-8 grid grid-cols-2 lg:grid-cols-6 gap-px rounded-xl overflow-hidden bg-white/10 text-center">
      @for (k of kpis(); track k.rotulo) {
        <div class="bg-vision-950 p-4"><p class="text-3xl font-bold">{{ k.valor }}</p><p class="mt-1 text-xs text-white/60">{{ k.rotulo }}</p></div>
      }
    </div>

    <h3 class="mt-8 font-semibold">Detalhamento por operador</h3>
    <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table class="w-full text-sm text-left">
        <thead class="bg-white/5 text-white/60"><tr>
          <th class="p-3">Operador</th><th class="p-3">Chamados atendidos</th><th class="p-3">Concluídos</th>
          <th class="p-3">Reagendados</th><th class="p-3">Pendentes de encerramento</th><th class="p-3">Taxa</th></tr></thead>
        <tbody>
        @for (o of r.operadores; track o.operador) {
          <tr class="border-t border-white/10">
            <td class="p-3 font-semibold">{{ o.operador }}</td><td class="p-3">{{ o.total }}</td><td class="p-3">{{ o.concluidos }}</td>
            <td class="p-3">{{ o.reagendados }}</td><td class="p-3">{{ o.pendEnc }}</td><td class="p-3">{{ o.taxa }}%</td>
          </tr>
        } @empty { <tr><td colspan="6" class="p-6 text-center text-white/50">Nenhum chamado agendado neste período.</td></tr> }
        </tbody>
      </table>
    </div>
  }`
})
export class PeriodoComponent {
  private auth = inject(AuthService);
  ini = signal(fmt(new Date(Date.now() - 6 * 864e5))); fim = signal(fmt(new Date()));
  r = signal<any>(null); carregando = signal(false); erro = signal('');

  kpis = () => { const r = this.r(); return [
    { rotulo: 'Total de chamados', valor: r.total }, { rotulo: 'Pendentes de atendimento', valor: r.pendAtend },
    { rotulo: 'Pendentes de encerramento', valor: r.pendEnc }, { rotulo: 'Concluídos', valor: r.concluidos },
    { rotulo: 'Reagendamentos', valor: r.reagendados }, { rotulo: 'Taxa de reagendamento', valor: r.taxa + '%' }]; };

  async gerar() {
    this.carregando.set(true); this.erro.set('');
    try {
      const r = await this.auth.call('relPeriodo', { inicio: this.ini(), fim: this.fim() });
      if (!r.ok) throw r; this.r.set(r);
    } catch (e: any) {
      const m = String(e?.detail || e?.error || e);
      this.erro.set(m.includes('PERÍODO_INVÁLIDO') ? 'Escolha um período válido de até 1 ano.' : 'Não foi possível gerar o relatório. Detalhe: ' + m.slice(0, 300));
    }
    this.carregando.set(false);
  }
}

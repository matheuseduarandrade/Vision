import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';
import { IconComponent } from './icon.component';
import { NewflowConfigComponent } from './newflow-config.component';

interface Tarefa { tipo: 'op' | 'tec'; mes: string; }
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

@Component({
  selector: 'app-configuracoes', standalone: true, imports: [DatePipe, IconComponent, NewflowConfigComponent],
  template: `
  <h2 class="text-2xl font-bold">Configurações</h2>
  <p class="mt-1 text-sm text-white/60">Atualização dos dados do sistema a partir do Jira.</p>

  <section class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
    <h3 class="text-lg font-semibold">Atualizar dados</h3>
    <p class="mt-1 max-w-3xl text-sm text-white/60">Busca os chamados novos no Jira e renova todas as telas (Monitoramento, Técnico, Planejamento, Credenciamento, Dados gerais e Relatórios).
      Use quando precisar dos dados mais recentes.</p>
    <p class="mt-3 text-sm">Última atualização:
      <strong>{{ s()?.ultima ? (s().ultima | date:'dd/MM/yyyy HH:mm') : 'ainda não realizada por este botão' }}</strong></p>

    <div class="mt-5 flex flex-wrap gap-3">
      <button (click)="iniciar('rapida')" [disabled]="executando()" class="inline-flex items-center gap-2 rounded-lg bg-vision-500 px-5 py-2.5 text-sm font-semibold hover:bg-vision-400 disabled:opacity-50">
        <app-icon nome="atualizar" [tam]="16" /> {{ executando() ? 'Atualizando…' : 'Atualizar dados' }}</button>
      <button (click)="completa()" [disabled]="executando()" class="rounded-lg border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50">Recarregar o ano todo</button>
    </div>
    <p class="mt-2 text-xs text-white/50">“Atualizar dados” refaz o mês atual e o anterior e carrega meses que faltem. “Recarregar o ano todo” refaz todos os meses (demora mais).</p>

    @if (total() > 0) {
      <div class="mt-6" role="status" aria-live="polite">
        <div class="flex justify-between text-sm"><span>{{ rotuloAtual() }}</span><span class="tabular-nums">{{ feitas() }} de {{ total() }} etapas</span></div>
        <div class="mt-2 h-2.5 overflow-hidden rounded bg-white/10"><div class="h-2.5 rounded bg-vision-500 transition-all duration-500" [style.width.%]="feitas() * 100 / total()"></div></div>
      </div>
    }
    @if (fim()) { <p class="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300" role="status">Dados atualizados. As telas já mostram as informações novas.</p> }
    @if (erro()) {
      <div class="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200" role="alert">{{ erro() }}
        <button (click)="continuar()" class="ml-2 font-semibold underline">Tentar novamente</button></div>
    }
  </section>

  <h3 class="mt-10 font-semibold">Carga por mês</h3>
  <p class="text-sm text-white/60">Dados guardados para o Desempenho dos operadores e dos técnicos.</p>
  <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
    <table class="w-full text-left text-sm">
      <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Mês</th><th class="p-3">Operadores</th><th class="p-3">Técnicos</th></tr></thead>
      <tbody>
      @for (m of s()?.meses ?? []; track m.mes) {
        <tr class="border-t border-white/10"><td class="p-3 font-semibold capitalize">{{ nomeMes(m.mes) }}</td>
          <td class="p-3" [class]="m.operadores ? '' : 'text-amber-300'">{{ m.operadores ? (m.operadores | date:'dd/MM HH:mm') : 'não carregado' }}</td>
          <td class="p-3" [class]="m.tecnicos ? '' : 'text-amber-300'">{{ m.tecnicos ? (m.tecnicos | date:'dd/MM HH:mm') : 'não carregado' }}</td></tr>
      }
      </tbody>
    </table>
  </div>

  <app-newflow-config />`
})
export class ConfiguracoesComponent implements OnInit {
  private auth = inject(AuthService);
  s = signal<any>(null);
  tarefas = signal<Tarefa[]>([]); feitas = signal(0); executando = signal(false); fim = signal(false); erro = signal('');
  total = computed(() => this.tarefas().length);
  rotuloAtual = computed(() => { const t = this.tarefas()[this.feitas()];
    return !this.executando() || !t ? (this.fim() ? 'Concluído' : 'Parado') : (t.tipo === 'op' ? 'Operadores — ' : 'Técnicos — ') + this.nomeMes(t.mes); });

  nomeMes = (m: string) => MES[+m.slice(5) - 1] + '/' + m.slice(0, 4);
  ngOnInit() { this.status(); }

  private async status() { try { const r = await this.auth.call('cfgStatus'); if (r.ok) this.s.set(r); } catch { /* o painel funciona sem o status */ } }
  private msg(e: any) { return 'Não foi possível concluir. ' + String(e?.detail || e?.error || e?.message || e).slice(0, 250); }

  completa() { if (confirm('Recarregar o ano todo pode levar vários minutos. Continuar?')) this.iniciar('completa'); }

  async iniciar(modo: 'rapida' | 'completa') {
    if (this.executando()) return;
    this.erro.set(''); this.fim.set(false); this.feitas.set(0); this.tarefas.set([]); this.executando.set(true);
    try { const p = await this.auth.call('cfgPlano', { modo }); if (!p.ok) throw p; this.tarefas.set(p.tarefas); }
    catch (e) { this.erro.set(this.msg(e)); this.executando.set(false); return; }
    await this.rodar();
  }
  async continuar() { this.erro.set(''); this.executando.set(true); await this.rodar(); }

  private async rodar() {
    try {
      while (this.feitas() < this.total()) {
        const r = await this.auth.call('cfgExecutar', { tarefa: this.tarefas()[this.feitas()] });
        if (!r.ok) throw r;
        this.feitas.update(n => n + 1);
      }
      const c = await this.auth.call('cfgConcluir'); if (!c.ok) throw c;
      this.fim.set(true); await this.status();
    } catch (e) { this.erro.set(this.msg(e)); }
    this.executando.set(false);
  }
}
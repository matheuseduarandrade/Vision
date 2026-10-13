import { Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';

const CORES = { proprio: '#0a7cff', terceiro: '#f5a524', semTecnico: '#64748b' };
const num = (n: number) => n.toLocaleString('pt-BR');

interface Kpi { rotulo: string; valor: string; icone?: string; img?: string; card: string; tom: string; }
const AZUL = { card: 'border-vision-400/30 from-vision-500/20', tom: 'bg-vision-500/20 text-vision-400 ring-vision-400/40' };
const VERDE = { card: 'border-emerald-400/30 from-emerald-500/15', tom: 'bg-emerald-500/20 text-emerald-400 ring-emerald-400/40' };
const LARANJA = { card: 'border-amber-400/30 from-amber-500/15', tom: 'bg-amber-500/20 text-amber-500 ring-amber-400/40' };
const ROXO = { card: 'border-purple-400/30 from-purple-500/15', tom: 'bg-purple-500/20 text-purple-400 ring-purple-400/40' };

@Component({
  selector: 'app-bloco', standalone: true, imports: [IconComponent],
  template: `
  <div class="grid grid-cols-2 gap-3 md:grid-cols-3" [class]="mostrarPend() ? 'xl:grid-cols-7' : 'xl:grid-cols-6'">
    @for (k of kpis(); track k.rotulo) {
      <div class="relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white/[0.02] p-4 shadow-lg backdrop-blur transition hover:-translate-y-0.5" [class]="k.card">
        <span class="grid h-10 w-10 place-items-center rounded-xl ring-1" [class]="k.tom">
          @if (k.img) { <img [src]="k.img" alt="" class="h-6 w-6 object-contain"> } @else { <app-icon [nome]="k.icone || 'check'" [tam]="20" /> }
        </span>
        <p class="mt-4 text-3xl font-bold tabular-nums tracking-tight">{{ k.valor }}</p>
        <p class="mt-0.5 text-xs text-white/60">{{ k.rotulo }}</p>
      </div>
    }
  </div>

  <div class="mt-6 grid gap-5 lg:grid-cols-2">
    @for (l of lados(); track l.titulo) {
      <section class="rounded-2xl border border-vision-400/25 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-5 shadow-[0_0_44px_-20px_rgba(6,109,255,.9)] backdrop-blur">
        <header class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10"><img [src]="l.img" alt="" class="h-6 w-6 object-contain"></span>
          <div><h4 class="font-semibold leading-tight">{{ l.titulo }}</h4>
            <p class="text-xs text-white/50">{{ l.d.total }} {{ l.d.total === 1 ? 'reagendamento' : 'reagendamentos' }}</p></div>
        </header>

        @if (l.d.motivos.length) {
          <ul class="mt-5 space-y-3 text-sm">
            @for (m of l.d.motivos; track m.nome) {
              <li>
                <div class="flex items-baseline justify-between gap-3"><span class="truncate" [title]="m.nome">{{ m.nome }}</span><span class="font-semibold tabular-nums">{{ m.total }}</span></div>
                <div class="mt-1 h-1.5 rounded-full bg-white/10"><div class="h-1.5 rounded-full bg-gradient-to-r from-vision-500 to-sky-400" [style.width.%]="m.total * 100 / l.d.total"></div></div>
              </li>
            }
          </ul>

          <div class="mt-6 flex items-center gap-6 border-t border-white/10 pt-5">
            <div class="relative h-28 w-28 shrink-0" role="img" aria-label="Técnicos próprios e terceiros">
              <div class="donut absolute inset-0 rounded-full" [style.background]="gradiente(l.d)"></div>
              <span class="absolute inset-0 grid place-items-center text-xl font-bold">{{ l.d.total }}</span>
            </div>
            <ul class="space-y-1.5 text-sm">
              @for (f of fatias(l.d); track f.nome) {
                <li class="flex items-center gap-2"><span class="h-3 w-3 rounded-[3px]" [style.background]="f.cor"></span>{{ f.nome }}: <strong>{{ f.n }}</strong></li>
              }
            </ul>
          </div>
        } @else {
          <p class="mt-5 text-sm text-white/50">Nenhum reagendamento nesta categoria.</p>
        }
      </section>
    }
  </div>`
})
export class BlocoComponent {
  b = input.required<any>();
  mostrarPend = input(false);

  kpis = computed<Kpi[]>(() => {
    const b = this.b();
    const l: Kpi[] = [
      { rotulo: 'Chamados', valor: num(b.total), icone: 'telefone', ...AZUL },
      { rotulo: 'Concluídos', valor: num(b.concluidos), icone: 'check', ...VERDE },
      { rotulo: 'Com reagendamento', valor: num(b.reagendados), icone: 'atualizar', ...LARANJA },
      { rotulo: 'Taxa de reagendamento', valor: String(b.taxa).replace('.', ',') + '%', icone: 'percentual', ...ROXO },
      { rotulo: 'Necessidade do cliente', valor: num(b.cliente.total), img: 'assets/cliente.png', ...AZUL },
      { rotulo: 'Necessidade da Queo', valor: num(b.queo.total), img: 'assets/queo.png', ...ROXO },
    ];
    if (this.mostrarPend()) l.splice(2, 0, { rotulo: 'Pendentes', valor: num(b.pendentes), icone: 'calendario', ...LARANJA });
    return l;
  });
  lados = computed(() => [{ titulo: 'Necessidade do cliente', img: 'assets/cliente.png', d: this.b().cliente },
    { titulo: 'Necessidade da Queo', img: 'assets/queo.png', d: this.b().queo }]);

  fatias(d: any) {
    return [{ nome: 'Técnicos próprios', n: d.proprio, cor: CORES.proprio }, { nome: 'Técnicos terceiros', n: d.terceiro, cor: CORES.terceiro },
      { nome: 'Sem técnico informado', n: d.semTecnico, cor: CORES.semTecnico }].filter(f => f.n > 0);
  }
  gradiente(d: any) {
    const f = this.fatias(d), tot = f.reduce((s, x) => s + x.n, 0) || 1; let acc = 0;
    return 'conic-gradient(' + f.map(x => { const ini = acc * 100 / tot; acc += x.n; return `${x.cor} ${ini}% ${acc * 100 / tot}%`; }).join(',') + ')';
  }
}

import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-barras', standalone: true,
  template: `
  @if (lista().length) {
    <ul class="space-y-1.5">
      @for (i of lista(); track i.nome) {
        <li class="flex items-center gap-3 text-sm">
          <span class="w-48 shrink-0 truncate" [title]="i.nome">{{ i.nome }}</span>
          <span class="flex-1 h-4 rounded bg-white/5"><span class="block h-4 rounded" [class]="i.ouro ? 'bg-amber-400' : 'bg-vision-500'" [style.width.%]="i.pct"></span></span>
          <span class="w-10 text-right tabular-nums">{{ i.total }}</span>
        </li>
      }
    </ul>
  } @else { <p class="text-sm text-white/50">Sem dados.</p> }`
})
export class BarrasComponent {
  itens = input.required<{ nome: string; total: number }[]>();
  ouroPrimeiro = input(false);
  lista = computed(() => { const l = this.itens(), max = Math.max(1, ...l.map(x => x.total));
    return l.map((x, i) => ({ ...x, pct: x.total * 100 / max, ouro: this.ouroPrimeiro() && i === 0 })); });
}

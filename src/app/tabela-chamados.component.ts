import { Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tabela-chamados', standalone: true, imports: [DatePipe, FormsModule],
  template: `
  <input [ngModel]="busca()" (ngModelChange)="busca.set($event)" placeholder="Buscar chamado, descrição, técnico, responsável ou cliente"
    class="bg-vision-900 rounded px-3 py-2 text-sm w-96 max-w-full">
  <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
    <table class="w-full text-sm text-left">
      <thead class="bg-white/5 text-white/60"><tr><th class="p-3">Chamado</th><th class="p-3">Descrição</th><th class="p-3">Agendamento</th>
        <th class="p-3">Técnico</th><th class="p-3">Responsável</th><th class="p-3">Cliente</th><th class="p-3">Projeto</th><th class="p-3">Status</th></tr></thead>
      <tbody>
      @for (c of visiveis(); track c.chamado) {
        <tr class="border-t border-white/10">
          <td class="p-3 font-semibold whitespace-nowrap">{{ c.chamado }}</td>
          <td class="p-3 max-w-xs truncate" [title]="c.descricao">{{ c.descricao }}</td>
          <td class="p-3 whitespace-nowrap">{{ c.agendamento ? (c.agendamento | date:'dd/MM/yy HH:mm') : '—' }}</td>
          <td class="p-3">{{ c.tecnico || '—' }}</td><td class="p-3">{{ c.responsavel }}</td>
          <td class="p-3 max-w-[14rem] truncate" [title]="c.cliente">{{ c.cliente }}</td><td class="p-3">{{ c.projeto }}</td><td class="p-3">{{ c.status }}</td>
        </tr>
      } @empty { <tr><td colspan="8" class="p-6 text-center text-white/50">Nenhum chamado encontrado.</td></tr> }
      </tbody>
    </table>
  </div>
  @if (filtradas().length > limite) { <p class="mt-2 text-xs text-white/50">Mostrando {{ limite }} de {{ filtradas().length }}. Use a busca para refinar.</p> }`
})
export class TabelaChamadosComponent {
  linhas = input.required<any[]>();
  busca = signal(''); limite = 300;
  filtradas = computed(() => { const b = this.busca().toLowerCase();
    return !b ? this.linhas() : this.linhas().filter(c => (c.chamado + ' ' + c.descricao + ' ' + c.tecnico + ' ' + c.responsavel + ' ' + c.cliente).toLowerCase().includes(b)); });
  visiveis = computed(() => this.filtradas().slice(0, this.limite));
}

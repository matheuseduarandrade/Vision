import { Injectable, computed, inject } from '@angular/core';
import { AuthService, User } from './auth.service';

export interface Link { nome: string; rota: string; }
export interface Grupo { chave: string; nome: string; icone: string; desc: string; links: Link[]; }

@Injectable({ providedIn: 'root' })
export class NavService {
  private auth = inject(AuthService);

  readonly todas: Grupo[] = [
    { chave: 'MONITORAMENTO', nome: 'Monitoramento', icone: 'monitor', desc: 'Chamados do dia, pendências, resultados e desempenho dos operadores.', links: [
      { nome: 'Painel', rota: '/monitoramento' }, { nome: 'Relatório por período', rota: '/monitoramento/periodo' },
      { nome: 'Resultados', rota: '/monitoramento/resultados' }, { nome: 'Tempo de encerramento', rota: '/monitoramento/encerramento' },
      { nome: 'Desempenho dos operadores', rota: '/monitoramento/desempenho' }] },
    { chave: 'TECNICO', nome: 'Técnico', icone: 'tecnico', desc: 'Técnicos em atendimento, reagendamentos e desempenho.', links: [
      { nome: 'Em atendimento', rota: '/tecnico' }, { nome: 'Atendimentos por data', rota: '/tecnico/data' },
      { nome: 'Reagendamentos', rota: '/tecnico/reagendamentos' }, { nome: 'Desempenho dos técnicos', rota: '/tecnico/desempenho' }] },
    { chave: 'PLANEJAMENTO', nome: 'Planejamento', icone: 'plano', desc: 'Chamados em aberto por status, projeto, planejadora e cliente.', links: [
      { nome: 'Chamados em aberto', rota: '/planejamento' }] },
    { chave: 'CREDENCIAMENTO', nome: 'Credenciamento', icone: 'cred', desc: 'Chamados de credenciamento por status, responsável e cliente.', links: [
      { nome: 'Chamados em aberto', rota: '/credenciamento' }] },
    { chave: 'GERAL', nome: 'Dados gerais', icone: 'geral', desc: 'Chamados do Monitoramento criados há mais de 19 dias e ainda pendentes.', links: [
      { nome: 'Pendentes há mais de 19 dias', rota: '/geral' }] },
  ];

  /** Mesma regra do servidor: admin, gerente e diretor veem tudo; os demais, o próprio setor; gestor também vê os dados gerais. */
  pode(chave: string, u: User | null): boolean {
    if (!u) return false;
    const alto = u.admin || ['GERENTE', 'DIRETOR'].includes(u.cargo);
    return chave === 'GERAL' ? alto || u.cargo === 'GESTOR' : alto || u.setor === chave;
  }
  grupos = computed(() => this.todas.filter(g => this.pode(g.chave, this.auth.user())));
}

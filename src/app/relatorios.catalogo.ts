/** Catálogo de relatórios: cada um busca dados nas ações do servidor e devolve seções (tabelas) prontas para exportar. */
export interface Secao { id: string; titulo: string; colunas: string[]; linhas: (string | number)[][]; }
export type Api = (acao: string, dados?: object) => Promise<any>;
export type ParamKind = 'data' | 'periodo' | 'mes' | 'operador' | 'tecnico';
export interface Params { data: string; inicio: string; fim: string; mes: number; operador: string; tecnico: string; }
export interface Relatorio {
  id: string; area: string; titulo: string; descricao: string; params: ParamKind[];
  secoes: { id: string; titulo: string }[]; gerar: (api: Api, p: Params) => Promise<Secao[]>;
}

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const hms = (s: number | null) => s == null ? '—' : [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
const fd = (s: string) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
const fdh = (iso: string) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' }) : '';
const tipo = (t: string) => t === 'PROPRIO' ? 'Próprio' : 'Terceiro';
const chk = (r: any) => { if (!r?.ok) throw new Error(String(r?.detail || r?.error || 'Falha ao buscar os dados.')); return r; };
const contar = (l: any[], f: (c: any) => string) => { const m: Record<string, number> = {};
  l.forEach(c => { const k = f(c) || '—'; m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map(n => [n, m[n]] as [string, number]).sort((a, b) => b[1] - a[1]); };
const anoAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' }).slice(0, 4);

const blocoResultados = (b: any): Secao[] => [
  { id: 'resumo', titulo: 'Resumo do período', colunas: ['Indicador', 'Valor'], linhas: [['Total de chamados', b.total], ['Total de concluídos', b.concluidos],
    ['Total com reagendamento', b.reagendados], ['Taxa de reagendamento', b.taxa + '%'], ['Reagendamentos por necessidade do cliente', b.cliente.total],
    ['Reagendamentos por necessidade da Queo', b.queo.total]] },
  { id: 'cliente', titulo: 'Motivos — necessidade do cliente', colunas: ['Motivo', 'Quantidade'], linhas: b.cliente.motivos.map((m: any) => [m.nome, m.total]) },
  { id: 'queo', titulo: 'Motivos — necessidade da Queo', colunas: ['Motivo', 'Quantidade'], linhas: b.queo.motivos.map((m: any) => [m.nome, m.total]) },
  { id: 'tecnicos', titulo: 'Reagendamentos por tipo de técnico', colunas: ['Necessidade', 'Técnicos próprios', 'Técnicos terceiros', 'Sem técnico informado'],
    linhas: [['Cliente', b.cliente.proprio, b.cliente.terceiro, b.cliente.semTecnico], ['Queo', b.queo.proprio, b.queo.terceiro, b.queo.semTecnico]] },
];

export const CATALOGO: Relatorio[] = [
  { id: 'mon-dia', area: 'MONITORAMENTO', titulo: 'Chamados por data', descricao: 'Chamados agendados em um dia: totais, clientes e lista completa.', params: ['data'],
    secoes: [{ id: 'resumo', titulo: 'Resumo do dia' }, { id: 'clientes', titulo: 'Chamados por cliente' }, { id: 'chamados', titulo: 'Lista de chamados' }],
    gerar: async (api, p) => { const r = chk(await api('monDia', { data: p.data })); return [
      { id: 'resumo', titulo: 'Resumo do dia', colunas: ['Indicador', 'Valor'], linhas: [['Total do dia', r.totais.total], ['Pendentes de atendimento', r.totais.pendAtend],
        ['Pendentes de encerramento', r.totais.pendEnc], ['Concluídos', r.totais.concluidos]] },
      { id: 'clientes', titulo: 'Chamados por cliente', colunas: ['Cliente', 'Chamados'], linhas: r.clientes.map((c: any) => [c.nome, c.total]) },
      { id: 'chamados', titulo: 'Lista de chamados', colunas: ['Chamado', 'Descrição', 'Agendamento', 'Técnico', 'Responsável', 'Status'],
        linhas: r.chamados.map((c: any) => [c.chamado, c.descricao, fdh(c.agendamento), c.tecnico, c.responsavel, c.status]) }]; } },

  { id: 'mon-periodo', area: 'MONITORAMENTO', titulo: 'Relatório por período', descricao: 'Totais do período escolhido e detalhamento por operador.', params: ['periodo'],
    secoes: [{ id: 'resumo', titulo: 'Resumo do período' }, { id: 'operadores', titulo: 'Detalhamento por operador' }],
    gerar: async (api, p) => { const r = chk(await api('relPeriodo', { inicio: p.inicio, fim: p.fim })); return [
      { id: 'resumo', titulo: 'Resumo do período', colunas: ['Indicador', 'Valor'], linhas: [['Total de chamados', r.total], ['Pendentes de atendimento', r.pendAtend],
        ['Pendentes de encerramento', r.pendEnc], ['Concluídos', r.concluidos], ['Reagendamentos', r.reagendados], ['Taxa de reagendamento', r.taxa + '%']] },
      { id: 'operadores', titulo: 'Detalhamento por operador', colunas: ['Operador', 'Chamados atendidos', 'Concluídos', 'Reagendados', 'Pendentes de encerramento', 'Taxa'],
        linhas: r.operadores.map((o: any) => [o.operador, o.total, o.concluidos, o.reagendados, o.pendEnc, o.taxa + '%']) }]; } },

  { id: 'mon-resultados', area: 'MONITORAMENTO', titulo: 'Resultados do mês', descricao: 'Todos os chamados agendados no mês: concluídos, reagendados (status Com reagendamento), motivos e resumo por dia.', params: ['mes'],
    secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'cliente', titulo: 'Motivos — cliente' }, { id: 'queo', titulo: 'Motivos — Queo' },
      { id: 'tecnicos', titulo: 'Próprios x terceiros' }, { id: 'dias', titulo: 'Resumo por dia' }],
    gerar: async (api, p) => { const r = chk(await api('relResultados', { mes: `${anoAtual()}-${String(p.mes).padStart(2, '0')}` })); return [
      ...blocoResultados(r.bloco),
      { id: 'dias', titulo: 'Resumo por dia', colunas: ['Dia', 'Agendados', 'Concluídos', 'Reagendados'],
        linhas: Object.keys(r.dias).sort().map(k => [fd(k), r.dias[k].agendados, r.dias[k].concluidos, r.dias[k].reagendados]) }]; } },

  { id: 'mon-encerramento', area: 'MONITORAMENTO', titulo: 'Tempo de encerramento', descricao: 'Tempo médio entre agendamento e resolução, geral e por operador.', params: ['periodo'],
    secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'operadores', titulo: 'Por operador' }],
    gerar: async (api, p) => { const r = chk(await api('relEncerramento', { inicio: p.inicio, fim: p.fim })); return [
      { id: 'resumo', titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: [['Chamados encerrados', r.chamados], ['Média geral', hms(r.media)],
        ['Média com reagendamento', hms(r.mediaCom)], ['Média sem reagendamento', hms(r.mediaSem)], ['Operadores envolvidos', r.operadoresEnvolvidos]] },
      { id: 'operadores', titulo: 'Por operador', colunas: ['Operador', 'Chamados', 'Média geral', 'Com reagendamento', 'Sem reagendamento'],
        linhas: r.operadores.map((o: any) => [o.operador, o.chamados, hms(o.media), hms(o.mediaCom), hms(o.mediaSem)]) }]; } },

  { id: 'mon-desempenho', area: 'MONITORAMENTO', titulo: 'Desempenho dos operadores', descricao: 'Produtividade do ano: metas, meses, turnos, dias da semana e clientes.', params: ['operador'],
    secoes: [{ id: 'resumo', titulo: 'Indicadores' }, { id: 'operadores', titulo: 'Por operador' }, { id: 'meses', titulo: 'Atendimentos por mês' }, { id: 'newflow', titulo: 'NEWFLOW por mês' },
      { id: 'turnos', titulo: 'Demanda por turno' }, { id: 'semana', titulo: 'Demanda por dia da semana' }, { id: 'clientes', titulo: 'Clientes mais atendidos' }],
    gerar: async (api, p) => { const r = chk(await api('relDesempenho', { operador: p.operador })); if (r.vazio) throw new Error('Os dados do ano ainda não foram carregados.'); return [
      { id: 'resumo', titulo: 'Indicadores', colunas: ['Indicador', 'Valor'], linhas: [['Total de atendimentos', r.total], ['Média por dia', r.mediaDia], ['Tempo médio (estimativa)', hms(r.tempoMedioSeg)],
        ['Taxa de reagendamento', r.taxa + '%'], ['Média vs meta', `${r.mediaPorOperador}/${r.meta} = ${r.pctMeta}%`], ['Atendimentos NEWFLOW', r.newflow.total]] },
      { id: 'operadores', titulo: 'Por operador', colunas: ['Operador', 'Meta/dia', 'Atendimento/dia', 'Reagendamentos', 'Pend. encerramento', 'NEWFLOW', 'Total', 'Média diária', '% da meta'],
        linhas: r.operadoresTabela.map((o: any) => [o.operador, r.meta, o.saldoDia, o.reagendados, o.pendEnc, o.newflow, o.total, o.mediaDia, o.pctMeta + '%']) },
      { id: 'meses', titulo: 'Atendimentos por mês', colunas: ['Mês', 'Atendimentos'], linhas: r.meses.map((m: any) => [m.mes, m.total]) },
      { id: 'newflow', titulo: 'NEWFLOW por mês', colunas: ['Mês', 'Total', ...r.newflow.projetos.map((p: any) => p.nome)],
        linhas: r.newflow.meses.map((m: any) => [m.mes, m.total, ...r.newflow.projetos.map((p: any) => m.porProjeto[p.nome])]) },
      { id: 'turnos', titulo: 'Demanda por turno', colunas: ['Turno', 'Operadores', 'Chamados', 'Média/operador', 'Ocupação estimada'],
        linhas: r.turnos.map((t: any) => [t.nome, t.operadores, t.chamados, t.mediaOperador, t.ocupacao + '%']) },
      { id: 'semana', titulo: 'Demanda por dia da semana', colunas: ['Dia', 'Atendimentos'], linhas: r.semana.map((s: any) => [s.nome, s.total]) },
      { id: 'clientes', titulo: 'Clientes mais atendidos', colunas: ['Cliente', 'Atendimentos'], linhas: r.clientes.map((c: any) => [c.nome, c.total]) }]; } },

  { id: 'mon-newflow', area: 'MONITORAMENTO', titulo: 'NEWFLOW — lançamentos do mês', descricao: 'Atendimentos NEWFLOW lançados manualmente: totais por projeto e lista de lançamentos.', params: ['mes'],
    secoes: [{ id: 'resumo', titulo: 'Total por projeto' }, { id: 'lancamentos', titulo: 'Lançamentos' }],
    gerar: async (api, p) => { const r = chk(await api('nfListar', { mes: `${anoAtual()}-${String(p.mes).padStart(2, '0')}` })); return [
      { id: 'resumo', titulo: 'Total por projeto', colunas: ['Projeto', 'Atendimentos'], linhas: [...r.totais.map((t: any) => [t.projeto, t.total] as (string | number)[]), ['Total', r.total]] },
      { id: 'lancamentos', titulo: 'Lançamentos', colunas: ['Data', 'Operador', 'Projeto', 'Quantidade'],
        linhas: r.lancamentos.map((l: any) => [fd(l.data), l.operador, l.projeto, l.quantidade]) }]; } },

  { id: 'tec-dia', area: 'TECNICO', titulo: 'Técnicos em atendimento por data', descricao: 'Técnicos com chamados em um dia (passado, atual ou futuro) e seus chamados.', params: ['data'],
    secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'tecnicos', titulo: 'Técnicos' }, { id: 'chamados', titulo: 'Chamados por técnico' }],
    gerar: async (api, p) => { const r = chk(await api('tecDia', { data: p.data })); const nome: Record<string, string> = {}; r.tecnicos.forEach((t: any) => nome[t.key] = t.nome); return [
      { id: 'resumo', titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: [['Técnicos em atendimento', r.tecnicos.length], ['Técnicos próprios', r.proprios], ['Técnicos terceiros', r.terceiros]] },
      { id: 'tecnicos', titulo: 'Técnicos', colunas: ['Técnico', 'Tipo', 'Chamados'], linhas: r.tecnicos.map((t: any) => [t.nome, tipo(t.tipo), t.total]) },
      { id: 'chamados', titulo: 'Chamados por técnico', colunas: ['Técnico', 'Chamado', 'Descrição', 'Agendamento', 'Cliente', 'Tipo de requisição', 'Status'],
        linhas: r.chamados.map((c: any) => [nome[c.tec] || c.tec, c.chamado, c.descricao, fdh(c.agendamento), c.cliente, c.tipoReq, c.status]) }]; } },

  { id: 'tec-reag', area: 'TECNICO', titulo: 'Reagendamentos por técnico', descricao: 'Ranking de reagendamentos (necessidade do cliente ou da Queo) no período.', params: ['periodo'],
    secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'ranking', titulo: 'Ranking completo' }],
    gerar: async (api, p) => { const r = chk(await api('tecReag', { inicio: p.inicio, fim: p.fim })); return [
      { id: 'resumo', titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: [['Reagendamentos no período', r.total], ['Técnicos envolvidos', r.nTecnicos], ['Sem técnico informado', r.semTecnico]] },
      { id: 'ranking', titulo: 'Ranking completo', colunas: ['#', 'Técnico', 'Tipo', 'Reagendamentos', 'Necessidade do cliente', 'Necessidade da Queo'],
        linhas: r.ranking.map((t: any, i: number) => [i + 1, t.nome, tipo(t.tipo), t.total, t.cliente, t.queo]) }]; } },

  { id: 'tec-desempenho', area: 'TECNICO', titulo: 'Desempenho de um técnico', descricao: 'Chamados do ano, reagendamentos, clientes, requisições e operadores de um técnico.', params: ['tecnico'],
    secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'clientes', titulo: 'Clientes atendidos' }, { id: 'requisicoes', titulo: 'Tipos de requisição' }, { id: 'operadores', titulo: 'Operadores' }],
    gerar: async (api, p) => { if (!p.tecnico) throw new Error('Escolha um técnico.'); const r = chk(await api('tecDesempenho', { tecnico: p.tecnico })); if (r.vazio || !r.tecnico) throw new Error('Sem dados para este técnico.'); return [
      { id: 'resumo', titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: [['Técnico', r.tecnico.nome], ['Tipo', tipo(r.tecnico.tipo)], ['Chamados', r.total],
        ['Com reagendamento', r.reag], ['Sem reagendamento', r.sem], ['Operador que mais o atendeu', r.operadorTop ? `${r.operadorTop.nome} (${r.operadorTop.total})` : '—']] },
      { id: 'clientes', titulo: 'Clientes atendidos', colunas: ['Cliente', 'Atendimentos'], linhas: r.clientes.map((c: any) => [c.nome, c.total]) },
      { id: 'requisicoes', titulo: 'Tipos de requisição', colunas: ['Tipo', 'Atendimentos'], linhas: r.requisicoes.map((c: any) => [c.nome, c.total]) },
      { id: 'operadores', titulo: 'Operadores que o atenderam', colunas: ['Operador', 'Atendimentos'], linhas: r.operadores.map((c: any) => [c.nome, c.total]) }]; } },
];

const areaRel = (id: string, area: 'PLANEJAMENTO' | 'CREDENCIAMENTO', rotulo: string): Relatorio => ({
  id, area, titulo: `${rotulo} — chamados em aberto`, descricao: 'Chamados em aberto por status, projeto, responsável e cliente, com a lista completa.', params: [],
  secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'status', titulo: 'Por status' }, ...(area === 'PLANEJAMENTO' ? [{ id: 'projeto', titulo: 'Por projeto' }] : []),
    { id: 'responsavel', titulo: 'Por responsável' }, { id: 'cliente', titulo: 'Por cliente' }, { id: 'chamados', titulo: 'Lista de chamados' }],
  gerar: async (api) => { const r = chk(await api('areaDados', { area })), l: any[] = r.chamados;
    const tab = (id: string, titulo: string, col: string, f: (c: any) => string): Secao => ({ id, titulo, colunas: [col, 'Chamados'], linhas: contar(l, f) });
    return [
      { id: 'resumo', titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: [['Chamados em aberto', l.length], ['Status diferentes', new Set(l.map(c => c.status)).size],
        ['Responsáveis', new Set(l.map(c => c.responsavel)).size], ['Clientes', new Set(l.map(c => c.cliente)).size]] },
      tab('status', 'Por status', 'Status', c => c.status),
      ...(area === 'PLANEJAMENTO' ? [tab('projeto', 'Por projeto', 'Projeto', c => c.projeto)] : []),
      tab('responsavel', 'Por responsável', 'Responsável', c => c.responsavel), tab('cliente', 'Por cliente', 'Cliente', c => c.cliente),
      { id: 'chamados', titulo: 'Lista de chamados', colunas: ['Chamado', 'Descrição', 'Agendamento', 'Técnico', 'Responsável', 'Cliente', 'Projeto', 'Status'],
        linhas: l.map(c => [c.chamado, c.descricao, fdh(c.agendamento), c.tecnico, c.responsavel, c.cliente, c.projeto, c.status]) }]; }
});
CATALOGO.push(areaRel('plan-abertos', 'PLANEJAMENTO', 'Planejamento'), areaRel('cred-abertos', 'CREDENCIAMENTO', 'Credenciamento'));
CATALOGO.push({ id: 'geral-19', area: 'GERAL', titulo: 'Chamados pendentes há mais de 19 dias', descricao: 'Chamados PROMONITOR e MONITORAR criados há mais de 19 dias e ainda pendentes (atendimento ou encerramento).', params: [],
  secoes: [{ id: 'resumo', titulo: 'Resumo' }, { id: 'chamados', titulo: 'Lista de chamados' }],
  gerar: async (api) => { const r = chk(await api('geralAbertos')), l: any[] = r.chamados; return [
    { id: 'resumo', titulo: 'Resumo', colunas: ['Faixa', 'Chamados'], linhas: [['Total com mais de ' + r.limite + ' dias', r.total],
      ...(r.faixas as any[]).map(f => [f.nome, l.filter(c => c.dias >= f.min && (f.max == null || c.dias <= f.max)).length] as (string | number)[])] },
    { id: 'chamados', titulo: 'Lista de chamados', colunas: ['Dias', 'Chamado', 'Descrição', 'Projeto', 'Status', 'Responsável', 'Cliente', 'Criador', 'Criado em'],
      linhas: l.map(c => [c.dias, c.chamado, c.descricao, c.projeto, c.status, c.responsavel, c.cliente, c.criador, fdh(c.criado).slice(0, 10)]) }]; } });

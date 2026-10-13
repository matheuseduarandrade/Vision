import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

const autenticado = async () => {
  const auth = inject(AuthService), router = inject(Router);
  return (await auth.restore()) ? true : router.parseUrl('/login');
};
const somenteAdmin = async () => {
  const auth = inject(AuthService), router = inject(Router);
  return (await auth.restore()) && auth.user()?.admin ? true : router.parseUrl('/');
};

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login.component').then(m => m.LoginComponent) },
  { path: '', canActivate: [autenticado], loadComponent: () => import('./shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./home.component').then(m => m.HomeComponent) },
      { path: 'monitoramento', loadComponent: () => import('./monitoramento.component').then(m => m.MonitoramentoComponent) },
      { path: 'monitoramento/periodo', loadComponent: () => import('./periodo.component').then(m => m.PeriodoComponent) },
      { path: 'monitoramento/resultados', loadComponent: () => import('./resultados.component').then(m => m.ResultadosComponent) },
      { path: 'monitoramento/encerramento', loadComponent: () => import('./encerramento.component').then(m => m.EncerramentoComponent) },
      { path: 'monitoramento/desempenho', loadComponent: () => import('./desempenho.component').then(m => m.DesempenhoComponent) },
      { path: 'tecnico', data: { modo: 'hoje' }, loadComponent: () => import('./tecnico-atendimento.component').then(m => m.TecnicoAtendimentoComponent) },
      { path: 'tecnico/data', data: { modo: 'data' }, loadComponent: () => import('./tecnico-atendimento.component').then(m => m.TecnicoAtendimentoComponent) },
      { path: 'tecnico/reagendamentos', loadComponent: () => import('./tecnico-reag.component').then(m => m.TecnicoReagComponent) },
      { path: 'tecnico/desempenho', loadComponent: () => import('./tecnico-desempenho.component').then(m => m.TecnicoDesempenhoComponent) },
      { path: 'planejamento', data: { area: 'PLANEJAMENTO' }, loadComponent: () => import('./area.component').then(m => m.AreaComponent) },
      { path: 'credenciamento', data: { area: 'CREDENCIAMENTO' }, loadComponent: () => import('./area.component').then(m => m.AreaComponent) },
      { path: 'geral', loadComponent: () => import('./geral.component').then(m => m.GeralComponent) },
      { path: 'relatorios', loadComponent: () => import('./relatorios.component').then(m => m.RelatoriosComponent) },
      { path: 'configuracoes', canActivate: [somenteAdmin], loadComponent: () => import('./configuracoes.component').then(m => m.ConfiguracoesComponent) },
      { path: 'admin/acessos', canActivate: [somenteAdmin], loadComponent: () => import('./admin.component').then(m => m.AdminComponent) },
    ] },
  { path: '**', redirectTo: '' }
];

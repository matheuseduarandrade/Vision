import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { NavService, Grupo } from './nav.service';
import { ThemeService } from './theme.service';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-shell', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, AvatarComponent],
  template: `
  <div class="min-h-screen flex">
    <aside class="sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-white/10 bg-vision-900/60 backdrop-blur transition-[width] duration-200"
           [class]="rec() ? 'w-[4.75rem]' : 'w-64'">
      <div class="flex h-16 items-center gap-3 px-4">
        <a routerLink="/" class="flex items-center gap-3 min-w-0" aria-label="VISION — início">
          <img src="assets/logo.png" alt="" class="h-9 w-9 shrink-0 object-contain">
          @if (!rec()) { <span class="text-lg font-bold tracking-tight">VISION</span> }
        </a>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-2 text-sm" aria-label="Principal">
        <a routerLink="/" routerLinkActive="bg-vision-500/20 font-semibold" [routerLinkActiveOptions]="{exact:true}"
           class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10" [title]="rec() ? 'Início' : ''">
          <app-icon nome="home" /> @if (!rec()) { <span>Início</span> }</a>

        @for (g of nav.grupos(); track g.chave) {
          <div class="group relative" data-grupo>
            <button (click)="alternar(g.chave)" [attr.aria-expanded]="aberto() === g.chave" [attr.aria-label]="g.nome"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10" [class]="ativo(g) ? 'bg-vision-500/20 font-semibold' : ''">
              <app-icon [nome]="g.icone" />
              @if (!rec()) { <span class="flex-1 text-left">{{ g.nome }}</span><app-icon nome="seta" [tam]="14" /> }
            </button>
            <div class="invisible absolute left-full top-0 z-40 pl-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                 [class]="aberto() === g.chave ? '!visible !opacity-100' : ''">
              <div class="w-64 rounded-xl border border-white/10 bg-vision-950 p-2 shadow-2xl">
                <p class="px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">{{ g.nome }}</p>
                @for (l of g.links; track l.rota) {
                  <a [routerLink]="l.rota" (click)="aberto.set(null)" class="block rounded-lg px-3 py-2 hover:bg-white/10"
                     [class]="ativoLink(l.rota) ? 'bg-vision-500/20 font-semibold text-vision-400' : ''">{{ l.nome }}</a>
                }
              </div>
            </div>
          </div>
        }

        <a routerLink="/relatorios" routerLinkActive="bg-vision-500/20 font-semibold" class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10"
           [title]="rec() ? 'Relatórios' : ''"><app-icon nome="relatorio" /> @if (!rec()) { <span>Relatórios</span> }</a>

        @if (auth.user()?.admin) {
          <a routerLink="/admin/acessos" routerLinkActive="bg-vision-500/20 font-semibold" class="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10"
             [title]="rec() ? 'Controle de acesso' : ''"><app-icon nome="admin" /> @if (!rec()) { <span>Controle de acesso</span> }</a>

          <a routerLink="/configuracoes" routerLinkActive="bg-vision-500/20 font-semibold" class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10"
             [title]="rec() ? 'Configurações' : ''"><app-icon nome="config" /> @if (!rec()) { <span>Configurações</span> }</a>
        }
      </nav>

      <div class="border-t border-white/10 p-3">
        <button (click)="alternarMenu()" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"
                [attr.aria-label]="rec() ? 'Expandir menu' : 'Recolher menu'">
          <app-icon [nome]="rec() ? 'expandir' : 'recolher'" /> @if (!rec()) { <span>Recolher menu</span> }</button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-vision-950/80 px-6 backdrop-blur">
        <button (click)="alternarMenu()" class="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Menu"><app-icon nome="menu" /></button>
        <div class="flex-1"></div>
        <button (click)="tema.alternar()" class="rounded-lg p-2 hover:bg-white/10" [attr.aria-label]="tema.tema() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'"
                [title]="tema.tema() === 'dark' ? 'Tema claro' : 'Tema escuro'"><app-icon [nome]="tema.tema() === 'dark' ? 'sol' : 'lua'" /></button>
        <div class="flex items-center gap-3 rounded-full border border-white/10 py-1 pl-1 pr-4">
          <app-avatar [nome]="auth.user()?.nome ?? ''" [avatar]="auth.user()?.avatar" [tam]="36" />
          <span class="hidden leading-tight sm:block"><span class="block text-sm font-semibold">{{ auth.user()?.nome }}</span>
            <span class="block text-[0.7rem] text-white/50">{{ auth.user()?.cargo }}{{ auth.user()?.setor ? ' · ' + auth.user()?.setor : '' }}</span></span>
        </div>
        <button (click)="auth.logout()" class="rounded-lg p-2 hover:bg-white/10" aria-label="Sair" title="Sair"><app-icon nome="sair" /></button>
      </header>
      <main class="vision-page mx-auto w-full max-w-[1500px] flex-1 p-6 lg:p-8"><router-outlet /></main>
    </div>
  </div>`
})
export class ShellComponent {
  auth = inject(AuthService); nav = inject(NavService); tema = inject(ThemeService);
  private router = inject(Router); private host = inject(ElementRef);
  rec = signal(this.lerRec()); aberto = signal<string | null>(null);

  ativoLink = (rota: string) => this.router.isActive(rota, { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' });
  ativo = (g: Grupo) => g.links.some(l => this.ativoLink(l.rota));
  alternar(chave: string) { this.aberto.set(this.aberto() === chave ? null : chave); }
  alternarMenu() { const v = !this.rec(); this.rec.set(v); try { localStorage.setItem('vision_menu_rec', v ? '1' : '0'); } catch { /* ok */ } }
  private lerRec(): boolean { try { const v = localStorage.getItem('vision_menu_rec'); if (v !== null) return v === '1'; } catch { /* ok */ } return window.innerWidth < 1024; }

  @HostListener('document:click', ['$event']) fora(e: MouseEvent) {
    if (this.aberto() && !(e.target as HTMLElement).closest('[data-grupo]')) this.aberto.set(null);
  }
}

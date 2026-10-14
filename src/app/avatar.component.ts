import { Component, computed, input } from '@angular/core';
import { avatarPorId } from './avatares';

/** Foto de perfil: mostra a caricatura escolhida; sem avatar, mostra as iniciais do nome. */
@Component({
  selector: 'app-avatar', standalone: true,
  host: { class: 'inline-flex shrink-0' },
  template: `
  @if (img(); as src) {
    <img [src]="src" [alt]="'Avatar de ' + nome()" [style.width.px]="tam()" [style.height.px]="tam()" class="rounded-full bg-vision-500/20 object-cover ring-1 ring-white/20">
  } @else {
    <span class="grid place-items-center rounded-full bg-vision-500 font-bold" [style.width.px]="tam()" [style.height.px]="tam()" [style.font-size.px]="tam() * 0.36" aria-hidden="true">{{ iniciais() }}</span>
  }`
})
export class AvatarComponent {
  nome = input('');
  avatar = input<string | null | undefined>('');
  tam = input(36);
  img = computed(() => avatarPorId(this.avatar())?.caminho ?? '');
  iniciais = computed(() => (this.nome() || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase());
}

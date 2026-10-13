import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
  signal
} from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

declare const google: any;

const ERROS: Record<string, string> = {
  'DOMÍNIO_NÃO_PERMITIDO':
    'Use sua conta @queonetics.com para entrar.',
  'AGUARDANDO_LIBERAÇÃO':
    'Seu acesso foi registrado e aguarda liberação do administrador.',
  'TOKEN_INVÁLIDO':
    'Não foi possível validar sua conta Google. Tente novamente.'
};


/* =============================================================
   MALHA DE DADOS (canvas)

   Um terreno 3D feito de uma grade ROWS x COLS de pontos com
   perspectiva. Cada ponto é ligado aos vizinhos (linhas, colunas
   e diagonais), formando uma rede. A altura é a soma de senoides
   que se movem no tempo. Os pontos pulsam e brilham nas cristas.
============================================================= */

const TAU = Math.PI * 2;
const ROWS = 40;
const COLS = 100;

type RGB = [number, number, number];

interface Palette {
  line: RGB;
  dot: RGB;
  glow: RGB;
  lineAlpha: number;
  additive: boolean;
}

const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    line: [64, 156, 255],
    dot: [170, 226, 255],
    glow: [56, 170, 255],
    lineAlpha: 0.5,
    additive: true
  },
  light: {
    line: [28, 100, 230],
    dot: [20, 108, 255],
    glow: [40, 125, 255],
    lineAlpha: 0.38,
    additive: false
  }
};

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const smooth = (x: number) => {
  const f = Math.max(0, Math.min(1, x));
  return f * f * (3 - 2 * f);
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class DataWave {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private t = 6;
  private last = 0;
  private raf = 0;
  private themeKey = '';
  private edge!: CanvasGradient;
  private sprite!: HTMLCanvasElement;
  private ro: ResizeObserver;

  private xs = new Float32Array(ROWS * COLS);
  private ys = new Float32Array(ROWS * COLS);
  private hs = new Float32Array(ROWS * COLS);
  private ph = new Float32Array(ROWS * COLS);
  private sp = new Float32Array(ROWS * COLS);

  private reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  constructor(
    private canvas: HTMLCanvasElement,
    private isDark: () => boolean
  ) {
    this.ctx = canvas.getContext('2d')!;

    const rnd = mulberry32(11);
    for (let i = 0; i < ROWS * COLS; i++) {
      this.ph[i] = rnd() * TAU;
      this.sp[i] = 0.6 + rnd() * 1.4;
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  start() {
    if (this.reduced) {
      this.draw();
      return;
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
      this.last = now;
      this.t += dt;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };

    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }

  /** Redesenha um quadro (usado ao trocar tema com movimento reduzido). */
  redraw() {
    if (this.reduced) this.draw();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (!r.width || !r.height) return;

    this.w = r.width;
    this.h = r.height;

    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.themeKey = '';

    if (this.reduced) this.draw();
  }

  /** Calcula a posição na tela de cada ponto da grade. */
  private project(t: number) {
    const { w, h, xs, ys, hs } = this;

    for (let r = 0; r < ROWS; r++) {
      const v = r / (ROWS - 1);
      const vv = Math.pow(v, 1.15);
      const scale = 0.75 + 1.15 * vv;
      const base = h * (0.04 + 0.92 * vv);
      const amp = h * (0.025 + 0.10 * vv);

      for (let c = 0; c < COLS; c++) {
        const u = c / (COLS - 1);
        const i = r * COLS + c;
        const env = 0.65 + 0.35 * Math.sin(Math.PI * u);

        const d =
          Math.sin(TAU * 1.2 * u + t * 0.35 + v * 3.2) * 0.5 +
          Math.sin(TAU * 2.6 * u - t * 0.5 + v * 5.4) * 0.28 +
          Math.sin(TAU * (0.8 * u + 0.9 * v) + t * 0.25) * 0.22;

        xs[i] = w / 2 + (u - 0.5) * w * scale;
        ys[i] = base - amp * env * d - (u - 0.5) * h * 0.12 * (0.3 + vv);
        hs[i] = d;
      }
    }
  }

  private prepare(dark: boolean, p: Palette) {
    const key = `${dark}|${this.w}`;
    if (key === this.themeKey) return;
    this.themeKey = key;

    const g = this.ctx.createLinearGradient(0, 0, this.w, 0);
    g.addColorStop(0, rgba(p.line, 0));
    g.addColorStop(0.12, rgba(p.line, 1));
    g.addColorStop(0.88, rgba(p.line, 1));
    g.addColorStop(1, rgba(p.line, 0));
    this.edge = g;

    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const sc = s.getContext('2d')!;
    const rg = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, rgba(p.glow, 0.9));
    rg.addColorStop(0.3, rgba(p.glow, 0.25));
    rg.addColorStop(1, rgba(p.glow, 0));
    sc.fillStyle = rg;
    sc.fillRect(0, 0, 64, 64);
    this.sprite = s;
  }

  private draw() {
    const { ctx, w, h, t, xs, ys, hs, ph, sp } = this;
    if (!w || !h) return;

    const dark = this.isDark();
    const p = dark ? PALETTES.dark : PALETTES.light;

    this.prepare(dark, p);
    this.project(t);

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.edge;

    /* ---- ligações entre fileiras (colunas + diagonais) ---- */

    ctx.lineWidth = 0.5;

    for (let r = 0; r < ROWS - 1; r++) {
      const v = (r + 1) / (ROWS - 1);
      const k = 0.08 + 0.92 * Math.pow(v, 1.2);

      ctx.globalAlpha = p.lineAlpha * 0.5 * k;
      ctx.beginPath();

      for (let c = 0; c < COLS; c++) {
        const a = r * COLS + c;
        const b = (r + 1) * COLS + c;

        ctx.moveTo(xs[a], ys[a]);
        ctx.lineTo(xs[b], ys[b]);

        if (c % 2 === 0 && c < COLS - 1) {
          ctx.moveTo(xs[a], ys[a]);
          ctx.lineTo(xs[b + 1], ys[b + 1]);
        }
      }

      ctx.stroke();
    }

    /* ---- linhas de cada fileira ---- */

    for (let r = 0; r < ROWS; r++) {
      const v = r / (ROWS - 1);
      const k = 0.1 + 0.9 * Math.pow(v, 1.2);

      ctx.globalAlpha = p.lineAlpha * k;
      ctx.lineWidth = 0.5 + 0.8 * v;
      ctx.beginPath();

      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (c === 0) ctx.moveTo(xs[i], ys[i]);
        else ctx.lineTo(xs[i], ys[i]);
      }

      ctx.stroke();
    }

    /* ---- pontos: pulso em trânsito, brilho nas cristas, cintilação ---- */

    ctx.fillStyle = rgba(p.dot, 1);

    for (let r = 0; r < ROWS; r++) {
      const v = r / (ROWS - 1);
      const k = 0.1 + 0.9 * Math.pow(v, 1.2);
      const size = 1.6 + 3.2 * v;

      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const x = xs[i];

        if (x < -8 || x > w + 8) continue;

        const fx = x / w;
        const ef = smooth(Math.min(fx / 0.1, (1 - fx) / 0.1));
        if (ef <= 0.02) continue;

        const u = c / (COLS - 1);
        const y = ys[i];

        const pulse = Math.pow(
          Math.max(0, Math.sin(TAU * (u * 1.4 - t * 0.08) + v * 4)),
          10
        );
        const tw = Math.pow(Math.max(0, Math.sin(ph[i] + t * sp[i])), 14);
        const crest = 0.5 + 0.5 * hs[i];

        let a = (0.16 + 0.5 * pulse + 0.7 * tw) * (0.5 + 0.5 * crest) * k * ef;
        if (a > 1) a = 1;
        if (a < 0.03) continue;

        ctx.globalAlpha = a;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);

        if (a > 0.55 && v > 0.2) {
          const rr = 8 + 14 * v;
          ctx.globalAlpha = a * 0.8;
          ctx.drawImage(this.sprite, x - rr, y - rr, rr * 2, rr * 2);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}


/* =============================================================
   COMPONENTE
============================================================= */

@Component({
  selector: 'app-login',
  standalone: true,

  styles: [`

    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    * { box-sizing: border-box; }


    /* ---------- tokens por tema ---------- */

    .page {
      --bg: linear-gradient(180deg, #03123c 0%, #020d2e 50%, #010818 100%);
      --halo: rgba(20, 110, 255, .22);
      --horizon: rgba(20, 110, 255, .34);
      --text: #ffffff;
      --muted: rgba(200, 220, 255, .5);
      --err: #ff8a98;
      --ok: #5fb0ff;
      --switch-bg: rgba(8, 30, 84, .7);
      --switch-line: rgba(90, 150, 255, .25);
      --switch-off: rgba(190, 210, 245, .55);
      --cta-text: #1c2a48;
      --cta-line: rgba(255, 255, 255, .9);
      --cta-glow: rgba(20, 120, 255, .45);
    }

    .page:not(.dark) {
      --bg: linear-gradient(180deg, #ffffff 0%, #f6f9ff 55%, #ebf3ff 100%);
      --halo: rgba(37, 126, 255, .12);
      --horizon: rgba(37, 126, 255, .16);
      --text: #07183a;
      --muted: rgba(22, 52, 93, .55);
      --err: #cf2e45;
      --ok: #1565e0;
      --switch-bg: rgba(255, 255, 255, .85);
      --switch-line: rgba(20, 60, 110, .12);
      --switch-off: rgba(60, 85, 125, .55);
      --cta-line: rgba(20, 60, 110, .14);
      --cta-glow: rgba(20, 100, 235, .22);
    }


    /* ---------- página ---------- */

    .page {
      position: relative;
      width: 100%;
      min-height: 100vh;
      overflow: hidden;
      color: var(--text);
      background: var(--bg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system,
                   BlinkMacSystemFont, "Segoe UI", sans-serif;
      transition: color .5s ease;
    }

    /* horizonte: luz que sobe da malha */
    .horizon {
      position: absolute;
      inset: auto 0 0 0;
      height: 60%;
      pointer-events: none;
      background:
        radial-gradient(
          ellipse 75% 70% at 50% 115%,
          var(--horizon),
          transparent 70%
        );
    }


    /* ---------- conteúdo ---------- */

    .content {
      position: relative;
      z-index: 5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px 14vh;
      animation: reveal 1s cubic-bezier(.2, .7, .2, 1) both;
    }

    @keyframes reveal {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: none; }
    }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 44px;
      user-select: none;
    }

    .logo-wrap {
      position: relative;
      width: 84px;
      height: 84px;
      margin-bottom: 20px;
    }

    .logo-wrap::before {
      content: '';
      position: absolute;
      inset: -90px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--halo), transparent 65%);
      animation: breathe 8s ease-in-out infinite;
    }

    @keyframes breathe {
      0%, 100% { opacity: .65; transform: scale(.94); }
      50%      { opacity: 1;   transform: scale(1.06); }
    }

    .logo {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 10px 26px rgba(0, 105, 255, .35));
    }

    .brand-name {
      margin: 0;
      padding-left: .36em; /* compensa o espaçamento final para centralizar */
      font-size: 30px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: .36em;
      color: var(--text);
    }


    /* ---------- botão ---------- */

    .login-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    /*
     * O botão visível (branco) é desenhado aqui; o botão oficial do
     * Google fica por cima, transparente, recebendo o clique. Assim o
     * texto é nosso e o fluxo de autenticação continua sendo o do Google.
     */
    .cta {
      position: relative;
      width: 320px;
      max-width: 100%;
      height: 48px;
      cursor: pointer;
    }

    .cta-face {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 0 16px;
      border-radius: 14px;
      color: var(--cta-text);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: .005em;
      background: #ffffff;
      border: 1px solid var(--cta-line);
      box-shadow: 0 10px 28px -10px var(--cta-glow);
      transition: transform .25s ease, box-shadow .25s ease;
    }

    .cta:hover .cta-face {
      transform: translateY(-1px);
      box-shadow: 0 16px 34px -10px var(--cta-glow);
    }

    .cta:focus-within .cta-face {
      outline: 2px solid var(--ok);
      outline-offset: 3px;
    }

    .cta.busy {
      pointer-events: none;
    }

    .cta.busy .cta-face {
      opacity: .85;
    }

    .g-icon {
      width: 20px;
      height: 20px;
      flex: none;
      display: block;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid rgba(21, 101, 224, .25);
      border-top-color: #1565e0;
      animation: spin .8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .cta-hit {
      position: absolute;
      left: 0;
      top: 4px;
      width: 320px;
      height: 40px;
      transform: scaleY(1.2);
      overflow: hidden;
      opacity: .01;
    }


    /* ---------- textos de apoio ---------- */

    .status {
      margin: 16px 0 0;
      font-size: 13px;
      text-align: center;
    }

    .status.error { color: var(--err); }

    .access-info {
      margin: 20px 0 0;
      font-size: 12px;
      line-height: 1.5;
      text-align: center;
      color: var(--muted);
    }


    /* ---------- alternador de tema ---------- */

    .theme {
      position: absolute;
      z-index: 10;
      top: 26px;
      right: 28px;
      width: 68px;
      height: 36px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid var(--switch-line);
      background: var(--switch-bg);
      backdrop-filter: blur(8px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-around;
    }

    .theme:focus-visible {
      outline: 2px solid var(--ok);
      outline-offset: 2px;
    }

    .thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #147dff;
      box-shadow: 0 3px 12px rgba(0, 117, 255, .45);
      transition: transform .35s cubic-bezier(.4, 0, .2, 1);
    }

    .page.dark .thumb { transform: translateX(32px); }

    .theme svg {
      position: relative;
      width: 15px;
      height: 15px;
      fill: none;
      stroke: var(--switch-off);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke .35s ease;
    }

    .page:not(.dark) .theme .sun,
    .page.dark .theme .moon {
      stroke: #fff;
    }


    /* ---------- malha ---------- */

    
    .waves {
      position: absolute;
      z-index: 2;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;

      /* A malha fica visível de cima a baixo */
      -webkit-mask-image: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.75) 0%,
        #000 20%,
        #000 85%,
        rgba(0, 0, 0, 0.65) 100%
      );

      mask-image: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.75) 0%,
        #000 20%,
        #000 85%,
        rgba(0, 0, 0, 0.65) 100%
      );
    }

    .waves canvas {
      display: block;
      width: 100%;
      height: 100%;
    }



    /* ---------- responsivo ---------- */

    @media (max-width: 640px) {
      .theme { top: 18px; right: 18px; }
      .brand { margin-bottom: 36px; }
      .logo-wrap { width: 72px; height: 72px; }
      .brand-name { font-size: 26px; }
    }

    @media (max-height: 650px) {
      .content { padding-top: 70px; padding-bottom: 60px; }
      .brand { margin-bottom: 28px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
      }
    }

  `],

  template: `

    <main class="page" [class.dark]="darkMode()">

      <div class="horizon" aria-hidden="true"></div>

      <div class="waves" aria-hidden="true">
        <canvas #waveCanvas></canvas>
      </div>


      <button
        type="button"
        class="theme"
        role="switch"
        aria-label="Alternar tema escuro"
        [attr.aria-checked]="darkMode()"
        (click)="alternarTema()"
      >
        <span class="thumb"></span>

        <svg class="sun" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>

        <svg class="moon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>


      <section class="content">

        <div class="brand">
          <div class="logo-wrap">
            <img src="assets/logo.png" alt="" class="logo" />
          </div>

          <h1 class="brand-name">VISION</h1>
        </div>


        <div class="login-area">

          <div class="cta" [class.busy]="carregando()">

            <div class="cta-face" aria-hidden="true">

              @if (carregando()) {
                <span class="spinner"></span>
                <span>Validando acesso...</span>
              } @else {
                <svg class="g-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Entrar com Google Workspace</span>
              }

            </div>

            <div class="cta-hit" #gbtn></div>

          </div>


          @if (erro()) {
            <p class="status error" role="alert">{{ erro() }}</p>
          }

          <p class="access-info">
            © 2026 VISION. Todos os direitos reservados.


          </p>

        </div>

      </section>

    </main>

  `
})
export class LoginComponent implements AfterViewInit, OnDestroy {

  private auth = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);

  @ViewChild('waveCanvas', { static: true })
  private waveCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('gbtn', { static: true })
  private gbtn!: ElementRef<HTMLDivElement>;

  erro = signal('');
  carregando = signal(false);
  darkMode = signal(true);

  private googleTimer: ReturnType<typeof setTimeout> | null = null;
  private wave: DataWave | null = null;


  ngAfterViewInit() {
    this.carregarTema();

    // animação fora do Angular: 60 quadros por segundo sem disparar change detection
    this.zone.runOutsideAngular(() => {
      this.wave = new DataWave(
        this.waveCanvas.nativeElement,
        () => this.darkMode()
      );
      this.wave.start();
    });

    this.iniciarGoogle();
  }


  private iniciarGoogle() {
    if (typeof google === 'undefined') {
      this.googleTimer = setTimeout(() => this.iniciarGoogle(), 150);
      return;
    }

    const container = this.gbtn.nativeElement;
    container.innerHTML = '';

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      hd: 'queonetics.com',
      callback: (response: any) => this.entrar(response.credential)
    });

    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      locale: 'pt-BR',
      width: 320
    });
  }


  private carregarTema() {
    try {
      this.darkMode.set(localStorage.getItem('vision-theme') !== 'light');
    } catch {
      this.darkMode.set(true);
    }
  }

  alternarTema() {
    const novo = !this.darkMode();
    this.darkMode.set(novo);

    try {
      localStorage.setItem('vision-theme', novo ? 'dark' : 'light');
    } catch {
      // localStorage indisponível
    }

    this.wave?.redraw();
  }


  async entrar(idToken: string) {
    this.erro.set('');
    this.carregando.set(true);

    try {
      const resultado = await this.auth.loginWithGoogle(idToken);

      if (resultado.ok) {
        this.router.navigate(['/']);
      } else {
        this.erro.set(
          ERROS[resultado.error] ||
          'Não foi possível entrar. Tente novamente.'
        );
      }
    } catch {
      this.erro.set('Sem conexão com o servidor do VISION.');
    } finally {
      this.carregando.set(false);
    }
  }


  ngOnDestroy() {
    if (this.googleTimer) clearTimeout(this.googleTimer);
    this.wave?.stop();
  }
}
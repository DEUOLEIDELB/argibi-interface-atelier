// E0-attaque-kurnel.js — Cinematique d'attaque (fullscreen, 2 panneaux BD).
// Composants utilises :
//   - bandeau-pulsant--alerte (panneau 1)
//   - caption-bd (les deux panneaux)
//   - cta-primary (panneau 2)
//   - placeholder-image (les deux panneaux)
//   - panneau BD plein ecran (§ 7.1) + barre-progression (§ 4.2)
//   - glitch d'intrusion Kurnel (§ 5.6) — p5 overlay interne a la page
//
// Animation cle : p5 glitch overlay riche (RGB shift + scan-lines +
// flash rouge/violet) sur le canvas Pixi du panneau 1, attenue brutalement
// au passage panneau 2. Au CTA final on enableKurnelOverlay() pour
// materialiser la corruption persistante en arriere-plan jusqu'a F1.
//
// Note shell fullscreen : avec step.fullscreen=true, le shell se masque
// (cf. base.css "#shell.is-fullscreen .shell-band { display: none }") et
// le watermark aussi. La page utilise toute la surface du #stage (qui
// reste a width/height calc()-based, mais la zone est etendue par
// "#shell.is-fullscreen #stage-wrap { grid-row: 1 / -1 }").

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { saveStepState } from '../core/state.js';
import { spawnShockwave } from '../core/effects.js';
import { enableKurnelOverlay } from './_kurnel-overlay.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;
let p5Instance = null;
let p5Container = null;

let state = { panel: 1 };
let panelEnteredAt = 0;          // pour le cap min 2s avant Espace->panel 2
const PANEL_MIN_MS = 2000;

const STYLE_ID = 'step-E0-style';

const CSS = `
.step-E0 {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #000;
  cursor: var(--cursor-default);
  font-family: var(--display);
  color: var(--paper);
  user-select: none;
}

/* ---- Couche p5 glitch (panneau 1 uniquement, fade au panneau 2) ---- */
.step-E0__p5 {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  opacity: 1;
  transition: opacity var(--d-slow) var(--ease-out);
}
.step-E0--panel-2 .step-E0__p5 { opacity: 0.15; }

/* Le canvas que p5 cree dedans doit lui aussi etre transparent aux events */
.step-E0__p5 canvas { pointer-events: none; display: block; }

/* ---- Flash rouge/violet plein ecran (panneau 1, ponctuel) ---- */
.step-E0__flash {
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  background: var(--accent-4);
  opacity: 0;
  mix-blend-mode: screen;
}
.step-E0__flash.is-firing { animation: e0-flash 0.3s ease-out; }

@keyframes e0-flash {
  0%   { opacity: 0; }
  20%  { opacity: 0.8; }
  100% { opacity: 0; }
}

/* ---- Barre de progression panneaux ---- */
.step-E0__progress {
  position: absolute;
  top: var(--s-3);
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  z-index: 50;
}
.step-E0__progress-tag {
  display: block;
  margin-top: var(--s-1);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  opacity: 0.6;
  color: var(--ink);
}

/* ---- Panneau commun ---- */
.step-E0__panel {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-7) var(--s-6) var(--s-5);
  text-align: center;
  z-index: 20;
  opacity: 0;
  transition: opacity var(--d-slow) var(--ease-out);
}
.step-E0__panel.is-active { opacity: 1; }

/* ---- Panneau 1 specifiques ---- */
.step-E0__bandeau {
  width: min(960px, 90%);
  font-size: var(--t-h2);
  letter-spacing: 0.08em;
  opacity: 0;
  transform: translateY(-100%);
  animation: e0-bandeau-in var(--d-slow) var(--ease-out) 0.05s forwards;
  margin-top: var(--s-6);
}
.step-E0__bandeau-cibles {
  display: block;
  margin-top: var(--s-1);
  font-size: var(--t-body-xl);
  letter-spacing: 0.12em;
}
.step-E0__cible-1, .step-E0__cible-2 {
  display: inline-block;
  animation: e0-cibles-blink 1.6s ease-in-out 0.6s infinite;
}
.step-E0__cible-2 { animation-delay: 1.4s; }

@keyframes e0-cibles-blink {
  0%, 80%, 100% { color: var(--paper); }
  85%, 95%      { color: var(--accent-3); text-shadow: 0 0 6px var(--accent-3); }
}

.step-E0__hero {
  width: min(680px, 60vw);
  height: auto;
  max-height: 55vh;
  object-fit: contain;
  display: block;
  opacity: 0;
  transform: scale(0.6);
  animation: e0-hero-in var(--d-hero) var(--ease-bounce) 0.4s forwards,
             e0-hero-shake 0.32s ease-in-out 1.6s 1;
}

@keyframes e0-hero-in {
  0%   { transform: scale(0.6); opacity: 0; filter: hue-rotate(120deg) brightness(1.5); }
  60%  { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes e0-hero-shake {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(-6px, 4px); }
  40%      { transform: translate(5px, -3px); }
  60%      { transform: translate(-4px, -2px); }
  80%      { transform: translate(3px, 5px); }
}

.step-E0__caption {
  max-width: 1100px;
  margin: 0;
  opacity: 0;
  animation: e0-caption-in var(--d-slow) var(--ease-out) 1.4s forwards;
}
.step-E0__caption-line { display: block; }
.step-E0__caption-line + .step-E0__caption-line { margin-top: var(--s-1); }

@keyframes e0-caption-in {
  to { opacity: 1; }
}

/* Caracteres glitches : variante CSS sans JS lourd */
.step-E0__caption.is-glitching .step-E0__caption-line {
  animation: e0-text-glitch 0.6s steps(8) 1;
}
@keyframes e0-text-glitch {
  0%, 100% { transform: translate(0, 0); filter: none; }
  25%      { transform: translate(-2px, 0); filter: hue-rotate(40deg); }
  50%      { transform: translate(2px, 0); filter: hue-rotate(-40deg); }
  75%      { transform: translate(-1px, 1px); }
}

/* ---- Panneau 2 specifiques ---- */
.step-E0__hero-2 {
  width: min(680px, 60vw);
  height: auto;
  max-height: 55vh;
  object-fit: contain;
  display: block;
  opacity: 0;
  transform: scale(0.7);
  animation: e0-hero-2-in var(--d-hero) var(--ease-bounce) 0.1s forwards;
}
@keyframes e0-hero-2-in {
  0%   { transform: scale(0.7); opacity: 0; filter: brightness(2.5); }
  40%  { transform: scale(1.08); opacity: 1; filter: brightness(2); }
  60%  { filter: brightness(1); }
  100% { transform: scale(1);    opacity: 1; filter: brightness(1); }
}

.step-E0__caption-2 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  max-width: 1400px;
}
.step-E0__caption-2 .step-E0__caption-line {
  font-size: clamp(48px, 4.8vw, 84px);
  letter-spacing: 0.02em;
  padding: var(--s-3) var(--s-5);
  opacity: 0;
  transform: scale(0.7);
  animation: e0-line-smash var(--d-normal) var(--ease-bounce) forwards;
}
.step-E0__caption-2 .step-E0__caption-line:nth-child(1) { animation-delay: 0.6s; }
.step-E0__caption-2 .step-E0__caption-line:nth-child(2) { animation-delay: 1.2s; }
.step-E0__caption-2 .step-E0__caption-line:nth-child(3) { animation-delay: 1.8s; }

@keyframes e0-line-smash {
  0%   { transform: scale(0.7); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

/* ---- Hint clavier discret ---- */
.step-E0__hint {
  position: absolute;
  bottom: var(--s-3);
  right: var(--s-3);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0.5;
  z-index: 50;
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

/* --------------------------------------------------------------------------
   p5 glitch sketch — scan-lines fines + RGB shift sporadique. Pas de
   sprites lourds, pas d'image charge, juste du dessin procedural.
   -------------------------------------------------------------------------- */
function buildP5Sketch(host) {
  return (p) => {
    let w = host.clientWidth || 1280;
    let h = host.clientHeight || 720;
    let nextRgbAt = 0;
    let rgbActive = false;
    let rgbStart = 0;

    p.setup = () => {
      p.createCanvas(w, h);
      p.noStroke();
      p.frameRate(30);
    };

    p.windowResized = () => {
      w = host.clientWidth || w;
      h = host.clientHeight || h;
      p.resizeCanvas(w, h);
    };

    p.draw = () => {
      p.clear();

      // Scan-lines violet sombre semi-transparentes
      p.noStroke();
      p.fill(63, 26, 92, 32);
      for (let y = (p.frameCount % 4); y < h; y += 4) {
        p.rect(0, y, w, 1);
      }

      // RGB shift sporadique : declenchement aleatoire
      if (!rgbActive && p.millis() > nextRgbAt) {
        rgbActive = true;
        rgbStart = p.millis();
        nextRgbAt = p.millis() + 1800 + Math.random() * 2400;
      }
      if (rgbActive) {
        const t = p.millis() - rgbStart;
        if (t > 220) {
          rgbActive = false;
        } else {
          // Trois bandes horizontales decalees colorees
          const bandH = h / 3;
          const sh = (t < 110 ? 6 : -6);
          p.fill(217, 2, 114, 60);   // rose --accent-4 ~
          p.rect(sh, 0, w, bandH);
          p.fill(89, 20, 208, 60);   // violet --accent-1 ~
          p.rect(-sh, bandH, w, bandH);
          p.fill(29, 193, 249, 60);  // bleu --accent-2 ~
          p.rect(sh, bandH * 2, w, bandH);
        }
      }

      // Mini-glitch : 1 ligne aleatoire deplacee
      if (Math.random() < 0.06) {
        const yy = Math.floor(Math.random() * h);
        p.fill(255, 221, 11, 80); // jaune --accent-3 ~
        p.rect(0, yy, w, 2);
      }
    };
  };
}

function mountP5(host) {
  if (typeof window.p5 !== 'function') {
    console.info('[E0] p5.js indisponible, fallback sans glitch riche.');
    return;
  }
  p5Instance = new window.p5(buildP5Sketch(host), host);
}

function unmountP5() {
  try { p5Instance?.remove(); } catch { /* ignore */ }
  p5Instance = null;
}

/* --------------------------------------------------------------------------
   DOM builders
   -------------------------------------------------------------------------- */
function buildPanel1() {
  const panel = document.createElement('div');
  panel.className = 'step-E0__panel step-E0__panel--1';

  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau-pulsant bandeau-pulsant--alerte step-E0__bandeau';
  bandeau.appendChild(textNode('⚠⚠⚠   SYSTEME CORROMPU   ⚠⚠⚠'));
  const cibles = document.createElement('span');
  cibles.className = 'step-E0__bandeau-cibles';
  const c1 = document.createElement('span');
  c1.className = 'step-E0__cible-1';
  c1.textContent = 'COULEUR';
  const c2 = document.createElement('span');
  c2.className = 'step-E0__cible-2';
  c2.textContent = 'LUMIERE';
  cibles.appendChild(c1);
  cibles.appendChild(document.createTextNode(' · '));
  cibles.appendChild(c2);
  bandeau.appendChild(cibles);
  panel.appendChild(bandeau);

  const hero = document.createElement('img');
  hero.className = 'step-E0__hero';
  hero.src = 'assets/sprites/E0/KURNEL.svg';
  hero.alt = '';
  panel.appendChild(hero);

  const caption = document.createElement('div');
  caption.className = 'caption-bd step-E0__caption is-glitching';
  const l1 = document.createElement('span');
  l1.className = 'step-E0__caption-line';
  l1.textContent = '« MOUHAHAHA ! MES NOLLS ONT INFILTRE TES SYSTEMES.';
  const l2 = document.createElement('span');
  l2.className = 'step-E0__caption-line';
  l2.textContent = 'COULEUR ET LUMIERE SONT A MOI ! »';
  caption.appendChild(l1);
  caption.appendChild(l2);
  panel.appendChild(caption);

  return panel;
}

function buildPanel2() {
  const panel = document.createElement('div');
  panel.className = 'step-E0__panel step-E0__panel--2';

  // Espace haut (vide pour equilibrer la grille rows)
  const spacer = document.createElement('div');
  spacer.style.minHeight = '40px';
  panel.appendChild(spacer);

  const hero = document.createElement('img');
  hero.className = 'step-E0__hero-2';
  hero.src = 'assets/sprites/E0/tuko_disc.png';
  hero.alt = '';
  panel.appendChild(hero);

  const captionWrap = document.createElement('div');
  captionWrap.className = 'step-E0__caption-2';
  const ln = document.createElement('span');
  ln.className = 'caption-bd step-E0__caption-line';
  ln.textContent = "A L'AIDEEEE !";
  captionWrap.appendChild(ln);

  panel.appendChild(captionWrap);

  return { panel };
}

function buildProgress(currentPanel) {
  const wrap = document.createElement('div');
  wrap.className = 'step-E0__progress';
  const bar = document.createElement('div');
  bar.className = 'barre-progression';
  for (let i = 1; i <= 2; i++) {
    const seg = document.createElement('div');
    seg.className = 'barre-progression__seg';
    if (i < currentPanel) seg.classList.add('is-done');
    if (i === currentPanel) seg.classList.add('is-current');
    bar.appendChild(seg);
  }
  wrap.appendChild(bar);
  const tag = document.createElement('span');
  tag.className = 'step-E0__progress-tag';
  tag.textContent = `attaque · ${currentPanel} sur 2`;
  wrap.appendChild(tag);
  return wrap;
}

function textNode(s) { return document.createTextNode(s); }

/* --------------------------------------------------------------------------
   Render / transitions
   -------------------------------------------------------------------------- */
function fireFlash(root) {
  const flash = root.querySelector('.step-E0__flash');
  if (!flash) return;
  flash.classList.remove('is-firing');
  void flash.offsetWidth;
  flash.classList.add('is-firing');
}

function activatePanel(root, panelNum, navAPI) {
  state.panel = panelNum;
  saveStepState('E0', { panel: panelNum });
  panelEnteredAt = performance.now();

  // Mise a jour CSS hook
  root.classList.toggle('step-E0--panel-1', panelNum === 1);
  root.classList.toggle('step-E0--panel-2', panelNum === 2);

  // Maj barre de progression
  const oldProg = root.querySelector('.step-E0__progress');
  if (oldProg) oldProg.replaceWith(buildProgress(panelNum));

  // Active le bon panneau (les deux sont dans le DOM, on toggle is-active)
  const p1 = root.querySelector('.step-E0__panel--1');
  const p2 = root.querySelector('.step-E0__panel--2');
  if (panelNum === 1) {
    p1?.classList.add('is-active');
    p2?.classList.remove('is-active');
  } else {
    p1?.classList.remove('is-active');
    p2?.classList.add('is-active');
    // Reward onde de victoire au passage BRIKZ riposte (delay calque sur l'anim hero-2)
    if (p2 && root.isConnected) {
      const tShock = setTimeout(() => spawnShockwave(p2, { rayonMax: 1400, duree: 900 }), 200);
      timers.push(tShock);
    }
    // Active l'overlay glitch persistant des l'arrivee sur panel 2.
    enableKurnelOverlay();
  }

  // Reset shake/glitch listeners pour panneau 1 : flash au pic anim
  if (panelNum === 1) {
    const flashTimer = setTimeout(() => fireFlash(root), 1100);
    timers.push(flashTimer);
  }
}

function tryAdvancePanel(root, navAPI) {
  if (state.panel === 1) {
    if (performance.now() - panelEnteredAt < PANEL_MIN_MS) {
      // Cap min 2s pas atteint, on ignore.
      return;
    }
    activatePanel(root, 2, navAPI);
  }
  // Sur panel 2, l'avance se fait via le clic CTA, pas via Espace.
}

function tryGoBackPanel(root, navAPI) {
  if (state.panel === 2) {
    activatePanel(root, 1, navAPI);
  }
}

/* --------------------------------------------------------------------------
   Module export
   -------------------------------------------------------------------------- */
export default {
  id: 'E0',
  phase: 'E',
  title: 'Attaque Kurnel',
  estimatedDuration: 12,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: true,

  async enter(container, savedState, navAPI) {
    injectStyle();

    scene = new Container();
    container.addChild(scene);

    state = { panel: savedState?.panel === 2 ? 2 : 1 };

    const stage = document.querySelector('#stage');
    const root = document.createElement('div');
    root.className = 'step-E0';

    // p5 layer host (par-dessus le canvas Pixi mais sous les panneaux DOM)
    p5Container = document.createElement('div');
    p5Container.className = 'step-E0__p5';
    root.appendChild(p5Container);

    // Flash overlay (panneau 1)
    const flash = document.createElement('div');
    flash.className = 'step-E0__flash';
    root.appendChild(flash);

    // Barre de progression
    root.appendChild(buildProgress(state.panel));

    // Panneau 1 (Kurnel attaque)
    root.appendChild(buildPanel1());

    // Panneau 2 (riposte BRIKZ)
    const { panel: panel2 } = buildPanel2();
    root.appendChild(panel2);

    // Hint clavier discret
    const hint = document.createElement('span');
    hint.className = 'step-E0__hint';
    hint.textContent = 'espace · panneau suivant';
    root.appendChild(hint);

    stage.appendChild(root);
    domNodes.push(root);

    // Mount p5 apres insertion (besoin des dimensions du host).
    mountP5(p5Container);

    // Active le panneau initial (1 ou repris)
    activatePanel(root, state.panel, navAPI);

    // Capture clavier pour Espace/Backspace en interne (sans empecher
    // le shell de gerer les autres touches). Le shell ecoute aussi
    // window keydown ; on ne preventDefault que sur Espace en panel 1
    // pour empecher le shell d'avancer trop tot, et sur Backspace en
    // panel 2 pour reculer. Sur panel 2, Espace laisse le shell avancer.
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        if (state.panel === 1) {
          // On gere nous-memes la transition, on bloque la nav globale.
          e.preventDefault();
          e.stopPropagation();
          tryAdvancePanel(root, navAPI);
        }
        // panel 2 : laisse le shell gerer (Espace -> next vers E1)
      } else if (e.key === 'Backspace') {
        if (state.panel === 2) {
          e.preventDefault();
          e.stopPropagation();
          tryGoBackPanel(root, navAPI);
        }
      }
    };
    // capture: true pour passer avant le listener du shell.
    window.addEventListener('keydown', onKey, true);
    handlers.push([window, 'keydown', onKey, true]);
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => {
      target.removeEventListener(event, fn, capture);
    });
    handlers = [];

    timers.forEach(clearTimeout);
    timers = [];

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    unmountP5();
    p5Container = null;

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    styleNode = null;
  },

  serialize() {
    return { panel: state.panel };
  },

  isComplete() {
    return state.panel === 2;
  },

  replay() {
    // Re-jouer depuis le panneau 1 sans toucher au "viewed".
    const root = domNodes[0];
    if (!root) return;
    // Reset des animations CSS panel 1
    const panel1 = root.querySelector('.step-E0__panel--1');
    panel1?.querySelectorAll('*').forEach(el => {
      const a = el.style.animation;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = a || '';
    });
    activatePanel(root, 1, /* navAPI inutile pour replay */ { next() {}, back() {} });
  },
};

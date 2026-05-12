// C1-tutoriel-controles.js — Tutoriel des deux indicateurs (cadenas / fleche).
// Source : doc interne.
// 2 slides. State : { slide: 1|2 } .

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';
import { play } from '../core/audio.js';

// ---- Patterns matrice 8x8 (index = row*8 + col) ---------------------------

const CADENAS_LIT = new Set([
  // r0: arc top
  2, 3, 4, 5,
  // r1: arc cotes
  9, 14,
  // r2: arc cotes
  17, 22,
  // r3: corps haut
  24, 25, 26, 27, 28, 29, 30, 31,
  // r4: corps cotes
  32, 39,
  // r5: corps + serrure
  40, 43, 47,
  // r6: corps cotes
  48, 55,
  // r7: corps bas
  56, 57, 58, 59, 60, 61, 62, 63,
]);

// Fleche decalee d'une ligne vers le haut (rows 0-6) pour liberer la
// row 7 = barre de progression integree. Toutes les valeurs precedentes
// ont ete decalees de -8 (passage d'une ligne 8x8 a la precedente).
const FLECHE_LIT = new Set([
  // r0: pointe haute (col 3)
  3,
  // r1: pointe (col 3, 4)
  11, 12,
  // r2: tige (col 0..6)
  16, 17, 18, 19, 20, 21, 22,
  // r3: tige pleine (col 0..7)
  24, 25, 26, 27, 28, 29, 30, 31,
  // r4: tige (col 0..6)
  32, 33, 34, 35, 36, 37, 38,
  // r5: pointe (col 3, 4)
  43, 44,
  // r6: pointe basse (col 3)
  51,
  // r7 : libre pour la barre de progression
]);

const ECLAIR_LIT = new Set([
  // GO flash : eclair stylise rapide
  3, 4, 11, 12, 18, 19, 25, 26, 27, 33, 34, 35, 41, 42, 49, 50,
]);

// ---- Etat module (refs pour cleanup propre) -------------------------------

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];
let navAPIRef = null;
let savedStateRef = null;

let currentSlide = 1;
let containerRef = null;

// Refs DOM specifiques au cycle slide courant
let wrapEl = null;
let matriceEl = null;
let pixelEls = [];
let demoFillEl = null;
let demoMiniTukoEl = null;

// ---- CSS scope (injecte une seule fois par enter) -------------------------

function injectStyle() {
  if (document.getElementById('step-C1-style')) return;
  const css = `
.step-C1__wrap {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  gap: var(--s-2);
  text-align: center;
  overflow: hidden;
  background: var(--bg);
}
.step-C1__titre {
  font-family: var(--display);
  font-size: clamp(56px, 5.4vw, 88px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  animation: step-C1-smash 600ms var(--ease-bounce) both;
}
.step-C1__sous {
  font-family: var(--display);
  font-size: clamp(24px, 2.2vw, 36px);
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 250ms forwards;
}
.step-C1__matrice {
  --matrice-8x8-size: clamp(360px, 42vh, 520px);
}
.step-C1__demo-bar {
  width: clamp(360px, 42vh, 520px);
}
.step-C1__progression {
  width: min(420px, 32vw);
  margin: 0;
}
.step-C1__eyebrow {
  margin-top: 0;
}
.step-C1__matrice-zone {
  display: grid;
  place-items: center;
  gap: var(--s-2);
  position: relative;
  justify-self: center;
  align-self: center;
}
.step-C1__matrice {
  opacity: 0;
  animation: step-C1-fade-in var(--d-normal) var(--ease-out) 400ms forwards;
}
.step-C1__matrice.is-pulsing .matrice-8x8__pixel.is-on-rose,
.step-C1__matrice.is-pulsing .matrice-8x8__pixel.is-on-cyan {
  animation: step-C1-pixel-pulse 2s ease-in-out infinite;
}
.step-C1__matrice.is-trembling {
  animation: step-C1-tremble 350ms var(--ease-out);
}
.step-C1__matrice.is-trembling-strong {
  animation: step-C1-tremble-strong 600ms var(--ease-bounce);
}
.step-C1__matrice.is-flashing-out {
  animation: step-C1-flash-out 600ms var(--ease-out) forwards;
}
.step-C1__matrice .matrice-8x8__pixel.step-C1__pixel-cascade {
  opacity: 0;
  animation: step-C1-pixel-pop 250ms var(--ease-bounce) forwards;
}
.step-C1__rappel,
.step-C1__consigne {
  font-family: var(--display);
  font-size: clamp(32px, 3vw, 48px);
  font-weight: 700;
  color: var(--ink);
  max-width: 1100px;
  line-height: 1.2;
  margin: 0;
  text-wrap: balance;
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 700ms forwards;
}
.step-C1__demo-bar {
  position: relative;
  height: 24px;
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-pill);
  overflow: hidden;
  box-shadow: var(--shadow);
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 550ms forwards;
}
.step-C1__demo-bar__fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--accent-2), var(--accent-3));
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 2000ms linear;
}
.step-C1__demo-bar.is-resetting .step-C1__demo-bar__fill {
  transition: transform var(--d-fast) var(--ease-out);
}
.step-C1__demo-bar.is-flashing {
  animation: step-C1-bar-flash 400ms ease-out;
}
.step-C1__demo-bar__mini-tuko {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background: var(--accent-4);
  border: var(--border-thin);
  border-radius: var(--r-pill);
  box-shadow: var(--shadow-sm);
  pointer-events: none;
  transition: left 2000ms linear;
  z-index: 2;
}
.step-C1__demo-bar.is-resetting .step-C1__demo-bar__mini-tuko {
  transition: left var(--d-fast) var(--ease-out);
}
.step-C1__cta-row {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3);
}
.step-C1__cta {
  animation: none !important;
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 850ms forwards !important;
}
.step-C1__cta.is-blinking {
  animation: step-C1-cta-blink 200ms steps(2, end) 2 !important;
}

@keyframes step-C1-smash {
  0%   { transform: scale(0.4) skewX(-8deg); opacity: 0; }
  60%  { transform: scale(1.08) skewX(2deg); opacity: 1; }
  100% { transform: scale(1) skewX(0);       opacity: 1; }
}
@keyframes step-C1-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes step-C1-pixel-pop {
  0%   { opacity: 0; transform: scale(0.2); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes step-C1-pixel-pulse {
  0%, 100% { opacity: 1;    filter: brightness(1); }
  50%      { opacity: 0.78; filter: brightness(0.85); }
}
@keyframes step-C1-tremble {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px) rotate(-0.5deg); }
  75%      { transform: translateX(4px)  rotate(0.5deg); }
}
@keyframes step-C1-tremble-strong {
  0%, 100% { transform: translateX(0)    rotate(0); }
  20%      { transform: translateX(-10px) rotate(-1.5deg); }
  40%      { transform: translateX(10px)  rotate(1.5deg); }
  60%      { transform: translateX(-6px)  rotate(-1deg); }
  80%      { transform: translateX(6px)   rotate(1deg); }
}
@keyframes step-C1-flash-out {
  0%   { background: var(--ink);   transform: translateX(0)    scale(1); }
  40%  { background: var(--paper); transform: translateX(40px) scale(1.05); opacity: 1; }
  100% { background: var(--paper); transform: translateX(80px) scale(1.1);  opacity: 0; }
}
@keyframes step-C1-bar-flash {
  0%, 100% { box-shadow: var(--shadow); background: var(--paper); }
  50%      { box-shadow: 0 0 24px var(--accent-3), var(--shadow); background: var(--accent-3); }
}
@keyframes step-C1-cta-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.96); }
}
`;
  const styleEl = document.createElement('style');
  styleEl.id = 'step-C1-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

function removeStyle() {
  const el = document.getElementById('step-C1-style');
  if (el) el.remove();
}

// ---- Helpers DOM ---------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function buildMatrice(litSet, colorClass, opts = {}) {
  const matrice = el('div', `matrice-8x8 step-C1__matrice ${opts.extraClass || ''}`.trim());
  pixelEls = [];
  for (let i = 0; i < 64; i++) {
    const p = el('div', 'matrice-8x8__pixel');
    if (litSet.has(i)) {
      p.classList.add('is-on');
      p.classList.add(colorClass);
      if (opts.cascade) {
        p.classList.add('step-C1__pixel-cascade');
        p.style.animationDelay = `${400 + i * 12}ms`;
      }
    }
    matrice.appendChild(p);
    pixelEls.push(p);
  }
  return matrice;
}

function setMatricePattern(litSet, colorClass) {
  pixelEls.forEach((p, i) => {
    p.classList.remove('is-on', 'is-on-rose', 'is-on-cyan', 'is-on-jaune', 'is-on-violet');
    if (litSet.has(i)) {
      p.classList.add('is-on');
      p.classList.add(colorClass);
    }
  });
}

// ---- Slide builders -------------------------------------------------------

function teardownCurrentSlide() {
  intervals.forEach(clearInterval);
  intervals = [];
  timers.forEach(clearTimeout);
  timers = [];
  if (wrapEl) {
    wrapEl.remove();
    domNodes = domNodes.filter(n => n !== wrapEl);
    wrapEl = null;
    matriceEl = null;
    pixelEls = [];
    demoFillEl = null;
    demoMiniTukoEl = null;
  }
}

function buildSlide1() {
  wrapEl = el('div', 'step-C1__wrap');

  const progression = el('div', 'barre-progression step-C1__progression');
  const seg1 = el('div', 'barre-progression__seg is-current');
  const seg2 = el('div', 'barre-progression__seg');
  progression.appendChild(seg1);
  progression.appendChild(seg2);
  wrapEl.appendChild(progression);

  const eyebrow = el('span', 'eyebrow step-C1__eyebrow', 'controles · 1 sur 2');
  wrapEl.appendChild(eyebrow);

  const titre = el('h1', 'step-C1__titre', 'LE CADENAS');
  wrapEl.appendChild(titre);

  // Sous-titre retire sur demande Taki (inutile)

  const matriceZone = el('div', 'step-C1__matrice-zone');
  matriceEl = buildMatrice(CADENAS_LIT, 'is-on-rose', { cascade: true });
  matriceZone.appendChild(matriceEl);
  wrapEl.appendChild(matriceZone);

  const rappel = el('p', 'step-C1__rappel');
  rappel.appendChild(document.createTextNode('Regarde ta capsule Argibi.'));
  rappel.appendChild(document.createElement('br'));
  rappel.appendChild(document.createTextNode(
    'Si elle montre ce dessin, tu attends mon signal.'));
  wrapEl.appendChild(rappel);

  const ctaRow = el('div', 'step-C1__cta-row');
  const cta = el('button', 'cta-primary step-C1__cta');
  cta.type = 'button';
  cta.textContent = "J'AI COMPRIS";
  ctaRow.appendChild(cta);
  wrapEl.appendChild(ctaRow);

  // Tuko placeholder retire (convention : pas de placeholder textuel sans sprite)

  const stage = document.querySelector('#stage');
  stage.appendChild(wrapEl);
  domNodes.push(wrapEl);

  // Cadenas pulse activation apres apparition cascade (~1.5s).
  const pulseTimer = setTimeout(() => {
    if (matriceEl) matriceEl.classList.add('is-pulsing');
  }, 1500);
  timers.push(pulseTimer);

  // Mini-secousse periodique (6s).
  const tremIv = setInterval(() => {
    if (!matriceEl) return;
    matriceEl.classList.add('is-trembling');
    const t = setTimeout(() => {
      if (matriceEl) matriceEl.classList.remove('is-trembling');
    }, 400);
    timers.push(t);
  }, 6000);
  intervals.push(tremIv);

  // Secousse forte une seule fois apres 30s d'attente.
  const strongTimer = setTimeout(() => {
    if (!matriceEl) return;
    matriceEl.classList.add('is-trembling-strong');
    const t = setTimeout(() => {
      if (matriceEl) matriceEl.classList.remove('is-trembling-strong');
    }, 700);
    timers.push(t);
  }, 30000);
  timers.push(strongTimer);

  // Son d'apparition cadenas (clack).
  play('clack');

  // Listener CTA.
  const onCta = () => {
    play('unlock');
    cta.classList.add('is-blinking');
    pixelEls.forEach(p => p.classList.add('is-blinking'));
    const t = setTimeout(() => goToSlide(2), 600);
    timers.push(t);
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);
}

function buildSlide2() {
  wrapEl = el('div', 'step-C1__wrap');

  const progression = el('div', 'barre-progression step-C1__progression');
  const seg1 = el('div', 'barre-progression__seg is-done');
  const seg2 = el('div', 'barre-progression__seg is-current');
  progression.appendChild(seg1);
  progression.appendChild(seg2);
  wrapEl.appendChild(progression);

  const eyebrow = el('span', 'eyebrow step-C1__eyebrow', 'controles · 2 sur 2');
  wrapEl.appendChild(eyebrow);

  const titre = el('h1', 'step-C1__titre', 'LA FLÈCHE');
  wrapEl.appendChild(titre);

  // Sous-titre retire sur demande Taki (inutile)

  const matriceZone = el('div', 'step-C1__matrice-zone');
  matriceEl = buildMatrice(FLECHE_LIT, 'is-on-cyan', { cascade: true });
  matriceZone.appendChild(matriceEl);

  // Pas de demo-bar separee : la barre de progression est integree
  // directement dans la matrice (derniere ligne row 7) via runDemoCycle.
  demoFillEl = null;
  demoMiniTukoEl = null;

  wrapEl.appendChild(matriceZone);

  const consigne = el('p', 'step-C1__consigne');
  consigne.appendChild(document.createTextNode(
    "Reste appuyé sur ton bouton jusqu'à ce que la barre soit pleine."));
  wrapEl.appendChild(consigne);

  const ctaRow = el('div', 'step-C1__cta-row');
  const cta = el('button', 'cta-primary step-C1__cta');
  cta.type = 'button';
  cta.textContent = 'ON EST PRÊT';
  ctaRow.appendChild(cta);
  wrapEl.appendChild(ctaRow);

  // Tuko placeholder retire (convention : pas de placeholder textuel sans sprite)

  const stage = document.querySelector('#stage');
  stage.appendChild(wrapEl);
  domNodes.push(wrapEl);

  play('clack');

  // Demarre la boucle demo apres l'apparition (~1.5s).
  const startTimer = setTimeout(startDemoLoop, 1500);
  timers.push(startTimer);

  // Listener CTA : sortie animee.
  const onCta = () => {
    play('unlock');
    cta.classList.add('is-blinking');
    if (matriceEl) matriceEl.classList.add('is-flashing-out');
    const t = setTimeout(() => {
      if (navAPIRef) {
        navAPIRef.markComplete?.();
        navAPIRef.next();
      }
    }, 700);
    timers.push(t);
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);
}

// ---- Demo loop slide 2 ----------------------------------------------------

function startDemoLoop() {
  runDemoCycle();
  const iv = setInterval(runDemoCycle, 4000);
  intervals.push(iv);
}

// Indices de la derniere ligne (row 7) de la matrice 8x8 = barre integree.
const PROGRESS_ROW = [56, 57, 58, 59, 60, 61, 62, 63];

function runDemoCycle() {
  if (!matriceEl || !pixelEls.length) return;

  // Reset : fleche cyan dessinee, row 7 eteinte (re-init fleche).
  setMatricePattern(FLECHE_LIT, 'is-on-cyan');
  // Si le pixel 59 (pointe basse de la fleche) est restau en cyan,
  // les transitions de la row 7 le repasseront en jaune.

  // Phase 1 : pulse fleche (0 -> 0.5s).
  const t0 = setTimeout(() => {
    matriceEl.classList.add('is-pulsing');
  }, 50);
  timers.push(t0);

  // Phase 2 : remplissage progressif de la row 7 en jaune,
  // un pixel toutes les ~250ms (2s pour 8 pixels).
  PROGRESS_ROW.forEach((idx, i) => {
    const t = setTimeout(() => {
      if (!pixelEls[idx]) return;
      const p = pixelEls[idx];
      // On retire les anciennes couleurs (cyan de la fleche au pixel 59)
      // et on allume en jaune.
      p.classList.remove('is-on-cyan');
      p.classList.add('is-on', 'is-on-jaune');
      if (i === 0) {
        matriceEl.classList.remove('is-pulsing');
        play('tick');
      }
    }, 500 + i * 250);
    timers.push(t);
  });
}

function resetDemo() {
  // Stoppe l'interval courant et redemarre proprement.
  intervals.forEach(clearInterval);
  intervals = [];
  startDemoLoop();
}

// ---- Navigation slides ----------------------------------------------------

function goToSlide(slide) {
  if (slide < 1 || slide > 2) return;
  currentSlide = slide;
  saveStepState('C1', { slide: currentSlide });
  teardownCurrentSlide();
  if (slide === 1) buildSlide1();
  else buildSlide2();
}

function advance() {
  if (currentSlide === 1) goToSlide(2);
  else if (currentSlide === 2 && navAPIRef) {
    play('unlock');
    if (matriceEl) matriceEl.classList.add('is-flashing-out');
    const t = setTimeout(() => {
      navAPIRef.markComplete?.();
      navAPIRef.next();
    }, 700);
    timers.push(t);
  }
}

function back() {
  if (currentSlide === 2) goToSlide(1);
  else if (navAPIRef) navAPIRef.back?.();
}

// ---- Contrat de step ------------------------------------------------------

export default {
  id: 'C1',
  phase: 'C',
  title: 'Tutoriel controles',
  estimatedDuration: 60,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    savedStateRef = savedState || null;
    containerRef = container;

    scene = new Container();
    container.addChild(scene);

    injectStyle();

    currentSlide = (savedState && (savedState.slide === 1 || savedState.slide === 2))
      ? savedState.slide
      : 1;

    saveStepState('C1', { slide: currentSlide });

    if (currentSlide === 2) buildSlide2();
    else buildSlide1();

    // Raccourcis animateur. On stopPropagation pour empecher le shell
    // (window keydown dans nav.js) de relancer navAPI.next() sur Space/ArrowRight
    // ou de declencher replay() sur R, ce qui sauterait notre logique slide 1->2.
    // Le handler shell ecoute sur window ; le notre sur document fire d'abord.
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        advance();
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        back();
      } else if (e.key === 'r' || e.key === 'R') {
        if (currentSlide === 2) {
          e.preventDefault();
          e.stopPropagation();
          resetDemo();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    handlers.push([document, 'keydown', onKey]);
  },

  exit() {
    handlers.forEach(([t, e, f]) => t.removeEventListener(e, f));
    handlers = [];

    timers.forEach(clearTimeout);
    timers = [];

    intervals.forEach(clearInterval);
    intervals = [];

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    removeStyle();

    wrapEl = null;
    matriceEl = null;
    pixelEls = [];
    demoFillEl = null;
    demoMiniTukoEl = null;
    navAPIRef = null;
    containerRef = null;
  },

  serialize() {
    return { slide: currentSlide };
  },

  isComplete() {
    return currentSlide === 2;
  },

  replay() {
    // Capture refs AVANT exit() qui les nullify.
    const savedSlide = currentSlide;
    const ctrRef = containerRef;
    const navRef = navAPIRef;
    this.exit();
    return this.enter(ctrRef, { slide: savedSlide }, navRef);
  },
};

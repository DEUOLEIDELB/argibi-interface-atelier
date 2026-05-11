// C1-tutoriel-controles.js — Tutoriel des deux indicateurs (cadenas / fleche).
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

const FLECHE_LIT = new Set([
  // r1: pointe (col 3)
  11,
  // r2: pointe (col 3, 4)
  19, 20,
  // r3: tige (col 0..6)
  24, 25, 26, 27, 28, 29, 30,
  // r4: tige pleine (col 0..7)
  32, 33, 34, 35, 36, 37, 38, 39,
  // r5: tige (col 0..6)
  40, 41, 42, 43, 44, 45, 46,
  // r6: pointe (col 3, 4)
  51, 52,
  // r7: pointe (col 3)
  59,
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: var(--s-2) var(--s-4) var(--s-2);
  gap: var(--s-1);
  text-align: center;
  overflow: hidden;
}
.step-C1__titre {
  font-size: var(--t-h1);
  margin-top: var(--s-1);
  animation: step-C1-smash 600ms var(--ease-bounce) both;
}
.step-C1__sous {
  font-size: var(--t-body-xl);
  margin-top: 0;
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 250ms forwards;
}
.step-C1__matrice {
  --matrice-8x8-size: min(280px, 30vh);
}
.step-C1__demo-bar {
  width: min(280px, 30vh);
}
.step-C1__progression {
  width: min(280px, 24vw);
  margin-top: 0;
}
.step-C1__eyebrow {
  margin-top: 0;
}
.step-C1__matrice-zone {
  display: grid;
  place-items: center;
  gap: var(--s-2);
  position: relative;
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
  font-size: var(--t-body-xl);
  font-weight: 600;
  color: var(--ink);
  max-width: 720px;
  line-height: 1.25;
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
  display: flex;
  gap: var(--s-3);
  align-items: center;
  margin-bottom: var(--s-2);
}
.step-C1__cta {
  opacity: 0;
  animation: step-C1-fade-in var(--d-slow) var(--ease-out) 850ms forwards;
}
.step-C1__cta.is-blinking {
  animation: step-C1-cta-blink 200ms steps(2, end) 2;
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

  const titre = el('h1', 'titre-hero step-C1__titre', 'LE CADENAS');
  wrapEl.appendChild(titre);

  const sous = el('p', 'sous-titre step-C1__sous', 'attends que je debloque');
  wrapEl.appendChild(sous);

  const matriceZone = el('div', 'step-C1__matrice-zone');
  matriceEl = buildMatrice(CADENAS_LIT, 'is-on-rose', { cascade: true });
  matriceZone.appendChild(matriceEl);
  wrapEl.appendChild(matriceZone);

  const rappel = el('p', 'step-C1__rappel',
    'regarde ta capsule · si elle montre ce dessin, tu attends mon signal');
  wrapEl.appendChild(rappel);

  const ctaRow = el('div', 'step-C1__cta-row');
  const cta = el('button', 'cta-primary step-C1__cta');
  cta.type = 'button';
  cta.textContent = 'J\'AI COMPRIS';
  ctaRow.appendChild(cta);
  wrapEl.appendChild(ctaRow);

  const tuko = el('div', 'tuko-mascotte');
  tuko.dataset.pose = 'stop';
  tuko.dataset.position = 'bas-gauche';
  wrapEl.appendChild(tuko);

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

  const titre = el('h1', 'titre-hero step-C1__titre', 'LA FLECHE');
  wrapEl.appendChild(titre);

  const sous = el('p', 'sous-titre step-C1__sous', 'appuie longtemps pour demarrer');
  wrapEl.appendChild(sous);

  const matriceZone = el('div', 'step-C1__matrice-zone');
  matriceEl = buildMatrice(FLECHE_LIT, 'is-on-cyan', { cascade: true });
  matriceZone.appendChild(matriceEl);

  const demoBar = el('div', 'step-C1__demo-bar');
  demoFillEl = el('div', 'step-C1__demo-bar__fill');
  demoMiniTukoEl = el('div', 'step-C1__demo-bar__mini-tuko');
  demoBar.appendChild(demoFillEl);
  demoBar.appendChild(demoMiniTukoEl);
  matriceZone.appendChild(demoBar);

  wrapEl.appendChild(matriceZone);

  const consigne = el('p', 'step-C1__consigne',
    'reste appuye sur ton bouton jusqu\'a ce que la barre soit pleine');
  wrapEl.appendChild(consigne);

  const ctaRow = el('div', 'step-C1__cta-row');
  const cta = el('button', 'cta-primary step-C1__cta');
  cta.type = 'button';
  cta.textContent = 'ON EST PRET';
  ctaRow.appendChild(cta);
  wrapEl.appendChild(ctaRow);

  const tuko = el('div', 'tuko-mascotte');
  tuko.dataset.pose = 'presentateur';
  tuko.dataset.position = 'bas-gauche';
  wrapEl.appendChild(tuko);

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

function runDemoCycle() {
  if (!demoFillEl || !matriceEl) return;

  // Reset
  demoFillEl.parentElement.classList.add('is-resetting');
  demoFillEl.style.transform = 'scaleX(0)';
  if (demoMiniTukoEl) demoMiniTukoEl.style.left = '0';
  setMatricePattern(FLECHE_LIT, 'is-on-cyan');

  // Phase 1 : pulse fleche (0 -> 0.5s).
  const t0 = setTimeout(() => {
    matriceEl.classList.add('is-pulsing');
  }, 50);
  timers.push(t0);

  // Phase 2 : remplissage barre (0.5s -> 2.5s).
  const t1 = setTimeout(() => {
    matriceEl.classList.remove('is-pulsing');
    demoFillEl.parentElement.classList.remove('is-resetting');
    demoFillEl.style.transform = 'scaleX(1)';
    if (demoMiniTukoEl) demoMiniTukoEl.style.left = '100%';
    play('tick');
  }, 500);
  timers.push(t1);

  // Phase 3 : pleine charge -> GO flash (2.5s -> 3s).
  const t2 = setTimeout(() => {
    setMatricePattern(ECLAIR_LIT, 'is-on-jaune');
    demoFillEl.parentElement.classList.add('is-flashing');
    play('power-up');
    const t3 = setTimeout(() => {
      if (demoFillEl) demoFillEl.parentElement.classList.remove('is-flashing');
    }, 400);
    timers.push(t3);
  }, 2500);
  timers.push(t2);
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

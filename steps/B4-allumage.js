// B4-allumage.js - Branchement de la batterie + allumage synchronise.
// Source : doc interne.
//
// Slide 1 : ON BRANCHE LA BATTERIE + .bandeau-pulsant--alerte (rose) qui
//           passe en --ok (jaune) au clic GO + flash + bascule. Tuko stop
//           -> triomphe.
// Slide 2 : APPUIE ! + .matrice-8x8 PARTAGEE  qui execute la
//           sequence d'eveil : countdown 3-2-1 sur 3 lignes (300-900ms),
//           allumage spirale centre vers bords (~50ms/pixel, 800-2400ms),
//           flash + spawnShockwave + pattern signature 700ms, puis idle
//           respiration (.is-respirante) + cycle de patterns toutes les
//           15s apres 30s. Etincelles cyan via spawnEtincelles partage.
//           Tuko emerveille.
//

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';
import { spawnEtincelles, spawnShockwave } from '../core/effects.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let stopSparkles = null;

let currentSlide = 1;
let goPressed = false;
let currentPattern = 0;
let patternCycleStartedAt = 0;

const MATRIX_SIZE = 8;
const PIXEL_COUNT = MATRIX_SIZE * MATRIX_SIZE;
const SPIRAL_ORDER = computeSpiralOrder();

// Patterns signature (8x8). 1 = pixel allume, 0 = eteint.
const PATTERNS = [
  // Coeur
  [
    '00000000',
    '01100110',
    '11111111',
    '11111111',
    '01111110',
    '00111100',
    '00011000',
    '00000000',
  ],
  // Sourire
  [
    '00111100',
    '01000010',
    '10100101',
    '10000001',
    '10100101',
    '10011001',
    '01000010',
    '00111100',
  ],
  // Tuko miniature stylise
  [
    '00111100',
    '01111110',
    '11011011',
    '11111111',
    '11011011',
    '11111111',
    '01100110',
    '01100110',
  ],
];

let slide1El = null;
let slide2El = null;
let bandeauEl = null;
let bandeauTextEl = null;
let cta1El = null;
let tuko1El = null;
let tuko2El = null;
let matrixEl = null;
let matrixWrapEl = null;
let matrixCells = [];
let titreAppuieEl = null;
let sousTitre2El = null;
let cta2El = null;

export default {
  id: 'B4',
  phase: 'B',
  title: 'Allumage',
  estimatedDuration: 60,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;

    scene = new Container();
    scene.label = 'step-B4-root';
    container.addChild(scene);

    injectStyles();

    const stage = document.querySelector('#stage');

    const wrap = document.createElement('div');
    wrap.className = 'step-B4';
    stage.appendChild(wrap);
    domNodes.push(wrap);

    buildSlide1(wrap);
    buildSlide2(wrap);

    if (savedState?.slide === 2) {
      currentSlide = 2;
      goPressed = true;
      showSlide2(true);
    } else {
      currentSlide = 1;
      goPressed = false;
      showSlide1();
    }

    const onKeyCapture = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (currentSlide === 1 && (e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        triggerGo();
      } else if (currentSlide === 2 && e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        backToSlide1();
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    handlers.push([window, 'keydown', onKeyCapture, true]);

    persist();
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => {
      target.removeEventListener(event, fn, !!capture);
    });
    handlers = [];

    timers.forEach(clearTimeout);
    timers = [];

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    if (stopSparkles) {
      stopSparkles();
      stopSparkles = null;
    }

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    navAPIRef = null;
    currentSlide = 1;
    goPressed = false;
    currentPattern = 0;
    slide1El = null;
    slide2El = null;
    bandeauEl = null;
    bandeauTextEl = null;
    cta1El = null;
    tuko1El = null;
    tuko2El = null;
    matrixEl = null;
    matrixWrapEl = null;
    matrixCells = [];
    titreAppuieEl = null;
    sousTitre2El = null;
    cta2El = null;
  },

  serialize() {
    return { slide: currentSlide, goPressed };
  },

  isComplete() {
    return goPressed && currentSlide === 2;
  },

  replay() {
    this.exit();
  },
};

function buildSlide1(wrap) {
  const slide = document.createElement('section');
  slide.className = 'step-B4__slide step-B4__slide--1';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-B4__titre';
  titre.textContent = 'ON BRANCHE LA BATTERIE';
  slide.appendChild(titre);

  const image = document.createElement('div');
  image.className = 'placeholder-image step-B4__image';
  image.textContent = 'illustration batterie + cable + capsule, branchement clair';
  slide.appendChild(image);

  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau-pulsant bandeau-pulsant--alerte step-B4__bandeau';
  const bandeauText = document.createElement('span');
  bandeauText.className = 'step-B4__bandeau-text';
  bandeauText.textContent = "n'allume pas : attends le GO";
  bandeau.appendChild(bandeauText);
  slide.appendChild(bandeau);
  bandeauEl = bandeau;
  bandeauTextEl = bandeauText;

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'stop';
  tuko.dataset.position = 'bas-gauche';
  slide.appendChild(tuko);
  tuko1El = tuko;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-B4__cta1';
  cta.textContent = 'GO !';
  slide.appendChild(cta);
  cta1El = cta;

  const onClick = () => triggerGo();
  cta.addEventListener('click', onClick);
  handlers.push([cta, 'click', onClick]);

  wrap.appendChild(slide);
  slide1El = slide;
}

function triggerGo() {
  if (currentSlide !== 1 || goPressed) return;
  goPressed = true;

  // Bandeau alerte (rose) -> ok (jaune) + texte change.
  bandeauEl.classList.remove('bandeau-pulsant--alerte');
  bandeauEl.classList.add('bandeau-pulsant--ok');
  bandeauTextEl.textContent = 'GO !';
  bandeauEl.classList.add('step-B4__bandeau--flash');

  // Tuko stop -> triomphe via data-pose (mascotte partagee).
  if (tuko1El) {
    tuko1El.dataset.pose = 'triomphe';
  }

  // Flash plein ecran bref puis bascule slide 2.
  const flash = document.createElement('div');
  flash.className = 'step-B4__flash';
  document.querySelector('#stage').appendChild(flash);
  domNodes.push(flash);
  requestAnimationFrame(() => flash.classList.add('is-on'));

  const t = setTimeout(() => {
    currentSlide = 2;
    showSlide2(false);
    persist();
  }, 350);
  timers.push(t);
}

function showSlide1() {
  slide1El.classList.add('is-active');
  slide2El.classList.remove('is-active');
}

function buildSlide2(wrap) {
  const slide = document.createElement('section');
  slide.className = 'step-B4__slide step-B4__slide--2';

  const titre = document.createElement('h2');
  titre.className = 'titre-hero step-B4__titre-appuie';
  titre.textContent = 'APPUIE !';
  slide.appendChild(titre);
  titreAppuieEl = titre;

  // Wrapper positionne pour les helpers (spawnShockwave, spawnEtincelles).
  const matWrap = document.createElement('div');
  matWrap.className = 'step-B4__matrix-wrap';
  slide.appendChild(matWrap);
  matrixWrapEl = matWrap;

  // Composant partage .matrice-8x8  : conteneur + 64 pixels.
  const grid = document.createElement('div');
  grid.className = 'matrice-8x8';
  grid.setAttribute('role', 'img');
  grid.setAttribute('aria-label', 'Matrice virtuelle 8 par 8');
  matWrap.appendChild(grid);
  matrixEl = grid;

  matrixCells = [];
  for (let y = 0; y < MATRIX_SIZE; y++) {
    for (let x = 0; x < MATRIX_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'matrice-8x8__pixel';
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      grid.appendChild(cell);
      matrixCells.push({ el: cell, x, y });
    }
  }

  const sousTitre = document.createElement('p');
  sousTitre.className = 'sous-titre step-B4__sous-titre';
  sousTitre.textContent = 'elle est en vie : regarde ta capsule';
  slide.appendChild(sousTitre);
  sousTitre2El = sousTitre;

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'emerveille';
  tuko.dataset.position = 'bas-gauche';
  slide.appendChild(tuko);
  tuko2El = tuko;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-B4__cta2';
  cta.textContent = 'on decouvre les pouvoirs';
  slide.appendChild(cta);
  cta2El = cta;

  const onClick = () => {
    flashAllPixels(3, 100);
    const t = setTimeout(() => {
      navAPIRef?.markComplete?.();
      navAPIRef?.next?.();
    }, 400);
    timers.push(t);
  };
  cta.addEventListener('click', onClick);
  handlers.push([cta, 'click', onClick]);

  wrap.appendChild(slide);
  slide2El = slide;
}

function showSlide2(skipIntroAnim) {
  slide1El.classList.remove('is-active');
  slide2El.classList.add('is-active');

  // Reset visuel matrice.
  matrixCells.forEach(c => { c.el.className = 'matrice-8x8__pixel'; });
  matrixEl.classList.remove('is-respirante');
  sousTitre2El.classList.remove('is-visible');
  cta2El.classList.remove('is-visible');
  titreAppuieEl.classList.remove('is-pulsing');

  // Etincelles cyan continues autour de la matrice (helper partage).
  if (stopSparkles) stopSparkles();
  stopSparkles = spawnEtincelles(matrixWrapEl, { duree: 0, densite: 'normale' });

  if (skipIntroAnim) {
    // Reprise : etat idle stable.
    matrixCells.forEach(c => c.el.classList.add('is-on-jaune'));
    matrixEl.classList.add('is-respirante');
    sousTitre2El.classList.add('is-visible');
    cta2El.classList.add('is-visible');
    schedulePatternCycle();
    return;
  }

  playWakeupSequence();
}

function backToSlide1() {
  if (currentSlide !== 2) return;
  currentSlide = 1;
  goPressed = false;
  bandeauEl.classList.remove('bandeau-pulsant--ok');
  bandeauEl.classList.add('bandeau-pulsant--alerte');
  bandeauEl.classList.remove('step-B4__bandeau--flash');
  bandeauTextEl.textContent = "n'allume pas : attends le GO";
  if (tuko1El) tuko1El.dataset.pose = 'stop';
  if (stopSparkles) { stopSparkles(); stopSparkles = null; }
  showSlide1();
  persist();
}

function playWakeupSequence() {
  // 0 -> 0.3s : APPUIE pulse 2x rapide.
  titreAppuieEl.classList.add('is-pulsing');

  // 0.3 -> 0.9s : countdown 3-2-1 sur les 3 lignes centrales (rows 4, 5, 6).
  // Chaque ligne se remplit gauche -> droite en 200ms.
  const countdownRows = [4, 5, 6];
  const rowDuration = 200;
  countdownRows.forEach((row, i) => {
    const t = setTimeout(() => fillRowLeftToRight(row, rowDuration), 300 + i * rowDuration);
    timers.push(t);
  });

  // Reset des lignes puis allumage spirale.
  const t1 = setTimeout(() => {
    matrixCells.forEach(c => c.el.classList.remove('is-on-jaune', 'is-on'));
    titreAppuieEl.classList.remove('is-pulsing');
    spiralLightUp();
  }, 300 + countdownRows.length * rowDuration);
  timers.push(t1);
}

function fillRowLeftToRight(row, duration) {
  const cells = matrixCells.filter(c => c.y === row);
  const step = duration / cells.length;
  cells.forEach((c, i) => {
    const t = setTimeout(() => c.el.classList.add('is-on-jaune'), Math.round(i * step));
    timers.push(t);
  });
}

function spiralLightUp() {
  const total = SPIRAL_ORDER.length;
  const stepMs = 22; // ~1.4s pour 64 pixels (centre -> bords)

  SPIRAL_ORDER.forEach((idx, i) => {
    const t = setTimeout(() => {
      const cell = matrixCells[idx];
      cell.el.classList.add('is-on-cyan', 'just-lit');
      const t2 = setTimeout(() => cell.el.classList.remove('just-lit'), 200);
      timers.push(t2);
    }, i * stepMs);
    timers.push(t);
  });

  // Fin de spirale : shockwave (helper partage) + pattern signature coeur.
  const flashAt = total * stepMs + 50;
  const t1 = setTimeout(() => {
    spawnShockwave(matrixWrapEl, {
      rayonMax: 1200,
      duree: 700,
      couleur: 'var(--accent-3)',
    });
    showSignaturePattern(0);
  }, flashAt);
  timers.push(t1);

  // Apres pattern signature : sous-titre + CTA + idle respiration.
  const t2 = setTimeout(() => {
    // Reset puis allumage uniforme jaune en respiration.
    matrixCells.forEach(c => {
      c.el.classList.remove('is-on-cyan', 'is-pattern');
      c.el.classList.add('is-on-jaune');
    });
    matrixEl.classList.add('is-respirante');
    sousTitre2El.classList.add('is-visible');
    cta2El.classList.add('is-visible');
    schedulePatternCycle();
  }, flashAt + 1300);
  timers.push(t2);
}

function showSignaturePattern(index) {
  const pattern = PATTERNS[index % PATTERNS.length];
  matrixCells.forEach(c => {
    const lit = pattern[c.y][c.x] === '1';
    c.el.classList.remove('is-on-cyan', 'is-on-jaune');
    c.el.classList.toggle('is-pattern', lit);
  });
}

function flashAllPixels(times, intervalMs) {
  // Clignote 3x au clic CTA Slide 2 : alterne is-on-jaune off/on (cf. fiche
  // "la matrice clignote 3 fois rapidement"). Pas d'usage de .is-blinking
  // partagee (qui est 2x a 600ms, semantique pixel-manquant).
  let count = 0;
  const tick = () => {
    matrixCells.forEach(c => {
      if (count % 2 === 0) c.el.classList.remove('is-on-jaune', 'is-on-cyan');
      else c.el.classList.add('is-on-jaune');
    });
    count++;
    if (count < times * 2) {
      const t = setTimeout(tick, intervalMs);
      timers.push(t);
    } else {
      matrixCells.forEach(c => c.el.classList.add('is-on-jaune'));
    }
  };
  tick();
}

function schedulePatternCycle() {
  patternCycleStartedAt = performance.now();
  // Si l'animateur reste > 30s, change de pattern toutes les 15s.
  const tick = () => {
    if (currentSlide !== 2) return;
    const elapsed = performance.now() - patternCycleStartedAt;
    if (elapsed > 30_000) {
      currentPattern = (currentPattern + 1) % PATTERNS.length;
      showSignaturePattern(currentPattern);
      // Apres 700ms d'affichage du pattern : retour idle uniforme.
      const tReset = setTimeout(() => {
        if (currentSlide !== 2) return;
        matrixCells.forEach(c => {
          c.el.classList.remove('is-pattern');
          c.el.classList.add('is-on-jaune');
        });
      }, 700);
      timers.push(tReset);
    }
    const t = setTimeout(tick, 15_000);
    timers.push(t);
  };
  const t = setTimeout(tick, 15_000);
  timers.push(t);
}

function persist() {
  saveStepState('B4', { slide: currentSlide, goPressed });
}

function computeSpiralOrder() {
  const center = (MATRIX_SIZE - 1) / 2;
  const indices = [];
  for (let y = 0; y < MATRIX_SIZE; y++) {
    for (let x = 0; x < MATRIX_SIZE; x++) {
      const idx = y * MATRIX_SIZE + x;
      const dx = x - center;
      const dy = y - center;
      const r = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      indices.push({ idx, r, angle });
    }
  }
  indices.sort((a, b) => {
    if (Math.abs(a.r - b.r) > 0.05) return a.r - b.r;
    return a.angle - b.angle;
  });
  return indices.map(i => i.idx);
}

function injectStyles() {
  if (document.querySelector('#step-B4-styles')) return;
  const css = `
    .step-B4 {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .step-B4__slide {
      position: absolute;
      inset: 0;
      display: none;
    }
    .step-B4__slide.is-active { display: grid; }

    .step-B4__slide--1 {
      grid-template-rows: auto 1fr auto auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-6) var(--s-6) var(--s-7);
      text-align: center;
    }

    .step-B4__titre {
      opacity: 0;
      transform: scale(0);
      animation: stepB4-titre-smash var(--d-normal) var(--ease-bounce) 100ms forwards;
    }

    .step-B4__image {
      width: min(640px, 55%);
      max-height: 320px;
      opacity: 0;
      transform: translateY(20px);
      animation: stepB4-fade-in var(--d-slow) var(--ease-out) 350ms forwards,
                 stepB4-bobbing 3s ease-in-out 950ms infinite;
    }

    .step-B4__bandeau {
      width: min(900px, 80%);
      transform: scale(0.85);
      opacity: 0;
      animation: stepB4-bandeau-impact var(--d-slow) var(--ease-bounce) 500ms forwards;
    }

    .step-B4__bandeau--flash {
      animation: stepB4-bandeau-flash var(--d-fast) var(--ease-out) forwards;
    }

    .step-B4__cta1 {
      opacity: 0;
      transform: translateY(10px);
      animation: stepB4-fade-in var(--d-normal) var(--ease-bounce) 800ms forwards;
    }

    .step-B4__cta2 {
      position: absolute;
      bottom: var(--s-5);
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
    }
    .step-B4__cta2.is-visible {
      animation: stepB4-cta-pop var(--d-normal) var(--ease-bounce) forwards;
    }

    .step-B4__slide--2 {
      grid-template-rows: auto 1fr auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-6);
      text-align: center;
    }

    .step-B4__titre-appuie {
      font-size: var(--t-hero);
      opacity: 0;
      transform: scale(0);
      animation: stepB4-titre-smash var(--d-normal) var(--ease-bounce) forwards;
    }
    .step-B4__titre-appuie.is-pulsing {
      animation: stepB4-titre-smash var(--d-normal) var(--ease-bounce) forwards,
                 stepB4-appuie-pulse 0.18s ease-in-out 350ms 2;
    }

    .step-B4__matrix-wrap {
      position: relative;
      display: grid;
      place-items: center;
    }

    .step-B4__sous-titre {
      opacity: 0;
      transform: translateY(10px);
    }
    .step-B4__sous-titre.is-visible {
      animation: stepB4-fade-in var(--d-slow) var(--ease-out) forwards;
    }

    .step-B4__flash {
      position: absolute;
      inset: 0;
      background: var(--paper);
      opacity: 0;
      pointer-events: none;
      z-index: 50;
    }
    .step-B4__flash.is-on {
      animation: stepB4-flash 350ms ease-out forwards;
    }

    @keyframes stepB4-titre-smash {
      0%   { opacity: 0; transform: scale(0); }
      60%  { opacity: 1; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes stepB4-fade-in {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes stepB4-bobbing {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-5px); }
    }

    @keyframes stepB4-bandeau-impact {
      0%   { opacity: 0; transform: scale(0.85); }
      60%  { opacity: 1; transform: scale(1.06); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes stepB4-bandeau-flash {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.08); }
      100% { transform: scale(1); }
    }

    @keyframes stepB4-cta-pop {
      0%   { opacity: 0; transform: translate(-50%, 10px) scale(0.95); }
      60%  { opacity: 1; transform: translate(-50%, 0)    scale(1.05); }
      100% { opacity: 1; transform: translate(-50%, 0)    scale(1); }
    }

    @keyframes stepB4-appuie-pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.12); }
    }

    @keyframes stepB4-flash {
      0%   { opacity: 0; }
      40%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `;

  const style = document.createElement('style');
  style.id = 'step-B4-styles';
  style.textContent = css;
  document.head.appendChild(style);
  domNodes.push(style);
}

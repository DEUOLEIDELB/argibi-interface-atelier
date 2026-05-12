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
import { spawnShockwave } from '../core/effects.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

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
let matrixEl = null;
let matrixWrapEl = null;
let matrixCells = [];
let titreAppuieEl = null;
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
    matrixEl = null;
    matrixWrapEl = null;
    matrixCells = [];
    titreAppuieEl = null;
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

  // Wrapper centre : faisceau rotatif jaune (derriere) + card batterie (devant)
  const imageWrap = document.createElement('div');
  imageWrap.className = 'step-B4__image-wrap';

  const beam = document.createElement('div');
  beam.className = 'step-B4__beam';
  imageWrap.appendChild(beam);

  const card = document.createElement('div');
  card.className = 'step-B4__image-card';
  const image = document.createElement('img');
  image.className = 'step-B4__image';
  image.src = 'assets/sprites/B4/batterie.jpg';
  image.alt = 'Batterie externe';
  image.loading = 'lazy';
  card.appendChild(image);
  imageWrap.appendChild(card);

  slide.appendChild(imageWrap);

  // Bandeau warning avec icone d'alerte explicite + texte
  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau-pulsant bandeau-pulsant--alerte step-B4__bandeau';
  const bandeauIconLeft = document.createElement('span');
  bandeauIconLeft.className = 'step-B4__bandeau-icon';
  bandeauIconLeft.setAttribute('aria-hidden', 'true');
  bandeauIconLeft.textContent = '⚠';
  bandeau.appendChild(bandeauIconLeft);
  const bandeauText = document.createElement('span');
  bandeauText.className = 'step-B4__bandeau-text';
  bandeauText.textContent = "N'ALLUME PAS : ATTENDS LE GO";
  bandeau.appendChild(bandeauText);
  const bandeauIconRight = document.createElement('span');
  bandeauIconRight.className = 'step-B4__bandeau-icon';
  bandeauIconRight.setAttribute('aria-hidden', 'true');
  bandeauIconRight.textContent = '⚠';
  bandeau.appendChild(bandeauIconRight);
  slide.appendChild(bandeau);
  bandeauEl = bandeau;
  bandeauTextEl = bandeauText;
  // Tuko placeholder bas-gauche retire sur demande Taki (slide 1)
  tuko1El = null;

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

  // (Tuko1 retire sur slide 1 : pas de changement de pose ici.)

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
  titre.textContent = 'Allume ton Argibi !';
  slide.appendChild(titre);
  titreAppuieEl = titre;

  // Wrapper positionne pour les helpers (spawnShockwave).
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

  // Sous-titre + tuko-mascotte emerveille retires sur demande Taki.

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
  cta2El.classList.remove('is-visible');
  titreAppuieEl.classList.remove('is-pulsing');

  if (skipIntroAnim) {
    // Reprise : etat idle stable.
    matrixCells.forEach(c => c.el.classList.add('is-on-jaune'));
    matrixEl.classList.add('is-respirante');
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
  bandeauTextEl.textContent = "N'ALLUME PAS : ATTENDS LE GO";
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

    /* Wrapper centre : ancre le faisceau rotatif + la card batterie. */
    .step-B4__image-wrap {
      position: relative;
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    /* Card avec contour neo-brutaliste autour de l'image batterie. */
    .step-B4__image-card {
      position: relative;
      z-index: 2;
      background: var(--paper);
      border: var(--border);
      box-shadow: var(--shadow-lg);
      border-radius: var(--r-md);
      padding: var(--s-3);
      display: grid;
      place-items: center;
      opacity: 0;
      transform: translateY(20px);
      animation: stepB4-fade-in var(--d-slow) var(--ease-out) 350ms forwards,
                 stepB4-bobbing 3s ease-in-out 950ms infinite;
    }

    .step-B4__image {
      display: block;
      width: auto;
      max-width: min(420px, 36vw);
      max-height: clamp(240px, 32vh, 400px);
      height: auto;
      object-fit: contain;
    }

    /* Faisceau rotatif jaune autour de la card (12 rayons fins, sens horaire). */
    .step-B4__beam {
      position: absolute;
      top: 50%;
      left: 50%;
      width: clamp(640px, 60vw, 900px);
      height: clamp(640px, 60vw, 900px);
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 1deg,
        var(--accent-3) 4deg 5deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 8deg,
        transparent 12deg 30deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 31deg,
        var(--accent-3) 34deg 35deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 38deg,
        transparent 42deg 60deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 61deg,
        var(--accent-3) 64deg 65deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 68deg,
        transparent 72deg 90deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 91deg,
        var(--accent-3) 94deg 95deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 98deg,
        transparent 102deg 120deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 121deg,
        var(--accent-3) 124deg 125deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 128deg,
        transparent 132deg 150deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 151deg,
        var(--accent-3) 154deg 155deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 158deg,
        transparent 162deg 180deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 181deg,
        var(--accent-3) 184deg 185deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 188deg,
        transparent 192deg 210deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 211deg,
        var(--accent-3) 214deg 215deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 218deg,
        transparent 222deg 240deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 241deg,
        var(--accent-3) 244deg 245deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 248deg,
        transparent 252deg 270deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 271deg,
        var(--accent-3) 274deg 275deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 278deg,
        transparent 282deg 300deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 301deg,
        var(--accent-3) 304deg 305deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 308deg,
        transparent 312deg 330deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 331deg,
        var(--accent-3) 334deg 335deg,
        color-mix(in srgb, var(--accent-3) 30%, transparent) 338deg,
        transparent 342deg 360deg
      );
      -webkit-mask: radial-gradient(circle, transparent 28%, black 38%, black 55%, transparent 90%);
      mask:         radial-gradient(circle, transparent 28%, black 38%, black 55%, transparent 90%);
      pointer-events: none;
      filter: blur(2px);
      z-index: 1;
      opacity: 0;
      transform: translate(-50%, -50%) rotate(0deg);
      animation: stepB4-beam-fade 600ms var(--ease-out) 600ms forwards,
                 stepB4-beam-rotate 16s linear 600ms infinite;
    }

    /* Important : conserver translate(-50%,-50%) dans chaque keyframe rotate
       sinon le faisceau perd son centrage et saute. */
    @keyframes stepB4-beam-rotate {
      0%   { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }

    @keyframes stepB4-beam-fade {
      from { opacity: 0; }
      to   { opacity: 0.75; }
    }

    .step-B4__bandeau {
      width: min(900px, 80%);
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--s-3);
      transform: scale(0.85);
      opacity: 0;
      animation: stepB4-bandeau-impact var(--d-slow) var(--ease-bounce) 500ms forwards;
    }

    .step-B4__bandeau-icon {
      font-family: var(--display);
      font-size: clamp(48px, 4.6vw, 72px);
      font-weight: 900;
      line-height: 1;
      color: var(--ink);
      animation: stepB4-bandeau-icon-blink 1.2s ease-in-out infinite;
    }

    @keyframes stepB4-bandeau-icon-blink {
      0%, 100% { transform: scale(1)    rotate(-3deg); opacity: 1; }
      50%      { transform: scale(1.12) rotate(3deg);  opacity: 0.85; }
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
      white-space: nowrap;
      opacity: 0;
      transform: translateY(10px);
    }
    .step-B4__cta2.is-visible {
      animation: stepB4-cta-pop var(--d-normal) var(--ease-bounce) forwards;
    }

    .step-B4__slide--2 {
      grid-template-rows: auto 1fr auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-5) var(--s-6) var(--s-8);
      text-align: center;
    }

    .step-B4__titre-appuie {
      font-size: clamp(72px, 7vw, 110px);
      white-space: nowrap;
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
      0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
      60%  { opacity: 1; transform: translateY(0)    scale(1.05); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
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

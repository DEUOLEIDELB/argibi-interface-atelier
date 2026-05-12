// D1-activite-bouton.js : "LE BOUTON A 3 LANGUES" (page magazine 14).
// V2 : utilise .matrice-8x8--mini partagee + timeline jaune dessous.
// 3 cards : APPUI COURT / LONG / DOUBLE. Chaque card affiche :
//   - titre
//   - mini matrice 8x8 statique avec le pattern jaune correspondant
//   - timeline (graph) sous la matrice
//   - label court ("un message", "une duree", "une repetition")
// Conventions : padding wrap var(--s-3) var(--s-5) var(--s-8) var(--s-5)
//   pour aligner CTA a 128px du footer. CTA sans chevron, animation: none.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D1-styles';

// Patterns matrice 8x8 (indices = row*8 + col, cf. memoire matrice_8x8_system).
// Tous les patterns occupent les colonnes specifiees sur les rows 4 a 7 (bas).
const PATTERN_COURT = new Set([
  // col 2 sur rows 4-7 (1 colonne verticale)
  34, 42, 50, 58,
]);

const PATTERN_LONG = new Set([
  // cols 2-6 sur rows 4-7 (rectangle 5 colonnes x 4 rows)
  34, 35, 36, 37, 38,
  42, 43, 44, 45, 46,
  50, 51, 52, 53, 54,
  58, 59, 60, 61, 62,
]);

const PATTERN_DOUBLE = new Set([
  // cols 2 et 5 sur rows 4-7 (2 colonnes verticales separees)
  34, 37,
  42, 45,
  50, 53,
  58, 61,
]);

const STYLE_TEXT = `
.step-D1 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

/* ----- Title hero --------------------------------------------------------- */

.step-D1__titre {
  font-family: var(--display);
  font-size: clamp(56px, 5.4vw, 88px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  justify-self: center;
  opacity: 0;
  transform: scale(0);
}

.step-D1__titre.is-in {
  animation: d1-smash 400ms var(--ease-bounce) forwards;
}

@keyframes d1-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

/* ----- Sous-titre simple (option) ----------------------------------------- */

.step-D1__sous {
  font-family: var(--body);
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 600;
  color: var(--ink);
  text-align: center;
  justify-self: center;
  margin: 0;
  opacity: 0.85;
}

/* ----- Cards row : 3 cards parallel --------------------------------------- */

.step-D1__cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-4);
  align-items: stretch;
  align-self: center;
  width: min(1600px, 100%);
  justify-self: center;
}

.step-D1__card {
  /* Var partagee entre la mini-matrice et le graph pour alignement exact */
  --d1-matrix-width: clamp(220px, 19vw, 300px);
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-3);
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: var(--s-2);
  text-align: center;
  place-items: center;
  align-content: center;
  opacity: 0;
  transform: scale(0);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}

.step-D1__card.is-in {
  animation: d1-card-pop 350ms var(--ease-bounce) forwards;
}

.step-D1__card:nth-child(1).is-in { animation-delay: 700ms; }
.step-D1__card:nth-child(2).is-in { animation-delay: 850ms; }
.step-D1__card:nth-child(3).is-in { animation-delay: 1000ms; }

@keyframes d1-card-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

.step-D1__card__titre {
  font-family: var(--display);
  font-size: clamp(24px, 2.2vw, 36px);
  font-weight: 900;
  text-transform: uppercase;
  color: var(--ink);
  letter-spacing: -0.005em;
  margin: 0;
}

/* Mini matrice 8x8 partagee : width = --d1-matrix-width (var sur la card). */
.step-D1 .matrice-8x8--mini {
  --matrice-8x8-size: var(--d1-matrix-width);
}

/* Pixels eteints d'office. JS ajoute .is-lit en cascade pour animer. */
.step-D1 .matrice-8x8__pixel.is-on {
  opacity: 0;
  transform: scale(0.4);
}

.step-D1 .matrice-8x8__pixel.is-on.is-lit {
  animation: d1-pixel-light 280ms var(--ease-bounce) forwards;
}

@keyframes d1-pixel-light {
  0%   { opacity: 0; transform: scale(0.4); }
  60%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}

/* ----- Graph : aligne sur la matrice (meme width, meme grid 8 cols, ------ */
/* memes gap/padding) MAIS style visuel different de la matrice :          */
/* fond clair (bg-2), pas de bordure noire epaisse, cells "barres" jaunes  */
/* avec border ink. Style "timeline" magazine, pas "ecran LED".            */

.step-D1__graph {
  width: var(--d1-matrix-width);
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  padding: 8px;
  box-sizing: border-box;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  aspect-ratio: 8 / 1.6;
  position: relative;
}

/* Axe horizontal en bas (signature graph magazine) */
.step-D1__graph::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 6px;
  height: 2px;
  background: var(--ink);
  opacity: 0.45;
}

.step-D1__graph__cell {
  /* Cells eteintes : invisibles (juste l'espacement) */
}

.step-D1__graph__cell.is-on {
  background: var(--accent-3);
  border: 2px solid var(--ink);
  border-radius: 3px 3px 0 0;
  align-self: stretch;
}

/* ----- Reveal button (anti-spoiler) -------------------------------------- */
/* Bouton visible AU BOOT a la place de la matrice. Clic = matrice/graph    */
/* apparaissent + cascade LED. Sans ce bouton la reponse serait spoilee.    */

.step-D1__reveal-btn {
  width: var(--d1-matrix-width);
  height: var(--d1-matrix-width);
  font-family: var(--display);
  font-size: clamp(22px, 2vw, 32px);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: var(--accent-1);
  color: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
  display: grid;
  place-items: center;
  transition: transform 200ms var(--ease-out),
              box-shadow 200ms var(--ease-out);
}

.step-D1__reveal-btn:hover {
  transform: translate(-4px, -4px);
  box-shadow: 14px 14px 0 var(--ink);
}

.step-D1__reveal-btn:active {
  transform: translate(-2px, -2px);
}

.step-D1__card__label {
  font-family: var(--display);
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 700;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
}

/* ----- CTA bottom : convention CTA (animation:none, sans chevron) --------- */

.step-D1__cta-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3);
}

.step-D1__cta {
  animation: none !important;
  opacity: 0;
  transform: scale(0);
}

.step-D1__cta.is-in {
  animation: d1-cta-pop 350ms var(--ease-bounce) 1500ms forwards !important;
}

@keyframes d1-cta-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
`;

// Colonnes (0-7) du graph qui s'allument : MIROIR EXACT des colonnes
// matrice. La barre jaune du graph est donc verticalement alignee
// au-dessus de la colonne matrice allumee correspondante.
const CARD_DEFS = [
  {
    key: 'court',
    titre: 'APPUI COURT',
    pattern: PATTERN_COURT,
    graphLitCols: [2],
    label: 'un message',
  },
  {
    key: 'long',
    titre: 'APPUI LONG',
    pattern: PATTERN_LONG,
    graphLitCols: [2, 3, 4, 5, 6],
    label: 'une durée',
  },
  {
    key: 'double',
    titre: 'DOUBLE APPUI',
    pattern: PATTERN_DOUBLE,
    graphLitCols: [2, 5],
    label: 'une répétition',
  },
];

// Delays d'apparition des cards (cf. CSS animation-delay)
const CARD_BASE_DELAYS = [700, 850, 1000];
const CARD_POP_DURATION = 350;
const PIXEL_CASCADE_STEP_MS = 30;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];

let containerRef = null;
let navAPIRef = null;
let savedStateRef = null;
let cardsEls = [];
let viewed = false;

function injectStyle() {
  if (document.querySelector('#' + STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLE_TEXT;
  document.head.appendChild(el);
}

function removeStyle() {
  const el = document.querySelector('#' + STYLE_ID);
  if (el) el.remove();
}

function buildMiniMatrice(litSet) {
  const matrice = document.createElement('div');
  matrice.className = 'matrice-8x8 matrice-8x8--mini';
  matrice.setAttribute('role', 'img');
  matrice.setAttribute('aria-label', 'Matrice 8 par 8');
  for (let i = 0; i < 64; i++) {
    const pixel = document.createElement('div');
    pixel.className = 'matrice-8x8__pixel';
    if (litSet.has(i)) {
      pixel.classList.add('is-on', 'is-on-jaune');
    }
    matrice.appendChild(pixel);
  }
  return matrice;
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D1';

  // Title
  const titre = document.createElement('h1');
  titre.className = 'step-D1__titre';
  titre.textContent = 'LE BOUTON À 3 LANGUES';
  wrap.appendChild(titre);

  // Sous-titre simple
  const sous = document.createElement('p');
  sous.className = 'step-D1__sous';
  sous.textContent = 'essaie chacune sur ta capsule.';
  wrap.appendChild(sous);

  // Cards row
  const cardsRow = document.createElement('div');
  cardsRow.className = 'step-D1__cards';
  cardsEls = CARD_DEFS.map((def) => {
    const card = document.createElement('div');
    card.className = 'step-D1__card';
    card.dataset.cardKey = def.key;

    // Titre
    const ctitre = document.createElement('h2');
    ctitre.className = 'step-D1__card__titre';
    ctitre.textContent = def.titre;
    card.appendChild(ctitre);

    // Bouton reveal (visible au boot, cache au clic)
    const revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'step-D1__reveal-btn';
    revealBtn.textContent = "VOIR L'EFFET";
    card.appendChild(revealBtn);

    // Mini matrice 8x8 (cachee au boot, revelee au clic du bouton)
    const matrice = buildMiniMatrice(def.pattern);
    matrice.style.display = 'none';
    card.appendChild(matrice);

    // Graph aligne sur la matrice (cache au boot, revele au clic)
    const graph = document.createElement('div');
    graph.className = 'step-D1__graph';
    graph.style.display = 'none';
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'step-D1__graph__cell';
      if (def.graphLitCols.includes(c)) cell.classList.add('is-on');
      graph.appendChild(cell);
    }
    card.appendChild(graph);

    // Label (cache au boot, revele au clic)
    const label = document.createElement('p');
    label.className = 'step-D1__card__label';
    label.textContent = def.label;
    label.style.display = 'none';
    card.appendChild(label);

    // Clic reveal : cache le bouton, montre matrice/graph/label,
    // declenche la cascade LED.
    const onReveal = () => {
      revealBtn.style.display = 'none';
      matrice.style.display = '';
      graph.style.display = '';
      label.style.display = '';
      play('pop');
      const litPixels = matrice.querySelectorAll('.matrice-8x8__pixel.is-on');
      litPixels.forEach((pixel, i) => {
        const t = setTimeout(() => pixel.classList.add('is-lit'),
          i * PIXEL_CASCADE_STEP_MS);
        timers.push(t);
      });
    };
    revealBtn.addEventListener('click', onReveal);
    handlers.push([revealBtn, 'click', onReveal]);

    cardsRow.appendChild(card);
    return card;
  });
  wrap.appendChild(cardsRow);

  // CTA area
  const ctaArea = document.createElement('div');
  ctaArea.className = 'step-D1__cta-area';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D1__cta';
  cta.textContent = 'ON FAIT UN MINI-JEU';
  cta.disabled = true;
  ctaArea.appendChild(cta);
  wrap.appendChild(ctaArea);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Sequence d'entree
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    cardsEls.forEach((c) => c.classList.add('is-in'));
    cta.classList.add('is-in');
  });

  // (Cascade LED n'est plus auto au boot : declenchee au clic du bouton
  // reveal de chaque card, pour ne pas spoiler la reponse.)

  // CTA activable apres la sequence
  const tEnable = setTimeout(() => { cta.disabled = false; }, 1900);
  timers.push(tEnable);

  // Mark complete apres entree
  const tComplete = setTimeout(() => {
    viewed = true;
    navAPI.markComplete();
    navAPI.saveState({ steps: { D1: { viewed: true } } });
  }, 2200);
  timers.push(tComplete);

  // (Plus de listener click sur la card entiere : le bouton reveal a son
  // propre handler et on ne veut pas de double trigger.)

  // CTA click
  const onCta = () => {
    if (cta.disabled) return;
    play('whoosh');
    cta.disabled = true;
    navAPI.next();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);
}

export default {
  id: 'D1',
  phase: 'D',
  title: 'Le bouton a 3 langues',
  estimatedDuration: 90,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    viewed = !!(savedState && savedState.viewed);

    scene = new Container();
    scene.label = 'step-D1';
    container.addChild(scene);

    injectStyle();
    build(navAPI);
  },

  exit() {
    handlers.forEach(([t, e, fn]) => t.removeEventListener(e, fn));
    handlers = [];
    timers.forEach(clearTimeout);
    timers = [];
    intervals.forEach(clearInterval);
    intervals = [];
    tickerFns.forEach((fn) => app.ticker.remove(fn));
    tickerFns = [];
    domNodes.forEach((n) => n.remove());
    domNodes = [];
    cardsEls = [];
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    return { viewed };
  },

  isComplete() {
    return viewed;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

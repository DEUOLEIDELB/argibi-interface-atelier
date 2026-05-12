// D5-activite-interrupteur.js — 2 interrupteurs A et B, 4 combinaisons.
//
// LOGIQUE :
//   - Interrupteur A (gauche sur l'Argibi) controle 2 pixels matrice :
//     row 7, col 1 (idx 57) + row 7, col 2 (idx 58).
//   - Interrupteur B (droite sur l'Argibi) controle 2 pixels matrice :
//     row 7, col 5 (idx 61) + row 7, col 6 (idx 62).
//   - Chaque interrupteur = etat 0 ou 1. État 1 = ROSE (--accent-4),
//     état 0 = JAUNE (--accent-3).
//   - 4 cards = les 4 combinaisons possibles (A=0/1 × B=0/1).
//
// ANTI-SPOIL : les interrupteurs sont caches sous un overlay "VOIR LES
// INTERRUPTEURS". Clic = reveal des leviers de la card. La matrice
// reste visible des le debut (resultat observable directement).
// Interrupteur visuel : rectangle vertical noir, capuchon rouge en haut
// (state=1) ou en bas (state=0). Vu du dessus comme sur l'Argibi.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

const STYLE_ID = 'step-D5-style';

// Indices matrice 8x8 (row 7, cols 1-2 et 5-6) controles par A et B.
const PIXELS_A = [57, 58]; // row 7, cols 1 et 2
const PIXELS_B = [61, 62]; // row 7, cols 5 et 6

// 4 combinaisons (a, b) ∈ {0, 1}².
const COMBINAISONS = [
  { a: 0, b: 0 },
  { a: 0, b: 1 },
  { a: 1, b: 0 },
  { a: 1, b: 1 },
];

const CSS = `
.step-D5 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  cursor: var(--cursor-default);

  /* Couleur du capuchon des interrupteurs (rouge vif). */
  --d5-cap: #E63946;
  /* Couleur du corps de l'interrupteur (noir profond). */
  --d5-body: #1A1A1A;
}

.step-D5__titre {
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
  animation: step-D5-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D5__sous {
  font-family: var(--body);
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 600;
  text-align: center;
  color: var(--ink);
  opacity: 0.85;
  margin: 0;
  justify-self: center;
}

.step-D5__sous-anim {
  opacity: 0;
  transform: translateY(16px);
  animation: step-D5-slide-up var(--d-slow) var(--ease-out) 0.5s forwards;
}

.step-D5__cards-wrap {
  width: 100%;
  max-width: 1600px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--s-4);
  align-self: center;
  justify-self: center;
}

.step-D5__card {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-3);
  display: grid;
  grid-template-rows: auto auto auto;
  gap: var(--s-2);
  place-items: center;
  opacity: 0;
  transform: translateY(40px) scale(0.9);
  animation: step-D5-pop var(--d-normal) var(--ease-bounce) forwards;
}

.step-D5__card:nth-child(1) { animation-delay: 0.7s; }
.step-D5__card:nth-child(2) { animation-delay: 0.85s; }
.step-D5__card:nth-child(3) { animation-delay: 1.0s; }
.step-D5__card:nth-child(4) { animation-delay: 1.15s; }

.step-D5__card-label {
  font-family: var(--display);
  font-size: clamp(22px, 2vw, 32px);
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--ink);
  text-align: center;
  margin: 0;
}

/* Mini matrice 8x8 partagee. */
.step-D5 .matrice-8x8--mini {
  --matrice-8x8-size: clamp(180px, 16vw, 240px);
}

/* === Zone interrupteurs (cachee sous overlay reveal) === */

.step-D5__leviers-zone {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s-2);
  padding: var(--s-2);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  border-radius: var(--r-md);
  min-height: 130px;
  place-items: center;
}

.step-D5__levier-slot {
  display: grid;
  gap: var(--s-1);
  place-items: center;
}

.step-D5__levier-label {
  font-family: var(--display);
  font-size: clamp(14px, 1.1vw, 18px);
  font-weight: 900;
  color: var(--ink);
  letter-spacing: 0.04em;
}

/* Interrupteur rectangulaire vertical vu du dessus.
   Le capuchon rouge glisse en haut (state=1) ou en bas (state=0). */
.step-D5__interrupteur {
  position: relative;
  width: clamp(36px, 3.4vw, 52px);
  height: clamp(64px, 6vw, 92px);
  background: var(--d5-body);
  border: 3px solid var(--ink);
  border-radius: 6px;
  box-shadow: 4px 4px 0 var(--ink);
  overflow: hidden;
}

.step-D5__interrupteur::before,
.step-D5__interrupteur::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: color-mix(in srgb, var(--paper) 30%, transparent);
}
.step-D5__interrupteur::before { top: 8px; }
.step-D5__interrupteur::after { bottom: 8px; }

.step-D5__capuchon {
  position: absolute;
  left: 50%;
  width: 75%;
  height: 42%;
  background: var(--d5-cap);
  border: 2px solid var(--ink);
  border-radius: 4px;
  box-shadow:
    inset 0 -3px 0 color-mix(in srgb, var(--ink) 35%, transparent),
    inset 0 2px 0 color-mix(in srgb, var(--paper) 30%, transparent);
}
.step-D5__capuchon[data-state="1"] {
  top: 4px;
  transform: translateX(-50%);
}
.step-D5__capuchon[data-state="0"] {
  bottom: 4px;
  transform: translateX(-50%);
}

/* Overlay reveal anti-spoil */
.step-D5__reveal {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ink) 99%, transparent);
  color: var(--paper);
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
  font-family: var(--display);
  font-size: clamp(13px, 1vw, 16px);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  padding: var(--s-2);
  line-height: 1.2;
  transition: opacity 240ms var(--ease-out);
  border: 3px solid var(--ink);
}
.step-D5__reveal:hover {
  background: var(--ink);
}
.step-D5__reveal.is-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Cascade d'apparition des LEDs allumees */
.step-D5 .matrice-8x8__pixel.is-on {
  opacity: 0;
  transform: scale(0.4);
}
.step-D5 .matrice-8x8__pixel.is-on.is-lit {
  animation: step-D5-pixel-light 280ms var(--ease-bounce) forwards;
}
@keyframes step-D5-pixel-light {
  0%   { opacity: 0; transform: scale(0.4); }
  60%  { opacity: 1; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.step-D5__rappel {
  font-family: var(--body);
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 600;
  text-align: center;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  animation: step-D5-fade-in var(--d-slow) var(--ease-out) 1.5s forwards;
}

/* CTA convention (cf. memoire cta_button_convention) */
.step-D5__cta-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3);
}

.step-D5__cta {
  animation: none !important;
  opacity: 0;
  transform: scale(0);
}
.step-D5__cta.is-in {
  animation: step-D5-pop-cta var(--d-normal) var(--ease-bounce) 1.8s forwards !important;
}

@keyframes step-D5-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes step-D5-slide-up {
  to { opacity: 0.85; transform: translateY(0); }
}
@keyframes step-D5-pop {
  0%   { transform: translateY(40px) scale(0.9); opacity: 0; }
  60%  { transform: translateY(-4px)  scale(1.05); opacity: 1; }
  100% { transform: translateY(0)     scale(1);    opacity: 1; }
}
@keyframes step-D5-fade-in {
  to { opacity: 0.75; }
}
@keyframes step-D5-pop-cta {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.1);  opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function buildInterrupteur(state, label) {
  const slot = document.createElement('div');
  slot.className = 'step-D5__levier-slot';

  const inter = document.createElement('div');
  inter.className = 'step-D5__interrupteur';

  const cap = document.createElement('div');
  cap.className = 'step-D5__capuchon';
  cap.dataset.state = String(state);
  inter.appendChild(cap);

  const lbl = document.createElement('div');
  lbl.className = 'step-D5__levier-label';
  lbl.textContent = `${label} = ${state}`;

  slot.appendChild(inter);
  slot.appendChild(lbl);
  return slot;
}

function buildCard(combo, idx) {
  const card = document.createElement('div');
  card.className = 'step-D5__card';
  card.dataset.idx = String(idx);

  // Label A=x B=y
  const label = document.createElement('div');
  label.className = 'step-D5__card-label';
  label.textContent = `A=${combo.a}  B=${combo.b}`;
  card.appendChild(label);

  // Matrice 8x8 mini : seuls les 4 pixels controles s'allument.
  // PIXELS_A → couleur selon combo.a (1 = rose, 0 = jaune)
  // PIXELS_B → couleur selon combo.b (1 = rose, 0 = jaune)
  const matrice = document.createElement('div');
  matrice.className = 'matrice-8x8 matrice-8x8--mini';
  for (let i = 0; i < 64; i++) {
    const pix = document.createElement('div');
    pix.className = 'matrice-8x8__pixel';
    if (PIXELS_A.includes(i)) {
      pix.classList.add('is-on', combo.a === 1 ? 'is-on-rose' : 'is-on-jaune');
    } else if (PIXELS_B.includes(i)) {
      pix.classList.add('is-on', combo.b === 1 ? 'is-on-rose' : 'is-on-jaune');
    }
    matrice.appendChild(pix);
  }
  card.appendChild(matrice);

  // Zone interrupteurs : 2 leviers verticaux + overlay reveal anti-spoil
  const leviersZone = document.createElement('div');
  leviersZone.className = 'step-D5__leviers-zone';
  leviersZone.appendChild(buildInterrupteur(combo.a, 'A'));
  leviersZone.appendChild(buildInterrupteur(combo.b, 'B'));

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'step-D5__reveal';
  reveal.textContent = 'voir les interrupteurs';
  reveal.setAttribute('aria-label', 'Reveler la combinaison d\'interrupteurs');
  leviersZone.appendChild(reveal);

  const onReveal = () => reveal.classList.add('is-hidden');
  reveal.addEventListener('click', onReveal);
  handlers.push([reveal, 'click', onReveal]);

  card.appendChild(leviersZone);

  return card;
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D5';

  // Titre
  const titre = document.createElement('h1');
  titre.className = 'step-D5__titre';
  titre.textContent = '2 INTERRUPTEURS = 4 CODES';
  wrap.appendChild(titre);

  // Sous-titre court
  const sous = document.createElement('p');
  sous.className = 'step-D5__sous step-D5__sous-anim';
  sous.textContent = 'essaie chaque combinaison sur ta capsule.';
  wrap.appendChild(sous);

  // Cards : 4 combinaisons matrice
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'step-D5__cards-wrap';
  const cards = [];
  COMBINAISONS.forEach((combo, idx) => {
    const card = buildCard(combo, idx);
    cardsWrap.appendChild(card);
    cards.push(card);
  });
  wrap.appendChild(cardsWrap);

  // Rappel
  const rappel = document.createElement('p');
  rappel.className = 'step-D5__rappel';
  rappel.textContent = 'Regarde ta capsule, trouve les 4 codes.';
  wrap.appendChild(rappel);

  // CTA convention (cf. cta_button_convention memoire)
  const ctaArea = document.createElement('div');
  ctaArea.className = 'step-D5__cta-area';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D5__cta';
  cta.textContent = 'ON FAIT UN MINI-JEU';
  ctaArea.appendChild(cta);
  wrap.appendChild(ctaArea);

  // Cascade LED dans chaque card apres son pop (en parallele).
  const CARD_BASE_DELAYS = [700, 850, 1000, 1150]; // ms
  const POP_DURATION = 350;
  const STEP = 60;
  cards.forEach((card, cardIdx) => {
    const startAt = CARD_BASE_DELAYS[cardIdx] + POP_DURATION;
    const litPixels = card.querySelectorAll('.matrice-8x8__pixel.is-on');
    litPixels.forEach((pixel, i) => {
      const t = setTimeout(() => pixel.classList.add('is-lit'), startAt + i * STEP);
      timers.push(t);
    });
  });

  // Reveal CTA
  const ctaT = setTimeout(() => cta.classList.add('is-in'), 50);
  timers.push(ctaT);

  // Listeners
  const onCtaClick = () => navAPI.next();
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  return wrap;
}

export default {
  id: 'D5',
  phase: 'D',
  title: '2 interrupteurs = 4 codes',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    void savedState;
  },

  exit() {
    handlers.forEach(([target, event, fn]) => target.removeEventListener(event, fn));
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
    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    styleNode = null;
  },

  serialize() {
    return { viewed: true };
  },

  isComplete() {
    return true;
  },

  replay() {
    const wrap = domNodes[0];
    if (!wrap) return;
    const elems = wrap.querySelectorAll(
      '.step-D5__titre, .step-D5__sous, .step-D5__card, .step-D5__rappel, .step-D5__cta'
    );
    elems.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  },
};

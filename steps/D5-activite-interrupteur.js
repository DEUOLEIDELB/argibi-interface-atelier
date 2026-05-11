// D5-activite-interrupteur.js — 2 interrupteurs = 4 portes (table de verite).
// migration vers composants partages.
//   - .matrice-8x8.matrice-8x8--mini (4x)
//   - .bouton-bascule.bouton-bascule--passif (visuel etat A/B)
//   - .chip (decimal label)
//   - .tuko-mascotte[data-pose="pedagogique" data-position="inline"]
//   - .card-clickable / .titre-hero / .sous-titre / .cta-primary
// Animations apparition + interaction (focus 1-4) + raccourcis clavier.
// State : { viewed: true }.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;
let tukoCountInterval = null;

const STYLE_ID = 'step-D5-style';

// Configuration des 4 combinaisons.
// Pattern matrice : 00 = tout eteint, 01 = cyan moitie droite,
// 10 = jaune moitie gauche, 11 = rose plein.
const COMBINAISONS = [
  { a: 0, b: 0, decimal: 0, color: 'off',   pattern: 'empty' },
  { a: 0, b: 1, decimal: 1, color: 'cyan',  pattern: 'right-half' },
  { a: 1, b: 0, decimal: 2, color: 'jaune', pattern: 'left-half' },
  { a: 1, b: 1, decimal: 3, color: 'rose',  pattern: 'full' },
];

const CSS = `
.step-D5 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-5) var(--s-6) var(--s-3);
  gap: var(--s-3);
  cursor: var(--cursor-default);
}

.step-D5__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  text-align: center;
}

.step-D5__titre {
  opacity: 0;
  transform: scale(0);
  animation: step-D5-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D5__sous {
  opacity: 0;
  transform: translateY(16px);
  animation: step-D5-slide-up var(--d-slow) var(--ease-out) 0.5s forwards;
}

.step-D5__cards-wrap {
  position: relative;
  width: 100%;
  max-width: 1600px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--s-3);
  align-self: center;
  padding: var(--s-3) var(--s-4) var(--s-4);
}

.step-D5__cards-wrap::before {
  content: '';
  position: absolute;
  left: var(--s-5);
  right: var(--s-5);
  bottom: var(--s-1);
  border-top: 2px dashed var(--ink);
  opacity: 0.25;
  z-index: 0;
}

.step-D5__card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-2);
  justify-items: center;
  opacity: 0;
  transform: translateY(40px) scale(0.9);
  animation: step-D5-pop var(--d-normal) var(--ease-bounce) forwards;
}

.step-D5__card:nth-child(1) { animation-delay: 1.0s; }
.step-D5__card:nth-child(2) { animation-delay: 1.15s; }
.step-D5__card:nth-child(3) { animation-delay: 1.3s; }
.step-D5__card:nth-child(4) { animation-delay: 1.45s; }

.step-D5__card-label {
  font-family: var(--mono);
  font-size: var(--t-body);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-align: center;
  color: var(--ink);
}

/* Bouton-bascule passif compactes : 2 cote a cote (A puis B). */
.step-D5__leviers {
  display: flex;
  gap: var(--s-2);
  align-items: center;
  justify-content: center;
}

.step-D5__levier-label {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0.7;
  display: inline-block;
  margin-right: 4px;
}

.step-D5__rappel {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  text-align: center;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0;
  animation: step-D5-fade-in var(--d-slow) var(--ease-out) 1.7s forwards;
}

.step-D5__bottom {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  width: 100%;
  gap: var(--s-4);
  padding-bottom: var(--s-2);
}

.step-D5__tuko-wrap {
  justify-self: start;
  opacity: 0;
  transform: translateX(-120%);
  animation: step-D5-slide-in-tuko var(--d-slow) var(--ease-out) 1.8s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}

.step-D5__tuko-fingers {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  color: var(--accent-4);
  display: inline-block;
}

.step-D5__tuko-fingers.is-counting {
  animation: step-D5-tuko-count 0.4s ease-out;
}

.step-D5__cta {
  justify-self: center;
  opacity: 0;
  transform: scale(0);
  animation: step-D5-pop-cta var(--d-normal) var(--ease-bounce) 2.0s forwards;
}

.step-D5__spacer {
  width: 160px;
}

@keyframes step-D5-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

@keyframes step-D5-slide-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes step-D5-pop {
  0%   { transform: translateY(40px) scale(0.9); opacity: 0; }
  60%  { transform: translateY(-4px) scale(1.05); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes step-D5-fade-in {
  to { opacity: 0.75; }
}

@keyframes step-D5-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}

@keyframes step-D5-pop-cta {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

@keyframes step-D5-tuko-count {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
`;

function buildPattern(name) {
  const s = new Set();
  switch (name) {
    case 'empty':      return s;
    case 'right-half':
      for (let r = 0; r < 8; r++) for (let c = 4; c < 8; c++) s.add(r * 8 + c);
      return s;
    case 'left-half':
      for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) s.add(r * 8 + c);
      return s;
    case 'full':
      for (let i = 0; i < 64; i++) s.add(i);
      return s;
    default:           return s;
  }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function buildBascule(state) {
  // .bouton-bascule.--passif visuel : is-left = 0, is-right = 1.
  const bascule = document.createElement('label');
  bascule.className = `bouton-bascule bouton-bascule--passif ${state === 1 ? 'is-right' : 'is-left'}`;

  const markL = document.createElement('span');
  markL.className = 'bouton-bascule__mark bouton-bascule__mark--left';
  markL.textContent = '0';

  const pad = document.createElement('span');
  pad.className = 'bouton-bascule__pad';

  const markR = document.createElement('span');
  markR.className = 'bouton-bascule__mark bouton-bascule__mark--right';
  markR.textContent = '1';

  bascule.appendChild(markL);
  bascule.appendChild(pad);
  bascule.appendChild(markR);
  return bascule;
}

function buildCard(combo, idx) {
  const card = document.createElement('div');
  card.className = 'step-D5__card card-clickable';
  card.setAttribute('data-combo', `${combo.a}${combo.b}`);
  card.setAttribute('data-idx', String(idx));
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  // Label A=x B=y
  const label = document.createElement('div');
  label.className = 'step-D5__card-label';
  label.textContent = `A=${combo.a}  B=${combo.b}`;
  card.appendChild(label);

  // Chip decimal (composant partage)
  const dec = document.createElement('span');
  dec.className = 'chip';
  dec.style.setProperty('--rot', '0deg');
  dec.textContent = `= ${combo.decimal}`;
  card.appendChild(dec);

  // Matrice 8x8 mini (composant partage)
  const matrice = document.createElement('div');
  matrice.className = 'matrice-8x8 matrice-8x8--mini is-respirante';
  const pattern = buildPattern(combo.pattern);
  for (let i = 0; i < 64; i++) {
    const pix = document.createElement('div');
    pix.className = 'matrice-8x8__pixel';
    if (pattern.has(i) && combo.color !== 'off') {
      pix.classList.add(`is-on-${combo.color}`);
    }
    matrice.appendChild(pix);
  }
  card.appendChild(matrice);

  // Leviers (2 bascules passives cote a cote)
  const leviers = document.createElement('div');
  leviers.className = 'step-D5__leviers';

  const wrapA = document.createElement('div');
  const lblA = document.createElement('span');
  lblA.className = 'step-D5__levier-label';
  lblA.textContent = 'A';
  wrapA.appendChild(lblA);
  wrapA.appendChild(buildBascule(combo.a));

  const wrapB = document.createElement('div');
  const lblB = document.createElement('span');
  lblB.className = 'step-D5__levier-label';
  lblB.textContent = 'B';
  wrapB.appendChild(lblB);
  wrapB.appendChild(buildBascule(combo.b));

  leviers.appendChild(wrapA);
  leviers.appendChild(wrapB);
  card.appendChild(leviers);

  return card;
}

function focusCard(card, allCards) {
  if (!card) return;
  allCards.forEach(c => c.classList.remove('is-active'));
  card.classList.add('is-active');
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D5';

  // Heading
  const heading = document.createElement('div');
  heading.className = 'step-D5__heading';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-D5__titre';
  titre.textContent = '2 INTERRUPTEURS = 4 PORTES';

  const sous = document.createElement('p');
  sous.className = 'sous-titre step-D5__sous';
  sous.textContent = 'essaie chaque combinaison sur ta capsule';

  heading.appendChild(titre);
  heading.appendChild(sous);
  wrap.appendChild(heading);

  // Cards wrap
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'step-D5__cards-wrap';

  const cards = [];
  COMBINAISONS.forEach((combo, idx) => {
    const card = buildCard(combo, idx);
    cardsWrap.appendChild(card);
    cards.push(card);

    const onCardClick = () => focusCard(card, cards);
    card.addEventListener('click', onCardClick);
    handlers.push([card, 'click', onCardClick]);
  });
  wrap.appendChild(cardsWrap);

  // Rappel
  const rappel = document.createElement('p');
  rappel.className = 'step-D5__rappel';
  rappel.textContent = 'regarde ta capsule · trouve les 4 codes';
  wrap.appendChild(rappel);

  // Bottom row
  const bottom = document.createElement('div');
  bottom.className = 'step-D5__bottom';

  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D5__tuko-wrap';

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.setAttribute('data-pose', 'pedagogique');
  tuko.setAttribute('data-position', 'inline');
  tukoWrap.appendChild(tuko);

  const tukoFingers = document.createElement('span');
  tukoFingers.className = 'step-D5__tuko-fingers';
  tukoFingers.textContent = '1';
  tukoWrap.appendChild(tukoFingers);

  bottom.appendChild(tukoWrap);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D5__cta';
  cta.textContent = '▶ ON FAIT UN MINI-JEU';
  bottom.appendChild(cta);

  const spacer = document.createElement('div');
  spacer.className = 'step-D5__spacer';
  bottom.appendChild(spacer);

  wrap.appendChild(bottom);

  // Listeners
  const onCtaClick = () => navAPI.next();
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  // Raccourcis 1-4 pour focus card
  const onKey = (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3 };
    const idx = map[e.key];
    if (idx !== undefined) {
      e.preventDefault();
      focusCard(cards[idx], cards);
    }
  };
  document.addEventListener('keydown', onKey);
  handlers.push([document, 'keydown', onKey]);

  // Tuko qui compte 1-2-3-4 toutes les ~10s
  let count = 1;
  tukoCountInterval = setInterval(() => {
    count = (count % 4) + 1;
    tukoFingers.textContent = String(count);
    tukoFingers.classList.remove('is-counting');
    void tukoFingers.offsetWidth;
    tukoFingers.classList.add('is-counting');
  }, 10000);

  return wrap;
}

export default {
  id: 'D5',
  phase: 'D',
  title: '2 interrupteurs = 4 portes',
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

    if (tukoCountInterval) {
      clearInterval(tukoCountInterval);
      tukoCountInterval = null;
    }

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
      '.step-D5__titre, .step-D5__sous, .step-D5__card, .step-D5__rappel, .step-D5__tuko-wrap, .step-D5__cta'
    );
    elems.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  },
};

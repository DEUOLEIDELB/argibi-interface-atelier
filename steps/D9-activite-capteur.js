// D9-activite-capteur.js : "LE CAPTEUR - CONDUCTEUR OU ISOLANT" (page mag 18).
// Fiche : doc interne.
// Composants partages :
//   - `.matrice-8x8--mini` + variantes `.is-on-cyan` (composant 5.1)
//   - `.tuko-mascotte` (placeholder mascotte)
//   - `.cta-primary`
//   - `spawnEtincelles` cyan depuis `core/effects.js` (composant 5.7)
//
// pour les etincelles.  utilise le helper `spawnEtincelles` partage.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { spawnEtincelles } from '../core/effects.js';

const STYLE_ID = 'step-D9-styles';

const STYLE_TEXT = `
.step-D9 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6) var(--s-4);
  pointer-events: none;
}
.step-D9__header {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--s-1);
}
.step-D9__titre {
  font-family: var(--display);
  font-size: var(--t-h1);
  font-weight: 900;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: scale(0);
}
.step-D9__titre.is-in {
  animation: d9-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d9-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D9__sous {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(16px);
}
.step-D9__sous.is-in {
  animation: d9-fade-up var(--d-slow) var(--ease-out) 350ms forwards;
}
@keyframes d9-fade-up {
  to { opacity: 1; transform: translateY(0); }
}
.step-D9__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-5);
  align-items: stretch;
  pointer-events: auto;
}
.step-D9__card {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-4);
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-3);
  position: relative;
  opacity: 0;
  cursor: var(--cursor-pointer);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.step-D9__card--gauche.is-in {
  animation: d9-slide-in-left var(--d-slow) var(--ease-out) 600ms forwards;
}
.step-D9__card--droite.is-in {
  animation: d9-slide-in-right var(--d-slow) var(--ease-out) 750ms forwards;
}
@keyframes d9-slide-in-left {
  from { opacity: 0; transform: translateX(-32px) scale(0.92); }
  to   { opacity: 1; transform: translateX(0)    scale(1); }
}
@keyframes d9-slide-in-right {
  from { opacity: 0; transform: translateX(32px)  scale(0.92); }
  to   { opacity: 1; transform: translateX(0)    scale(1); }
}
.step-D9__card.is-focus {
  transform: scale(1.04);
  box-shadow: var(--shadow-xl), 0 0 0 4px var(--accent-1);
  z-index: 3;
}
.step-D9__card-titre {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-align: center;
  color: var(--ink);
  margin: 0;
}
.step-D9__card-sous {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  text-transform: lowercase;
  text-align: center;
  color: var(--ink);
  opacity: 0.75;
  margin: 0;
}
.step-D9__demo {
  position: relative;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-md);
  min-height: 240px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3);
  overflow: hidden;
}
.step-D9__demo-tuko {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0.7;
  background: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  padding: var(--s-1) var(--s-2);
  white-space: nowrap;
  animation: d9-tuko-approche 4s ease-in-out infinite;
}
.step-D9__demo-arrow {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  color: var(--ink);
  opacity: 0.4;
  text-align: center;
}
.step-D9__matrix-anchor {
  position: relative;
  display: grid;
  place-items: center;
}
.step-D9__bigbit {
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  line-height: 1;
  text-align: center;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 0;
}
.step-D9__card--gauche .step-D9__bigbit { color: var(--accent-2); }
.step-D9__exemples {
  display: grid;
  gap: var(--s-1);
  margin: 0;
  padding: 0;
  list-style: none;
}
.step-D9__exemple {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 700;
  padding: 4px var(--s-2);
  border-radius: var(--r-sm);
  opacity: 0.55;
  transition: opacity var(--d-fast) var(--ease-out),
              background var(--d-fast) var(--ease-out),
              color var(--d-fast) var(--ease-out);
}
.step-D9__exemple.is-flash {
  opacity: 1;
  background: var(--accent-3);
}
.step-D9__card--droite .step-D9__exemple.is-flash {
  background: var(--bg-2);
}
.step-D9__exemple-ico {
  font-family: var(--mono);
  font-size: var(--t-h2);
  font-weight: 700;
}
.step-D9__card--gauche .step-D9__exemple-ico { color: var(--accent-2); }
.step-D9__card--droite .step-D9__exemple-ico { opacity: 0.55; }
.step-D9__rappel {
  text-align: center;
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.12em;
  color: var(--ink);
  opacity: 0;
  margin: 0;
}
.step-D9__rappel.is-in {
  animation: d9-fade-up var(--d-slow) var(--ease-out) 1300ms forwards;
}
.step-D9__bottom {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: end;
  gap: var(--s-4);
  pointer-events: auto;
}
.step-D9__cta {
  justify-self: center;
  align-self: end;
  opacity: 0;
  transform: scale(0);
}
.step-D9__cta.is-in {
  animation: d9-pop 350ms var(--ease-bounce) 1500ms forwards,
             cta-idle-pulse 2s var(--ease-out) 1900ms infinite;
}
@keyframes d9-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes d9-tuko-approche {
  0%, 25%  { transform: translateX(0);    }
  50%      { transform: translateX(24px); }
  70%      { transform: translateX(24px); }
  100%     { transform: translateX(0);    }
}
`;

// Mini-pattern smiley pour la matrice 8x8 (16 pixels allumes).
// Coordonnees (row, col) sur grille 8x8 indexee 0..7.
const SMILEY_INDICES = (() => {
  const pairs = [
    [2, 2], [2, 5],          // yeux
    [4, 1], [4, 6],          // joues
    [5, 2], [5, 3], [5, 4], [5, 5], // bouche
  ];
  return pairs.map(([r, c]) => r * 8 + c);
})();

const CARDS = [
  {
    side: 'gauche',
    key: 'conducteur',
    titre: 'CONDUCTEUR',
    sous: '= laisse passer',
    bigbit: '1',
    tukoLabel: '[ tuko · doigt ]',
    exemples: [
      { ico: '⚡', label: 'doigt' },
      { ico: '⚡', label: 'piece de monnaie' },
      { ico: '⚡', label: 'trombone' },
    ],
  },
  {
    side: 'droite',
    key: 'isolant',
    titre: 'ISOLANT',
    sous: '= bloque',
    bigbit: '0',
    tukoLabel: '[ tuko · gomme ]',
    exemples: [
      { ico: '⊘', label: 'gomme' },
      { ico: '⊘', label: 'stylo' },
      { ico: '⊘', label: 'pull' },
    ],
  },
];

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];

let containerRef = null;
let navAPIRef = null;
let savedStateRef = null;
let cardEls = [];
let matrixCells = { gauche: [], droite: [] };
let exempleEls = { gauche: [], droite: [] };
let matrixAnchorEls = { gauche: null, droite: null };
let focusedSide = null;
let cardsRevealed = [false, false];
let stopFocusSparks = null;

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

function buildMiniMatrix() {
  const matrix = document.createElement('div');
  matrix.className = 'matrice-8x8 matrice-8x8--mini';
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    cell.className = 'matrice-8x8__pixel';
    matrix.appendChild(cell);
    cells.push(cell);
  }
  return { matrix, cells };
}

function setMatrixOn(cells, side) {
  // side='gauche' = conducteur => cyan ; side='droite' = isolant => off (jamais allume).
  if (side !== 'gauche') return;
  SMILEY_INDICES.forEach((idx) => {
    cells[idx].classList.add('is-on-cyan');
  });
}
function setMatrixOff(cells) {
  cells.forEach((c) => c.classList.remove('is-on-cyan'));
}

function buildCard(def) {
  const card = document.createElement('article');
  card.className = `step-D9__card step-D9__card--${def.side}`;
  card.dataset.side = def.side;
  card.tabIndex = 0;

  const titre = document.createElement('h2');
  titre.className = 'step-D9__card-titre';
  titre.textContent = def.titre;
  card.appendChild(titre);

  const sous = document.createElement('p');
  sous.className = 'step-D9__card-sous';
  sous.textContent = def.sous;
  card.appendChild(sous);

  const demo = document.createElement('div');
  demo.className = 'step-D9__demo';

  const tuko = document.createElement('div');
  tuko.className = 'step-D9__demo-tuko';
  tuko.textContent = def.tukoLabel;
  demo.appendChild(tuko);

  const arrow = document.createElement('span');
  arrow.className = 'step-D9__demo-arrow';
  arrow.textContent = '▶';
  demo.appendChild(arrow);

  const matrixAnchor = document.createElement('div');
  matrixAnchor.className = 'step-D9__matrix-anchor';
  const built = buildMiniMatrix();
  matrixAnchor.appendChild(built.matrix);
  demo.appendChild(matrixAnchor);

  card.appendChild(demo);

  const bigbit = document.createElement('p');
  bigbit.className = 'step-D9__bigbit';
  bigbit.textContent = def.bigbit;
  card.appendChild(bigbit);

  const list = document.createElement('ul');
  list.className = 'step-D9__exemples';
  const exempleNodes = def.exemples.map((ex) => {
    const li = document.createElement('li');
    li.className = 'step-D9__exemple';
    const ico = document.createElement('span');
    ico.className = 'step-D9__exemple-ico';
    ico.textContent = ex.ico;
    const lbl = document.createElement('span');
    lbl.textContent = ex.label;
    li.appendChild(ico);
    li.appendChild(lbl);
    list.appendChild(li);
    return li;
  });
  card.appendChild(list);

  matrixCells[def.side] = built.cells;
  matrixAnchorEls[def.side] = matrixAnchor;
  exempleEls[def.side] = exempleNodes;

  return card;
}

function setFocus(side) {
  // Toggle si meme side, sinon switch.
  const next = (focusedSide === side) ? null : side;
  focusedSide = next;
  cardEls.forEach((el) => {
    el.classList.toggle('is-focus', el.dataset.side === next);
  });
  // Etincelles continues autour de la card focusee (uniquement si CONDUCTEUR).
  if (stopFocusSparks) { stopFocusSparks(); stopFocusSparks = null; }
  if (next === 'gauche' && matrixAnchorEls.gauche) {
    stopFocusSparks = spawnEtincelles(matrixAnchorEls.gauche, {
      densite: 'normale',
      duree: 0,
    });
  }
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D9';

  const header = document.createElement('header');
  header.className = 'step-D9__header';
  const titre = document.createElement('h1');
  titre.className = 'step-D9__titre';
  titre.textContent = 'LE CAPTEUR';
  header.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D9__sous';
  sous.textContent = 'approche, ne touche pas';
  header.appendChild(sous);
  wrap.appendChild(header);

  const cardsRow = document.createElement('div');
  cardsRow.className = 'step-D9__cards';
  cardEls = CARDS.map((def) => {
    const card = buildCard(def);
    cardsRow.appendChild(card);
    return card;
  });
  wrap.appendChild(cardsRow);

  const rappel = document.createElement('p');
  rappel.className = 'step-D9__rappel';
  rappel.textContent = 'regarde ta capsule · essaie 4 objets differents';
  wrap.appendChild(rappel);

  const bottom = document.createElement('div');
  bottom.className = 'step-D9__bottom';
  const tukoMain = document.createElement('div');
  tukoMain.className = 'tuko-mascotte';
  tukoMain.dataset.pose = 'pedagogique';
  tukoMain.dataset.position = 'inline';
  bottom.appendChild(tukoMain);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D9__cta';
  cta.textContent = '▶ ON FAIT UN MINI-JEU';
  cta.disabled = true;
  bottom.appendChild(cta);

  bottom.appendChild(document.createElement('span'));
  wrap.appendChild(bottom);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Entrance.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    cardEls.forEach((c) => c.classList.add('is-in'));
    rappel.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // Apres slide-in des cards, marque cardsRevealed et persiste.
  const tCardsRevealed = setTimeout(() => {
    cardsRevealed = [true, true];
    navAPI.saveState({ steps: { D9: { cardsRevealed: [...cardsRevealed] } } });
  }, 1200);
  timers.push(tCardsRevealed);

  // CTA enabled apres entrance.
  const tEnable = setTimeout(() => { cta.disabled = false; }, 1800);
  timers.push(tEnable);

  // Mark complete apres affichage.
  const tComplete = setTimeout(() => {
    navAPI.markComplete();
  }, 2000);
  timers.push(tComplete);

  // Boucle de demo : a chaque cycle (4s), au pic du contact, allume la matrice
  // CONDUCTEUR + spawnEtincelles cyan sur le matrix-anchor. La carte ISOLANT
  // reste statique (jamais d'etincelles, jamais d'allumage).
  const runDemoCycle = () => {
    setMatrixOn(matrixCells.gauche, 'gauche');
    spawnEtincelles(matrixAnchorEls.gauche, {
      densite: 'normale',
      duree: 800,
    });
    const tOff = setTimeout(() => setMatrixOff(matrixCells.gauche), 1000);
    timers.push(tOff);
  };
  // Premier tir + intervalle 4s aligne sur l'anim Tuko approche.
  const tFirst = setTimeout(runDemoCycle, 2200);
  timers.push(tFirst);
  const demoInterval = setInterval(runDemoCycle, 4000);
  intervals.push(demoInterval);

  // Liste d'exemples qui clignotent a tour de role (synchronise gauche/droite).
  let flashIdx = 0;
  const flashTick = () => {
    exempleEls.gauche.forEach((el, i) => el.classList.toggle('is-flash', i === flashIdx));
    exempleEls.droite.forEach((el, i) => el.classList.toggle('is-flash', i === flashIdx));
    flashIdx = (flashIdx + 1) % CARDS[0].exemples.length;
  };
  flashTick();
  const flashInterval = setInterval(flashTick, 1300);
  intervals.push(flashInterval);

  // Focus card via clic ou raccourcis 1 / 2.
  cardEls.forEach((cardEl) => {
    const onClick = () => {
      play('pop');
      setFocus(cardEl.dataset.side);
    };
    cardEl.addEventListener('click', onClick);
    handlers.push([cardEl, 'click', onClick]);
  });

  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if (e.key === '1') { e.preventDefault(); play('pop'); setFocus('gauche'); }
    else if (e.key === '2') { e.preventDefault(); play('pop'); setFocus('droite'); }
  };
  window.addEventListener('keydown', onKey);
  handlers.push([window, 'keydown', onKey]);

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
  id: 'D9',
  phase: 'D',
  title: 'Le capteur (conducteur ou isolant)',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    cardsRevealed = Array.isArray(savedState?.cardsRevealed)
      ? [...savedState.cardsRevealed]
      : [false, false];
    focusedSide = null;

    scene = new Container();
    scene.label = 'step-D9';
    container.addChild(scene);

    injectStyle();
    build(navAPI);
  },

  exit() {
    if (stopFocusSparks) { stopFocusSparks(); stopFocusSparks = null; }
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
    cardEls = [];
    matrixCells = { gauche: [], droite: [] };
    exempleEls = { gauche: [], droite: [] };
    matrixAnchorEls = { gauche: null, droite: null };
    focusedSide = null;
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    return { cardsRevealed: [...cardsRevealed] };
  },

  isComplete() {
    return cardsRevealed.every(Boolean);
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

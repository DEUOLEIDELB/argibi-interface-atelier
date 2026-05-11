// D3-vraie-vie-collectif.js : "DANS LA VRAIE VIE", intelligence collective.
// utilise .scenario-card + .scenario-card-grid + .scenario-card__options(--3)
// + .scenario-card__option (avec .is-active) + .scenario-card.is-decided partages.
// Zero duplication locale du composant scenario-card.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D3-styles';

// CSS local : uniquement layout page + overrides specifiques D3.
// .scenario-card et tout son sous-arbre sont fournis par components.css partage.
const STYLE_TEXT = `
.step-D3 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: var(--s-4) var(--s-5);
  gap: var(--s-3);
  pointer-events: none;
}
.step-D3__title-block {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}
.step-D3__titre {
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
.step-D3__titre.is-in {
  animation: d3-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d3-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D3__sous {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(20px);
}
.step-D3__sous.is-in {
  animation: d3-fade-up 400ms var(--ease-out) 250ms forwards;
}
@keyframes d3-fade-up {
  to { opacity: 1; transform: translateY(0); }
}
.step-D3__grid {
  pointer-events: auto;
  align-self: stretch;
}
/* Cascade d'entree des 4 cards (composant partage .scenario-card.is-in) */
.step-D3__grid .scenario-card:nth-child(1).is-in { animation-delay: 600ms; }
.step-D3__grid .scenario-card:nth-child(2).is-in { animation-delay: 800ms; }
.step-D3__grid .scenario-card:nth-child(3).is-in { animation-delay: 1000ms; }
.step-D3__grid .scenario-card:nth-child(4).is-in { animation-delay: 1200ms; }
/* Option : idle pulse quand la card n'est pas votee + bars graph miniatures.
   Le composant partage .scenario-card__option fournit deja base + hover + is-active. */
.step-D3__option-content {
  display: grid;
  gap: 4px;
  place-items: center;
}
.scenario-card:not(.is-decided) .scenario-card__option {
  animation: d3-option-pulse 2s ease-in-out infinite;
}
@keyframes d3-option-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}
.scenario-card__option.is-dimmed {
  opacity: 0.55;
}
.step-D3__option__bars {
  display: inline-flex;
  align-items: end;
  gap: 3px;
  height: 16px;
}
.step-D3__option__bar {
  width: 5px;
  background: var(--ink);
  border-radius: 1px;
}
.step-D3__option__bar--short { height: 10px; }
.step-D3__option__bar--wide  { height: 14px; width: 16px; }
.scenario-card__option:hover .step-D3__option__bars {
  animation: d3-option-demo 800ms ease-out 1;
}
@keyframes d3-option-demo {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
/* Mini-Tuko qui sort d'une card sur vote long/double, va vers l'image et revient. */
.step-D3__mini-tuko {
  position: absolute;
  bottom: 80px;
  left: 50%;
  width: 36px;
  height: 36px;
  background: var(--accent-4);
  border: var(--border-thin);
  border-radius: var(--r-pill);
  pointer-events: none;
  transform: translateX(-50%);
  animation: d3-mini-go 1100ms ease-in-out forwards;
}
@keyframes d3-mini-go {
  0%   { transform: translateX(-50%) translateY(0) scale(0.6); opacity: 0; }
  20%  { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
  50%  { transform: translateX(-50%) translateY(-50px) scale(1); opacity: 1; }
  80%  { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0) scale(0.6); opacity: 0; }
}
/* Onde de validation quand 4/4 cards sont votees. */
.step-D3__grid.is-wave .scenario-card {
  animation: d3-wave 500ms ease-out 1;
}
.step-D3__grid.is-wave .scenario-card:nth-child(1) { animation-delay: 0ms; }
.step-D3__grid.is-wave .scenario-card:nth-child(2) { animation-delay: 120ms; }
.step-D3__grid.is-wave .scenario-card:nth-child(3) { animation-delay: 240ms; }
.step-D3__grid.is-wave .scenario-card:nth-child(4) { animation-delay: 360ms; }
@keyframes d3-wave {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}
/* Bottom row : Tuko mascotte partage + CTA primaire. */
.step-D3__bottom {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: end;
  gap: var(--s-3);
  pointer-events: auto;
}
.step-D3 .tuko-mascotte[data-position="inline"] {
  --tuko-mascotte-size: 140px;
  opacity: 0;
  transform: translateX(-100px);
}
.step-D3 .tuko-mascotte[data-position="inline"].is-in {
  animation: d3-tuko-in var(--d-slow) var(--ease-out) 1500ms forwards;
}
@keyframes d3-tuko-in {
  to { opacity: 1; transform: translateX(0); }
}
/* Reactions discretes de Tuko principal selon tendance des votes. */
.step-D3 .tuko-mascotte.is-reacting--court {
  animation: d3-tuko-claque 600ms ease-in-out 1;
}
.step-D3 .tuko-mascotte.is-reacting--long {
  animation: d3-tuko-watch 700ms ease-in-out 1;
}
.step-D3 .tuko-mascotte.is-reacting--double {
  animation: d3-tuko-double 600ms ease-in-out 1;
}
@keyframes d3-tuko-claque {
  0%, 100% { transform: rotate(0); }
  35%      { transform: rotate(-4deg); }
  65%      { transform: rotate(4deg); }
}
@keyframes d3-tuko-watch {
  0%, 100% { transform: rotate(0); }
  50%      { transform: rotate(-3deg) translateY(-2px); }
}
@keyframes d3-tuko-double {
  0%, 100% { transform: scale(1); }
  25%      { transform: scale(0.96); }
  50%      { transform: scale(1); }
  75%      { transform: scale(0.96); }
}
.step-D3__cta {
  justify-self: center;
  align-self: end;
  opacity: 0;
  transform: scale(0);
  animation: none;
}
.step-D3__cta.is-in {
  animation: d3-cta-pop 350ms var(--ease-bounce) 1700ms forwards,
             cta-idle-pulse 2s var(--ease-out) 2100ms infinite;
}
@keyframes d3-cta-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D3__cta.is-disabled {
  opacity: 0.5;
  cursor: var(--cursor-not-allowed);
}
`;

const SCENARIOS = [
  { id: 1, title: 'TU SONNES POUR DIRE COUCOU',  imageHint: "sonnette d'ami" },
  { id: 2, title: 'TU ALLUMES TA CHAMBRE',        imageHint: 'interrupteur de chambre' },
  { id: 3, title: 'TU ALERTES EN URGENCE',        imageHint: 'klaxon de voiture' },
  { id: 4, title: 'TU VALIDES DANS UN JEU',       imageHint: 'bouton OK manette' },
];

const KIND_BARS = {
  court:  () => [{ cls: 'short' }],
  long:   () => [{ cls: 'wide' }],
  double: () => [{ cls: 'short' }, { cls: 'short' }],
};

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];

let containerRef = null;
let navAPIRef = null;
let savedStateRef = null;

let scenariosState = {}; // id -> 'court'|'long'|'double'
let totalVotes = 0;
let cardsEls = [];
let optionsByCard = {}; // id -> { court, long, double }
let tukoMainEl = null;
let ctaEl = null;
let gridEl = null;

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

function pushTimer(t) { timers.push(t); return t; }

function buildOptionBars(kind) {
  const wrap = document.createElement('span');
  wrap.className = 'step-D3__option__bars';
  KIND_BARS[kind]().forEach((b) => {
    const bar = document.createElement('span');
    bar.className = `step-D3__option__bar step-D3__option__bar--${b.cls}`;
    wrap.appendChild(bar);
  });
  return wrap;
}

function spawnMiniTuko(cardEl) {
  if (!cardEl) return;
  const mini = document.createElement('span');
  mini.className = 'step-D3__mini-tuko';
  cardEl.appendChild(mini);
  pushTimer(setTimeout(() => mini.remove(), 1200));
}

function reactTukoToTrend() {
  if (!tukoMainEl) return;
  if (totalVotes < 3) return;
  const counts = { court: 0, long: 0, double: 0 };
  Object.values(scenariosState).forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
  let top = null;
  let topCount = 0;
  for (const [k, c] of Object.entries(counts)) {
    if (c > topCount) { topCount = c; top = k; }
  }
  if (!top) return;
  if (totalVotes % 3 !== 0) return;
  tukoMainEl.classList.remove('is-reacting--court', 'is-reacting--long', 'is-reacting--double');
  // force reflow
  void tukoMainEl.offsetWidth;
  tukoMainEl.classList.add(`is-reacting--${top}`);
  pushTimer(setTimeout(() => {
    tukoMainEl?.classList.remove(`is-reacting--${top}`);
  }, 800));
}

function maybeWaveAndComplete() {
  if (Object.keys(scenariosState).length === SCENARIOS.length) {
    gridEl?.classList.add('is-wave');
    pushTimer(setTimeout(() => gridEl?.classList.remove('is-wave'), 1200));
  }
}

function persistState() {
  if (!navAPIRef) return;
  // Etat : scenarios = {1..4: 'court'|'long'|'double'}.
  navAPIRef.saveState({ steps: { D3: { scenarios: { ...scenariosState } } } });
}

function onVote(scenarioId, kind, cardEl) {
  const previous = scenariosState[scenarioId];
  scenariosState[scenarioId] = kind;
  if (previous === undefined) totalVotes++;

  // Update options state (composant partage : .is-active pour selectionne, .is-dimmed local).
  Object.entries(optionsByCard[scenarioId] || {}).forEach(([k, btn]) => {
    btn.classList.remove('is-active', 'is-dimmed');
    if (k === kind) btn.classList.add('is-active');
    else btn.classList.add('is-dimmed');
  });
  cardEl.classList.add('is-decided');
  play('pop');

  // Mini-Tuko qui anime le scenario (Long ou Double : va toucher l'image).
  if (kind === 'long' || kind === 'double') {
    spawnMiniTuko(cardEl);
  }

  // CTA active des le 1er vote.
  if (ctaEl) {
    ctaEl.classList.remove('is-disabled');
    ctaEl.disabled = false;
  }

  reactTukoToTrend();
  maybeWaveAndComplete();
  persistState();

  if (navAPIRef) navAPIRef.markComplete();
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D3';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'step-D3__title-block';
  const titre = document.createElement('h1');
  titre.className = 'step-D3__titre';
  titre.textContent = 'DANS LA VRAIE VIE';
  titleBlock.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D3__sous';
  sous.textContent = 'comment tu appuierais ?';
  titleBlock.appendChild(sous);
  wrap.appendChild(titleBlock);

  // Grid 2x2 : composant partage .scenario-card-grid .
  gridEl = document.createElement('div');
  gridEl.className = 'scenario-card-grid step-D3__grid';
  cardsEls = [];
  optionsByCard = {};
  SCENARIOS.forEach((sc) => {
    // Composant partage .scenario-card .
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.scenarioId = String(sc.id);

    // Image placeholder via composant partage .scenario-card__image (.placeholder-image).
    const img = document.createElement('div');
    img.className = 'scenario-card__image placeholder-image';
    img.textContent = `[PLACEHOLDER : ${sc.imageHint}]`;
    card.appendChild(img);

    const title = document.createElement('h3');
    title.className = 'scenario-card__title';
    title.textContent = sc.title;
    card.appendChild(title);

    // Options : 3 boutons (court/long/double) via .scenario-card__options--3 partage.
    const opts = document.createElement('div');
    opts.className = 'scenario-card__options scenario-card__options--3';
    optionsByCard[sc.id] = {};
    ['court', 'long', 'double'].forEach((kind) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scenario-card__option';
      btn.dataset.kind = kind;

      // Contenu : label + mini bars (specifique D3).
      const content = document.createElement('span');
      content.className = 'step-D3__option-content';
      const label = document.createElement('span');
      label.textContent = kind;
      content.appendChild(label);
      content.appendChild(buildOptionBars(kind));
      btn.appendChild(content);

      const onClick = () => onVote(sc.id, kind, card);
      btn.addEventListener('click', onClick);
      handlers.push([btn, 'click', onClick]);

      opts.appendChild(btn);
      optionsByCard[sc.id][kind] = btn;
    });
    card.appendChild(opts);

    gridEl.appendChild(card);
    cardsEls.push(card);
  });
  wrap.appendChild(gridEl);

  // Bottom row : Tuko mascotte partage + CTA
  const bottom = document.createElement('div');
  bottom.className = 'step-D3__bottom';
  tukoMainEl = document.createElement('div');
  tukoMainEl.className = 'tuko-mascotte';
  tukoMainEl.dataset.pose = 'pedagogique';
  tukoMainEl.dataset.position = 'inline';
  bottom.appendChild(tukoMainEl);

  ctaEl = document.createElement('button');
  ctaEl.type = 'button';
  ctaEl.className = 'cta-primary step-D3__cta is-disabled';
  ctaEl.textContent = '▶ ON CONTINUE';
  ctaEl.disabled = true;
  bottom.appendChild(ctaEl);

  bottom.appendChild(document.createElement('span'));
  wrap.appendChild(bottom);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Trigger entrance (.scenario-card.is-in fournit l'animation pop partage).
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    cardsEls.forEach((c) => c.classList.add('is-in'));
    tukoMainEl.classList.add('is-in');
    ctaEl.classList.add('is-in');
  });

  // CTA click
  const onCta = () => {
    if (ctaEl.disabled) return;
    play('whoosh');
    ctaEl.disabled = true;
    navAPI.next();
  };
  ctaEl.addEventListener('click', onCta);
  handlers.push([ctaEl, 'click', onCta]);

  // Restore state from savedState if any.
  if (savedStateRef && savedStateRef.scenarios) {
    Object.entries(savedStateRef.scenarios).forEach(([sid, kind]) => {
      const id = Number(sid);
      const cardEl = cardsEls.find((c) => Number(c.dataset.scenarioId) === id);
      if (cardEl) onVote(id, kind, cardEl);
    });
  }
}

export default {
  id: 'D3',
  phase: 'D',
  title: 'Dans la vraie vie',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    scenariosState = (savedState && savedState.scenarios) ? { ...savedState.scenarios } : {};
    totalVotes = Object.keys(scenariosState).length;

    scene = new Container();
    scene.label = 'step-D3';
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
    optionsByCard = {};
    tukoMainEl = ctaEl = gridEl = null;
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    // Etat : scenarios = {1..4: 'court'|'long'|'double'}.
    return { scenarios: { ...scenariosState } };
  },

  isComplete() {
    return totalVotes >= 1;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

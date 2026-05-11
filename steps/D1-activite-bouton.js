// D1-activite-bouton.js : "LE BOUTON A 3 LANGUES" (page magazine 14).
// utilise .scenario-card + .scenario-card-grid--1x3 partages .
//        Override local du grid-template-rows interne pour titre + demo + graph + label.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D1-styles';

const STYLE_TEXT = `
.step-D1 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  padding: var(--s-5) var(--s-5) var(--s-4);
  gap: var(--s-3);
  pointer-events: none;
}
.step-D1__title-block {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}
.step-D1__titre {
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
.step-D1__titre.is-in {
  animation: d1-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d1-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D1__sous {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(20px);
}
.step-D1__sous.is-in {
  animation: d1-fade-up 400ms var(--ease-out) 300ms forwards;
}
@keyframes d1-fade-up {
  to { opacity: 1; transform: translateY(0); }
}
/* Layout 3 cards en parallele (utilise .scenario-card-grid--1x3 partage). */
.step-D1__cards {
  align-items: stretch;
  align-self: center;
  width: 100%;
  pointer-events: auto;
}
/* D1 override : structure interne specifique (titre + zone demo + graph + label).
   Le composant partage .scenario-card fournit fond, border, shadow, padding, border-radius. */
.step-D1__card {
  --d1-cycle: 3.2s;
  grid-template-rows: auto 1fr auto auto;
  text-align: center;
  cursor: var(--cursor-pointer);
  opacity: 0;
  transform: scale(0);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out),
              border-color var(--d-fast) var(--ease-out);
}
.step-D1__card.is-in {
  animation: d1-card-pop 350ms var(--ease-bounce) forwards;
}
.step-D1__card:nth-child(1).is-in { animation-delay: 800ms; }
.step-D1__card:nth-child(2).is-in { animation-delay: 1000ms; }
.step-D1__card:nth-child(3).is-in { animation-delay: 1200ms; }
@keyframes d1-card-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D1__card.is-in:hover:not(.is-focus) {
  animation: none;
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow-lg);
}
.step-D1__card.is-in.is-focus {
  animation: none;
  --d1-cycle: 2.5s;
  transform: scale(1.05);
  box-shadow: var(--shadow-accent-1);
  border-color: var(--accent-1);
}
.step-D1__card__titre {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.01em;
}
.step-D1__card__tuko-zone {
  display: grid;
  place-items: center;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-md);
  min-height: 140px;
  position: relative;
  overflow: hidden;
}
/* Tuko miniatures inline (utilisent .tuko-mascotte[data-position=inline] partage). */
.step-D1 .tuko-mascotte[data-position="inline"] {
  --tuko-mascotte-size: 100px;
  margin: 0;
}
.step-D1__card__tuko-zone .tuko-mascotte--court {
  animation: d1-tuko-court var(--d1-cycle) infinite ease-in-out;
}
@keyframes d1-tuko-court {
  0%, 6%   { transform: scale(1); }
  9%       { transform: scale(0.92); }
  16%      { transform: scale(1); }
  100%     { transform: scale(1); }
}
.step-D1__card__tuko-zone .tuko-mascotte--long {
  animation: d1-tuko-long var(--d1-cycle) infinite ease-in-out;
}
@keyframes d1-tuko-long {
  0%, 4%   { transform: scale(1); }
  10%      { transform: scale(0.92); }
  50%      { transform: scale(0.92); }
  56%      { transform: scale(1); }
  100%     { transform: scale(1); }
}
.step-D1__card__tuko-zone .tuko-mascotte--double {
  animation: d1-tuko-double var(--d1-cycle) infinite ease-in-out;
}
@keyframes d1-tuko-double {
  0%, 5%   { transform: scale(1); }
  8%       { transform: scale(0.92); }
  14%      { transform: scale(1); }
  17%      { transform: scale(0.92); }
  23%      { transform: scale(1); }
  100%     { transform: scale(1); }
}
.step-D1__graph {
  position: relative;
  height: 56px;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.step-D1__graph__axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--ink);
  opacity: 0.4;
}
.step-D1__bar {
  position: absolute;
  bottom: 2px;
  background: var(--accent-1);
  border-radius: 2px 2px 0 0;
  height: 0;
  width: 0;
  transform-origin: left bottom;
}
.step-D1__bar--court {
  left: 18%;
  width: 12%;
  animation: d1-bar-court var(--d1-cycle) infinite ease-out;
}
@keyframes d1-bar-court {
  0%       { height: 0; opacity: 0; }
  6%       { height: 36px; opacity: 1; }
  35%      { height: 36px; opacity: 1; }
  50%      { height: 0; opacity: 0; }
  100%     { height: 0; opacity: 0; }
}
.step-D1__bar--long {
  left: 12%;
  height: 42px;
  width: 0;
  animation: d1-bar-long var(--d1-cycle) infinite ease-out;
}
@keyframes d1-bar-long {
  0%       { width: 0; opacity: 0; }
  4%       { opacity: 1; }
  50%      { width: 60%; opacity: 1; }
  60%      { width: 60%; opacity: 1; }
  74%      { width: 0; opacity: 0; }
  100%     { width: 0; opacity: 0; }
}
/* Long bar : micro-vibration pendant l'etirement (signature pedagogique). */
.step-D1__bar--long.is-vibrating {
  animation: d1-bar-long var(--d1-cycle) infinite ease-out,
             d1-bar-vibrate 80ms infinite linear;
}
@keyframes d1-bar-vibrate {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-0.5px); }
}
.step-D1__bar--double-1 {
  left: 16%;
  width: 10%;
  animation: d1-bar-double-1 var(--d1-cycle) infinite ease-out;
}
.step-D1__bar--double-2 {
  left: 36%;
  width: 10%;
  animation: d1-bar-double-2 var(--d1-cycle) infinite ease-out;
}
@keyframes d1-bar-double-1 {
  0%       { height: 0; opacity: 0; }
  6%       { height: 36px; opacity: 1; }
  40%      { height: 36px; opacity: 1; }
  52%      { height: 0; opacity: 0; }
  100%     { height: 0; opacity: 0; }
}
@keyframes d1-bar-double-2 {
  0%, 14%  { height: 0; opacity: 0; }
  20%      { height: 36px; opacity: 1; }
  40%      { height: 36px; opacity: 1; }
  52%      { height: 0; opacity: 0; }
  100%     { height: 0; opacity: 0; }
}
.step-D1__card__label {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 700;
  text-transform: lowercase;
  margin: 0;
  color: var(--ink);
}
.step-D1__rappel {
  text-align: center;
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.08em;
  color: var(--ink);
  opacity: 0;
  transform: translateY(10px);
  margin: 0;
}
.step-D1__rappel.is-in {
  animation: d1-fade-up 400ms var(--ease-out) 1500ms forwards;
}
.step-D1__bottom {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: end;
  gap: var(--s-4);
  pointer-events: auto;
}
/* Tuko principal en bas-gauche (composant partage, position relative au bottom). */
.step-D1__bottom .tuko-mascotte {
  opacity: 0;
  transform: translateX(-100px);
  position: relative;
  left: 0;
  bottom: 0;
}
.step-D1__bottom .tuko-mascotte.is-in {
  animation: d1-tuko-enter var(--d-slow) var(--ease-out) 1700ms forwards;
}
@keyframes d1-tuko-enter {
  to { opacity: 1; transform: translateX(0); }
}
.step-D1__cta {
  justify-self: center;
  align-self: end;
  opacity: 0;
  transform: scale(0);
  animation: none;
}
.step-D1__cta.is-in {
  animation: d1-cta-pop 350ms var(--ease-bounce) 2200ms forwards,
             cta-idle-pulse 2s var(--ease-out) 2600ms infinite;
}
@keyframes d1-cta-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
`;

const CARD_DEFS = [
  {
    key: 'court',
    titre: 'APPUI COURT',
    pose: 'presentateur',
    label: 'un message',
    bars: [{ kind: 'court' }],
  },
  {
    key: 'long',
    titre: 'APPUI LONG',
    pose: 'pedagogique',
    label: 'une duree',
    bars: [{ kind: 'long', vibrating: true }],
  },
  {
    key: 'double',
    titre: 'DOUBLE APPUI',
    pose: 'mysterieux',
    label: 'une repetition',
    bars: [{ kind: 'double-1' }, { kind: 'double-2' }],
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
let cardsEls = [];
let focusedKey = null;
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

function setFocus(key) {
  focusedKey = (focusedKey === key) ? null : key;
  cardsEls.forEach((cardEl) => {
    cardEl.classList.toggle('is-focus', cardEl.dataset.cardKey === focusedKey);
  });
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D1';

  // Title block
  const titleBlock = document.createElement('div');
  titleBlock.className = 'step-D1__title-block';
  const titre = document.createElement('h1');
  titre.className = 'step-D1__titre';
  titre.textContent = 'LE BOUTON A 3 LANGUES';
  titleBlock.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D1__sous';
  sous.textContent = 'essaie chacune sur ta capsule';
  titleBlock.appendChild(sous);
  wrap.appendChild(titleBlock);

  // Cards row (utilise .scenario-card-grid--1x3 partage ).
  const cardsRow = document.createElement('div');
  cardsRow.className = 'scenario-card-grid scenario-card-grid--1x3 step-D1__cards';
  cardsEls = CARD_DEFS.map((def) => {
    // Composant partage .scenario-card + classe locale pour override grid-template-rows.
    const card = document.createElement('div');
    card.className = 'scenario-card step-D1__card';
    card.dataset.cardKey = def.key;

    const ctitre = document.createElement('h2');
    ctitre.className = 'step-D1__card__titre';
    ctitre.textContent = def.titre;
    card.appendChild(ctitre);

    const tukoZone = document.createElement('div');
    tukoZone.className = 'step-D1__card__tuko-zone';
    // Mini Tuko : composant partage avec data-position=inline + classe modifieur locale.
    const tukoMini = document.createElement('div');
    tukoMini.className = `tuko-mascotte tuko-mascotte--${def.key}`;
    tukoMini.dataset.pose = def.pose;
    tukoMini.dataset.position = 'inline';
    tukoZone.appendChild(tukoMini);
    card.appendChild(tukoZone);

    const graph = document.createElement('div');
    graph.className = 'step-D1__graph';
    const axis = document.createElement('span');
    axis.className = 'step-D1__graph__axis';
    graph.appendChild(axis);
    def.bars.forEach((b) => {
      const bar = document.createElement('span');
      bar.className = `step-D1__bar step-D1__bar--${b.kind}`;
      if (b.vibrating) bar.classList.add('is-vibrating');
      graph.appendChild(bar);
    });
    card.appendChild(graph);

    const label = document.createElement('p');
    label.className = 'step-D1__card__label';
    label.textContent = def.label;
    card.appendChild(label);

    cardsRow.appendChild(card);
    return card;
  });
  wrap.appendChild(cardsRow);

  // Rappel
  const rappel = document.createElement('p');
  rappel.className = 'step-D1__rappel';
  rappel.textContent = 'regarde ta capsule : le dessin change selon ta presse';
  wrap.appendChild(rappel);

  // Bottom row
  const bottom = document.createElement('div');
  bottom.className = 'step-D1__bottom';
  // Tuko principal : composant partage [data-pose=pedagogique].
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'pedagogique';
  tuko.dataset.position = 'inline';
  bottom.appendChild(tuko);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D1__cta';
  cta.textContent = '▶ ON FAIT UN MINI-JEU';
  cta.disabled = true;
  bottom.appendChild(cta);

  bottom.appendChild(document.createElement('span'));
  wrap.appendChild(bottom);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Trigger entrance (CSS handles delays).
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    rappel.classList.add('is-in');
    cardsEls.forEach((c) => c.classList.add('is-in'));
    tuko.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // CTA enabled after entrance.
  const tEnable = setTimeout(() => { cta.disabled = false; }, 2600);
  timers.push(tEnable);

  // Mark complete after entrance settles.
  const tComplete = setTimeout(() => {
    viewed = true;
    navAPI.markComplete();
    navAPI.saveState({ steps: { D1: { viewed: true } } });
  }, 3000);
  timers.push(tComplete);

  // Card click -> focus toggle.
  cardsEls.forEach((cardEl) => {
    const onClick = () => {
      play('pop');
      setFocus(cardEl.dataset.cardKey);
    };
    cardEl.addEventListener('click', onClick);
    handlers.push([cardEl, 'click', onClick]);
  });

  // CTA click.
  const onCta = () => {
    if (cta.disabled) return;
    play('whoosh');
    cta.disabled = true;
    navAPI.next();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);

  // Keyboard 1/2/3 to focus, ignore inputs (nav.js owns Espace/arrows/R).
  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if (e.key === '1') { e.preventDefault(); play('pop'); setFocus('court'); }
    else if (e.key === '2') { e.preventDefault(); play('pop'); setFocus('long'); }
    else if (e.key === '3') { e.preventDefault(); play('pop'); setFocus('double'); }
  };
  window.addEventListener('keydown', onKey);
  handlers.push([window, 'keydown', onKey]);
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
    focusedKey = null;

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
    focusedKey = null;
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

// D2-mini-jeu-reconnais-le-signal.js : "DOUBLE-VUE", 3 manches qui devoilent
// la connexion entre graph (D1) et timeline 0/1 (binaire).
// Fiche : doc interne
// utilise .barre-progression + .compteur-geant + .tuko-mascotte
// partages  + helpers spawnConfettis/spawnShockwave (effects.js).

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { spawnConfettis, spawnShockwave } from '../core/effects.js';

const STYLE_ID = 'step-D2-styles';

const STYLE_TEXT = `
.step-D2 {
  position: absolute;
  inset: 0;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  background: var(--bg);
  pointer-events: none;
}

/* Tuko_peda en bas-gauche (au-dessus du footer shell). Sprite reel, miroir
   horizontal (scaleX -1) pour qu'il regarde vers la droite (vers le contenu). */
.step-D2__tuko {
  position: absolute;
  bottom: 0;
  left: var(--s-4);
  width: clamp(160px, 15vw, 220px);
  height: auto;
  transform: scaleX(-1);
  pointer-events: none;
  z-index: 3;
  animation: d2-tuko-bobbing 2.4s ease-in-out infinite;
}

@keyframes d2-tuko-bobbing {
  /* Le scaleX -1 est dans chaque keyframe (piège du transform de centrage) */
  0%, 100% { transform: scaleX(-1) translateY(0); }
  50%      { transform: scaleX(-1) translateY(-6px); }
}
.step-D2__top {
  position: absolute;
  top: var(--s-4);
  left: var(--s-4);
  right: var(--s-4);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--s-3);
  pointer-events: none;
}
.step-D2__progress-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  max-width: 320px;
}
.step-D2 .barre-progression {
  width: 100%;
}
.step-D2__manche-label {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  color: var(--ink);
  opacity: 0.7;
}
.step-D2 .compteur-geant__value {
  font-size: var(--t-h1);
  line-height: 1;
}
.step-D2__main {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  width: min(1100px, 90%);
  pointer-events: none;
}
.step-D2__question {
  font-family: var(--display);
  font-size: var(--t-h1);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  color: var(--ink);
  letter-spacing: -0.01em;
  opacity: 0;
  transform: scale(0.9);
}
.step-D2__question.is-in {
  animation: d2-q-in 350ms var(--ease-bounce) forwards;
}
@keyframes d2-q-in {
  to { opacity: 1; transform: scale(1); }
}
.step-D2__main .tuko-mascotte {
  position: relative;
  left: 0;
  bottom: 0;
  --tuko-mascotte-size: 120px;
  opacity: 0;
  transform: translateY(20px);
}
.step-D2__main .tuko-mascotte.is-in {
  animation: d2-tuko-in 350ms var(--ease-out) forwards;
}
@keyframes d2-tuko-in {
  to { opacity: 1; transform: translateY(0); }
}
.step-D2__double-vue {
  width: 100%;
  display: grid;
  grid-template-rows: auto auto;
  gap: var(--s-2);
  position: relative;
  border-left: var(--border);
  padding-left: var(--s-3);
  opacity: 0;
  transform: translateY(20px);
}
.step-D2__double-vue.is-in {
  animation: d2-vue-in 400ms var(--ease-out) forwards;
}
@keyframes d2-vue-in {
  to { opacity: 1; transform: translateY(0); }
}
.step-D2__layer {
  position: relative;
  border: var(--border);
  border-radius: var(--r-md);
  background: var(--paper);
  padding: var(--s-2) var(--s-3);
  min-height: 90px;
  overflow: hidden;
}
.step-D2__layer__title {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0.7;
  margin: 0 0 var(--s-1);
}
.step-D2__layer.is-hidden .step-D2__layer__content {
  visibility: hidden;
}
.step-D2__layer__hint {
  display: none;
}
.step-D2__layer.is-hidden .step-D2__layer__hint {
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  color: var(--ink);
  opacity: 0.25;
  animation: d2-hint-pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes d2-hint-pulse {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 0.5; transform: translate(-50%, -50%) scale(1.05); }
}
/* Graph et timeline alignes sur LA MEME grille 12 cols (memes gap + padding).
   Resultat : la cell jaune du graph a l'index i tombe pile sous le bit i
   de la timeline. Et le nombre de cells jaunes du graph = nombre de 1
   dans la timeline (manche 3 reposait sur cette deduction visuelle). */
.step-D2__graph-area {
  position: relative;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  padding: 6px;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  aspect-ratio: 12 / 3;
}
.step-D2__graph-cell {
  /* eteinte par defaut */
}
.step-D2__graph-cell.is-on {
  background: var(--accent-3);
  border: 2px solid var(--ink);
  border-radius: 3px 3px 0 0;
  align-self: stretch;
}
.step-D2__graph-axis {
  position: absolute;
  left: 6px; right: 6px; bottom: 4px;
  height: 2px;
  background: var(--ink);
  opacity: 0.4;
}
.step-D2__timeline-bits {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  padding: 6px;
  font-family: var(--mono);
  font-weight: 700;
  position: relative;
}
.step-D2__bit {
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  font-size: clamp(20px, 1.8vw, 32px);
  border-radius: var(--r-sm);
  opacity: 0;
  transition: opacity 100ms var(--ease-out), background 200ms var(--ease-out);
  color: var(--ink);
}
.step-D2__bit.is-shown { opacity: 1; }
.step-D2__bit.is-zero { opacity: 0.4; }
.step-D2__bit.is-one  { color: var(--ink); }
.step-D2__bit.is-flash {
  background: var(--accent-3);
  animation: d2-bit-flash 300ms var(--ease-out) 1;
}
@keyframes d2-bit-flash {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.step-D2__bit.is-jaillit {
  animation: d2-bit-jaillit 700ms var(--ease-out) forwards;
}
@keyframes d2-bit-jaillit {
  0%   { transform: translateY(0) scale(1); opacity: 1; background: var(--accent-3); }
  100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
}
.step-D2__cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-4);
  border-radius: 1px;
  left: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--d-fast) var(--ease-out);
}
.step-D2__cursor.is-on { opacity: 0.7; }
.step-D2__options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
  width: 100%;
  pointer-events: auto;
  opacity: 0;
  transform: translateY(20px);
}
.step-D2__options.is-in {
  animation: d2-options-in 400ms var(--ease-out) forwards;
}
@keyframes d2-options-in {
  to { opacity: 1; transform: translateY(0); }
}
.step-D2__option {
  background: var(--paper);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-3);
  cursor: var(--cursor-pointer);
  text-align: center;
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  display: grid;
  gap: var(--s-1);
  place-items: center;
  min-height: 130px;
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out),
              background var(--d-fast) var(--ease-out);
  position: relative;
  overflow: hidden;
}
.step-D2__option:hover:not(.is-correct):not(.is-wrong):not(.is-disabled) {
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow-lg);
}
.step-D2__option.is-disabled {
  cursor: var(--cursor-not-allowed);
  opacity: 0.5;
}
.step-D2__option__sub {
  font-family: var(--mono);
  font-size: var(--t-small);
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: lowercase;
  opacity: 0.7;
}
.step-D2__option__big {
  font-size: var(--t-h2);
  line-height: 1;
}
.step-D2__option.is-correct {
  background: var(--accent-3);
  animation: d2-correct-bounce 400ms var(--ease-bounce) forwards;
}
@keyframes d2-correct-bounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.1); }
  100% { transform: scale(1.05); }
}
.step-D2__option.is-wrong {
  animation: d2-wrong-shake 220ms 1;
}
@keyframes d2-wrong-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-6px); }
  75%      { transform: translateX(6px); }
}
/* Mini graph dans une option (manche 2) - meme structure 12 cols que le graph
   principal pour coherence visuelle. */
.step-D2__mini-graph {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
  padding: 4px;
  width: 150px;
  aspect-ratio: 12 / 3;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  margin: 0 auto;
}
.step-D2__mini-graph__cell {
  /* eteinte par defaut */
}
.step-D2__mini-graph__cell.is-on {
  background: var(--accent-3);
  border: 1px solid var(--ink);
  border-radius: 2px 2px 0 0;
  align-self: stretch;
}
/* CTA bas-centre : convention CTA (animation:none, sans chevron) */
.step-D2__cta-area {
  position: absolute;
  bottom: var(--s-3);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  justify-items: center;
  pointer-events: auto;
  opacity: 0;
}
.step-D2__cta-area.is-in {
  animation: d2-cta-area-in var(--d-fast) var(--ease-out) forwards;
}
@keyframes d2-cta-area-in {
  to { opacity: 1; }
}

.step-D2__cta {
  animation: none !important;
}
`;

// Configuration des 3 manches.
// Questions reformulees : claires, ton sympa et direct, accents corrects.
const ROUNDS = [
  {
    press: 'long',
    timeline: [0,0,0,1,1,1,1,1,1,0,0,0],
    hidden: null,
    question: 'Quel signal vois-tu ?',
    type: 'kind',
    options: [
      { id: 'court',  big: 'COURT',  sub: 'un petit pic',  correct: false },
      { id: 'long',   big: 'LONG',   sub: 'une vague',     correct: true  },
      { id: 'double', big: 'DOUBLE', sub: 'deux pics',     correct: false },
    ],
  },
  {
    press: 'double',
    timeline: [0,0,1,1,0,0,1,1,0,0,0,0],
    hidden: 'graph',
    question: 'Quel graph va avec ?',
    type: 'graph',
    options: [
      { id: 'court',  graph: 'court',  correct: false },
      { id: 'long',   graph: 'long',   correct: false },
      { id: 'double', graph: 'double', correct: true  },
    ],
  },
  {
    press: 'court',
    timeline: [0,0,0,1,1,0,0,0,0,0,0,0],
    hidden: 'timeline',
    // Le graph reste visible : l'enfant compte les colonnes jaunes
    // (alignees verticalement avec les positions des 1) pour deduire
    // combien de 1 sont caches dans la timeline en dessous.
    question: 'Compte les colonnes jaunes : combien de 1 ?',
    type: 'count',
    options: [
      { id: 'n2', big: '2', sub: 'deux',     correct: true  },
      { id: 'n6', big: '6', sub: 'six',      correct: false },
      { id: 'n1', big: '1', sub: 'un seul',  correct: false },
    ],
  },
];

// Timelines representatives de chaque type de presse, pour les mini-graphs
// dans les options manche 2. Memes patterns que ROUNDS.timeline correspondants.
const MINI_TIMELINES = {
  court:  [0,0,0,1,1,0,0,0,0,0,0,0],
  long:   [0,0,0,1,1,1,1,1,1,0,0,0],
  double: [0,0,1,1,0,0,1,1,0,0,0,0],
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

let currentRoundIdx = 0;
let score = 0;
let attemptInRound = 0;

let mainEl = null;
let questionEl = null;
let tukoMystEl = null;
let doubleVueEl = null;
let layerGraphEl = null;
let layerTimelineEl = null;
let graphAreaEl = null;
let timelineBitsEl = null;
let cursorEl = null;
let optionsEl = null;
let counterValueEl = null;
let segEls = [];
let mancheLabelEl = null;
let ctaEl = null;
let ctaAnchorEl = null;

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
function pushInterval(i) { intervals.push(i); return i; }

function persistState() {
  // Etat : round 1-indexe (1..3), score number (0..3).
  if (!navAPIRef) return;
  navAPIRef.saveState({ steps: { D2: { round: currentRoundIdx + 1, score } } });
}

// Mini-graph d'option (manche 2) : grid 12 cols miroir de MINI_TIMELINES[kind].
function buildMiniGraph(kind) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D2__mini-graph';
  const pattern = MINI_TIMELINES[kind] || [];
  pattern.forEach((v) => {
    const cell = document.createElement('div');
    cell.className = 'step-D2__mini-graph__cell';
    if (v === 1) cell.classList.add('is-on');
    wrap.appendChild(cell);
  });
  return wrap;
}

// Reset des cells du graph principal.
function clearGraphArea() {
  if (!graphAreaEl) return;
  Array.from(graphAreaEl.querySelectorAll('.step-D2__graph-cell')).forEach((c) => {
    c.classList.remove('is-on');
  });
}

// Construit/met a jour les 12 cells du graph selon la timeline du round.
// Cells "is-on" = positions des 1 dans la timeline → ALIGNEMENT VERTICAL
// pixel-perfect avec les bits de la timeline.
function buildGraphCells(timeline) {
  if (!graphAreaEl) return;
  // Reset : retire cells existantes (mais garde l'axe pseudo-positionne)
  Array.from(graphAreaEl.querySelectorAll('.step-D2__graph-cell')).forEach((c) => c.remove());
  timeline.forEach((v, i) => {
    const cell = document.createElement('div');
    cell.className = 'step-D2__graph-cell';
    cell.dataset.idx = String(i);
    if (v === 1) cell.classList.add('is-on');
    graphAreaEl.appendChild(cell);
  });
}

// Pulse compteur + increment (utilise .compteur-geant__value.is-pulsing partage).
function pulseCounter() {
  if (!counterValueEl) return;
  counterValueEl.classList.add('is-pulsing');
  pushTimer(setTimeout(() => counterValueEl?.classList.remove('is-pulsing'), 200));
}
function setScore(n) {
  score = n;
  if (counterValueEl) counterValueEl.textContent = `${score}/3`;
  pulseCounter();
  persistState();
}

// Reward : shockwave + confettis depuis un element (helpers partages effects.js).
function spawnReward(targetEl) {
  if (!targetEl) return;
  const stage = document.querySelector('#stage');
  if (!stage) return;
  const rect = targetEl.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - stageRect.left;
  const cy = rect.top + rect.height / 2 - stageRect.top;

  spawnShockwave(stage, {
    origine: { x: cx, y: cy },
    rayonMax: 320,
    duree: 600,
  });
  spawnConfettis(stage, {
    nombre: 5,
    origine: { x: cx, y: cy },
  });
  play('success');
}

function clearOptions() {
  if (!optionsEl) return;
  while (optionsEl.firstChild) optionsEl.removeChild(optionsEl.firstChild);
  optionsEl.classList.remove('is-in');
}

function buildOptions(round) {
  clearOptions();
  round.options.forEach((opt) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'step-D2__option';
    card.dataset.optId = opt.id;

    if (round.type === 'kind') {
      const big = document.createElement('span');
      big.className = 'step-D2__option__big';
      big.textContent = opt.big;
      card.appendChild(big);
      const sub = document.createElement('span');
      sub.className = 'step-D2__option__sub';
      sub.textContent = opt.sub;
      card.appendChild(sub);
    } else if (round.type === 'graph') {
      // Manche 2 : juste le mini-graph, AUCUN label texte (sinon ca spoile
      // la reponse - le nom 'court'/'long'/'double' donnait directement
      // le type). L'enfant doit reconnaitre visuellement.
      card.appendChild(buildMiniGraph(opt.graph));
    } else if (round.type === 'count') {
      const big = document.createElement('span');
      big.className = 'step-D2__option__big';
      big.textContent = opt.big;
      card.appendChild(big);
      const sub = document.createElement('span');
      sub.className = 'step-D2__option__sub';
      sub.textContent = opt.sub;
      card.appendChild(sub);
    }

    const onClick = () => onOptionClick(opt, card);
    card.addEventListener('click', onClick);
    handlers.push([card, 'click', onClick]);

    optionsEl.appendChild(card);
  });
}

function onOptionClick(opt, cardEl) {
  if (cardEl.classList.contains('is-correct')) return;
  if (cardEl.classList.contains('is-disabled')) return;
  attemptInRound++;
  if (opt.correct) {
    cardEl.classList.add('is-correct');
    Array.from(optionsEl.children).forEach((c) => {
      if (c !== cardEl) c.classList.add('is-disabled');
    });
    if (attemptInRound === 1) setScore(score + 1);
    spawnReward(cardEl);
    revealHidden();
    pushTimer(setTimeout(() => goToNextRound(), 1800));
  } else {
    play('error');
    cardEl.classList.add('is-wrong');
    pushTimer(setTimeout(() => cardEl.classList.remove('is-wrong'), 360));
  }
}

function revealHidden() {
  const round = ROUNDS[currentRoundIdx];
  if (!round.hidden) return;
  if (round.hidden === 'graph') {
    layerGraphEl?.classList.remove('is-hidden');
    // Cells deja construites par animateSignal/buildGraphCells. Juste reveler.
  } else if (round.hidden === 'timeline') {
    layerTimelineEl?.classList.remove('is-hidden');
    revealTimelineSpectacular(round);
  }
}

function revealTimelineSpectacular() {
  if (!timelineBitsEl) return;
  const bits = Array.from(timelineBitsEl.querySelectorAll('.step-D2__bit'));
  bits.forEach((b) => b.classList.remove('is-shown', 'is-flash'));
  bits.forEach((b, i) => {
    pushTimer(setTimeout(() => {
      b.classList.add('is-shown');
      if (b.classList.contains('is-one')) {
        b.classList.add('is-flash');
        // Ensuite jaillissement (signature manche 3)
        pushTimer(setTimeout(() => b.classList.add('is-jaillit'), 250));
      }
    }, i * 80));
  });
}

function setHiddenStates(round) {
  layerGraphEl?.classList.toggle('is-hidden', round.hidden === 'graph');
  layerTimelineEl?.classList.toggle('is-hidden', round.hidden === 'timeline');
}

function buildTimeline(round) {
  if (!timelineBitsEl) return;
  while (timelineBitsEl.firstChild) timelineBitsEl.removeChild(timelineBitsEl.firstChild);
  round.timeline.forEach((v) => {
    const span = document.createElement('span');
    span.className = `step-D2__bit ${v === 1 ? 'is-one' : 'is-zero'}`;
    span.textContent = String(v);
    timelineBitsEl.appendChild(span);
  });
}

function animateSignal(round, onDone) {
  // 1. Construit les 12 cells du graph (si visible). Si cache, on les
  //    construit quand meme mais le layer est cache via .is-hidden.
  buildGraphCells(round.timeline);
  // 2. Cursor sweep + bits cascade
  cursorEl?.classList.add('is-on');
  const len = round.timeline.length;
  const stepDur = 110; // ms par bit
  const totalDur = len * stepDur;
  let elapsed = 0;
  const cursorInterval = setInterval(() => {
    elapsed += 30;
    const pct = Math.min(100, (elapsed / totalDur) * 100);
    if (cursorEl) cursorEl.style.left = `${pct}%`;
    if (elapsed >= totalDur) {
      clearInterval(cursorInterval);
      const idx = intervals.indexOf(cursorInterval);
      if (idx >= 0) intervals.splice(idx, 1);
    }
  }, 30);
  pushInterval(cursorInterval);

  // bits cascade
  if (round.hidden !== 'timeline' && timelineBitsEl) {
    const bits = Array.from(timelineBitsEl.querySelectorAll('.step-D2__bit'));
    bits.forEach((b, i) => {
      pushTimer(setTimeout(() => {
        b.classList.add('is-shown');
        if (b.classList.contains('is-one')) {
          b.classList.add('is-flash');
          play('tic');
        }
      }, i * stepDur));
    });
  }
  pushTimer(setTimeout(() => {
    cursorEl?.classList.remove('is-on');
    if (cursorEl) cursorEl.style.left = '0%';
    onDone && onDone();
  }, totalDur + 200));
}

function clearVisualState() {
  if (timelineBitsEl) {
    Array.from(timelineBitsEl.querySelectorAll('.step-D2__bit')).forEach((b) => {
      b.classList.remove('is-shown', 'is-flash', 'is-jaillit');
    });
  }
  clearGraphArea();
  if (cursorEl) cursorEl.style.left = '0%';
}

function runRound() {
  const round = ROUNDS[currentRoundIdx];
  attemptInRound = 0;
  // Maj progress segments (composant .barre-progression__seg partage).
  segEls.forEach((seg, i) => {
    seg.classList.toggle('is-current', i === currentRoundIdx);
    seg.classList.toggle('is-done', i < currentRoundIdx);
  });
  if (mancheLabelEl) {
    mancheLabelEl.textContent = `manche ${currentRoundIdx + 1} sur 3`;
  }
  // Question
  if (questionEl) {
    questionEl.classList.remove('is-in');
    questionEl.textContent = round.question;
    requestAnimationFrame(() => questionEl.classList.add('is-in'));
  }
  // Hidden visibility
  setHiddenStates(round);
  buildTimeline(round);
  clearVisualState();
  persistState();
  // After short delay (Tuko gesture), animate signal then show options
  pushTimer(setTimeout(() => {
    animateSignal(round, () => {
      buildOptions(round);
      requestAnimationFrame(() => optionsEl?.classList.add('is-in'));
    });
  }, 600));
}

function goToNextRound() {
  if (currentRoundIdx < ROUNDS.length - 1) {
    currentRoundIdx++;
    clearOptions();
    runRound();
  } else {
    // Last round done, mark progress all done, show CTA
    segEls.forEach((seg) => { seg.classList.add('is-done'); seg.classList.remove('is-current'); });
    if (ctaAnchorEl) {
      requestAnimationFrame(() => ctaAnchorEl.classList.add('is-in'));
    }
    persistState();
    if (navAPIRef) navAPIRef.markComplete();
  }
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D2';

  // Top: progress (.barre-progression partage) + counter (.compteur-geant partage)
  const top = document.createElement('div');
  top.className = 'step-D2__top';

  const progressWrap = document.createElement('div');
  progressWrap.className = 'step-D2__progress-wrap';
  const progress = document.createElement('div');
  progress.className = 'barre-progression';
  segEls = [];
  for (let i = 0; i < 3; i++) {
    const seg = document.createElement('span');
    seg.className = 'barre-progression__seg';
    progress.appendChild(seg);
    segEls.push(seg);
  }
  progressWrap.appendChild(progress);
  mancheLabelEl = document.createElement('div');
  mancheLabelEl.className = 'step-D2__manche-label';
  mancheLabelEl.textContent = 'manche 1 sur 3';
  progressWrap.appendChild(mancheLabelEl);
  top.appendChild(progressWrap);

  // Compteur geant (composant partage )
  const counter = document.createElement('div');
  counter.className = 'compteur-geant';
  counterValueEl = document.createElement('span');
  counterValueEl.className = 'compteur-geant__value';
  counterValueEl.textContent = '0/3';
  const counterLabel = document.createElement('span');
  counterLabel.className = 'compteur-geant__label';
  counterLabel.textContent = 'reussis';
  counter.appendChild(counterValueEl);
  counter.appendChild(counterLabel);
  top.appendChild(counter);
  wrap.appendChild(top);

  // Main column
  mainEl = document.createElement('div');
  mainEl.className = 'step-D2__main';

  questionEl = document.createElement('h1');
  questionEl.className = 'step-D2__question';
  questionEl.textContent = ROUNDS[0].question;
  mainEl.appendChild(questionEl);

  // Tuko mysterieux inline retire : on a deja tuko_peda en bas-gauche,
  // doublon visuel inutile. Reference garde pour compatibilite code.
  tukoMystEl = null;

  // Double-vue
  doubleVueEl = document.createElement('div');
  doubleVueEl.className = 'step-D2__double-vue';

  // Layer graph
  layerGraphEl = document.createElement('div');
  layerGraphEl.className = 'step-D2__layer';
  const lgTitle = document.createElement('p');
  lgTitle.className = 'step-D2__layer__title';
  lgTitle.textContent = 'le graph';
  layerGraphEl.appendChild(lgTitle);
  const lgContent = document.createElement('div');
  lgContent.className = 'step-D2__layer__content';
  graphAreaEl = document.createElement('div');
  graphAreaEl.className = 'step-D2__graph-area';
  const axis = document.createElement('span');
  axis.className = 'step-D2__graph-axis';
  graphAreaEl.appendChild(axis);
  cursorEl = document.createElement('span');
  cursorEl.className = 'step-D2__cursor';
  graphAreaEl.appendChild(cursorEl);
  lgContent.appendChild(graphAreaEl);
  layerGraphEl.appendChild(lgContent);
  const lgHint = document.createElement('span');
  lgHint.className = 'step-D2__layer__hint';
  lgHint.textContent = '?';
  layerGraphEl.appendChild(lgHint);
  doubleVueEl.appendChild(layerGraphEl);

  // Layer timeline
  layerTimelineEl = document.createElement('div');
  layerTimelineEl.className = 'step-D2__layer';
  const ltTitle = document.createElement('p');
  ltTitle.className = 'step-D2__layer__title';
  ltTitle.textContent = 'la timeline';
  layerTimelineEl.appendChild(ltTitle);
  const ltContent = document.createElement('div');
  ltContent.className = 'step-D2__layer__content';
  timelineBitsEl = document.createElement('div');
  timelineBitsEl.className = 'step-D2__timeline-bits';
  ltContent.appendChild(timelineBitsEl);
  layerTimelineEl.appendChild(ltContent);
  const ltHint = document.createElement('span');
  ltHint.className = 'step-D2__layer__hint';
  ltHint.textContent = '?';
  layerTimelineEl.appendChild(ltHint);
  doubleVueEl.appendChild(layerTimelineEl);

  mainEl.appendChild(doubleVueEl);

  // Options row
  optionsEl = document.createElement('div');
  optionsEl.className = 'step-D2__options';
  mainEl.appendChild(optionsEl);

  wrap.appendChild(mainEl);

  // Tuko_peda en bas-gauche : sprite reel (PAS de .tuko-mascotte placeholder).
  // scaleX(-1) gere par le CSS pour qu'il regarde vers la droite.
  const tukoMain = document.createElement('img');
  tukoMain.className = 'step-D2__tuko';
  tukoMain.src = 'assets/sprites/tuko_peda.png';
  tukoMain.alt = '';
  wrap.appendChild(tukoMain);

  // CTA bas-centre (apparait apres manche 3) - convention CTA
  ctaAnchorEl = document.createElement('div');
  ctaAnchorEl.className = 'step-D2__cta-area';
  ctaEl = document.createElement('button');
  ctaEl.type = 'button';
  ctaEl.className = 'cta-primary step-D2__cta';
  ctaEl.textContent = 'DANS LA VRAIE VIE';
  ctaAnchorEl.appendChild(ctaEl);
  wrap.appendChild(ctaAnchorEl);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Trigger entrance animations
  requestAnimationFrame(() => {
    questionEl.classList.add('is-in');
    doubleVueEl.classList.add('is-in');
  });

  // Boot first round after entrance
  pushTimer(setTimeout(() => runRound(), 800));

  // CTA listener
  const onCta = () => {
    if (!ctaAnchorEl.classList.contains('is-in')) return;
    play('whoosh');
    ctaEl.disabled = true;
    navAPI.next();
  };
  ctaEl.addEventListener('click', onCta);
  handlers.push([ctaEl, 'click', onCta]);

  // Keyboard 1/2/3 to vote on current round options.
  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      e.preventDefault();
      const idx = Number(e.key) - 1;
      const optEl = optionsEl?.children[idx];
      if (optEl) optEl.click();
    }
  };
  window.addEventListener('keydown', onKey);
  handlers.push([window, 'keydown', onKey]);

  // Hover sur un 1 -> illumine bref (demo passive de la connexion cf. fiche).
  if (timelineBitsEl) {
    const onTimelineHover = (e) => {
      const target = e.target;
      if (!target?.classList?.contains('is-one')) return;
      target.classList.add('is-flash');
      pushTimer(setTimeout(() => target.classList.remove('is-flash'), 250));
    };
    timelineBitsEl.addEventListener('mouseover', onTimelineHover);
    handlers.push([timelineBitsEl, 'mouseover', onTimelineHover]);
  }
}

export default {
  id: 'D2',
  phase: 'D',
  title: 'Mini-jeu double-vue',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    currentRoundIdx = 0;
    score = 0;
    attemptInRound = 0;

    scene = new Container();
    scene.label = 'step-D2';
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
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
    mainEl = questionEl = tukoMystEl = doubleVueEl = null;
    layerGraphEl = layerTimelineEl = graphAreaEl = timelineBitsEl = cursorEl = null;
    optionsEl = counterValueEl = ctaEl = ctaAnchorEl = mancheLabelEl = null;
    segEls = [];
  },

  serialize() {
    // Etat : round 1-indexe (1..3), score number (0..3).
    return { round: currentRoundIdx + 1, score };
  },

  isComplete() {
    return currentRoundIdx >= ROUNDS.length - 1 && attemptInRound > 0;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

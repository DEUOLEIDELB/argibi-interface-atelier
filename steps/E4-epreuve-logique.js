// E4-epreuve-logique.js — Epreuve collective ET/OU (4 slides).
//
// Slide 1 : decouverte ET vs OU (2 cards opposees + exemples micro-ondes/cles).
// Slide 2 : quiz eclair 5 questions, vote ET ou OU, score X/5.
// Slide 3 : puzzle collectif ET sur matrice 8x8, revele digit5.
// Slide 4 : puzzle collectif OU sur matrice 8x8, revele digit6.
//
// Composants utilises :
//   - card-clickable (cards ET/OU, vote quiz)
//   - bouton-bascule (toggle visuel ET/OU sur slides 3/4)
//   - matrice virtuelle 8x8 (cliquable, CSS-only, perf OK pour 64 cells)
//   - cadenas indices deverrouillables (Q/W/E)
//   - cta-primary, cta-secondary (effacer / valider)
//   - cell-digit (code en cours 6 cellules en bas)
//   - barre-progression (4 segments slides)
//
// Persistance : state.steps.E4 = { slide, quizScore, quizIdx, puzzle3Solved,
//   puzzle4Solved, puzzle3Pixels, puzzle4Pixels, hints3, hints4,
//   digit5, digit6 }.
// Contrat avec F1 : F1 lit allState.steps.E4.digit5 + .digit6 pour les 2
// derniers chiffres du code final 6.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { saveStepState } from '../core/state.js';
import { spawnConfettis, spawnShockwave } from '../core/effects.js';
import { enableKurnelOverlay } from './_kurnel-overlay.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

/* --------------------------------------------------------------------------
   Config (digits par puzzle) — facile a tweaker sans toucher a la logique.
   -------------------------------------------------------------------------- */
const PUZZLE_3 = {
  // Regle : LIGNE 4 ET COLONNES D ou E (intersection)
  // Index 8x8 (row*8+col). Ligne 4 = row 3 (0-indexed). Colonnes D, E = col 3, 4.
  validPixels: new Set([3 * 8 + 3, 3 * 8 + 4]),
  digit: '2',  // 2 pixels valides
  rule: 'allume les pixels de la LIGNE 4 ET dans les COLONNES D ou E',
  hints: [
    'la ligne 4 c\'est la 4e en partant du haut',
    'D et E sont les colonnes 4 et 5',
    'l\'intersection : 2 pixels au centre',
  ],
  expectedCount: 2,
};

const PUZZLE_4 = {
  // Regle : LIGNE 1 OU LIGNE 8 (lignes 0 ou 7 en 0-indexed)
  validPixels: new Set([
    ...Array.from({ length: 8 }, (_, i) => i),         // ligne 0 (= ligne 1 humaine)
    ...Array.from({ length: 8 }, (_, i) => 7 * 8 + i), // ligne 7 (= ligne 8)
  ]),
  digit: '8',  // 8 pixels par ligne valide
  rule: 'allume les pixels de la LIGNE 1 OU de la LIGNE 8',
  warn: 'attention, plusieurs solutions sont valides : ligne 1, ligne 8, ou les deux !',
  hints: [
    'la ligne 1 c\'est la toute premiere en haut',
    'la ligne 8 c\'est la toute derniere en bas',
    'tu peux choisir l\'une, l\'autre, ou les deux',
  ],
  // Acceptable si une ligne complete OU les deux completes
  isCorrect(allumes) {
    if (allumes.size === 0) return false;
    // toutes les cellules allumees doivent etre dans validPixels
    for (const i of allumes) if (!PUZZLE_4.validPixels.has(i)) return false;
    // au moins une ligne complete
    const ligne1 = [0,1,2,3,4,5,6,7].every(i => allumes.has(i));
    const ligne8 = [56,57,58,59,60,61,62,63].every(i => allumes.has(i));
    return ligne1 || ligne8;
  },
  expectedCount: 8,
};

const QUIZ_QUESTIONS = [
  { emoji: '🥞', text: 'pour faire des pancakes, il faut de la farine __ des oeufs.', answer: 'ET' },
  { emoji: '🔑', text: 'rentrer chez moi : ma cle __ celle de mes parents.',          answer: 'OU' },
  { emoji: '🚦', text: 'traverser la rue : feu vert __ pas de voiture.',              answer: 'ET' },
  { emoji: '🍕', text: 'commander une pizza : tomate __ champignons.',                answer: 'OU' },
  { emoji: '📱', text: 'allumer mon telephone : batterie __ bouton power.',           answer: 'ET' },
];

let state = {
  slide: 1,
  quizIdx: 0,
  quizScore: 0,
  puzzle3Solved: false,
  puzzle4Solved: false,
  puzzle3Pixels: [],
  puzzle4Pixels: [],
  hints3: [false, false, false],
  hints4: [false, false, false],
  digit5: null,
  digit6: null,
};

const STYLE_ID = 'step-E4-style';

const CSS = `
.step-E4 {
  position: absolute;
  inset: 0;
  background: var(--bg);
  cursor: var(--cursor-default);
  font-family: var(--display);
  color: var(--ink);
  user-select: none;
}

.step-E4__progress {
  position: absolute;
  top: var(--s-3);
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  z-index: 50;
}
.step-E4__progress-tag {
  display: block;
  margin-top: var(--s-1);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  opacity: 0.6;
  color: var(--ink);
}

/* ---- Slides container ---- */
.step-E4__slide {
  position: absolute;
  inset: 80px var(--s-6) 80px;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  text-align: center;
}
.step-E4__slide.is-active { display: flex; }

/* ---- Slide 1 : decouverte ET / OU ---- */
.step-E4__slide-1__title {
  font-family: var(--display);
  font-size: var(--t-h1);
  margin: 0;
  text-transform: uppercase;
}
.step-E4__slide-1__sub {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  margin: 0;
  text-transform: lowercase;
  opacity: 0.8;
}
.step-E4__et-ou {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  width: min(1300px, 92%);
  margin-top: var(--s-3);
}
.step-E4__et-ou-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-4);
  text-align: center;
  align-items: center;
}
.step-E4__et-ou-card--et { border-color: var(--ink); }
.step-E4__et-ou-card--ou { border-color: var(--ink); }
.step-E4__et-ou-card__op {
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 0;
}
.step-E4__et-ou-card__motto {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  margin: 0;
  text-transform: lowercase;
  opacity: 0.85;
}
.step-E4__et-ou-illu {
  width: 100%;
  min-height: 180px;
}

/* ---- Slide 2 : quiz ET ou OU ---- */
.step-E4__quiz-score {
  position: absolute;
  top: var(--s-3);
  right: var(--s-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--display);
}
.step-E4__quiz-score-num {
  font-size: var(--t-h1);
  font-weight: 900;
  line-height: 1;
}
.step-E4__quiz-score-num.is-pulsing { animation: e4-pulse 0.4s var(--ease-bounce); }
.step-E4__quiz-score-lbl {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.6;
}
.step-E4__quiz-card {
  width: min(700px, 92%);
  padding: var(--s-4);
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}
.step-E4__quiz-emoji {
  font-size: var(--t-hero);
  animation: e4-bounce 1.6s ease-in-out infinite;
}
.step-E4__quiz-text {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  text-transform: lowercase;
}
.step-E4__quiz-vote {
  display: flex;
  gap: var(--s-3);
  margin-top: var(--s-2);
}
.step-E4__quiz-card-vote {
  width: 200px;
  padding: var(--s-2);
  text-align: center;
}
.step-E4__quiz-card-vote .step-E4__et-ou-card__op { font-size: var(--t-h1); }
.step-E4__quiz-card-vote.is-correct {
  background: var(--accent-3);
  animation: e4-glow-correct 0.6s var(--ease-out);
}
.step-E4__quiz-card-vote.is-wrong {
  animation: e4-shake 0.4s ease-in-out;
}
.step-E4__quiz-bilan {
  display: flex;
  gap: var(--s-2);
  margin-top: var(--s-3);
}
.step-E4__quiz-bilan-item {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  font-size: var(--t-h2);
  background: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-md);
  position: relative;
  opacity: 0;
  transform: scale(0);
  animation: e4-pop-bilan var(--d-fast) var(--ease-bounce) forwards;
}
.step-E4__quiz-bilan-item::after {
  content: attr(data-tag);
  position: absolute;
  bottom: -22px;
  font-family: var(--display);
  font-size: var(--t-small);
  font-weight: 900;
}
.step-E4__quiz-bilan-item[data-tag="✓"]::after { color: var(--accent-1); }
.step-E4__quiz-bilan-item[data-tag="✗"]::after { color: var(--accent-4); }

/* ---- Slides 3 & 4 : puzzles ---- */
.step-E4__puzzle {
  display: grid;
  grid-template-columns: auto 320px;
  gap: var(--s-4);
  align-items: start;
  width: min(1400px, 95%);
}
.step-E4__rule {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-3);
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 700;
  text-transform: lowercase;
  text-align: left;
  width: 100%;
}
.step-E4__rule-tag {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  background: var(--ink);
  color: var(--paper);
  padding: var(--s-1) var(--s-2);
  border-radius: var(--r-sm);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.step-E4__rule-tag--ou { background: var(--accent-1); }
.step-E4__rule-warn {
  grid-column: 1 / -1;
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.06em;
  color: var(--accent-4);
  text-align: left;
  margin: 0;
}

/* Toggle ET/OU : composant partage .bouton-bascule (passif, montre le mode courant) */
.step-E4__toggle { margin-left: auto; }

/* Matrice host (la matrice elle-meme = composant partage .matrice-8x8.is-cliquable) */
.step-E4__matrix-host {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

/* Coordonnees A-H / 1-8 alignees avec la matrice partagee (vars --matrice-8x8-*) */
.step-E4__matrix-coords {
  display: grid;
  grid-template-columns: 28px var(--matrice-8x8-size, 440px);
  gap: var(--matrice-8x8-gap, 6px);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  opacity: 0.5;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.step-E4__matrix-coords-inner {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--matrice-8x8-gap, 6px);
  padding: 0 var(--matrice-8x8-padding, 14px);
}
.step-E4__matrix-coords-inner > span {
  text-align: center;
}
.step-E4__matrix-row-label {
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  gap: var(--matrice-8x8-gap, 6px);
  padding: var(--matrice-8x8-padding, 14px) 0;
  height: var(--matrice-8x8-size, 440px);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  opacity: 0.5;
}
.step-E4__matrix-row-label > span {
  display: grid;
  place-items: center;
}
.step-E4__matrix-with-rows {
  display: grid;
  grid-template-columns: 28px auto;
  gap: var(--matrice-8x8-gap, 6px);
  align-items: start;
}

/* Side panel : indices + actions + code en cours */
.step-E4__side {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  align-items: stretch;
}
.step-E4__side-tag {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 0;
}
.step-E4__hints {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}
.step-E4__hints-row {
  display: flex;
  gap: var(--s-1);
}
/* Hint lockers : composant partage .cadenas (taille reduite scope local) */
.step-E4__hint-locker {
  --cadenas-size: 56px;
}
.step-E4__hint-bubble {
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 600;
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-md);
  padding: var(--s-1);
  text-align: left;
  animation: e4-hint-drop var(--d-normal) var(--ease-bounce);
}
.step-E4__count {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-align: center;
  margin: 0;
}
.step-E4__count-sub {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.6;
  text-align: center;
}
.step-E4__actions {
  display: flex;
  gap: var(--s-2);
  margin-top: var(--s-1);
}
.step-E4__btn-clear, .step-E4__btn-validate {
  flex: 1;
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 700;
  text-transform: uppercase;
  padding: var(--s-2);
  border: var(--border);
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
}
.step-E4__btn-clear {
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.step-E4__btn-validate {
  background: var(--accent-1);
  color: var(--paper);
  box-shadow: var(--shadow);
}
.step-E4__btn-validate:hover { transform: translate(-3px, -3px); box-shadow: var(--shadow-lg); }

/* Code en cours (6 cellules en bas du puzzle) */
.step-E4__code {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}
.step-E4__code-row {
  display: flex;
  gap: var(--s-1);
}
.step-E4__code-cell {
  width: 56px;
  height: 72px;
  font-size: var(--t-h1);
}
.step-E4__code-cell.is-pulsing { animation: e4-pulse 1s ease-in-out infinite; }
.step-E4__code-line {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 0;
}

/* CTA next slide / final */
.step-E4__cta-host {
  position: absolute;
  bottom: 12px;
  right: var(--s-6);
}
.step-E4__cta {
  opacity: 0;
  transform: scale(0);
  transition: opacity var(--d-normal) var(--ease-out),
              transform var(--d-normal) var(--ease-bounce);
}
.step-E4__cta.is-shown { opacity: 1; transform: scale(1); }

/* Keyframes */
@keyframes e4-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
@keyframes e4-bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes e4-glow-correct {
  0%, 100% { box-shadow: var(--shadow); }
  50%      { box-shadow: 0 0 0 6px var(--accent-3), var(--shadow); }
}
@keyframes e4-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(5px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(3px); }
}
@keyframes e4-pop-bilan {
  to { transform: scale(1); opacity: 1; }
}
@keyframes e4-hint-drop {
  0%   { transform: translateY(-15px); opacity: 0; }
  100% { transform: translateY(0);     opacity: 1; }
}

/* Reward effect (digit revele migrant) */
.step-E4__reveal-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 80;
  display: grid;
  place-items: center;
}
.step-E4__digit-hero {
  font-family: var(--display);
  font-size: calc(var(--t-hero) * 2);
  font-weight: 900;
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow-xl);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-4);
  opacity: 0;
  transform: scale(0);
  transition: transform 0.8s var(--ease-bounce), opacity 0.4s var(--ease-out);
}
.step-E4__digit-hero.is-shown {
  opacity: 1;
  transform: scale(1);
}
.step-E4__digit-hero.is-flying {
  transition: transform 1s var(--ease-out), opacity 0.4s ease-out 0.6s;
  opacity: 0;
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

/* --------------------------------------------------------------------------
   Builders
   -------------------------------------------------------------------------- */
function buildProgress(currentSlide) {
  const wrap = document.createElement('div');
  wrap.className = 'step-E4__progress';
  const bar = document.createElement('div');
  bar.className = 'barre-progression';
  for (let i = 1; i <= 4; i++) {
    const seg = document.createElement('div');
    seg.className = 'barre-progression__seg';
    if (i < currentSlide) seg.classList.add('is-done');
    if (i === currentSlide) seg.classList.add('is-current');
    bar.appendChild(seg);
  }
  wrap.appendChild(bar);
  const tag = document.createElement('span');
  tag.className = 'step-E4__progress-tag';
  tag.textContent = `logique · ${currentSlide} sur 4`;
  wrap.appendChild(tag);
  return wrap;
}

function buildSlide1() {
  const slide = document.createElement('div');
  slide.className = 'step-E4__slide step-E4__slide--1';

  const t = document.createElement('h1');
  t.className = 'step-E4__slide-1__title';
  t.textContent = 'DEUX REGLES MAGIQUES';
  slide.appendChild(t);
  const s = document.createElement('p');
  s.className = 'step-E4__slide-1__sub';
  s.textContent = 'une exigeante · une tolerante';
  slide.appendChild(s);

  const wrap = document.createElement('div');
  wrap.className = 'step-E4__et-ou';

  const cardET = document.createElement('div');
  cardET.className = 'card-clickable step-E4__et-ou-card step-E4__et-ou-card--et';
  const opET = document.createElement('div');
  opET.className = 'step-E4__et-ou-card__op'; opET.textContent = 'ET';
  const motoET = document.createElement('p');
  motoET.className = 'step-E4__et-ou-card__motto'; motoET.textContent = 'les deux. ou rien.';
  const illuET = document.createElement('div');
  illuET.className = 'placeholder-image step-E4__et-ou-illu';
  illuET.textContent = '[ MICRO-ONDES porte fermee ET bouton START ]';
  cardET.appendChild(opET); cardET.appendChild(motoET); cardET.appendChild(illuET);

  const cardOU = document.createElement('div');
  cardOU.className = 'card-clickable step-E4__et-ou-card step-E4__et-ou-card--ou';
  const opOU = document.createElement('div');
  opOU.className = 'step-E4__et-ou-card__op'; opOU.textContent = 'OU';
  const motoOU = document.createElement('p');
  motoOU.className = 'step-E4__et-ou-card__motto'; motoOU.textContent = 'une suffit. deux aussi.';
  const illuOU = document.createElement('div');
  illuOU.className = 'placeholder-image step-E4__et-ou-illu';
  illuOU.textContent = '[ CLES MAISON : ta cle OU celle de tes parents ]';
  cardOU.appendChild(opOU); cardOU.appendChild(motoOU); cardOU.appendChild(illuOU);

  wrap.appendChild(cardET); wrap.appendChild(cardOU);
  slide.appendChild(wrap);

  return slide;
}

function buildSlide2() {
  const slide = document.createElement('div');
  slide.className = 'step-E4__slide step-E4__slide--2';

  // Score panel (haut-droite)
  const score = document.createElement('div');
  score.className = 'step-E4__quiz-score';
  const num = document.createElement('span');
  num.className = 'step-E4__quiz-score-num'; num.textContent = '0/5';
  num.dataset.role = 'score';
  const lbl = document.createElement('span');
  lbl.className = 'step-E4__quiz-score-lbl'; lbl.textContent = 'reussis';
  score.appendChild(num); score.appendChild(lbl);
  slide.appendChild(score);

  // Question card
  const card = document.createElement('div');
  card.className = 'step-E4__quiz-card';
  card.dataset.role = 'quiz-card';
  const emoji = document.createElement('div');
  emoji.className = 'step-E4__quiz-emoji';
  emoji.dataset.role = 'emoji';
  card.appendChild(emoji);
  const text = document.createElement('p');
  text.className = 'step-E4__quiz-text';
  text.dataset.role = 'text';
  card.appendChild(text);

  const vote = document.createElement('div');
  vote.className = 'step-E4__quiz-vote';
  const voteET = document.createElement('div');
  voteET.className = 'card-clickable step-E4__et-ou-card step-E4__quiz-card-vote';
  voteET.dataset.vote = 'ET';
  const opVE = document.createElement('div'); opVE.className = 'step-E4__et-ou-card__op'; opVE.textContent = 'ET';
  voteET.appendChild(opVE);

  const voteOU = document.createElement('div');
  voteOU.className = 'card-clickable step-E4__et-ou-card step-E4__quiz-card-vote';
  voteOU.dataset.vote = 'OU';
  const opVO = document.createElement('div'); opVO.className = 'step-E4__et-ou-card__op'; opVO.textContent = 'OU';
  voteOU.appendChild(opVO);

  vote.appendChild(voteET); vote.appendChild(voteOU);
  card.appendChild(vote);

  // Bilan en bas (5 emojis)
  const bilan = document.createElement('div');
  bilan.className = 'step-E4__quiz-bilan';
  bilan.dataset.role = 'bilan';
  card.appendChild(bilan);

  slide.appendChild(card);
  return slide;
}

function buildPuzzleSlide(slideNum, puzzle, opTag) {
  const slide = document.createElement('div');
  slide.className = `step-E4__slide step-E4__slide--${slideNum}`;
  slide.dataset.puzzle = String(slideNum);

  const wrap = document.createElement('div');
  wrap.className = 'step-E4__puzzle';

  // Rule bar
  const rule = document.createElement('div');
  rule.className = 'step-E4__rule';
  const tag = document.createElement('span');
  tag.className = 'step-E4__rule-tag' + (opTag === 'OU' ? ' step-E4__rule-tag--ou' : '');
  tag.textContent = opTag;
  rule.appendChild(tag);
  const ruleText = document.createElement('span');
  ruleText.textContent = puzzle.rule;
  rule.appendChild(ruleText);

  // Toggle visuel ET/OU — composant partage .bouton-bascule (passif, montre le mode)
  const toggle = document.createElement('label');
  toggle.className = 'bouton-bascule bouton-bascule--passif step-E4__toggle '
                     + (opTag === 'ET' ? 'is-left' : 'is-right');
  const lblET = document.createElement('span');
  lblET.className = 'bouton-bascule__mark bouton-bascule__mark--left';
  lblET.textContent = 'ET';
  const pad = document.createElement('span');
  pad.className = 'bouton-bascule__pad';
  const lblOU = document.createElement('span');
  lblOU.className = 'bouton-bascule__mark bouton-bascule__mark--right';
  lblOU.textContent = 'OU';
  toggle.appendChild(lblET); toggle.appendChild(pad); toggle.appendChild(lblOU);
  rule.appendChild(toggle);

  wrap.appendChild(rule);

  // Optional warning
  if (puzzle.warn) {
    const w = document.createElement('p');
    w.className = 'step-E4__rule-warn';
    w.textContent = puzzle.warn;
    wrap.appendChild(w);
  }

  // Matrix host
  const matrixHost = document.createElement('div');
  matrixHost.className = 'step-E4__matrix-host';
  const head = document.createElement('p');
  head.className = 'step-E4__side-tag';
  head.textContent = 'matrice 8 x 8';
  matrixHost.appendChild(head);

  // Coords header (col labels A-H) — grille interne aligne sur .matrice-8x8
  const matrixCoords = document.createElement('div');
  matrixCoords.className = 'step-E4__matrix-coords';
  const empty = document.createElement('span'); empty.textContent = '';
  matrixCoords.appendChild(empty);
  const coordsInner = document.createElement('div');
  coordsInner.className = 'step-E4__matrix-coords-inner';
  ['A','B','C','D','E','F','G','H'].forEach(c => {
    const s = document.createElement('span'); s.textContent = c;
    coordsInner.appendChild(s);
  });
  matrixCoords.appendChild(coordsInner);
  matrixHost.appendChild(matrixCoords);

  const matrixWith = document.createElement('div');
  matrixWith.className = 'step-E4__matrix-with-rows';
  const rowLabels = document.createElement('div');
  rowLabels.className = 'step-E4__matrix-row-label';
  for (let r = 1; r <= 8; r++) {
    const s = document.createElement('span'); s.textContent = String(r);
    rowLabels.appendChild(s);
  }
  matrixWith.appendChild(rowLabels);

  // Composant partage .matrice-8x8 cliquable (64 pixels)
  const matrix = document.createElement('div');
  matrix.className = 'matrice-8x8 is-cliquable step-E4__matrix';
  matrix.dataset.role = 'matrix';
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'matrice-8x8__pixel step-E4__pix';
    cell.dataset.idx = String(i);
    matrix.appendChild(cell);
  }
  matrixWith.appendChild(matrix);
  matrixHost.appendChild(matrixWith);

  wrap.appendChild(matrixHost);

  // Side panel : hints + actions + count
  const side = document.createElement('div');
  side.className = 'step-E4__side';

  const hHead = document.createElement('p');
  hHead.className = 'step-E4__side-tag';
  hHead.textContent = 'indices';
  side.appendChild(hHead);

  const hints = document.createElement('div');
  hints.className = 'step-E4__hints';
  const hintsRow = document.createElement('div');
  hintsRow.className = 'step-E4__hints-row';
  for (let i = 0; i < 3; i++) {
    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'cadenas cadenas--ferme is-pulsing step-E4__hint-locker';
    lock.dataset.hintIdx = String(i);
    lock.setAttribute('aria-label', `Indice ${i + 1}`);
    hintsRow.appendChild(lock);
  }
  hints.appendChild(hintsRow);
  const revealed = document.createElement('div');
  revealed.dataset.role = 'hints-revealed';
  revealed.style.display = 'flex';
  revealed.style.flexDirection = 'column';
  revealed.style.gap = 'var(--s-1)';
  revealed.style.minHeight = '40px';
  hints.appendChild(revealed);
  side.appendChild(hints);

  const cnt = document.createElement('p');
  cnt.className = 'step-E4__count';
  cnt.dataset.role = 'count';
  cnt.textContent = `0 / ${puzzle.expectedCount}`;
  side.appendChild(cnt);
  const cntSub = document.createElement('p');
  cntSub.className = 'step-E4__count-sub';
  cntSub.textContent = 'pixels allumes';
  side.appendChild(cntSub);

  const actions = document.createElement('div');
  actions.className = 'step-E4__actions';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'step-E4__btn-clear';
  clear.textContent = 'effacer';
  actions.appendChild(clear);
  const validate = document.createElement('button');
  validate.type = 'button';
  validate.className = 'step-E4__btn-validate';
  validate.dataset.role = 'validate';
  validate.textContent = 'valider';
  actions.appendChild(validate);
  side.appendChild(actions);

  wrap.appendChild(side);
  slide.appendChild(wrap);

  // Code en cours (6 cellules) en bas
  const code = document.createElement('div');
  code.className = 'step-E4__code';
  const codeRow = document.createElement('div');
  codeRow.className = 'step-E4__code-row';
  for (let i = 0; i < 6; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell-digit step-E4__code-cell';
    cell.dataset.codeIdx = String(i);
    codeRow.appendChild(cell);
  }
  code.appendChild(codeRow);
  const ln = document.createElement('p');
  ln.className = 'step-E4__code-line';
  ln.textContent = 'C C P P L L';
  code.appendChild(ln);
  slide.appendChild(code);

  // Reveal host (digit hero qui apparait au validate correct)
  const revealHost = document.createElement('div');
  revealHost.className = 'step-E4__reveal-host';
  revealHost.dataset.role = 'reveal-host';
  slide.appendChild(revealHost);

  return slide;
}

function buildCtaHost() {
  const host = document.createElement('div');
  host.className = 'step-E4__cta-host';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-E4__cta';
  cta.dataset.role = 'cta';
  cta.textContent = '▶ SUIVANT';
  host.appendChild(cta);
  return host;
}

/* --------------------------------------------------------------------------
   Quiz logic
   -------------------------------------------------------------------------- */
function renderQuizQuestion(slide) {
  const q = QUIZ_QUESTIONS[state.quizIdx];
  if (!q) return;
  slide.querySelector('[data-role="emoji"]').textContent = q.emoji;
  slide.querySelector('[data-role="text"]').textContent = q.text;
  slide.querySelector('[data-role="score"]').textContent = `${state.quizScore}/${QUIZ_QUESTIONS.length}`;
  slide.querySelectorAll('.step-E4__quiz-card-vote').forEach(c => {
    c.classList.remove('is-correct', 'is-wrong');
  });
}

function answerQuiz(slide, root, vote) {
  const q = QUIZ_QUESTIONS[state.quizIdx];
  if (!q) return;
  const cards = slide.querySelectorAll('.step-E4__quiz-card-vote');
  const chosen = [...cards].find(c => c.dataset.vote === vote);
  const correct = vote === q.answer;
  if (correct) {
    chosen?.classList.add('is-correct');
    state.quizScore += 1;
    play('success');
  } else {
    chosen?.classList.add('is-wrong');
    play('error');
  }
  // Bilan emoji
  const bilan = slide.querySelector('[data-role="bilan"]');
  if (bilan) {
    const item = document.createElement('div');
    item.className = 'step-E4__quiz-bilan-item';
    item.textContent = q.emoji;
    item.dataset.tag = correct ? '✓' : '✗';
    bilan.appendChild(item);
  }

  // Pulse score
  const sc = slide.querySelector('[data-role="score"]');
  sc?.classList.add('is-pulsing');
  setTimeout(() => sc?.classList.remove('is-pulsing'), 400);

  saveStepState('E4', { ...state });

  // Question suivante apres delay
  const t = setTimeout(() => {
    state.quizIdx += 1;
    if (state.quizIdx >= QUIZ_QUESTIONS.length) {
      // Fin du quiz : on revele la CTA pour passer au puzzle
      const cta = root.querySelector('.step-E4__cta');
      cta?.classList.add('is-shown');
      play('victory');
    } else {
      renderQuizQuestion(slide);
    }
    saveStepState('E4', { ...state });
  }, 900);
  timers.push(t);
}

/* --------------------------------------------------------------------------
   Puzzle logic
   -------------------------------------------------------------------------- */
function pixelsKey(slideNum) {
  return slideNum === 3 ? 'puzzle3Pixels' : 'puzzle4Pixels';
}
function hintsKey(slideNum) {
  return slideNum === 3 ? 'hints3' : 'hints4';
}
function solvedKey(slideNum) {
  return slideNum === 3 ? 'puzzle3Solved' : 'puzzle4Solved';
}
function digitKey(slideNum) {
  return slideNum === 3 ? 'digit5' : 'digit6';
}

function getPuzzle(slideNum) { return slideNum === 3 ? PUZZLE_3 : PUZZLE_4; }

function refreshPuzzleCount(slide, slideNum) {
  const pixels = state[pixelsKey(slideNum)];
  const cnt = slide.querySelector('[data-role="count"]');
  if (cnt) cnt.textContent = `${pixels.length} / ${getPuzzle(slideNum).expectedCount}`;
}

function refreshPuzzlePixels(slide, slideNum) {
  const pixels = new Set(state[pixelsKey(slideNum)]);
  slide.querySelectorAll('.step-E4__pix').forEach(p => {
    const idx = +p.dataset.idx;
    p.classList.toggle('is-on', pixels.has(idx));
    p.classList.remove('is-wrong', 'is-blinking', 'is-hint');
  });
}

function togglePixel(slide, slideNum, idx) {
  if (state[solvedKey(slideNum)]) return;
  const arr = state[pixelsKey(slideNum)];
  const pos = arr.indexOf(idx);
  if (pos >= 0) arr.splice(pos, 1);
  else arr.push(idx);
  state[pixelsKey(slideNum)] = arr;
  saveStepState('E4', { ...state });
  refreshPuzzleCount(slide, slideNum);
  const cell = slide.querySelector(`.step-E4__pix[data-idx="${idx}"]`);
  cell?.classList.toggle('is-on', arr.includes(idx));
  play('tic');
}

function clearPixels(slide, slideNum) {
  if (state[solvedKey(slideNum)]) return;
  state[pixelsKey(slideNum)] = [];
  saveStepState('E4', { ...state });
  refreshPuzzlePixels(slide, slideNum);
  refreshPuzzleCount(slide, slideNum);
  play('whoosh');
}

function validatePuzzle(slide, root, slideNum) {
  const allumes = new Set(state[pixelsKey(slideNum)]);
  const puzzle = getPuzzle(slideNum);
  let correct;
  if (slideNum === 3) {
    // ET : exactement les pixels valides
    correct = allumes.size === puzzle.validPixels.size
              && [...puzzle.validPixels].every(i => allumes.has(i));
  } else {
    correct = puzzle.isCorrect(allumes);
  }
  if (correct) {
    state[solvedKey(slideNum)] = true;
    state[digitKey(slideNum)] = puzzle.digit;
    saveStepState('E4', { ...state });
    fireRevealDigit(slide, slideNum, puzzle.digit);
  } else {
    // Highlight wrong + missing (composant partage : .is-wrong / .is-blinking)
    slide.querySelectorAll('.step-E4__pix').forEach(p => {
      const idx = +p.dataset.idx;
      const isOn = allumes.has(idx);
      const expectedOn = (slideNum === 3) ? puzzle.validPixels.has(idx) : false;
      p.classList.remove('is-wrong', 'is-blinking');
      if (isOn && !puzzle.validPixels.has(idx)) p.classList.add('is-wrong');
      if (slideNum === 3 && !isOn && expectedOn) p.classList.add('is-blinking');
    });
    play('error');
  }
}

function revealHint(slide, slideNum, idx) {
  const arr = state[hintsKey(slideNum)];
  if (idx < 0 || idx > 2) return;
  if (arr[idx]) return;
  arr[idx] = true;
  state[hintsKey(slideNum)] = arr;
  saveStepState('E4', { ...state });

  const lock = slide.querySelector(`.step-E4__hint-locker[data-hint-idx="${idx}"]`);
  if (lock) {
    lock.classList.remove('is-pulsing');
    lock.classList.add('is-unlocking');
    const tOpen = setTimeout(() => {
      lock.classList.remove('cadenas--ferme');
      lock.classList.add('cadenas--ouvert');
    }, 600);
    timers.push(tOpen);
  }
  const revealed = slide.querySelector('[data-role="hints-revealed"]');
  if (revealed) {
    const bubble = document.createElement('div');
    bubble.className = 'step-E4__hint-bubble';
    bubble.textContent = `💡 ${getPuzzle(slideNum).hints[idx]}`;
    revealed.appendChild(bubble);
  }
  // Visualise sur la matrice : highlight ligne/colonne concernees
  const puzzle = getPuzzle(slideNum);
  const cells = slide.querySelectorAll('.step-E4__pix');
  if (slideNum === 3) {
    if (idx === 0) cells.forEach(c => { if (Math.floor(+c.dataset.idx / 8) === 3) c.classList.add('is-hint'); });
    if (idx === 1) cells.forEach(c => { const col = +c.dataset.idx % 8; if (col === 3 || col === 4) c.classList.add('is-hint'); });
    if (idx === 2) cells.forEach(c => { if (puzzle.validPixels.has(+c.dataset.idx)) c.classList.add('is-hint'); });
  } else {
    if (idx === 0) cells.forEach(c => { if (Math.floor(+c.dataset.idx / 8) === 0) c.classList.add('is-hint'); });
    if (idx === 1) cells.forEach(c => { if (Math.floor(+c.dataset.idx / 8) === 7) c.classList.add('is-hint'); });
    if (idx === 2) cells.forEach(c => { if (puzzle.validPixels.has(+c.dataset.idx)) c.classList.add('is-hint'); });
  }
  play('unlock');
}

function fireRevealDigit(slide, slideNum, digit) {
  const host = slide.querySelector('[data-role="reveal-host"]');
  if (!host) return;
  const hero = document.createElement('div');
  hero.className = 'step-E4__digit-hero';
  hero.textContent = digit;
  host.appendChild(hero);
  requestAnimationFrame(() => hero.classList.add('is-shown'));

  // Reward onde de victoire + gerbe confettis via helpers partages
  spawnShockwave(slide, { rayonMax: 1200, duree: 800 });
  spawnConfettis(slide, { nombre: 14 });

  play('victory');

  // Apres 1.2s : envoie le digit vers la cellule du code en bas
  const tFly = setTimeout(() => {
    const codeCell = slide.querySelector(
      `.step-E4__code-cell[data-code-idx="${slideNum === 3 ? 4 : 5}"]`,
    );
    if (codeCell) {
      const heroRect = hero.getBoundingClientRect();
      const targetRect = codeCell.getBoundingClientRect();
      const dx = targetRect.left - heroRect.left + (targetRect.width - heroRect.width) / 2;
      const dy = targetRect.top - heroRect.top + (targetRect.height - heroRect.height) / 2;
      hero.classList.add('is-flying');
      hero.style.transform = `translate(${dx}px, ${dy}px) scale(${targetRect.width / heroRect.width})`;
      const tArrived = setTimeout(() => {
        hero.remove();
        codeCell.textContent = digit;
        codeCell.classList.add('is-filled');
      }, 950);
      timers.push(tArrived);
    }
  }, 1200);
  timers.push(tFly);

  // CTA "suivant"
  const root = domNodes[0];
  const cta = root?.querySelector('.step-E4__cta');
  cta?.classList.add('is-shown');
}

/* --------------------------------------------------------------------------
   Slide management
   -------------------------------------------------------------------------- */
function setSlide(root, slideNum, navAPI) {
  state.slide = slideNum;
  saveStepState('E4', { ...state });

  // Maj progress
  const prog = root.querySelector('.step-E4__progress');
  if (prog) prog.replaceWith(buildProgress(slideNum));

  // Active la bonne slide
  root.querySelectorAll('.step-E4__slide').forEach(s => {
    s.classList.toggle('is-active', +s.dataset.slideNum === slideNum);
  });

  // Setup specifique
  const slide = root.querySelector(`.step-E4__slide--${slideNum}`);
  if (!slide) return;

  // Reset CTA visibility (sauf si la slide est deja completee)
  const cta = root.querySelector('.step-E4__cta');
  cta?.classList.remove('is-shown');
  if (cta) {
    if (slideNum === 1) {
      cta.textContent = '▶ ON FAIT UN QUIZ ECLAIR';
      cta.classList.add('is-shown');
    } else if (slideNum === 2) {
      cta.textContent = '▶ ON ATTAQUE LES PUZZLES';
      if (state.quizIdx >= QUIZ_QUESTIONS.length) cta.classList.add('is-shown');
    } else if (slideNum === 3) {
      cta.textContent = '▶ PUZZLE OU';
      if (state.puzzle3Solved) cta.classList.add('is-shown');
    } else if (slideNum === 4) {
      cta.textContent = '▶ ON ASSEMBLE LE CODE COMPLET';
      if (state.puzzle4Solved) cta.classList.add('is-shown');
    }
  }

  // Slide 2 : render question
  if (slideNum === 2) {
    if (state.quizIdx >= QUIZ_QUESTIONS.length) {
      // Quiz deja termine, refresh juste l'affichage
      const sc = slide.querySelector('[data-role="score"]');
      if (sc) sc.textContent = `${state.quizScore}/${QUIZ_QUESTIONS.length}`;
    } else {
      renderQuizQuestion(slide);
    }
  }

  // Slides 3/4 : restore pixels + hints + code en cours
  if (slideNum === 3 || slideNum === 4) {
    refreshPuzzlePixels(slide, slideNum);
    refreshPuzzleCount(slide, slideNum);
    // Restore hints
    const hintsArr = state[hintsKey(slideNum)];
    hintsArr.forEach((revealed, i) => {
      if (!revealed) return;
      const lock = slide.querySelector(`.step-E4__hint-locker[data-hint-idx="${i}"]`);
      if (lock) {
        lock.classList.remove('is-pulsing', 'cadenas--ferme', 'is-unlocking');
        lock.classList.add('cadenas--ouvert');
      }
      const revealedZone = slide.querySelector('[data-role="hints-revealed"]');
      if (revealedZone) {
        const b = document.createElement('div');
        b.className = 'step-E4__hint-bubble';
        b.style.animation = 'none';
        b.textContent = `💡 ${getPuzzle(slideNum).hints[i]}`;
        revealedZone.appendChild(b);
      }
    });
    // Restore code en cours
    fillCodeCells(slide);
  }
}

function fillCodeCells(slide) {
  // 6 cellules : C C P P L L → idx 0..3 viennent de E3, 4..5 d'E4.
  // On lit l'etat de l'autre step via state.steps mais on n'a que getStepState
  // ici en interne. L'interface F1 fera l'assemblage final ; ici on remplit
  // au moins la cellule du puzzle en cours quand resolu.
  // Pour cette page on remplit juste les cellules digit5/digit6 quand
  // disponibles.
  const cells = slide.querySelectorAll('.step-E4__code-cell');
  if (state.digit5 && cells[4]) {
    cells[4].textContent = state.digit5;
    cells[4].classList.add('is-filled');
  }
  if (state.digit6 && cells[5]) {
    cells[5].textContent = state.digit6;
    cells[5].classList.add('is-filled');
  }
  // Highlight cellule cible (en attente)
  cells.forEach(c => c.classList.remove('is-pulsing'));
  if (slide.dataset.puzzle === '3' && !state.digit5 && cells[4]) cells[4].classList.add('is-pulsing');
  if (slide.dataset.puzzle === '4' && !state.digit6 && cells[5]) cells[5].classList.add('is-pulsing');
}

/* --------------------------------------------------------------------------
   DOM principal + listeners
   -------------------------------------------------------------------------- */
function buildDom(navAPI) {
  const root = document.createElement('div');
  root.className = 'step-E4';

  root.appendChild(buildProgress(state.slide));

  const s1 = buildSlide1();      s1.dataset.slideNum = '1'; root.appendChild(s1);
  const s2 = buildSlide2();      s2.dataset.slideNum = '2'; root.appendChild(s2);
  const s3 = buildPuzzleSlide(3, PUZZLE_3, 'ET'); s3.dataset.slideNum = '3'; root.appendChild(s3);
  const s4 = buildPuzzleSlide(4, PUZZLE_4, 'OU'); s4.dataset.slideNum = '4'; root.appendChild(s4);

  root.appendChild(buildCtaHost());

  attachListeners(root, navAPI);
  return root;
}

function attachListeners(root, navAPI) {
  // Slide 2 : vote ET / OU
  const slide2 = root.querySelector('.step-E4__slide--2');
  slide2?.querySelectorAll('.step-E4__quiz-card-vote').forEach(card => {
    const onClick = () => {
      if (state.quizIdx >= QUIZ_QUESTIONS.length) return;
      answerQuiz(slide2, root, card.dataset.vote);
    };
    card.addEventListener('click', onClick);
    handlers.push([card, 'click', onClick]);
  });

  // Slides 3 / 4 : matrice + indices + actions
  [3, 4].forEach(n => {
    const slide = root.querySelector(`.step-E4__slide--${n}`);
    if (!slide) return;
    slide.querySelectorAll('.step-E4__pix').forEach(cell => {
      const onClick = () => togglePixel(slide, n, +cell.dataset.idx);
      cell.addEventListener('click', onClick);
      handlers.push([cell, 'click', onClick]);
    });
    slide.querySelectorAll('.step-E4__hint-locker').forEach(lock => {
      const onClick = () => revealHint(slide, n, +lock.dataset.hintIdx);
      lock.addEventListener('click', onClick);
      handlers.push([lock, 'click', onClick]);
    });
    const clear = slide.querySelector('.step-E4__btn-clear');
    if (clear) {
      const onClick = () => clearPixels(slide, n);
      clear.addEventListener('click', onClick);
      handlers.push([clear, 'click', onClick]);
    }
    const validate = slide.querySelector('[data-role="validate"]');
    if (validate) {
      const onClick = () => validatePuzzle(slide, root, n);
      validate.addEventListener('click', onClick);
      handlers.push([validate, 'click', onClick]);
    }
  });

  // CTA principal (avance entre slides + final navAPI.next)
  const cta = root.querySelector('.step-E4__cta');
  if (cta) {
    const onClick = () => {
      if (state.slide < 4) {
        play('whoosh');
        setSlide(root, state.slide + 1, navAPI);
      } else {
        // Slide 4 reussie → F1
        play('whoosh');
        enableKurnelOverlay();
        navAPI.next();
      }
    };
    cta.addEventListener('click', onClick);
    handlers.push([cta, 'click', onClick]);
  }

  // Raccourcis animateur
  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    const k = e.key.toLowerCase();
    // Slide 2 : 1=ET, 2=OU
    if (state.slide === 2 && state.quizIdx < QUIZ_QUESTIONS.length) {
      if (k === '1') {
        e.preventDefault(); e.stopPropagation();
        answerQuiz(slide2, root, 'ET');
        return;
      }
      if (k === '2') {
        e.preventDefault(); e.stopPropagation();
        answerQuiz(slide2, root, 'OU');
        return;
      }
    }
    // Slides 3/4 : Q W E indices, V valider, C effacer
    if ((state.slide === 3 || state.slide === 4)) {
      const slide = root.querySelector(`.step-E4__slide--${state.slide}`);
      if (!slide) return;
      if (k === 'q' || k === 'w' || k === 'e') {
        e.preventDefault(); e.stopPropagation();
        revealHint(slide, state.slide, { q: 0, w: 1, e: 2 }[k]);
      } else if (k === 'v') {
        e.preventDefault(); e.stopPropagation();
        validatePuzzle(slide, root, state.slide);
      } else if (k === 'c') {
        e.preventDefault(); e.stopPropagation();
        clearPixels(slide, state.slide);
      }
    }
  };
  window.addEventListener('keydown', onKey, true);
  handlers.push([window, 'keydown', onKey, true]);
}

/* --------------------------------------------------------------------------
   Module export
   -------------------------------------------------------------------------- */
export default {
  id: 'E4',
  phase: 'E',
  title: 'Epreuve logique ET/OU',
  estimatedDuration: 300,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();
    enableKurnelOverlay();

    state = {
      slide: savedState?.slide ?? 1,
      quizIdx: savedState?.quizIdx ?? 0,
      quizScore: savedState?.quizScore ?? 0,
      puzzle3Solved: savedState?.puzzle3Solved ?? false,
      puzzle4Solved: savedState?.puzzle4Solved ?? false,
      puzzle3Pixels: Array.isArray(savedState?.puzzle3Pixels) ? [...savedState.puzzle3Pixels] : [],
      puzzle4Pixels: Array.isArray(savedState?.puzzle4Pixels) ? [...savedState.puzzle4Pixels] : [],
      hints3: Array.isArray(savedState?.hints3) ? savedState.hints3.slice(0, 3) : [false, false, false],
      hints4: Array.isArray(savedState?.hints4) ? savedState.hints4.slice(0, 3) : [false, false, false],
      digit5: savedState?.digit5 ?? null,
      digit6: savedState?.digit6 ?? null,
    };
    if (state.hints3.length < 3) state.hints3 = [...state.hints3, ...Array(3 - state.hints3.length).fill(false)];
    if (state.hints4.length < 3) state.hints4 = [...state.hints4, ...Array(3 - state.hints4.length).fill(false)];

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const root = buildDom(navAPI);
    stage.appendChild(root);
    domNodes.push(root);

    setSlide(root, state.slide, navAPI);
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => {
      target.removeEventListener(event, fn, capture);
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

    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    styleNode = null;
  },

  serialize() {
    return {
      slide: state.slide,
      quizIdx: state.quizIdx,
      quizScore: state.quizScore,
      puzzle3Solved: state.puzzle3Solved,
      puzzle4Solved: state.puzzle4Solved,
      puzzle3Pixels: [...state.puzzle3Pixels],
      puzzle4Pixels: [...state.puzzle4Pixels],
      hints3: [...state.hints3],
      hints4: [...state.hints4],
      digit5: state.digit5,
      digit6: state.digit6,
    };
  },

  isComplete() {
    return state.puzzle3Solved && state.puzzle4Solved;
  },

  replay() {
    const root = domNodes[0];
    if (!root) return;
    setSlide(root, 1, /* navAPI ignored */ { next() {}, back() {} });
  },
};

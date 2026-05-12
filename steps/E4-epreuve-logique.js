// E4-epreuve-logique.js — Epreuve collective ET/OU (4 slides).
//
// Slide 1 : decouverte ET vs OU (2 cards opposees + exemples micro-ondes/cles).
// Slide 2 : quiz eclair 10 questions, vote ET ou OU, score X/10.
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
  // Regle : LIGNE 4 ET (COLONNE D OU COLONNE E).
  // OU non-exclusif : D4 seul, E4 seul, ou les deux valident.
  validPixels: new Set([3 * 8 + 3, 3 * 8 + 4]), // D4, E4
  digit: '2',
  rule: 'allume LIGNE 4 ET (COLONNE D OU COLONNE E)',
  expectedCount: 2,
  isCorrect(allumes) {
    if (allumes.size === 0) return false;
    // Tout allume doit etre dans D4/E4 (rien d'autre permis)
    for (const i of allumes) if (!this.validPixels.has(i)) return false;
    return true;
  },
  hintCells(idx) {
    // idx 0 : ligne 4 entiere
    if (idx === 0) return new Set([24,25,26,27,28,29,30,31]);
    // idx 1 : colonnes D + E entieres
    if (idx === 1) return new Set([3,11,19,27,35,43,51,59, 4,12,20,28,36,44,52,60]);
    // idx 2 : cibles finales
    if (idx === 2) return new Set(this.validPixels);
    return new Set();
  },
};

// Slide 4 : mini-parcours de 4 sous-puzzles (le dernier = pikachu pixel art).
// L'utilisateur progresse de 1/4 a 4/4. Quand un sub est valide, on passe
// automatiquement au suivant. Sub 4 valide → digit6 revele.
//
// Patterns 8x8 (index = row * 8 + col, 0..63).
const PUZZLE_4_SUBS = [
  {
    // 1/4 : OU simple horizontal — LIGNE 1 OU LIGNE 8.
    // Une ligne complete suffit, les deux valident aussi.
    rule: 'allume la LIGNE 1 OU la LIGNE 8',
    warn: 'une ligne suffit.',
    validPixels: new Set([
      ...Array.from({ length: 8 }, (_, i) => i),
      ...Array.from({ length: 8 }, (_, i) => 7 * 8 + i),
    ]),
    expectedCount: 8,
    isCorrect(allumes) {
      if (allumes.size === 0) return false;
      for (const i of allumes) if (!this.validPixels.has(i)) return false;
      const l1 = [0,1,2,3,4,5,6,7].every(i => allumes.has(i));
      const l8 = [56,57,58,59,60,61,62,63].every(i => allumes.has(i));
      return l1 || l8;
    },
    hintCells(idx) {
      if (idx === 0) return new Set([0,1,2,3,4,5,6,7]);
      if (idx === 1) return new Set([56,57,58,59,60,61,62,63]);
      if (idx === 2) return new Set(this.validPixels);
      return new Set();
    },
  },
  {
    // 2/4 : OU simple vertical — COLONNE A OU COLONNE H.
    // Une colonne complete suffit, les deux valident aussi.
    rule: 'allume la COLONNE A OU la COLONNE H',
    warn: 'une colonne suffit.',
    validPixels: new Set([
      ...[0,8,16,24,32,40,48,56],
      ...[7,15,23,31,39,47,55,63],
    ]),
    expectedCount: 8,
    isCorrect(allumes) {
      if (allumes.size === 0) return false;
      for (const i of allumes) if (!this.validPixels.has(i)) return false;
      const cA = [0,8,16,24,32,40,48,56].every(i => allumes.has(i));
      const cH = [7,15,23,31,39,47,55,63].every(i => allumes.has(i));
      return cA || cH;
    },
    hintCells(idx) {
      if (idx === 0) return new Set([0,8,16,24,32,40,48,56]);
      if (idx === 1) return new Set([7,15,23,31,39,47,55,63]);
      if (idx === 2) return new Set(this.validPixels);
      return new Set();
    },
  },
  {
    // 3/4 : ET d'OU — LIGNE 4 ET (COLONNE C OU COLONNE F).
    // Valides : C4, F4. N'importe quelle combinaison non-vide.
    rule: 'allume LIGNE 4 ET (COLONNE C OU COLONNE F)',
    warn: 'une seule case peut suffire.',
    validPixels: new Set([3 * 8 + 2, 3 * 8 + 5]), // C4=26, F4=29
    expectedCount: 2,
    isCorrect(allumes) {
      if (allumes.size === 0) return false;
      for (const i of allumes) if (!this.validPixels.has(i)) return false;
      return true;
    },
    hintCells(idx) {
      if (idx === 0) return new Set([24,25,26,27,28,29,30,31]); // ligne 4
      if (idx === 1) return new Set([2,10,18,26,34,42,50,58, 5,13,21,29,37,45,53,61]); // cols C+F
      if (idx === 2) return new Set(this.validPixels);
      return new Set();
    },
  },
  {
    // 4/4 : MODE PIXEL ART LIBRE.
    // Palette 4 couleurs (jaune / rose / noir / marron) cliquable.
    // Pas de pattern de validation : l'enfant dessine, l'animateur valide
    // visuellement. Le bouton "valider" donne directement le digit final.
    rule: 'reproduis le pixel art',
    expectedCount: 0,
    isFreeMode: true,
    isCorrect() { return true; }, // toujours OK : validation libre
    hintCells() { return new Set(); },
  },
];

// Backward-compat : ancien PUZZLE_4 = on prend le 1er sub par defaut pour
// que getPuzzle(4) renvoie quelque chose si on appelle hors contexte sub.
const PUZZLE_4 = PUZZLE_4_SUBS[0];

const QUIZ_QUESTIONS = [
  { emoji: '🥞',  text: 'pour faire des pancakes : de la farine __ des œufs.',                     answer: 'ET' },
  { emoji: '🔑',  text: 'pour rentrer chez toi : ta clé __ celle de tes parents.',                 answer: 'OU' },
  { emoji: '🚲',  text: 'pour rouler à vélo : deux roues __ un guidon.',                           answer: 'ET' },
  { emoji: '🍦',  text: 'choisir une glace : chocolat __ vanille.',                                answer: 'OU' },
  { emoji: '📱',  text: 'pour allumer ton téléphone : de la batterie __ le bouton power.',         answer: 'ET' },
  { emoji: '🌧️', text: 'te protéger de la pluie : un parapluie __ une capuche.',                  answer: 'OU' },
  { emoji: '🚌',  text: 'pour aller à l\'école : à pied __ en bus.',                               answer: 'OU' },
  { emoji: '✏️', text: 'pour écrire un mot : un stylo __ du papier.',                              answer: 'ET' },
  { emoji: '✈️', text: 'partir en voyage : en avion __ en train.',                                 answer: 'OU' },
  { emoji: '📺',  text: 'pour regarder un dessin animé : allumer la télé __ choisir la chaîne.',   answer: 'ET' },
];

let state = {
  slide: 1,
  quizIdx: 0,
  quizScore: 0,
  puzzle3Solved: false,
  puzzle4Solved: false,
  puzzle3Pixels: [],
  puzzle4Pixels: [],
  puzzle4SubIdx: 0,        // 0..3 : sub-puzzle courant (slide 4)
  puzzle4FreeColors: {},   // {idx: 'jaune'|'rose'|'noir'|'marron'} pour le sub 4 (mode libre)
  hints3: [false, false, false],
  hints4: [false, false, false],
  digit5: null,
  digit6: null,
};

// Couleur courante de la palette (mode libre / sub 4).
// 4 teintes inspirees du pixel art reference fourni par l'utilisateur :
//   jaune  vif clair (corps)        : #FFD93D
//   jaune2 ombre / joues douces     : #E5A82E
//   rouge  vif (joues)              : #FF1F1F
//   noir   contour / yeux / oreilles : #1A1A1A
let currentColor = 'jaune';
const PALETTE_COLORS = ['jaune', 'jaune2', 'rouge', 'noir'];

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
  width: min(1500px, 96%);
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
  text-align: center;
  text-wrap: balance;
  max-width: 100%;
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

/* Matrice host : centralise les dimensions pour que coords + row-labels
   utilisent EXACTEMENT les memes vars que .matrice-8x8 (sinon decalage). */
.step-E4__matrix-host {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  --m-size: min(520px, 48vh);
  --m-gap: 6px;
  --m-padding: 14px;
}
/* Force la matrice partagee a utiliser nos vars locales */
.step-E4__matrix-host .matrice-8x8 {
  --matrice-8x8-size: var(--m-size);
  --matrice-8x8-gap: var(--m-gap);
  --matrice-8x8-padding: var(--m-padding);
}

/* Header coords A-H : meme grille que la matrice (8 cols + meme gap + meme padding) */
.step-E4__matrix-coords {
  display: grid;
  grid-template-columns: 40px var(--m-size);
  gap: var(--m-gap);
  font-family: var(--display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink);
  text-transform: uppercase;
  margin-bottom: 2px;
}
.step-E4__matrix-coords-inner {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--m-gap);
  padding: 0 var(--m-padding);
  box-sizing: border-box;
}
.step-E4__matrix-coords-inner > span {
  text-align: center;
}

/* Colonne row labels 1-8 : meme hauteur + meme gap + meme padding vertical */
.step-E4__matrix-row-label {
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  gap: var(--m-gap);
  padding: var(--m-padding) 0;
  height: var(--m-size);
  box-sizing: border-box;
  font-family: var(--display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink);
}
.step-E4__matrix-row-label > span {
  display: grid;
  place-items: center;
}
.step-E4__matrix-with-rows {
  display: grid;
  grid-template-columns: 40px auto;
  gap: var(--m-gap);
  align-items: start;
}

/* Side panel : indices + actions + code en cours */
.step-E4__side {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  align-items: stretch;
}
.step-E4__sub-progress {
  margin-left: auto;
  padding: var(--s-1) var(--s-2);
  background: var(--accent-3);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: var(--ink);
  flex-shrink: 0;
  white-space: nowrap;
}
/* Le toggle ET/OU est avant le sub-progress, on lui retire son margin-left:auto */
.step-E4__rule .step-E4__toggle ~ .step-E4__sub-progress { margin-left: var(--s-2); }
.step-E4__rule:has(.step-E4__sub-progress) .step-E4__toggle { margin-left: auto; }
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
.step-E4__btn-clear, .step-E4__btn-validate, .step-E4__btn-hint {
  flex: 1;
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 700;
  text-transform: uppercase;
  padding: var(--s-2);
  border: var(--border);
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.step-E4__btn-clear {
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.step-E4__btn-hint {
  background: var(--accent-3);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.step-E4__btn-hint:hover { transform: translate(-2px, -2px); box-shadow: var(--shadow); }
.step-E4__btn-hint:disabled {
  opacity: 0.4;
  cursor: var(--cursor-default);
  transform: none;
  box-shadow: var(--shadow-sm);
}
.step-E4__btn-validate {
  background: var(--accent-1);
  color: var(--paper);
  box-shadow: var(--shadow);
}
.step-E4__btn-validate:hover { transform: translate(-3px, -3px); box-shadow: var(--shadow-lg); }

/* === Mode libre (sub 4/4 Pikachu) : palette 4 couleurs === */
.step-E4__palette {
  display: none;
  gap: var(--s-2);
  margin-top: var(--s-2);
  justify-content: center;
}
.step-E4__slide--4.is-free-mode .step-E4__palette { display: flex; }
.step-E4__slide--4.is-free-mode .step-E4__btn-hint  { display: none; }

.step-E4__color-btn {
  width: 56px;
  height: 56px;
  border: 3px solid var(--ink);
  border-radius: var(--r-md);
  box-shadow: 4px 4px 0 var(--ink);
  cursor: var(--cursor-pointer);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.step-E4__color-btn[data-color="jaune"]  { background: #FFD93D; }
.step-E4__color-btn[data-color="jaune2"] { background: #E5A82E; }
.step-E4__color-btn[data-color="rouge"]  { background: #FF1F1F; }
.step-E4__color-btn[data-color="noir"]   { background: #1A1A1A; }

.step-E4__color-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--ink); }
.step-E4__color-btn.is-active {
  transform: translate(-3px, -3px);
  box-shadow: 7px 7px 0 var(--ink), inset 0 0 0 4px var(--paper);
}

/* Pixels coloriables : 4 teintes locales sur la matrice */
.step-E4__pix.is-on-jaune  { background: #FFD93D; box-shadow: 0 0 10px rgba(255,217,61,0.55); }
.step-E4__pix.is-on-jaune2 { background: #E5A82E; box-shadow: 0 0 8px rgba(229,168,46,0.45); }
.step-E4__pix.is-on-rouge  { background: #FF1F1F; box-shadow: 0 0 10px rgba(255,31,31,0.55); }
.step-E4__pix.is-on-noir   { background: #1A1A1A; }

/* Mode libre : retire le compteur "X / 0 pixels allumes" (inutile sans cible) */
.step-E4__slide--4.is-free-mode .step-E4__count,
.step-E4__slide--4.is-free-mode .step-E4__count-sub { display: none; }

/* Code en cours (6 cellules) — en HAUT, sous la barre de progression
   pour ne pas chevaucher le CTA bottom */
.step-E4__code {
  position: absolute;
  left: 50%;
  top: var(--s-7);
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
  width: 96px;
  height: 124px;
  font-size: 76px;
  line-height: 1;
  padding: 0;
  display: inline-grid;
  place-items: center;
}
.step-E4__code-cell.is-filled {
  font-size: 76px;
  line-height: 1;
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

/* CTA next slide / final : centre bas, 128px du footer (convention) */
.step-E4__cta-host {
  position: absolute;
  bottom: var(--s-8);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
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
  cardET.appendChild(opET); cardET.appendChild(motoET);

  const cardOU = document.createElement('div');
  cardOU.className = 'card-clickable step-E4__et-ou-card step-E4__et-ou-card--ou';
  const opOU = document.createElement('div');
  opOU.className = 'step-E4__et-ou-card__op'; opOU.textContent = 'OU';
  const motoOU = document.createElement('p');
  motoOU.className = 'step-E4__et-ou-card__motto'; motoOU.textContent = 'une suffit. deux aussi.';
  cardOU.appendChild(opOU); cardOU.appendChild(motoOU);

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

  // Slide 4 : compteur de sub-puzzle (1/4 → 4/4)
  if (slideNum === 4) {
    const subTag = document.createElement('span');
    subTag.className = 'step-E4__sub-progress';
    subTag.dataset.role = 'sub-progress';
    subTag.textContent = `${(state.puzzle4SubIdx ?? 0) + 1} / ${PUZZLE_4_SUBS.length}`;
    rule.appendChild(subTag);
  }

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

  // Side panel : count + actions (indices retires : expliques a l'oral,
  // seuls les .is-hint sur la matrice restent comme indice visuel)
  const side = document.createElement('div');
  side.className = 'step-E4__side';

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
  const hint = document.createElement('button');
  hint.type = 'button';
  hint.className = 'step-E4__btn-hint';
  hint.dataset.role = 'hint';
  hint.textContent = 'indice';
  actions.appendChild(hint);
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

  // Palette de couleurs (visible uniquement en mode libre sub Pikachu)
  if (slideNum === 4) {
    const palette = document.createElement('div');
    palette.className = 'step-E4__palette';
    palette.dataset.role = 'palette';
    PALETTE_COLORS.forEach(col => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'step-E4__color-btn';
      btn.dataset.color = col;
      btn.setAttribute('aria-label', col);
      if (col === currentColor) btn.classList.add('is-active');
      palette.appendChild(btn);
    });
    side.appendChild(palette);
  }

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

let quizLocked = false;
function answerQuiz(slide, root, vote) {
  const q = QUIZ_QUESTIONS[state.quizIdx];
  if (!q) return;
  if (quizLocked) return; // empeche le spam-clic pendant le delai entre 2 questions
  quizLocked = true;
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
    quizLocked = false;
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

function getPuzzle(slideNum) {
  if (slideNum === 3) return PUZZLE_3;
  // Slide 4 : sub-puzzle en cours (4 patterns successifs)
  const idx = Math.min(state.puzzle4SubIdx ?? 0, PUZZLE_4_SUBS.length - 1);
  return PUZZLE_4_SUBS[idx];
}

function refreshPuzzleCount(slide, slideNum) {
  const pixels = state[pixelsKey(slideNum)];
  const cnt = slide.querySelector('[data-role="count"]');
  if (cnt) cnt.textContent = `${pixels.length} / ${getPuzzle(slideNum).expectedCount}`;
}

function refreshPuzzlePixels(slide, slideNum) {
  const pixels = new Set(state[pixelsKey(slideNum)]);
  const puzzle = getPuzzle(slideNum);
  const freeMode = puzzle?.isFreeMode;
  slide.querySelectorAll('.step-E4__pix').forEach(p => {
    const idx = +p.dataset.idx;
    p.classList.remove('is-on', 'is-on-jaune', 'is-on-jaune2', 'is-on-rouge', 'is-on-noir',
                       'is-wrong', 'is-blinking', 'is-hint');
    if (pixels.has(idx)) {
      p.classList.add('is-on');
      if (freeMode) {
        const col = state.puzzle4FreeColors[idx] || 'jaune';
        p.classList.add(`is-on-${col}`);
      }
    }
  });
}

function togglePixel(slide, slideNum, idx) {
  if (state[solvedKey(slideNum)]) return;
  const puzzle = getPuzzle(slideNum);
  const arr = state[pixelsKey(slideNum)];
  const pos = arr.indexOf(idx);
  if (pos >= 0) arr.splice(pos, 1);
  else arr.push(idx);
  state[pixelsKey(slideNum)] = arr;

  // Mode libre (sub Pikachu) : on memorise la couleur choisie par pixel.
  if (puzzle?.isFreeMode) {
    if (arr.includes(idx)) state.puzzle4FreeColors[idx] = currentColor;
    else delete state.puzzle4FreeColors[idx];
  }
  saveStepState('E4', { ...state });
  refreshPuzzleCount(slide, slideNum);

  const cell = slide.querySelector(`.step-E4__pix[data-idx="${idx}"]`);
  const isOn = arr.includes(idx);
  if (cell) {
    // Reset les classes couleur, puis appliquer is-on (+ couleur si free mode)
    cell.classList.remove('is-on', 'is-on-jaune', 'is-on-jaune2', 'is-on-rouge', 'is-on-noir');
    if (isOn) {
      cell.classList.add('is-on');
      if (puzzle?.isFreeMode) cell.classList.add(`is-on-${currentColor}`);
    }
    if (isOn) cell.classList.remove('is-hint');
    if (!isOn) cell.classList.remove('is-wrong');
  }
  play('tic');
}

function clearPixels(slide, slideNum) {
  if (state[solvedKey(slideNum)]) return;
  state[pixelsKey(slideNum)] = [];
  // Reset les indices reveles : la matrice repart vierge,
  // le bouton "indice" redevient cliquable.
  state[hintsKey(slideNum)] = [false, false, false];
  // Mode libre (sub Pikachu) : reset aussi les couleurs memorisees
  const puzzle = getPuzzle(slideNum);
  if (puzzle?.isFreeMode) state.puzzle4FreeColors = {};
  saveStepState('E4', { ...state });
  refreshPuzzlePixels(slide, slideNum);
  refreshPuzzleCount(slide, slideNum);
  // Retirer .is-hint et .is-wrong de toutes les cellules
  slide.querySelectorAll('.step-E4__pix').forEach(p => {
    p.classList.remove('is-hint', 'is-wrong', 'is-blinking');
  });
  // Re-enable le bouton indice
  const hintBtn = slide.querySelector('[data-role="hint"]');
  if (hintBtn) hintBtn.disabled = false;
  play('whoosh');
}

function validatePuzzle(slide, root, slideNum) {
  const allumes = new Set(state[pixelsKey(slideNum)]);
  const puzzle = getPuzzle(slideNum);
  // Chaque puzzle/sub a son isCorrect (logique propre OU/ET).
  const correct = puzzle.isCorrect
    ? puzzle.isCorrect(allumes)
    : (allumes.size === puzzle.validPixels.size
       && [...puzzle.validPixels].every(i => allumes.has(i)));
  if (correct) {
    if (slideNum === 4) {
      // Slide 4 : sub-puzzles. On avance, sauf si on est au dernier.
      const isLastSub = state.puzzle4SubIdx >= PUZZLE_4_SUBS.length - 1;
      if (isLastSub) {
        state.puzzle4Solved = true;
        state.digit6 = '6';
        saveStepState('E4', { ...state });
        fireRevealDigit(slide, slideNum, '6');
      } else {
        // Animation flash success puis on passe au sub suivant
        play('success');
        const tNext = setTimeout(() => {
          state.puzzle4SubIdx += 1;
          state.puzzle4Pixels = [];
          state.hints4 = [false, false, false];
          saveStepState('E4', { ...state });
          resetSlide4ForNextSub(slide);
        }, 700);
        timers.push(tNext);
      }
    } else {
      state[solvedKey(slideNum)] = true;
      state[digitKey(slideNum)] = puzzle.digit ?? '5';
      saveStepState('E4', { ...state });
      fireRevealDigit(slide, slideNum, puzzle.digit ?? '5');
    }
  } else {
    // Erreur : flag wrong sur les pixels en trop (allumes mais pas valides).
    // Pas de .is-blinking auto sur les bons pixels manquants : l'indice se
    // demande explicitement via le bouton 'indice'.
    slide.querySelectorAll('.step-E4__pix').forEach(p => {
      const idx = +p.dataset.idx;
      const isOn = allumes.has(idx);
      p.classList.remove('is-wrong', 'is-blinking');
      if (isOn && !puzzle.validPixels.has(idx)) p.classList.add('is-wrong');
    });
    play('error');
  }
}

function resetSlide4ForNextSub(slide) {
  // Nettoie la matrice, met a jour rule + warn + count, prepare le sub suivant.
  const puzzle = getPuzzle(4);
  // Toggle classe is-free-mode (sub Pikachu) : pilote l'affichage palette / cache hint
  slide.classList.toggle('is-free-mode', !!puzzle?.isFreeMode);
  slide.querySelectorAll('.step-E4__pix').forEach(p => {
    p.classList.remove('is-on', 'is-on-jaune', 'is-on-jaune2', 'is-on-rouge',
                       'is-on-noir', 'is-on-cyan', 'is-hint', 'is-wrong', 'is-blinking');
  });
  // Rule text
  const ruleSpan = slide.querySelector('.step-E4__rule > span:not(.step-E4__rule-tag)');
  if (ruleSpan) ruleSpan.textContent = puzzle.rule;
  // Warn
  const oldWarn = slide.querySelector('.step-E4__rule-warn');
  if (oldWarn) oldWarn.remove();
  if (puzzle.warn) {
    const w = document.createElement('p');
    w.className = 'step-E4__rule-warn';
    w.textContent = puzzle.warn;
    const wrap = slide.querySelector('.step-E4__puzzle');
    wrap?.insertBefore(w, wrap.querySelector('.step-E4__matrix-host'));
  }
  // Compteur
  const cnt = slide.querySelector('[data-role="count"]');
  if (cnt) cnt.textContent = `0 / ${puzzle.expectedCount}`;
  // Sub progress indicator (1/4, 2/4...)
  const subTag = slide.querySelector('[data-role="sub-progress"]');
  if (subTag) subTag.textContent = `${state.puzzle4SubIdx + 1} / ${PUZZLE_4_SUBS.length}`;
  // Re-enable le bouton indice (les hints viennent d'etre reset)
  const hintBtn = slide.querySelector('[data-role="hint"]');
  if (hintBtn) hintBtn.disabled = false;
}

function revealHint(slide, slideNum, idx) {
  const arr = state[hintsKey(slideNum)];
  if (idx < 0 || idx > 2) return;
  if (arr[idx]) return;
  arr[idx] = true;
  state[hintsKey(slideNum)] = arr;
  saveStepState('E4', { ...state });

  // Chaque puzzle/sub expose son propre hintCells(idx). Le tableau de
  // pixels indices ne depend plus de hardcodes globaux mais du puzzle.
  applyHintToMatrix(slide, slideNum, idx);
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

  // Slides 3/4 : restore pixels + hints sur matrice + code en cours
  if (slideNum === 3 || slideNum === 4) {
    // Slide 4 : sync DOM avec le sub courant (rule, warn, count, free-mode).
    // On appelle toujours, meme sur le sub 0, pour cleanup correct.
    if (slideNum === 4) {
      resetSlide4ForNextSub(slide);
    }
    refreshPuzzlePixels(slide, slideNum);
    refreshPuzzleCount(slide, slideNum);
    // Restore .is-hint sur les pixels de la matrice (pas de bulles)
    const hintsArr = state[hintsKey(slideNum)];
    hintsArr.forEach((revealed, i) => {
      if (revealed) applyHintToMatrix(slide, slideNum, i);
    });
    // Restore code en cours
    fillCodeCells(slide);
  }
}

function applyHintToMatrix(slide, slideNum, idx) {
  const puzzle = getPuzzle(slideNum);
  if (!puzzle?.hintCells) return;
  const targets = puzzle.hintCells(idx);
  slide.querySelectorAll('.step-E4__pix').forEach(c => {
    if (targets.has(+c.dataset.idx)) c.classList.add('is-hint');
  });
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
    const clear = slide.querySelector('.step-E4__btn-clear');
    if (clear) {
      const onClick = () => clearPixels(slide, n);
      clear.addEventListener('click', onClick);
      handlers.push([clear, 'click', onClick]);
    }
    const hintBtn = slide.querySelector('[data-role="hint"]');
    if (hintBtn) {
      const onClick = () => {
        const arr = state[hintsKey(n)];
        const nextIdx = arr.findIndex(v => !v);
        if (nextIdx < 0 || nextIdx > 2) return;
        revealHint(slide, n, nextIdx);
        // Disable si tous reveles
        const next = state[hintsKey(n)].findIndex(v => !v);
        if (next < 0) hintBtn.disabled = true;
      };
      hintBtn.addEventListener('click', onClick);
      handlers.push([hintBtn, 'click', onClick]);
      // Init disabled state
      const next = state[hintsKey(n)].findIndex(v => !v);
      hintBtn.disabled = next < 0;
    }
    // Listeners palette (slide 4 uniquement)
    if (n === 4) {
      slide.querySelectorAll('.step-E4__color-btn').forEach(btn => {
        const onClick = () => {
          currentColor = btn.dataset.color;
          slide.querySelectorAll('.step-E4__color-btn').forEach(b => {
            b.classList.toggle('is-active', b === btn);
          });
        };
        btn.addEventListener('click', onClick);
        handlers.push([btn, 'click', onClick]);
      });
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
      puzzle4SubIdx: typeof savedState?.puzzle4SubIdx === 'number'
        ? Math.min(savedState.puzzle4SubIdx, PUZZLE_4_SUBS.length - 1) : 0,
      puzzle4FreeColors: savedState?.puzzle4FreeColors && typeof savedState.puzzle4FreeColors === 'object'
        ? { ...savedState.puzzle4FreeColors } : {},
      hints3: Array.isArray(savedState?.hints3) ? savedState.hints3.slice(0, 3) : [false, false, false],
      hints4: Array.isArray(savedState?.hints4) ? savedState.hints4.slice(0, 3) : [false, false, false],
      digit5: savedState?.digit5 ?? null,
      digit6: savedState?.digit6 ?? null,
    };
    if (state.hints3.length < 3) state.hints3 = [...state.hints3, ...Array(3 - state.hints3.length).fill(false)];
    if (state.hints4.length < 3) state.hints4 = [...state.hints4, ...Array(3 - state.hints4.length).fill(false)];
    quizLocked = false; // reset au cas ou exit pendant le delai

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
      puzzle4SubIdx: state.puzzle4SubIdx,
      puzzle4FreeColors: { ...state.puzzle4FreeColors },
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

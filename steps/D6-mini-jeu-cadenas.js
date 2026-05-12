// D6-mini-jeu-cadenas.js — Mini-jeu des combinaisons d'interrupteurs.
//
// REGLE :
//   4 carres 2x2 sur la matrice (symetriques, 1 pixel autour vide).
//   Pour chaque carre, l'enfant positionne les 2 interrupteurs A et B
//   sur la bonne combinaison, puis valide.
//   - Juste  -> le carre passe jaune, on avance au suivant.
//   - Faux   -> shake rose, on retourne au carre precedent (sauf si
//                on est sur le premier, dans ce cas on ne bouge pas).
//   - Quand les 4 carres sont valides -> CTA "SUIVANT" apparait.
//
// Ordre des carres : haut-gauche -> haut-droite -> bas-gauche -> bas-droite.
//
// Layout matrice 8x8 (HG=haut-gauche, HD=haut-droite, BG, BD, IA, IB) :
//   Row 0 : . . . . . . . .
//   Row 1 : . H H . . H H .
//   Row 2 : . G G . . D D .
//   Row 3 : . . . . . . . .
//   Row 4 : . B B . . B B .
//   Row 5 : . G G . . D D .
//   Row 6 : . . . . . . . .
//   Row 7 : . IA IA . . IB IB .
//
// DA : reprend les interrupteurs D5 (rectangle vertical noir + capuchon
// rouge, haut=1 bas=0), mais ici les interrupteurs sont CLIQUABLES
// pour toggle. Validation = bouton "valider" (cta-primary).

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;
let abortCtrl = null;

const STYLE_ID = 'step-D6-style';

// Indices des 4 carres 2x2 (row-major, 0-63).
const SQUARES = [
  { id: 0, pixels: [ 9, 10, 17, 18] }, // haut-gauche : r1c1, r1c2, r2c1, r2c2
  { id: 1, pixels: [13, 14, 21, 22] }, // haut-droite : r1c5, r1c6, r2c5, r2c6
  { id: 2, pixels: [33, 34, 41, 42] }, // bas-gauche  : r4c1, r4c2, r5c1, r5c2
  { id: 3, pixels: [37, 38, 45, 46] }, // bas-droite  : r4c5, r4c6, r5c5, r5c6
];

// Combinaison cible pour chaque carre (ordre canonique binaire).
const TARGETS = [
  { a: 0, b: 0 }, // HG
  { a: 0, b: 1 }, // HD
  { a: 1, b: 0 }, // BG
  { a: 1, b: 1 }, // BD
];

// Indices des pixels d'etat des interrupteurs (cf. D5).
const PIXELS_A = [57, 58];
const PIXELS_B = [61, 62];

// === State ===
let s_currentIdx = 0;
let s_a = 0;
let s_b = 0;
// 'pending' | 'active' | 'done'
let s_squareStates = ['active', 'pending', 'pending', 'pending'];
let s_done = false;
let s_locked = false; // empeche double-clic pendant animation

// === DOM refs ===
let pixelEls = [];
let interrupteurAEl = null;
let interrupteurBEl = null;
let capuchonAEl = null;
let capuchonBEl = null;
let compteurEl = null;
let validerBtn = null;
let ctaSuivant = null;
let feedbackEl = null;

const CSS = `
.step-D6 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  cursor: var(--cursor-default);

  --d6-cap: #E63946;
  --d6-body: #1A1A1A;
}

.step-D6__titre {
  font-family: var(--display);
  font-size: clamp(56px, 5.4vw, 88px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  opacity: 0;
  transform: scale(0);
  animation: step-D6-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D6__compteur {
  font-family: var(--display);
  font-size: clamp(22px, 2vw, 32px);
  font-weight: 900;
  color: var(--ink);
  background: var(--accent-3);
  border: var(--border);
  box-shadow: 4px 4px 0 var(--ink);
  border-radius: var(--r-md);
  padding: var(--s-1) var(--s-3);
  opacity: 0;
  transform: translateY(-12px);
  animation: step-D6-slide-down var(--d-slow) var(--ease-out) 0.4s forwards;
}

.step-D6__jeu {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: var(--s-6);
  justify-self: center;
}

/* === Cote gauche : matrice === */
.step-D6__matrice-wrap {
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(20px);
  animation: step-D6-fade-up var(--d-slow) var(--ease-out) 0.55s forwards;
}

.step-D6 .matrice-8x8 {
  --matrice-8x8-size: min(520px, 52vh);
}

/* Etats des pixels carres */
.step-D6 .matrice-8x8__pixel.is-square {
  background: color-mix(in srgb, var(--accent-1) 18%, var(--bg-2));
  transition: background 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
}
.step-D6 .matrice-8x8__pixel.is-square.is-active {
  background: var(--paper);
  box-shadow: 0 0 12px color-mix(in srgb, var(--paper) 80%, transparent);
  animation: step-D6-pulse 800ms ease-in-out infinite;
}
.step-D6 .matrice-8x8__pixel.is-square.is-done {
  background: var(--accent-3);
  box-shadow: 0 0 12px var(--accent-3);
  animation: step-D6-pop-light 360ms var(--ease-bounce);
}
.step-D6 .matrice-8x8__pixel.is-square.is-wrong {
  background: var(--accent-4);
  box-shadow: 0 0 14px var(--accent-4);
  animation: step-D6-wrong 480ms ease-in-out;
}

/* Pixels d'etat des interrupteurs : toujours allumes,
   couleur dependante de s_a / s_b */
.step-D6 .matrice-8x8__pixel.is-inter-on {
  background: var(--accent-4); /* rose si state=1 */
  box-shadow: 0 0 10px var(--accent-4);
}
.step-D6 .matrice-8x8__pixel.is-inter-off {
  background: var(--accent-3); /* jaune si state=0 */
  box-shadow: 0 0 10px var(--accent-3);
}

/* === Cote droite : controles === */
.step-D6__controls {
  display: grid;
  gap: var(--s-4);
  justify-items: center;
  opacity: 0;
  transform: translateY(20px);
  animation: step-D6-fade-up var(--d-slow) var(--ease-out) 0.7s forwards;
}

.step-D6__leviers {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s-4);
}

.step-D6__slot {
  display: grid;
  gap: var(--s-2);
  place-items: center;
}

.step-D6__slot-label {
  font-family: var(--display);
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 900;
  color: var(--ink);
  letter-spacing: 0.04em;
}

/* Interrupteur cliquable */
.step-D6__interrupteur {
  position: relative;
  width: clamp(56px, 5vw, 80px);
  height: clamp(120px, 11vw, 168px);
  background: var(--d6-body);
  border: 3px solid var(--ink);
  border-radius: 10px;
  box-shadow: 6px 6px 0 var(--ink);
  overflow: hidden;
  cursor: var(--cursor-pointer);
  transition: transform 100ms var(--ease-out), box-shadow 100ms var(--ease-out);
}
.step-D6__interrupteur:hover {
  transform: translate(-2px, -2px);
  box-shadow: 8px 8px 0 var(--ink);
}
.step-D6__interrupteur:active {
  transform: translate(2px, 2px);
  box-shadow: 3px 3px 0 var(--ink);
}

.step-D6__interrupteur::before,
.step-D6__interrupteur::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 65%;
  height: 2px;
  background: color-mix(in srgb, var(--paper) 26%, transparent);
}
.step-D6__interrupteur::before { top: 10px; }
.step-D6__interrupteur::after { bottom: 10px; }

.step-D6__capuchon {
  position: absolute;
  left: 50%;
  width: 76%;
  height: 44%;
  background: var(--d6-cap);
  border: 3px solid var(--ink);
  border-radius: 6px;
  transform: translateX(-50%);
  transition: top 280ms var(--ease-bounce), bottom 280ms var(--ease-bounce);
  box-shadow:
    inset 0 -4px 0 color-mix(in srgb, var(--ink) 35%, transparent),
    inset 0 3px 0 color-mix(in srgb, var(--paper) 30%, transparent);
}
.step-D6__capuchon[data-state="1"] { top: 5px; bottom: auto; }
.step-D6__capuchon[data-state="0"] { bottom: 5px; top: auto; }

.step-D6__slot-etat {
  font-family: var(--display);
  font-size: clamp(28px, 2.6vw, 40px);
  font-weight: 900;
  color: var(--ink);
  min-width: 40px;
  text-align: center;
}

.step-D6__valider {
  animation: none !important;
  opacity: 1;
  transform: scale(1);
}

.step-D6__feedback {
  font-family: var(--display);
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 900;
  text-align: center;
  color: var(--ink);
  min-height: 28px;
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}
.step-D6__feedback.is-shown { opacity: 1; }
.step-D6__feedback.is-ok    { color: var(--accent-3); }
.step-D6__feedback.is-ko    { color: var(--accent-4); }

/* CTA suivant */
.step-D6__cta-suivant-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-2);
}
.step-D6__cta-suivant {
  animation: none !important;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
}
.step-D6__cta-suivant.is-in {
  animation: step-D6-pop-cta var(--d-normal) var(--ease-bounce) forwards !important;
  pointer-events: auto;
}

@keyframes step-D6-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes step-D6-slide-down {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes step-D6-fade-up {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes step-D6-pulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%      { transform: scale(1.12); opacity: 0.7; }
}
@keyframes step-D6-pop-light {
  0%   { transform: scale(0.7); }
  60%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
@keyframes step-D6-wrong {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-6px); }
  50%      { transform: translateX(6px); }
  75%      { transform: translateX(-4px); }
}
@keyframes step-D6-pop-cta {
  0%   { transform: scale(0);   opacity: 0; }
  70%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function isSquarePixel(idx) {
  return SQUARES.some(sq => sq.pixels.includes(idx));
}

function getSquareForPixel(idx) {
  return SQUARES.find(sq => sq.pixels.includes(idx));
}

function updateMatrice() {
  pixelEls.forEach((pix, i) => {
    pix.className = 'matrice-8x8__pixel';

    if (PIXELS_A.includes(i)) {
      pix.classList.add(s_a === 1 ? 'is-inter-on' : 'is-inter-off');
      return;
    }
    if (PIXELS_B.includes(i)) {
      pix.classList.add(s_b === 1 ? 'is-inter-on' : 'is-inter-off');
      return;
    }
    if (isSquarePixel(i)) {
      const sq = getSquareForPixel(i);
      const state = s_squareStates[sq.id];
      pix.classList.add('is-square');
      if (state === 'active') pix.classList.add('is-active');
      else if (state === 'done') pix.classList.add('is-done');
    }
  });
}

function shakeCurrentSquare() {
  const sq = SQUARES[s_currentIdx];
  sq.pixels.forEach(idx => {
    const pix = pixelEls[idx];
    pix.classList.remove('is-active');
    pix.classList.add('is-wrong');
  });
  const t = setTimeout(() => {
    // Apres le shake, on remet l'etat normal de chaque pixel concerne
    sq.pixels.forEach(idx => pixelEls[idx].classList.remove('is-wrong'));
    updateMatrice();
    s_locked = false;
  }, 500);
  timers.push(t);
}

function showFeedback(text, kind) {
  if (!feedbackEl) return;
  feedbackEl.textContent = text;
  feedbackEl.classList.remove('is-ok', 'is-ko');
  if (kind) feedbackEl.classList.add(`is-${kind}`);
  feedbackEl.classList.add('is-shown');
  const t = setTimeout(() => feedbackEl.classList.remove('is-shown'), 1400);
  timers.push(t);
}

function updateCompteur() {
  if (!compteurEl) return;
  const validated = s_squareStates.filter(s => s === 'done').length;
  compteurEl.textContent = `${validated} / 4`;
}

function checkValidation() {
  if (s_locked || s_done) return;
  s_locked = true;

  const target = TARGETS[s_currentIdx];
  const correct = s_a === target.a && s_b === target.b;

  if (correct) {
    s_squareStates[s_currentIdx] = 'done';
    showFeedback('bravo !', 'ok');
    updateMatrice();
    updateCompteur();

    if (s_currentIdx >= SQUARES.length - 1) {
      s_done = true;
      const t = setTimeout(() => {
        if (ctaSuivant) ctaSuivant.classList.add('is-in');
      }, 600);
      timers.push(t);
      s_locked = false;
    } else {
      s_currentIdx++;
      s_squareStates[s_currentIdx] = 'active';
      const t = setTimeout(() => {
        updateMatrice();
        s_locked = false;
      }, 450);
      timers.push(t);
    }
  } else {
    showFeedback('faux. recule.', 'ko');
    shakeCurrentSquare();

    if (s_currentIdx > 0) {
      s_squareStates[s_currentIdx] = 'pending';
      s_currentIdx--;
      s_squareStates[s_currentIdx] = 'active';
    }
    // sinon on reste sur le premier (regle du user)
  }
}

function toggleA() {
  if (s_locked || s_done) return;
  s_a = s_a === 1 ? 0 : 1;
  if (capuchonAEl) capuchonAEl.dataset.state = String(s_a);
  updateMatrice();
}

function toggleB() {
  if (s_locked || s_done) return;
  s_b = s_b === 1 ? 0 : 1;
  if (capuchonBEl) capuchonBEl.dataset.state = String(s_b);
  updateMatrice();
}

function buildInterrupteur(label, getState) {
  const slot = document.createElement('div');
  slot.className = 'step-D6__slot';

  const lblTop = document.createElement('div');
  lblTop.className = 'step-D6__slot-label';
  lblTop.textContent = label;
  slot.appendChild(lblTop);

  const inter = document.createElement('button');
  inter.type = 'button';
  inter.className = 'step-D6__interrupteur';
  inter.setAttribute('aria-label', `Interrupteur ${label}`);

  const cap = document.createElement('div');
  cap.className = 'step-D6__capuchon';
  cap.dataset.state = String(getState());
  inter.appendChild(cap);

  const etat = document.createElement('div');
  etat.className = 'step-D6__slot-etat';
  etat.textContent = `= ${getState()}`;

  slot.appendChild(inter);
  slot.appendChild(etat);

  return { slot, inter, cap, etat };
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D6';

  const titre = document.createElement('h1');
  titre.className = 'step-D6__titre';
  titre.textContent = 'LE JEU DU CADENAS';
  wrap.appendChild(titre);

  compteurEl = document.createElement('div');
  compteurEl.className = 'step-D6__compteur';
  compteurEl.textContent = '0 / 4';
  wrap.appendChild(compteurEl);

  const jeu = document.createElement('div');
  jeu.className = 'step-D6__jeu';

  // === Cote gauche : matrice ===
  const matriceWrap = document.createElement('div');
  matriceWrap.className = 'step-D6__matrice-wrap';
  const matrice = document.createElement('div');
  matrice.className = 'matrice-8x8';
  pixelEls = [];
  for (let i = 0; i < 64; i++) {
    const pix = document.createElement('div');
    pix.className = 'matrice-8x8__pixel';
    matrice.appendChild(pix);
    pixelEls.push(pix);
  }
  matriceWrap.appendChild(matrice);
  jeu.appendChild(matriceWrap);

  // === Cote droite : interrupteurs + valider ===
  const controls = document.createElement('div');
  controls.className = 'step-D6__controls';

  const leviers = document.createElement('div');
  leviers.className = 'step-D6__leviers';

  const interA = buildInterrupteur('A', () => s_a);
  interA.etat.textContent = `= ${s_a}`;
  interrupteurAEl = interA.inter;
  capuchonAEl = interA.cap;
  leviers.appendChild(interA.slot);

  const interB = buildInterrupteur('B', () => s_b);
  interB.etat.textContent = `= ${s_b}`;
  interrupteurBEl = interB.inter;
  capuchonBEl = interB.cap;
  leviers.appendChild(interB.slot);

  controls.appendChild(leviers);

  validerBtn = document.createElement('button');
  validerBtn.type = 'button';
  validerBtn.className = 'cta-primary step-D6__valider';
  validerBtn.textContent = 'valider';
  controls.appendChild(validerBtn);

  feedbackEl = document.createElement('div');
  feedbackEl.className = 'step-D6__feedback';
  controls.appendChild(feedbackEl);

  jeu.appendChild(controls);
  wrap.appendChild(jeu);

  // CTA suivant (visible quand 4/4)
  const ctaArea = document.createElement('div');
  ctaArea.className = 'step-D6__cta-suivant-area';
  ctaSuivant = document.createElement('button');
  ctaSuivant.type = 'button';
  ctaSuivant.className = 'cta-primary step-D6__cta-suivant';
  ctaSuivant.textContent = 'suivant';
  ctaArea.appendChild(ctaSuivant);
  wrap.appendChild(ctaArea);

  // === Listeners (AbortController pattern) ===
  abortCtrl = new AbortController();
  const { signal } = abortCtrl;

  const onAClick = () => {
    // Refresh la valeur affichee a cote du levier
    toggleA();
    interA.etat.textContent = `= ${s_a}`;
  };
  const onBClick = () => {
    toggleB();
    interB.etat.textContent = `= ${s_b}`;
  };
  const onValiderClick = () => checkValidation();
  const onSuivantClick = () => navAPI.next();
  const onKey = (e) => {
    if (s_done) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navAPI.next();
      }
      return;
    }
    if (e.key === 'q' || e.key === 'Q') { onAClick(); }
    else if (e.key === 'w' || e.key === 'W') { onBClick(); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      checkValidation();
    }
  };

  interrupteurAEl.addEventListener('click', onAClick, { signal });
  interrupteurBEl.addEventListener('click', onBClick, { signal });
  validerBtn.addEventListener('click', onValiderClick, { signal });
  ctaSuivant.addEventListener('click', onSuivantClick, { signal });
  window.addEventListener('keydown', onKey, { signal });

  // Etat initial
  updateMatrice();
  updateCompteur();

  return wrap;
}

export default {
  id: 'D6',
  phase: 'D',
  title: 'mini-jeu cadenas',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();

    // Reset state
    s_currentIdx = 0;
    s_a = 0;
    s_b = 0;
    s_squareStates = ['active', 'pending', 'pending', 'pending'];
    s_done = false;
    s_locked = false;
    pixelEls = [];

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    void savedState;
  },

  exit() {
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    handlers.forEach(([target, event, fn]) => target.removeEventListener(event, fn));
    handlers = [];
    timers.forEach(clearTimeout);
    timers = [];
    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];
    domNodes.forEach(n => n.remove());
    domNodes = [];
    pixelEls = [];
    interrupteurAEl = null;
    interrupteurBEl = null;
    capuchonAEl = null;
    capuchonBEl = null;
    compteurEl = null;
    validerBtn = null;
    ctaSuivant = null;
    feedbackEl = null;
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
      doneSquares: s_squareStates.filter(s => s === 'done').length,
    };
  },

  isComplete() {
    return s_done;
  },

  replay() {
    // Reset l'etat sans recharger le DOM
    s_currentIdx = 0;
    s_a = 0;
    s_b = 0;
    s_squareStates = ['active', 'pending', 'pending', 'pending'];
    s_done = false;
    s_locked = false;
    if (capuchonAEl) capuchonAEl.dataset.state = '0';
    if (capuchonBEl) capuchonBEl.dataset.state = '0';
    if (ctaSuivant) ctaSuivant.classList.remove('is-in');
    updateMatrice();
    updateCompteur();
  },
};

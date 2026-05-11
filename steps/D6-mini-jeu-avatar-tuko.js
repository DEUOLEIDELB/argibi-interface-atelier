// D6-mini-jeu-avatar-tuko.js — Defi des cadenas.
// 3 manches en gradation : Lecture (code visible) -> Deduction (code masque)
// -> Completude (4 cadenas, toutes combinaisons).
//
//  composants partages :
//   - .cadenas + .cadenas--ferme/--ouvert + .is-locking/.is-unlocking/.is-shaking
//   - .bouton-bascule (interrupteur A et B virtuel)
//   - .tuko-mascotte (poses pedagogique / hote / triomphe / mysterieux)
//   - .barre-progression (3 segments = 3 manches)
//   - .compteur-geant (score X/3)
//   - .titre-hero / .sous-titre / .cta-primary
//   - spawnShockwave + spawnConfettis + spawnFireworks depuis core/effects.js
//
// Raccourcis : Q=toggle A, W=toggle B, Espace=next (manche 3 finie), R=replay manche.
// State : { round, score, manche1Codes, manche2Codes, manche1Done, manche2Done, manche3Opened }.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { spawnShockwave, spawnConfettis, spawnFireworks } from '../core/effects.js';
import { play } from '../core/audio.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

let s_round = 1;
let s_score = 0;
let s_manche1Codes = [];
let s_manche2Codes = [];
let s_manche1Done = 0;
let s_manche2Done = 0;
let s_manche3Opened = [];

let s_A = 0;
let s_B = 0;
let s_manche2Errors = 0;
let s_hinted = false;
let s_locked = false;

let mainTukoEl = null;
let basculeAEl = null;
let basculeBEl = null;
let etatActuelEl = null;
let scoreCompteurEl = null;
let barreSegsEls = [];
let titreEl = null;
let sousTitreEl = null;
let zoneCadenasEl = null;
let ctaEl = null;

const STYLE_ID = 'step-D6-style';
const ALL_CODES = ['00', '01', '10', '11'];

const CSS = `
.step-D6 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-4) var(--s-6) var(--s-3);
  gap: var(--s-3);
  cursor: var(--cursor-default);
}

.step-D6__topbar {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--s-4);
  align-items: center;
}

.step-D6__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  text-align: center;
}

.step-D6__titre {
  opacity: 0;
  transform: scale(0);
  animation: step-D6-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D6__sous {
  opacity: 0;
  transform: translateY(16px);
  animation: step-D6-slide-up var(--d-slow) var(--ease-out) 0.5s forwards;
}

.step-D6__zone {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 320px;
  position: relative;
}

.step-D6__cadenas-stack {
  display: flex;
  gap: var(--s-3);
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.step-D6__cadenas-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  opacity: 0;
  transform: translateY(20px) scale(0.85);
  animation: step-D6-cadenas-in var(--d-normal) var(--ease-bounce) forwards;
  animation-delay: var(--step-D6-cadenas-delay, 0ms);
}

.step-D6__cadenas-code {
  font-family: var(--mono);
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: 0.18em;
  color: var(--ink);
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-sm);
  padding: 4px var(--s-2);
  box-shadow: var(--shadow-sm);
}

.step-D6__cadenas-code.is-masque {
  color: var(--accent-4);
  letter-spacing: 0.32em;
}

.step-D6__cadenas-decimal {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0.3;
}

.step-D6__cadenas-large {
  --cadenas-size: 140px;
}

.step-D6__interrupteurs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-5);
  width: 100%;
  max-width: 800px;
  align-items: center;
  justify-items: center;
}

.step-D6__interrupteur {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  padding: var(--s-3);
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  min-width: 200px;
}

.step-D6__interrupteur-label {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

.step-D6__interrupteur-help {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.12em;
  color: var(--ink);
  opacity: 0.55;
  text-align: center;
}

.step-D6__etat {
  font-family: var(--mono);
  font-size: var(--t-body-xl);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
  padding: var(--s-1) var(--s-3);
  background: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  transition: transform var(--d-fast) var(--ease-bounce),
              background var(--d-fast) var(--ease-out);
}

.step-D6__etat.is-pulse {
  animation: step-D6-etat-pulse 350ms var(--ease-bounce);
}

.step-D6__bottom {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  width: 100%;
  gap: var(--s-4);
  padding-bottom: var(--s-2);
}

.step-D6__tuko-wrap {
  justify-self: start;
  opacity: 0;
  transform: translateX(-120%);
  animation: step-D6-slide-in-tuko var(--d-slow) var(--ease-out) 1.0s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}

.step-D6__tuko-mood {
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--accent-4);
  text-transform: lowercase;
  letter-spacing: 0.02em;
  max-width: 240px;
  text-align: center;
}

.step-D6__cta {
  justify-self: center;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
}

.step-D6__cta.is-shown {
  animation: step-D6-pop-cta var(--d-normal) var(--ease-bounce) forwards;
  pointer-events: auto;
}

.step-D6__spacer {
  width: 200px;
}

.step-D6__watermark {
  position: absolute;
  right: var(--s-4);
  bottom: var(--s-2);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.2em;
  color: var(--ink);
  opacity: 0.4;
  text-transform: uppercase;
  pointer-events: none;
}

.step-D6__reveal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-family: var(--display);
  font-size: clamp(36px, 4.5vw, 64px);
  font-weight: 900;
  letter-spacing: -0.01em;
  text-align: center;
  text-transform: uppercase;
  color: var(--accent-1);
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  padding: var(--s-4) var(--s-5);
  z-index: 4;
  pointer-events: none;
  opacity: 0;
}

.step-D6__reveal.is-shown {
  animation: step-D6-reveal-smash 600ms var(--ease-bounce) forwards;
}

@keyframes step-D6-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

@keyframes step-D6-slide-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes step-D6-cadenas-in {
  0%   { opacity: 0; transform: translateY(20px) scale(0.85); }
  60%  { opacity: 1; transform: translateY(-4px) scale(1.05); }
  100% { opacity: 1; transform: translateY(0)   scale(1);    }
}

@keyframes step-D6-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}

@keyframes step-D6-pop-cta {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

@keyframes step-D6-etat-pulse {
  0%   { transform: scale(1);    background: var(--paper); }
  50%  { transform: scale(1.08); background: var(--accent-3); }
  100% { transform: scale(1);    background: var(--paper); }
}

@keyframes step-D6-reveal-smash {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.step-D6__cadenas-cell .cadenas.cadenas--ferme.is-idle {
  animation: step-D6-cadenas-breathe 2s ease-in-out infinite;
}

@keyframes step-D6-cadenas-breathe {
  0%, 100% { transform: scale(1);    }
  50%      { transform: scale(1.02); }
}

.step-D6__cadenas-cell .cadenas.is-shaking {
  animation: step-D6-cadenas-shake 200ms ease-in-out;
}

@keyframes step-D6-cadenas-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px); }
  75%      { transform: translateX(4px); }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function codeFromState() { return `${s_A}${s_B}`; }

function decimalOf(code) { return parseInt(code, 2); }

function pickRandomCodes(n, exclude = []) {
  const pool = ALL_CODES.filter(c => !exclude.includes(c));
  const out = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  while (out.length < n) {
    out.push(ALL_CODES[Math.floor(Math.random() * 4)]);
  }
  return out;
}

function buildBascule(state) {
  const bascule = document.createElement('label');
  bascule.className = `bouton-bascule ${state === 1 ? 'is-right' : 'is-left'}`;
  bascule.setAttribute('role', 'switch');
  bascule.setAttribute('aria-checked', state === 1 ? 'true' : 'false');

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

function setBasculeState(bascule, state) {
  bascule.classList.toggle('is-right', state === 1);
  bascule.classList.toggle('is-left', state === 0);
  bascule.setAttribute('aria-checked', state === 1 ? 'true' : 'false');
}

function buildCadenasCell(code, { masque = false, decimalFiligrane = true, large = false } = {}) {
  const cell = document.createElement('div');
  cell.className = 'step-D6__cadenas-cell';

  const codeEl = document.createElement('div');
  codeEl.className = 'step-D6__cadenas-code' + (masque ? ' is-masque' : '');
  codeEl.textContent = masque ? '? ?' : `${code[0]} ${code[1]}`;
  cell.appendChild(codeEl);

  const cadenas = document.createElement('div');
  cadenas.className = 'cadenas cadenas--ferme is-idle';
  if (large) cadenas.classList.add('step-D6__cadenas-large');
  cadenas.setAttribute('data-code', code);
  cell.appendChild(cadenas);

  if (decimalFiligrane && !masque) {
    const dec = document.createElement('div');
    dec.className = 'step-D6__cadenas-decimal';
    dec.textContent = `= ${decimalOf(code)}`;
    cell.appendChild(dec);
  }

  return { cell, cadenas, codeEl };
}

function updateBarre() {
  barreSegsEls.forEach((seg, i) => {
    seg.classList.remove('is-done', 'is-current');
    if (i + 1 < s_round) seg.classList.add('is-done');
    else if (i + 1 === s_round) seg.classList.add('is-current');
  });
}

function updateScore() {
  if (!scoreCompteurEl) return;
  const v = scoreCompteurEl.querySelector('.compteur-geant__value');
  if (!v) return;
  v.textContent = `${s_score}`;
  v.classList.remove('is-pulsing');
  void v.offsetWidth;
  v.classList.add('is-pulsing');
  const t = setTimeout(() => v.classList.remove('is-pulsing'), 200);
  timers.push(t);
}

function updateEtatActuel() {
  if (!etatActuelEl) return;
  etatActuelEl.textContent = `A=${s_A}  B=${s_B}`;
  etatActuelEl.classList.remove('is-pulse');
  void etatActuelEl.offsetWidth;
  etatActuelEl.classList.add('is-pulse');
}

function setTukoPose(pose, mood = '') {
  if (!mainTukoEl) return;
  mainTukoEl.setAttribute('data-pose', pose);
  const moodEl = mainTukoEl.parentElement?.querySelector('.step-D6__tuko-mood');
  if (moodEl) moodEl.textContent = mood;
}

function clearZone() {
  if (!zoneCadenasEl) return;
  while (zoneCadenasEl.firstChild) {
    zoneCadenasEl.removeChild(zoneCadenasEl.firstChild);
  }
}

function renderManche1() {
  s_round = 1;
  s_manche2Errors = 0;
  s_hinted = false;
  updateBarre();

  titreEl.textContent = 'DÉFI DES CADENAS';
  sousTitreEl.textContent = 'positionne les 2 interrupteurs sur le bon code';
  setTukoPose('pedagogique', 'lis le code, place les bascules');

  clearZone();
  const stack = document.createElement('div');
  stack.className = 'step-D6__cadenas-stack';
  zoneCadenasEl.appendChild(stack);

  const idx = s_manche1Done;
  if (idx >= s_manche1Codes.length) {
    advanceToManche2();
    return;
  }
  const code = s_manche1Codes[idx];
  const { cell, cadenas } = buildCadenasCell(code, { masque: false, large: true });
  cell.style.setProperty('--step-D6-cadenas-delay', '50ms');
  stack.appendChild(cell);

  attachCadenasMatcher(cadenas, code, { masque: false, onWin: onManche1Win });
}

function renderManche2() {
  s_round = 2;
  s_manche2Errors = 0;
  s_hinted = false;
  updateBarre();

  titreEl.textContent = 'CRACK LE CODE';
  sousTitreEl.textContent = 'la classe propose, l\'animateur essaie';
  setTukoPose('hote', 'que propose la classe ?');

  clearZone();
  const stack = document.createElement('div');
  stack.className = 'step-D6__cadenas-stack';
  zoneCadenasEl.appendChild(stack);

  const idx = s_manche2Done;
  if (idx >= s_manche2Codes.length) {
    advanceToManche3();
    return;
  }
  const code = s_manche2Codes[idx];
  const { cell, cadenas, codeEl } = buildCadenasCell(code, { masque: true, large: true });
  cell.style.setProperty('--step-D6-cadenas-delay', '50ms');
  stack.appendChild(cell);

  attachCadenasMatcher(cadenas, code, {
    masque: true,
    codeEl,
    onWin: onManche2Win,
    onError: onManche2Error,
  });
}

function renderManche3() {
  s_round = 3;
  updateBarre();

  titreEl.textContent = 'OUVRE TOUS LES CADENAS';
  sousTitreEl.textContent = 'il y a 4 cadenas, chacun avec un code différent';
  setTukoPose('pedagogique', 'trouve les 4 combinaisons');

  clearZone();
  const stack = document.createElement('div');
  stack.className = 'step-D6__cadenas-stack';
  zoneCadenasEl.appendChild(stack);

  ALL_CODES.forEach((code, i) => {
    const { cell, cadenas } = buildCadenasCell(code, { masque: false });
    cell.style.setProperty('--step-D6-cadenas-delay', `${i * 90}ms`);
    stack.appendChild(cell);

    if (s_manche3Opened.includes(code)) {
      cadenas.classList.remove('cadenas--ferme', 'is-idle');
      cadenas.classList.add('cadenas--ouvert');
    } else {
      attachCadenasMatcher(cadenas, code, {
        masque: false,
        onWin: () => onManche3Open(cadenas, code),
      });
    }
  });

  if (s_manche3Opened.length >= ALL_CODES.length) {
    const t = setTimeout(() => triggerRevealFinal(), 600);
    timers.push(t);
  }
}

function attachCadenasMatcher(cadenasEl, code, { masque, codeEl, onWin, onError }) {
  cadenasEl._d6_check = (currentCode) => {
    if (s_locked) return;
    if (currentCode === code) {
      s_locked = true;
      cadenasEl.classList.remove('cadenas--ferme', 'is-idle');
      cadenasEl.classList.add('cadenas--ouvert', 'is-unlocking');
      if (masque && codeEl) {
        codeEl.classList.remove('is-masque');
        codeEl.textContent = `${code[0]} ${code[1]}`;
      }
      try { play('unlock'); } catch { /* noop */ }
      try { spawnShockwave(cadenasEl, { rayonMax: 500, duree: 700, couleur: 'var(--accent-3)' }); } catch { /* noop */ }
      const t = setTimeout(() => {
        s_locked = false;
        if (onWin) onWin();
      }, 700);
      timers.push(t);
    } else {
      cadenasEl.classList.remove('is-shaking');
      void cadenasEl.offsetWidth;
      cadenasEl.classList.add('is-shaking');
      try { play(masque ? 'error' : 'tic'); } catch { /* noop */ }
      if (onError) onError();
    }
  };
}

function testCurrentCombination() {
  if (!zoneCadenasEl) return;
  const cadenasEls = zoneCadenasEl.querySelectorAll('.cadenas');
  const cur = codeFromState();
  cadenasEls.forEach(c => {
    if (c._d6_check && !c.classList.contains('cadenas--ouvert')) {
      c._d6_check(cur);
    }
  });
}

function onManche1Win() {
  s_score = Math.min(3, s_score + 1);
  s_manche1Done++;
  updateScore();
  try { play('success'); } catch { /* noop */ }
  setTukoPose('triomphe', 'bravo, on enchaine');

  const stage = document.querySelector('#stage');
  if (stage) spawnShockwave(stage, { rayonMax: 800, duree: 600 });

  const t = setTimeout(() => {
    if (s_manche1Done >= 3) {
      advanceToManche2();
    } else {
      renderManche1();
    }
  }, 900);
  timers.push(t);
}

function onManche2Win() {
  s_score = Math.min(3, s_score + 1);
  s_manche2Done++;
  s_manche2Errors = 0;
  s_hinted = false;
  updateScore();
  try { play('success'); } catch { /* noop */ }
  setTukoPose('triomphe', 'la classe a deduit !');

  const stage = document.querySelector('#stage');
  if (stage) spawnShockwave(stage, { rayonMax: 800, duree: 600 });

  const t = setTimeout(() => {
    if (s_manche2Done >= 2) {
      advanceToManche3();
    } else {
      renderManche2();
    }
  }, 900);
  timers.push(t);
}

function onManche2Error() {
  s_manche2Errors++;
  if (s_manche2Errors >= 3 && !s_hinted) {
    s_hinted = true;
    const firstChar = s_manche2Codes[s_manche2Done]?.[0] ?? '?';
    setTukoPose('mysterieux', `indice : le premier chiffre pourrait etre ${firstChar}`);
  }
}

function onManche3Open(cadenasEl, code) {
  void cadenasEl;
  if (!s_manche3Opened.includes(code)) s_manche3Opened.push(code);
  try { play('success'); } catch { /* noop */ }
  updateBarre();
  if (s_manche3Opened.length >= ALL_CODES.length) {
    s_score = 3;
    updateScore();
    setTukoPose('triomphe', 'tu as tout trouve !');
    const t = setTimeout(() => triggerRevealFinal(), 800);
    timers.push(t);
  } else {
    setTukoPose('hote', `${s_manche3Opened.length} / 4 cadenas`);
  }
}

function advanceToManche2() {
  s_round = 2;
  renderManche2();
}

function advanceToManche3() {
  s_round = 3;
  renderManche3();
}

function triggerRevealFinal() {
  if (!zoneCadenasEl) return;
  const cadenasEls = Array.from(zoneCadenasEl.querySelectorAll('.cadenas'));
  if (cadenasEls.length === 0) return;

  cadenasEls.forEach((c, i) => {
    const t = setTimeout(() => {
      c.classList.remove('cadenas--ouvert', 'is-unlocking');
      c.classList.add('cadenas--ferme', 'is-locking');
      try { play('clack'); } catch { /* noop */ }
    }, i * 200);
    timers.push(t);
  });

  const reopenStart = cadenasEls.length * 200 + 300;
  cadenasEls.forEach((c, i) => {
    const t = setTimeout(() => {
      c.classList.remove('cadenas--ferme', 'is-locking');
      c.classList.add('cadenas--ouvert', 'is-unlocking');
      try { play('unlock'); } catch { /* noop */ }
    }, reopenStart + i * 200);
    timers.push(t);
  });

  const revealStart = reopenStart + cadenasEls.length * 200 + 200;
  const t = setTimeout(() => {
    const reveal = document.createElement('div');
    reveal.className = 'step-D6__reveal is-shown';
    reveal.textContent = '2 INTERRUPTEURS · 4 COMBINAISONS · 4 CLÉS · TU AS TOUT TROUVÉ';
    zoneCadenasEl.appendChild(reveal);

    const stage = document.querySelector('#stage');
    if (stage) {
      spawnConfettis(stage, { nombre: 14 });
      spawnFireworks(stage, { nombre: 22, palette: 'tinta' });
    }
    try { play('victory'); } catch { /* noop */ }
    setTukoPose('triomphe', 'tu as tout trouve');

    if (ctaEl) ctaEl.classList.add('is-shown');
  }, revealStart);
  timers.push(t);
}

function toggleA() {
  s_A = s_A === 0 ? 1 : 0;
  if (basculeAEl) setBasculeState(basculeAEl, s_A);
  updateEtatActuel();
  testCurrentCombination();
}

function toggleB() {
  s_B = s_B === 0 ? 1 : 0;
  if (basculeBEl) setBasculeState(basculeBEl, s_B);
  updateEtatActuel();
  testCurrentCombination();
}

function replayCurrentManche() {
  s_locked = false;
  s_A = 0; s_B = 0;
  if (basculeAEl) setBasculeState(basculeAEl, 0);
  if (basculeBEl) setBasculeState(basculeBEl, 0);
  updateEtatActuel();
  if (s_round === 1) renderManche1();
  else if (s_round === 2) renderManche2();
  else renderManche3();
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D6';

  // Topbar (barre progression + compteur score)
  const topbar = document.createElement('div');
  topbar.className = 'step-D6__topbar';

  const barre = document.createElement('div');
  barre.className = 'barre-progression';
  barreSegsEls = [];
  for (let i = 0; i < 3; i++) {
    const seg = document.createElement('div');
    seg.className = 'barre-progression__seg';
    barre.appendChild(seg);
    barreSegsEls.push(seg);
  }
  topbar.appendChild(barre);

  scoreCompteurEl = document.createElement('div');
  scoreCompteurEl.className = 'compteur-geant';
  const scoreValue = document.createElement('div');
  scoreValue.className = 'compteur-geant__value';
  scoreValue.textContent = `${s_score}`;
  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'compteur-geant__label';
  scoreLabel.textContent = '/ 3 réussis';
  scoreCompteurEl.appendChild(scoreValue);
  scoreCompteurEl.appendChild(scoreLabel);
  topbar.appendChild(scoreCompteurEl);

  wrap.appendChild(topbar);

  // Heading
  const heading = document.createElement('div');
  heading.className = 'step-D6__heading';

  titreEl = document.createElement('h1');
  titreEl.className = 'titre-hero step-D6__titre';
  titreEl.textContent = 'DÉFI DES CADENAS';

  sousTitreEl = document.createElement('p');
  sousTitreEl.className = 'sous-titre step-D6__sous';
  sousTitreEl.textContent = 'positionne les 2 interrupteurs sur le bon code';

  heading.appendChild(titreEl);
  heading.appendChild(sousTitreEl);
  wrap.appendChild(heading);

  // Zone cadenas
  zoneCadenasEl = document.createElement('div');
  zoneCadenasEl.className = 'step-D6__zone';
  wrap.appendChild(zoneCadenasEl);

  // Interrupteurs
  const interrupteurs = document.createElement('div');
  interrupteurs.className = 'step-D6__interrupteurs';

  const interA = document.createElement('div');
  interA.className = 'step-D6__interrupteur';
  const lblA = document.createElement('div');
  lblA.className = 'step-D6__interrupteur-label';
  lblA.textContent = 'INTERRUPTEUR A';
  basculeAEl = buildBascule(s_A);
  const helpA = document.createElement('div');
  helpA.className = 'step-D6__interrupteur-help';
  helpA.textContent = 'raccourci : Q';
  interA.appendChild(lblA);
  interA.appendChild(basculeAEl);
  interA.appendChild(helpA);
  interrupteurs.appendChild(interA);

  const interB = document.createElement('div');
  interB.className = 'step-D6__interrupteur';
  const lblB = document.createElement('div');
  lblB.className = 'step-D6__interrupteur-label';
  lblB.textContent = 'INTERRUPTEUR B';
  basculeBEl = buildBascule(s_B);
  const helpB = document.createElement('div');
  helpB.className = 'step-D6__interrupteur-help';
  helpB.textContent = 'raccourci : W';
  interB.appendChild(lblB);
  interB.appendChild(basculeBEl);
  interB.appendChild(helpB);
  interrupteurs.appendChild(interB);

  const onAClick = () => toggleA();
  basculeAEl.addEventListener('click', onAClick);
  handlers.push([basculeAEl, 'click', onAClick]);

  const onBClick = () => toggleB();
  basculeBEl.addEventListener('click', onBClick);
  handlers.push([basculeBEl, 'click', onBClick]);

  wrap.appendChild(interrupteurs);

  // Indicateur etat actuel
  etatActuelEl = document.createElement('div');
  etatActuelEl.className = 'step-D6__etat';
  etatActuelEl.textContent = `A=${s_A}  B=${s_B}`;
  wrap.appendChild(etatActuelEl);

  // Bottom row
  const bottom = document.createElement('div');
  bottom.className = 'step-D6__bottom';

  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D6__tuko-wrap';

  mainTukoEl = document.createElement('div');
  mainTukoEl.className = 'tuko-mascotte';
  mainTukoEl.setAttribute('data-pose', 'pedagogique');
  mainTukoEl.setAttribute('data-position', 'inline');
  tukoWrap.appendChild(mainTukoEl);

  const tukoMood = document.createElement('div');
  tukoMood.className = 'step-D6__tuko-mood';
  tukoMood.textContent = 'lis le code, place les bascules';
  tukoWrap.appendChild(tukoMood);

  bottom.appendChild(tukoWrap);

  ctaEl = document.createElement('button');
  ctaEl.type = 'button';
  ctaEl.className = 'cta-primary step-D6__cta';
  ctaEl.textContent = '▶ ON CONTINUE';
  bottom.appendChild(ctaEl);

  const spacer = document.createElement('div');
  spacer.className = 'step-D6__spacer';
  bottom.appendChild(spacer);

  wrap.appendChild(bottom);

  // Watermark
  const wm = document.createElement('div');
  wm.className = 'step-D6__watermark';
  wm.textContent = 'wubo · argibi';
  wrap.appendChild(wm);

  // CTA
  const onCtaClick = () => {
    if (ctaEl.classList.contains('is-shown')) navAPI.next();
  };
  ctaEl.addEventListener('click', onCtaClick);
  handlers.push([ctaEl, 'click', onCtaClick]);

  // Raccourcis
  const onKey = (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      toggleA();
    } else if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      toggleB();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      replayCurrentManche();
    } else if ((e.key === ' ' || e.key === 'ArrowRight') && ctaEl.classList.contains('is-shown')) {
      e.preventDefault();
      navAPI.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (navAPI.prev) navAPI.prev();
    }
  };
  document.addEventListener('keydown', onKey);
  handlers.push([document, 'keydown', onKey]);

  return wrap;
}

export default {
  id: 'D6',
  phase: 'D',
  title: 'Défi des cadenas',
  estimatedDuration: 300,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();

    if (savedState && Number.isInteger(savedState.round)) {
      s_round = Math.max(1, Math.min(3, savedState.round));
      s_score = Math.max(0, Math.min(3, savedState.score ?? 0));
      s_manche1Codes = Array.isArray(savedState.manche1Codes) && savedState.manche1Codes.length === 3
        ? savedState.manche1Codes
        : pickRandomCodes(3);
      s_manche2Codes = Array.isArray(savedState.manche2Codes) && savedState.manche2Codes.length === 2
        ? savedState.manche2Codes
        : pickRandomCodes(2, s_manche1Codes);
      s_manche1Done = Math.max(0, Math.min(3, savedState.manche1Done ?? 0));
      s_manche2Done = Math.max(0, Math.min(2, savedState.manche2Done ?? 0));
      s_manche3Opened = Array.isArray(savedState.manche3Opened) ? [...savedState.manche3Opened] : [];
    } else {
      s_round = 1;
      s_score = 0;
      s_manche1Codes = pickRandomCodes(3);
      s_manche2Codes = pickRandomCodes(2, s_manche1Codes);
      s_manche1Done = 0;
      s_manche2Done = 0;
      s_manche3Opened = [];
    }
    s_A = 0; s_B = 0;
    s_manche2Errors = 0;
    s_hinted = false;
    s_locked = false;

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    updateBarre();
    updateScore();

    if (s_round === 1) renderManche1();
    else if (s_round === 2) renderManche2();
    else renderManche3();
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

    mainTukoEl = null;
    basculeAEl = null;
    basculeBEl = null;
    etatActuelEl = null;
    scoreCompteurEl = null;
    barreSegsEls = [];
    titreEl = null;
    sousTitreEl = null;
    zoneCadenasEl = null;
    ctaEl = null;
  },

  serialize() {
    return {
      round: s_round,
      score: s_score,
      manche1Codes: [...s_manche1Codes],
      manche2Codes: [...s_manche2Codes],
      manche1Done: s_manche1Done,
      manche2Done: s_manche2Done,
      manche3Opened: [...s_manche3Opened],
    };
  },

  isComplete() {
    return s_manche3Opened.length >= ALL_CODES.length;
  },

  replay() {
    s_round = 1;
    s_score = 0;
    s_manche1Done = 0;
    s_manche2Done = 0;
    s_manche3Opened = [];
    s_manche1Codes = pickRandomCodes(3);
    s_manche2Codes = pickRandomCodes(2, s_manche1Codes);
    s_A = 0; s_B = 0;
    s_manche2Errors = 0;
    s_hinted = false;
    s_locked = false;
    if (basculeAEl) setBasculeState(basculeAEl, 0);
    if (basculeBEl) setBasculeState(basculeBEl, 0);
    if (ctaEl) ctaEl.classList.remove('is-shown');
    updateBarre();
    updateScore();
    updateEtatActuel();
    renderManche1();
  },
};

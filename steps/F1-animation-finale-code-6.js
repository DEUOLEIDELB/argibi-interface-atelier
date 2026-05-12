// F1 — Animation finale + code 6 chiffres .
// Source : doc interne.
// Pic narratif de l'atelier : 3 temps cinematiques qui ferment l'arc Kurnel.
//
// Temps 1 (~3.2s) : les 4 chiffres E3 (C C P P) tombent depuis le haut, puis
//   les 2 chiffres E4 (L L) arrivent des cotes avec overshoot dramatique.
// Temps 2 (~3.2s) : titre `CODE COMPLET` -> `CODE VALIDE`, glow vert, 6 .cadenas
//   apparaissent au-dessus, cascade unlock gauche->droite (200ms), dispatch
//   `argibi:kurnel-dissipate` pour eteindre les overlays Kurnel (E0).
// Temps 3 (~5s+) : titre `MISSION REUSSIE !` smashe, Tuko libere central scale-up,
//   spawnFireworks dense, startPluieDePrenoms (A1.students), citation perso
//   (10 prenoms aleatoires flash en grand 0.4s), spawnShockwave loot drop,
//   CTA `> ON CLOTURE` apparait apres 5s -> F2.
//
// Mode shell : fullscreen pendant Temps 1+2 (immersion), mode standard a Temps 3
// (watermark + shell visibles pour la decompression).
//
// Composants partages utilises :
//   - .titre-hero  : 3 titres successifs (smash + swap)
//   - .cell-digit  : 6 cellules code (.is-filled au snap)
//   - .cadenas     : 6 cadenas ferme -> unlocking -> ouvert (cascade Temps 2)
//   - .tuko-mascotte[data-pose="triomphe"] : Tuko libere central + Tuko bas-gauche
//   - .cta-primary : `> ON CLOTURE`
//   - spawnFireworks(anchor, {palette: 'tinta'}) : feu d'artifice Temps 3
//   - startPluieDePrenoms(anchor) : pluie Temps 1 + 3 (lit A1.students)
//   - spawnShockwave(anchor) : onde Temps 3 + au clic CTA
//
// Persistance : { celebrated: true } des Temps 3.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { getState } from '../core/state.js';
import {
  spawnFireworks,
  startPluieDePrenoms,
  spawnShockwave,
  spawnConfettis,
} from '../core/effects.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleEl = null;
let nav = null;
let phase = 0; // 0 idle | 1 chiffres | 2 cadenas | 3 celebration
let cleanupEffects = []; // fonctions stop() retournees par effects.js

const SUB_LABELS = ['c', 'c', 'p', 'p', 'l', 'l'];

// Timings (ms) — exposes pour ajustement editorial sans toucher au code.
const T1_FIRST_DIGIT     = 600;   // premier chiffre apparait
const T1_E3_STAGGER      = 320;   // stagger entre les 4 chiffres E3
const T1_E4_GAP          = 500;   // pause avant les chiffres E4 (drama)
const T1_E4_STAGGER      = 600;   // stagger entre les 2 chiffres E4
const PHASE_2_DELAY      = 3500;  // Temps 1 -> Temps 2
const T2_LOCKS_APPEAR    = 350;   // cadenas apparaissent apres start Temps 2
const T2_LOCKS_STAGGER   = 80;    // entre les 6 cadenas qui apparaissent
const T2_UNLOCK_START    = 1100;  // premier unlock cascade
const T2_UNLOCK_STAGGER  = 200;   // entre chaque unlock (spec)
const T2_UNLOCK_DURATION = 600;   // durant l'animation unlock (--d-slow)
const T2_KURNEL_DISSIPATE = 2900; // dispatch event pour eteindre Kurnel
const PHASE_3_DELAY      = 6800;  // Temps 2 -> Temps 3 (~3.3s apres start T2)
const T3_FIREWORKS_DELAY = 200;
const T3_SHOCKWAVE_DELAY = 400;
const T3_MERCI_START     = 1000;  // demarre la citation des prenoms
const T3_MERCI_INTERVAL  = 400;   // chaque prenom flash 0.4s
const T3_MERCI_COUNT     = 10;    // ~10 prenoms cycle aleatoire
const CTA_READY_DELAY    = 5000;  // CTA cliquable apres start Temps 3

// --------------------------------------------------------------------------
// Lecture defensive du state amont (E3 + E4 + A1).
// --------------------------------------------------------------------------

function readDigits() {
  const state = getState();
  const couleur = state.steps?.E3?.couleur || ['_', '_'];
  const pixel   = state.steps?.E3?.pixel   || ['_', '_'];
  const d5 = state.steps?.E4?.digit5 ?? '_';
  const d6 = state.steps?.E4?.digit6 ?? '_';
  return [
    couleur[0] ?? '_',
    couleur[1] ?? '_',
    pixel[0]   ?? '_',
    pixel[1]   ?? '_',
    d5,
    d6,
  ].map(String);
}

function readPrenoms() {
  const state = getState();
  const list = state.steps?.A1?.students;
  if (!Array.isArray(list)) return [];
  return list.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
}

// --------------------------------------------------------------------------
// CSS local — scope .step-F1 strict, tokens uniquement, aucune duree hardcodee.
// --------------------------------------------------------------------------

const CSS = `
.step-F1 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  gap: var(--s-4);
  padding: var(--s-6) var(--s-6) var(--s-8);
  overflow: hidden;
  background: var(--bg);
}

.step-F1__pluie-anchor,
.step-F1__fx-anchor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.step-F1__pluie-anchor { z-index: 0; }
.step-F1__fx-anchor    { z-index: 1; }

.step-F1__title {
  position: relative;
  z-index: 3;
  text-align: center;
  transform: scale(0);
  animation: f1-title-smash var(--d-hero) var(--ease-bounce) forwards;
}

.step-F1__title.is-swapping {
  animation: f1-title-swap var(--d-slow) var(--ease-bounce) forwards;
}

@keyframes f1-title-smash {
  0%   { transform: scale(0)   rotate(-3deg); }
  60%  { transform: scale(1.2) rotate(2deg); }
  100% { transform: scale(1)   rotate(0); }
}

@keyframes f1-title-swap {
  0%   { transform: scale(1)   rotate(0); opacity: 1; }
  40%  { transform: scale(0.7) rotate(-4deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(2deg);  opacity: 0; }
  100% { transform: scale(1)   rotate(0);     opacity: 1; }
}

.step-F1__codes {
  position: relative;
  z-index: 3;
  display: flex;
  gap: var(--s-3);
  align-items: flex-start;
}

/* Centrage du chiffre dans la cellule (override scoped F1). */
.step-F1__codes .cell-digit {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.step-F1__code-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  /* Reserve la place pour le cadenas au-dessus (apparait au Temps 2). */
  padding-top: calc(var(--cadenas-size, 96px) + var(--s-3));
}

.step-F1__code-stack .cell-digit {
  /* Cellule arrive de l'invisible avec un pop. */
  transform: scale(0);
  animation: f1-cell-pop var(--d-normal) var(--ease-bounce) forwards;
}

.step-F1__code-stack .cell-digit.is-filled {
  animation: f1-cell-snap var(--d-normal) var(--ease-bounce) forwards;
}

.step-F1__code-stack.is-from-side-left .cell-digit.is-filled {
  animation: f1-cell-from-left var(--d-slow) var(--ease-bounce) forwards;
}
.step-F1__code-stack.is-from-side-right .cell-digit.is-filled {
  animation: f1-cell-from-right var(--d-slow) var(--ease-bounce) forwards;
}

@keyframes f1-cell-pop {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

@keyframes f1-cell-snap {
  0%   { transform: translateY(-200px) scale(0.6); }
  60%  { transform: translateY(8px) scale(1.18); }
  100% { transform: translateY(0)  scale(1); }
}

@keyframes f1-cell-from-left {
  0%   { transform: translateX(-600px) scale(0.5) rotate(-12deg); }
  60%  { transform: translateX(20px)   scale(1.25) rotate(4deg); }
  100% { transform: translateX(0)      scale(1)    rotate(0); }
}

@keyframes f1-cell-from-right {
  0%   { transform: translateX(600px) scale(0.5) rotate(12deg); }
  60%  { transform: translateX(-20px) scale(1.25) rotate(-4deg); }
  100% { transform: translateX(0)     scale(1)    rotate(0); }
}

.step-F1__code-stack.is-glow .cell-digit {
  background: var(--accent-3);
  box-shadow: 0 0 0 4px var(--accent-3), var(--shadow);
  transition: background var(--d-normal) var(--ease-out),
              box-shadow var(--d-normal) var(--ease-out);
}

/* Cadenas — positionne au-dessus de la cellule, invisible jusqu'au Temps 2. */
.step-F1__code-stack .cadenas {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) scale(0);
  opacity: 0;
  --cadenas-size: 88px;
  transition: opacity var(--d-fast) var(--ease-out);
}

.step-F1__code-stack .cadenas.is-shown {
  transform: translateX(-50%) scale(1);
  opacity: 1;
  animation: f1-lock-appear var(--d-normal) var(--ease-bounce) forwards;
  animation-delay: var(--cadenas-delay);
}

@keyframes f1-lock-appear {
  0%   { transform: translateX(-50%) scale(0)    rotate(-12deg); opacity: 0; }
  60%  { transform: translateX(-50%) scale(1.2)  rotate(6deg);   opacity: 1; }
  100% { transform: translateX(-50%) scale(1)    rotate(0);      opacity: 1; }
}

/* Override de l'animation cadenas-unlock pour conserver la position absolute. */
.step-F1__code-stack .cadenas.is-unlocking {
  animation: f1-lock-unlock var(--d-slow) var(--ease-bounce) forwards;
  animation-delay: var(--cadenas-delay);
}

@keyframes f1-lock-unlock {
  0%   { transform: translateX(-50%) scale(1)   rotate(0); }
  30%  { transform: translateX(-50%) scale(1.4) rotate(-12deg); }
  100% { transform: translateX(-50%) scale(1)   rotate(8deg); }
}

/* Flash plein ecran au dernier unlock du Temps 2. */
.step-F1__flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  background: var(--accent-3);
  opacity: 0;
}

.step-F1__flash.is-burst {
  animation: f1-flash-burst var(--d-slow) var(--ease-out) forwards;
}

@keyframes f1-flash-burst {
  0%   { opacity: 0; }
  20%  { opacity: 0.85; }
  100% { opacity: 0; }
}

/* Hero Tuko libere (sprite tuko_reward) — visible uniquement Temps 3. */
.step-F1__hero {
  position: relative;
  z-index: 2;
  display: none;
  width: auto;
  height: auto;
}
.step-F1__hero-img {
  width: auto;
  height: clamp(360px, 42vh, 520px);
  object-fit: contain;
  display: block;
}

.step-F1.is-phase-3 .step-F1__hero {
  display: block;
  animation: f1-hero-drop var(--d-hero) var(--ease-bounce) forwards;
}

@keyframes f1-hero-drop {
  0%   { transform: translateY(-280px) scale(0.5) rotate(-15deg); opacity: 0; }
  60%  { transform: translateY(24px)   scale(1.15) rotate(6deg);  opacity: 1; }
  80%  { transform: translateY(0)      scale(0.96) rotate(-2deg); }
  100% { transform: translateY(0)      scale(1)    rotate(0);     opacity: 1; }
}

/* Citation perso — Temps 3, alterne 10 prenoms aleatoires (~4s). */
.step-F1__merci {
  position: relative;
  z-index: 3;
  display: none;
  flex-direction: row;
  align-items: baseline;
  gap: var(--s-2);
  min-height: var(--t-h1);
}

.step-F1.is-phase-3 .step-F1__merci { display: flex; }

.step-F1__merci-name {
  font-family: var(--display);
  font-size: var(--t-h1);
  font-weight: 900;
  color: var(--accent-1);
  transform: scale(0);
  opacity: 0;
}

.step-F1__merci-name.is-flash {
  animation: f1-merci-flash var(--d-normal) var(--ease-bounce);
}

@keyframes f1-merci-flash {
  0%   { transform: scale(0)   rotate(-4deg); opacity: 0; }
  40%  { transform: scale(1.3) rotate(3deg);  opacity: 1; }
  100% { transform: scale(1)   rotate(0);     opacity: 0.85; }
}

/* CTA — visible Temps 3 apres delai de celebration. */
.step-F1__bottom {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}

.step-F1__cta {
  opacity: 0;
  transform: translateY(20px) scale(0.85);
  pointer-events: none;
  transition: opacity var(--d-slow) var(--ease-out),
              transform var(--d-slow) var(--ease-bounce);
}

.step-F1.is-cta-ready .step-F1__cta {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

`;

// --------------------------------------------------------------------------
// Helpers DOM + timer-safe.
// --------------------------------------------------------------------------

function injectStyle() {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.id = 'step-F1-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
}

function setT(ms, fn) {
  const t = setTimeout(fn, ms);
  timers.push(t);
  return t;
}

function clearAllTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function setShellFullscreen(on) {
  const shell = document.querySelector('#shell');
  if (shell) shell.classList.toggle('is-fullscreen', !!on);
}

function setPhase(rootEl, n, titleEl) {
  phase = n;
  rootEl.classList.remove('is-phase-1', 'is-phase-2', 'is-phase-3');
  rootEl.classList.add(`is-phase-${n}`);

  if (n === 2 && titleEl) {
    titleEl.classList.remove('is-swapping');
    void titleEl.offsetWidth;
    titleEl.classList.add('is-swapping');
    setT(240, () => { titleEl.textContent = 'CODE VALIDÉ'; });
  }
  if (n === 3 && titleEl) {
    titleEl.classList.remove('is-swapping');
    void titleEl.offsetWidth;
    titleEl.classList.add('is-swapping');
    setT(240, () => { titleEl.textContent = 'MISSION RÉUSSIE !'; });
    // Sortie du mode fullscreen pour la decompression (watermark + shell visibles).
    setShellFullscreen(false);
    // Marque complete + persiste.
    try { nav?.markComplete?.(); } catch { /* shell pas pret */ }
    try { nav?.saveState?.({ steps: { F1: { celebrated: true } } }); } catch { /* ignore */ }
  }
}

// --------------------------------------------------------------------------
// Sequences cinematiques.
// --------------------------------------------------------------------------

function runTemps1(rootEl, cellEls, stackEls) {
  setPhase(rootEl, 1, null);
  const digits = readDigits();

  // Les 4 chiffres E3 tombent depuis le haut (stagger).
  for (let i = 0; i < 4; i++) {
    setT(T1_FIRST_DIGIT + i * T1_E3_STAGGER, () => {
      cellEls[i].textContent = digits[i];
      cellEls[i].classList.add('is-filled');
    });
  }

  // Les 2 chiffres E4 (logique) arrivent des cotes avec overshoot — drame.
  const t1End = T1_FIRST_DIGIT + 4 * T1_E3_STAGGER + T1_E4_GAP;
  setT(t1End, () => {
    stackEls[4].classList.add('is-from-side-left');
    cellEls[4].textContent = digits[4];
    cellEls[4].classList.add('is-filled');
  });
  setT(t1End + T1_E4_STAGGER, () => {
    stackEls[5].classList.add('is-from-side-right');
    cellEls[5].textContent = digits[5];
    cellEls[5].classList.add('is-filled');
  });
}

function runTemps2(rootEl, lockEls, stackEls, titleEl, flashEl) {
  setPhase(rootEl, 2, titleEl);

  // Glow vert collectif sur les 6 cellules.
  stackEls.forEach(s => s.classList.add('is-glow'));

  // 6 cadenas apparaissent en cascade (rappel A4 fermeture, ici ouverture a venir).
  lockEls.forEach((lock, i) => {
    setT(T2_LOCKS_APPEAR + i * T2_LOCKS_STAGGER, () => {
      lock.classList.add('is-shown');
    });
  });

  // Cascade unlock gauche -> droite, 200ms entre chaque.
  lockEls.forEach((lock, i) => {
    setT(T2_UNLOCK_START + i * T2_UNLOCK_STAGGER, () => {
      lock.classList.add('is-unlocking');
    });
    // Transition vers etat "ouvert" a la fin de l'animation unlock.
    setT(T2_UNLOCK_START + i * T2_UNLOCK_STAGGER + T2_UNLOCK_DURATION, () => {
      lock.classList.remove('is-unlocking');
      lock.classList.remove('cadenas--ferme');
      lock.classList.add('cadenas--ouvert');
    });
  });

  // Flash plein ecran au dernier unlock.
  const lastUnlockEnd = T2_UNLOCK_START + 5 * T2_UNLOCK_STAGGER + T2_UNLOCK_DURATION;
  setT(lastUnlockEnd - 100, () => {
    flashEl.classList.remove('is-burst');
    void flashEl.offsetWidth;
    flashEl.classList.add('is-burst');
  });

  // Dispatch event : E0 (et tout overlay Kurnel persistant) doit s'eteindre.
  setT(T2_KURNEL_DISSIPATE, () => {
    window.dispatchEvent(new CustomEvent('argibi:kurnel-dissipate'));
  });
}

function runTemps3(rootEl, titleEl, heroEl, mainAnchor) {
  setPhase(rootEl, 3, titleEl);

  // Feu d'artifice multi-couleurs (palette atelier).
  setT(T3_FIREWORKS_DELAY, () => {
    spawnFireworks(mainAnchor, { nombre: 24, palette: 'tinta' });
  });
  // 2e gerbe legerement decalee.
  setT(T3_FIREWORKS_DELAY + 800, () => {
    spawnFireworks(mainAnchor, { nombre: 18, palette: 'tinta' });
  });

  // Loot drop "Tuko libere" : onde de choc cyan qui s'etend du centre.
  setT(T3_SHOCKWAVE_DELAY, () => {
    spawnShockwave(mainAnchor, { rayonMax: 1400, duree: 900, couleur: 'var(--accent-2)' });
  });

  // Citation perso : cycle aleatoire ~10 prenoms × 0.4s.
  const prenoms = readPrenoms();
  if (prenoms.length > 0) {
    startMerciCycle(rootEl, prenoms);
  }

  // CTA cliquable apres ~5s de celebration.
  setT(CTA_READY_DELAY, () => {
    rootEl.classList.add('is-cta-ready');
  });
}

function startMerciCycle(rootEl) {
  const prenoms = readPrenoms();
  if (prenoms.length === 0) return;

  const merciEl = rootEl.querySelector('.step-F1__merci-name');
  if (!merciEl) return;

  let i = 0;
  const tick = () => {
    if (i >= T3_MERCI_COUNT || phase !== 3) return;
    const name = prenoms[Math.floor(Math.random() * prenoms.length)];
    merciEl.textContent = name;
    merciEl.classList.remove('is-flash');
    void merciEl.offsetWidth;
    merciEl.classList.add('is-flash');
    i++;
    setT(T3_MERCI_INTERVAL, tick);
  };
  setT(T3_MERCI_START, tick);
}

function jumpToFinal(rootEl, cellEls, lockEls, stackEls, titleEl, heroEl, mainAnchor, flashEl) {
  // Skip operateur : on stoppe la sequence en cours et on force l'etat Temps 3.
  clearAllTimers();
  const digits = readDigits();
  cellEls.forEach((cell, i) => {
    cell.textContent = digits[i];
    cell.classList.add('is-filled');
  });
  stackEls.forEach(s => s.classList.add('is-glow'));
  lockEls.forEach((lock) => {
    lock.classList.add('is-shown');
    lock.classList.remove('cadenas--ferme', 'is-unlocking');
    lock.classList.add('cadenas--ouvert');
  });
  if (titleEl) titleEl.textContent = 'MISSION RÉUSSIE !';
  flashEl?.classList.remove('is-burst');
  // Dispatch kurnel-dissipate au cas ou on n'a pas atteint le T2_KURNEL_DISSIPATE.
  window.dispatchEvent(new CustomEvent('argibi:kurnel-dissipate'));
  setPhase(rootEl, 3, null);
  setShellFullscreen(false);
  // On enchaine sur Temps 3 immediatement.
  runTemps3(rootEl, titleEl, heroEl, mainAnchor);
}

function resetSequence(rootEl, cellEls, lockEls, stackEls, titleEl, heroEl, mainAnchor, flashEl) {
  // Restart doux : on remet a Temps 1.
  clearAllTimers();
  cleanupEffects.forEach(stop => { try { stop(); } catch { /* ignore */ } });
  cleanupEffects = [];

  cellEls.forEach(c => { c.textContent = '_'; c.classList.remove('is-filled'); });
  stackEls.forEach(s => s.classList.remove('is-glow', 'is-from-side-left', 'is-from-side-right'));
  lockEls.forEach(l => {
    l.classList.remove('is-shown', 'is-unlocking', 'cadenas--ouvert');
    l.classList.add('cadenas--ferme');
  });
  titleEl.textContent = 'CODE COMPLET';
  titleEl.classList.remove('is-swapping');
  flashEl?.classList.remove('is-burst');
  rootEl.classList.remove('is-cta-ready');
  setShellFullscreen(true);

  // Relance la sequence complete.
  startFullSequence(rootEl, cellEls, lockEls, stackEls, titleEl, heroEl, mainAnchor, flashEl);
}

function startFullSequence(rootEl, cellEls, lockEls, stackEls, titleEl, heroEl, mainAnchor, flashEl) {
  // Pluie de prenoms en fond (continue du Temps 1 au Temps 3).
  // On passe explicitement A1.students car effects.js lit globalThis.__argibiState__
  // qui n'est pas expose par state.js .
  const pluieAnchor = rootEl.querySelector('.step-F1__pluie-anchor');
  if (pluieAnchor) {
    const prenoms = readPrenoms();
    const stop = startPluieDePrenoms(pluieAnchor, {
      intensite: 'normale',
      prenoms: prenoms.length > 0 ? prenoms : undefined,
    });
    cleanupEffects.push(stop);
  }

  runTemps1(rootEl, cellEls, stackEls);
  setT(PHASE_2_DELAY, () => runTemps2(rootEl, lockEls, stackEls, titleEl, flashEl));
  setT(PHASE_3_DELAY, () => runTemps3(rootEl, titleEl, heroEl, mainAnchor));
}

// --------------------------------------------------------------------------
// Contrat de step.
// --------------------------------------------------------------------------

export default {
  id: 'F1',
  phase: 'F',
  title: 'Animation finale + code 6 chiffres',
  estimatedDuration: 17,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: true, // Temps 1+2 immersifs, on sort en mode standard au Temps 3.

  async enter(container, savedState, navAPI) {
    nav = navAPI;
    phase = 0;
    cleanupEffects = [];
    injectStyle();

    // Scene Pixi vide (DOM uniquement).
    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const root = document.createElement('div');
    root.className = 'step-F1 is-phase-1';

    // Anchor pluie de prenoms (z-index 0, fond).
    const pluieAnchor = document.createElement('div');
    pluieAnchor.className = 'step-F1__pluie-anchor';
    root.appendChild(pluieAnchor);

    // Anchor FX (fireworks + shockwave, z-index 1, devant pluie).
    const fxAnchor = document.createElement('div');
    fxAnchor.className = 'step-F1__fx-anchor';
    root.appendChild(fxAnchor);

    // Titre.
    const titre = document.createElement('h1');
    titre.className = 'titre-hero step-F1__title';
    titre.textContent = 'CODE COMPLET';
    root.appendChild(titre);

    // Hero Tuko libere (sprite reel, visible Temps 3).
    const hero = document.createElement('div');
    hero.className = 'step-F1__hero';
    hero.setAttribute('aria-label', 'Tuko libere');
    const heroImg = document.createElement('img');
    heroImg.className = 'step-F1__hero-img';
    heroImg.src = 'assets/sprites/tuko_reward.png';
    heroImg.alt = '';
    hero.appendChild(heroImg);
    root.appendChild(hero);

    // 6 cellules + cadenas par-dessus.
    const codes = document.createElement('div');
    codes.className = 'step-F1__codes';
    const cellEls = [];
    const lockEls = [];
    const stackEls = [];

    for (let i = 0; i < 6; i++) {
      const stack = document.createElement('div');
      stack.className = 'step-F1__code-stack';
      stack.style.animationDelay = `${i * 80}ms`;

      // Cadenas (shared component .cadenas).
      const lock = document.createElement('div');
      lock.className = 'cadenas cadenas--ferme';
      lock.setAttribute('aria-hidden', 'true');
      lock.style.setProperty('--cadenas-delay', `${i * T2_UNLOCK_STAGGER}ms`);
      stack.appendChild(lock);
      lockEls.push(lock);

      // Cellule (shared component .cell-digit).
      const cell = document.createElement('div');
      cell.className = 'cell-digit';
      cell.textContent = '_';
      cell.style.animationDelay = `${i * 80}ms`;
      stack.appendChild(cell);
      cellEls.push(cell);

      codes.appendChild(stack);
      stackEls.push(stack);
    }
    root.appendChild(codes);

    // Citation perso (visible Temps 3) : juste le prenom, plus de label "merci a :".
    const merci = document.createElement('div');
    merci.className = 'step-F1__merci';
    const merciName = document.createElement('span');
    merciName.className = 'step-F1__merci-name';
    merciName.textContent = '';
    merci.appendChild(merciName);
    root.appendChild(merci);

    // Bottom : CTA.
    const bottom = document.createElement('div');
    bottom.className = 'step-F1__bottom';
    const cta = document.createElement('button');
    cta.className = 'cta-primary step-F1__cta';
    cta.textContent = '▶ ON CLÔTURE';
    cta.type = 'button';
    bottom.appendChild(cta);
    root.appendChild(bottom);

    // Flash plein ecran (au dernier unlock du Temps 2).
    const flash = document.createElement('div');
    flash.className = 'step-F1__flash';
    flash.setAttribute('aria-hidden', 'true');
    root.appendChild(flash);

    stage.appendChild(root);
    domNodes.push(root);

    // Listeners.
    const onCta = () => {
      if (phase < 3) {
        jumpToFinal(root, cellEls, lockEls, stackEls, titre, hero, fxAnchor, flash);
        return;
      }
      // Onde de cloture + confettis au clic, puis bascule F2.
      spawnShockwave(fxAnchor, { rayonMax: 1200, duree: 500, couleur: 'var(--accent-1)' });
      spawnConfettis(fxAnchor, { nombre: 12 });
      try { nav?.markComplete?.(); } catch { /* ignore */ }
      setT(450, () => nav?.next?.());
    };
    cta.addEventListener('click', onCta);
    handlers.push([cta, 'click', onCta]);

    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === ' ') {
        if (phase < 3) {
          e.preventDefault();
          e.stopPropagation();
          jumpToFinal(root, cellEls, lockEls, stackEls, titre, hero, fxAnchor, flash);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        resetSequence(root, cellEls, lockEls, stackEls, titre, hero, fxAnchor, flash);
      }
    };
    window.addEventListener('keydown', onKey, true);
    handlers.push([window, 'keydown', onKey, true]);

    // Restauration si l'animateur revient apres avoir deja celebre.
    if (savedState?.celebrated) {
      jumpToFinal(root, cellEls, lockEls, stackEls, titre, hero, fxAnchor, flash);
    } else {
      startFullSequence(root, cellEls, lockEls, stackEls, titre, hero, fxAnchor, flash);
    }
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => target.removeEventListener(event, fn, capture));
    handlers = [];

    cleanupEffects.forEach(stop => { try { stop(); } catch { /* ignore */ } });
    cleanupEffects = [];

    clearAllTimers();

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    // Si on sort sans avoir atteint le Temps 3, on restaure le fullscreen
    // au comportement nominal du shell pour le step suivant.
    setShellFullscreen(false);

    nav = null;
    phase = 0;
  },

  serialize() {
    return { celebrated: phase >= 3 };
  },

  isComplete() {
    return phase >= 3;
  },

  replay() {
    // Re-execute juste l'animation principale sans ecraser le state.
    // Pattern : exit + enter avec savedState courant.
    return true;
  },
};

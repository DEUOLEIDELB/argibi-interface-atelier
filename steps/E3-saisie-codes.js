// E3-saisie-codes.js — Saisie animateur des 4 chiffres dictes par les enfants.
//
// L'animateur clique une cellule (ou Tab), tape un chiffre, ca apparait dans
// la cellule du HAUT puis MIGRE vers la cellule correspondante du code final
// en BAS (mini-Tuko transporteur). Les 2 dernieres cellules L L attendent
// E4 (logique).
//
// Composants utilises :
//   - cell-digit (focus/filled etats deja stylises par )
//   - card-clickable (cards equipe couleur / pixel)
//   - cta-primary (apparait apres 4/4)
//   - mini-Tuko transporteur (anime la migration haut->bas)
//
// Persistance : state.steps.E3 = { couleur:[d1,d2], pixel:[d1,d2], logique:[null,null] }
// Contrat avec F1 : F1 lit allState.steps.E3.couleur + .pixel pour les 4
// premiers chiffres du code final 6.

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

let state = {
  couleur: [null, null],
  pixel: [null, null],
  logique: [null, null],
};
let focusKey = null;     // 'couleur:0' | 'couleur:1' | 'pixel:0' | 'pixel:1'

const STYLE_ID = 'step-E3-style';

const CSS = `
.step-E3 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto auto;
  align-items: start;
  justify-items: center;
  padding: var(--s-3) var(--s-6) var(--s-8);
  text-align: center;
  cursor: var(--cursor-default);
  gap: var(--s-3);
}

.step-E3__titre {
  font-size: var(--t-h1);
  margin: 0;
  opacity: 0;
  transform: scale(0);
  animation: e3-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-E3__main {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: var(--s-4);
  align-items: center;
  justify-items: center;
  width: 100%;
}

/* ---- Zone haute : 2 cards de saisie ---- */
.step-E3__teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  width: min(1200px, 92%);
}

.step-E3__team {
  padding: var(--s-4) var(--s-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  min-height: 340px;
  opacity: 0;
  transform: translateY(40px);
  animation: e3-team-in var(--d-slow) var(--ease-out) forwards;
}
.step-E3__team--couleur { animation-delay: 0.4s; }
.step-E3__team--pixel   { animation-delay: 0.6s; }

.step-E3__team-title {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.04em;
}

.step-E3__team-cells {
  display: flex;
  gap: var(--s-3);
  margin-top: var(--s-1);
}

/* Cases digit team : agrandies pour contenir le chiffre hero */
.step-E3__team-cells .cell-digit {
  width: 130px;
  height: 180px;
  font-size: 120px;
  line-height: 1;
}

.step-E3__team-hint {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.7;
  margin: 0;
}

.step-E3__team-badge {
  margin-top: var(--s-1);
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border-thin);
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 700;
  opacity: 0;
  transform: scale(0);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-bounce);
}
.step-E3__team-badge.is-shown { opacity: 1; transform: scale(1); }

/* ---- Separateur ---- */
.step-E3__sep {
  width: min(900px, 80%);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0;
  animation: e3-sep-in var(--d-slow) var(--ease-out) 0.9s forwards;
}
.step-E3__sep-line { flex: 1; height: 2px; background: var(--ink); opacity: 0.4; }
.step-E3__sep-text { opacity: 0.7; }

/* ---- Zone basse : 6 cellules code final ---- */
.step-E3__final {
  display: flex;
  gap: var(--s-2);
  align-items: flex-start;
  margin-top: var(--s-2);
}

.step-E3__final-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateY(20px);
  animation: e3-final-cell-in var(--d-normal) var(--ease-bounce) forwards;
}
.step-E3__final-col:nth-child(1) { animation-delay: 1.0s; }
.step-E3__final-col:nth-child(2) { animation-delay: 1.08s; }
.step-E3__final-col:nth-child(3) { animation-delay: 1.16s; }
.step-E3__final-col:nth-child(4) { animation-delay: 1.24s; }
.step-E3__final-col:nth-child(5) { animation-delay: 1.32s; }
.step-E3__final-col:nth-child(6) { animation-delay: 1.40s; }

.step-E3__final-cell {
  width: 110px;
  height: 150px;
  font-size: 96px;
  line-height: 1;
}
.step-E3__final-cell .step-E3__waiting {
  font-family: var(--display);
  font-size: 64px;
  line-height: 1;
  color: var(--ink);
  opacity: 0.4;
  animation: e3-waiting-blink 1.4s ease-in-out infinite;
}
.step-E3__final-col--logique .step-E3__final-cell {
  background: var(--bg-2);
}
.step-E3__final-col--logique .step-E3__waiting {
  animation-duration: 0.8s;
}
.step-E3__final-label {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.6;
}
.step-E3__final-sub {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.4;
  text-align: center;
}

/* ---- Migration mini-Tuko (carte volante qui porte le chiffre) ---- */
.step-E3__migrant {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  display: grid;
  place-items: center;
  width: 110px;
  height: 150px;
  font-family: var(--display);
  font-size: 96px;
  line-height: 1;
  font-weight: 900;
  color: var(--ink);
  background: var(--accent-3);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
}
.step-E3__migrant::after {
  content: '';
  position: absolute;
  inset: -10px -10px auto auto;
  width: 28px;
  height: 28px;
  background: var(--accent-4);
  border: var(--border-thin);
  border-radius: 50%;
}

/* ---- Bottom row (Tuko absolute, ne prend pas de place ici) ---- */
.step-E3__bottom {
  display: grid;
  place-items: start center;
  width: 100%;
  margin-top: var(--s-2);
}
.step-E3__cta {
  opacity: 0;
  transform: scale(0);
  transition: opacity var(--d-normal) var(--ease-out), transform var(--d-normal) var(--ease-bounce);
}
.step-E3__cta.is-shown { opacity: 1; transform: scale(1); }

/* Tuko_ok grand en bas-gauche (sprite reel + shake aleatoire) */
.step-E3__tuko-wrap {
  position: absolute;
  left: var(--s-5);
  bottom: var(--s-3);
  opacity: 0;
  transform: translateX(-120%);
  animation: e3-slide-in-tuko var(--d-slow) var(--ease-out) 0.8s forwards;
  z-index: 5;
  pointer-events: none;
}
.step-E3__tuko-img {
  display: block;
  width: clamp(220px, 22vw, 360px);
  height: auto;
  transform-origin: 50% 90%;
}
.step-E3__tuko-img.is-shaking {
  animation: e3-tuko-shake 600ms var(--ease-out);
}
@keyframes e3-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}
@keyframes e3-tuko-shake {
  0%   { transform: rotate(0deg)  translateX(0); }
  15%  { transform: rotate(-7deg) translateX(-3px); }
  30%  { transform: rotate(6deg)  translateX(3px); }
  45%  { transform: rotate(-5deg) translateX(-2px); }
  60%  { transform: rotate(4deg)  translateX(2px); }
  100% { transform: rotate(0deg)  translateX(0); }
}

/* ---- Animations ---- */
@keyframes e3-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes e3-team-in {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes e3-sep-in {
  to { opacity: 1; }
}
@keyframes e3-final-cell-in {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes e3-waiting-blink {
  0%, 100% { opacity: 0.2; }
  50%      { opacity: 0.6; }
}
@keyframes e3-cell-flash-success {
  0%   { background: var(--accent-3); }
  50%  { background: color-mix(in srgb, var(--accent-3) 70%, var(--paper)); }
  100% { background: var(--accent-3); }
}
.step-E3__final-cell.is-flash {
  animation: e3-cell-flash-success 0.4s ease-out 1;
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
   DOM construction
   -------------------------------------------------------------------------- */
function buildTeamCard(zoneKey, label, hint) {
  const card = document.createElement('div');
  card.className = `card-clickable step-E3__team step-E3__team--${zoneKey}`;

  const t = document.createElement('h3');
  t.className = 'step-E3__team-title';
  t.textContent = label;
  card.appendChild(t);

  const cells = document.createElement('div');
  cells.className = 'step-E3__team-cells';
  for (let i = 0; i < 2; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell-digit';
    cell.dataset.zone = zoneKey;
    cell.dataset.idx = String(i);
    cell.tabIndex = 0;
    cells.appendChild(cell);
  }
  card.appendChild(cells);

  const h = document.createElement('p');
  h.className = 'step-E3__team-hint';
  h.textContent = hint;
  card.appendChild(h);

  const badge = document.createElement('span');
  badge.className = 'step-E3__team-badge';
  badge.dataset.zone = zoneKey;
  badge.textContent = '✓ equipe terminee';
  card.appendChild(badge);

  return card;
}

function buildFinalCol(label, sub, zoneKey, idx, modifier) {
  const col = document.createElement('div');
  col.className = 'step-E3__final-col' + (modifier ? ` step-E3__final-col--${modifier}` : '');

  const cell = document.createElement('div');
  cell.className = 'cell-digit step-E3__final-cell';
  cell.dataset.finalZone = zoneKey;
  cell.dataset.finalIdx = String(idx);

  const w = document.createElement('span');
  w.className = 'step-E3__waiting';
  w.textContent = '?';
  cell.appendChild(w);

  col.appendChild(cell);

  const lbl = document.createElement('span');
  lbl.className = 'step-E3__final-label';
  lbl.textContent = label;
  col.appendChild(lbl);

  if (sub) {
    const s = document.createElement('span');
    s.className = 'step-E3__final-sub';
    s.textContent = sub;
    col.appendChild(s);
  }
  return col;
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-E3';

  // Titre
  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-E3__titre';
  titre.textContent = 'VOS CODES, EQUIPES !';
  wrap.appendChild(titre);

  // Main
  const main = document.createElement('div');
  main.className = 'step-E3__main';

  // Teams
  const teams = document.createElement('div');
  teams.className = 'step-E3__teams';
  const cardCouleur = buildTeamCard('couleur', 'EQUIPE COULEUR', 'tape 2 chiffres');
  const cardPixel = buildTeamCard('pixel', 'EQUIPE PIXEL', 'tape 2 chiffres');
  teams.appendChild(cardCouleur);
  teams.appendChild(cardPixel);
  main.appendChild(teams);

  // Separator
  const sep = document.createElement('div');
  sep.className = 'step-E3__sep';
  const l1 = document.createElement('div'); l1.className = 'step-E3__sep-line';
  const l2 = document.createElement('div'); l2.className = 'step-E3__sep-line';
  const txt = document.createElement('span'); txt.className = 'step-E3__sep-text';
  txt.textContent = 'code final assemble';
  sep.appendChild(l1); sep.appendChild(txt); sep.appendChild(l2);
  main.appendChild(sep);

  // Final 6 cells: C C P P L L
  const final = document.createElement('div');
  final.className = 'step-E3__final';
  final.appendChild(buildFinalCol('C', 'couleur', 'couleur', 0));
  final.appendChild(buildFinalCol('C', null,      'couleur', 1));
  final.appendChild(buildFinalCol('P', 'pixel',   'pixel',   0));
  final.appendChild(buildFinalCol('P', null,      'pixel',   1));
  final.appendChild(buildFinalCol('L', 'logique', 'logique', 0, 'logique'));
  final.appendChild(buildFinalCol('L', '(a venir)', 'logique', 1, 'logique'));
  main.appendChild(final);

  wrap.appendChild(main);

  // Tuko_ok grand en bas-gauche
  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-E3__tuko-wrap';
  const tukoImg = document.createElement('img');
  tukoImg.className = 'step-E3__tuko-img';
  tukoImg.src = 'assets/sprites/tuko_ok.png';
  tukoImg.alt = '';
  tukoWrap.appendChild(tukoImg);
  wrap.appendChild(tukoWrap);

  // Shake aleatoire (3-7s)
  const scheduleShake = () => {
    const delay = 3000 + Math.random() * 4000;
    const t = setTimeout(() => {
      tukoImg.classList.remove('is-shaking');
      void tukoImg.offsetWidth;
      tukoImg.classList.add('is-shaking');
      scheduleShake();
    }, delay);
    timers.push(t);
  };
  const tFirstShake = setTimeout(scheduleShake, 2200);
  timers.push(tFirstShake);

  // Bottom : CTA centree (Tuko est en position absolue, ne prend pas de place)
  const bottom = document.createElement('div');
  bottom.className = 'step-E3__bottom';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-E3__cta';
  cta.textContent = 'on continue';
  bottom.appendChild(cta);

  wrap.appendChild(bottom);

  // Listeners
  attachListeners(wrap, navAPI);

  return wrap;
}

function attachListeners(wrap, navAPI) {
  // Click sur cell-digit du HAUT -> focus
  wrap.querySelectorAll('.step-E3__team-cells .cell-digit').forEach(cell => {
    const onClick = () => focusCell(wrap, cell.dataset.zone, +cell.dataset.idx);
    cell.addEventListener('click', onClick);
    handlers.push([cell, 'click', onClick]);
  });

  // Click sur card -> focus 1ere cellule vide de la card
  wrap.querySelectorAll('.step-E3__team').forEach(card => {
    const onCardClick = (e) => {
      // si le clic est deja sur une cell, on laisse le handler cell agir.
      if (e.target.closest('.cell-digit')) return;
      const zone = [...card.classList].find(c => c.startsWith('step-E3__team--'))
        ?.replace('step-E3__team--', '');
      if (!zone) return;
      const empty = state[zone].findIndex(d => d == null);
      focusCell(wrap, zone, empty < 0 ? 0 : empty);
    };
    card.addEventListener('click', onCardClick);
    handlers.push([card, 'click', onCardClick]);
  });

  // Keyboard global : 0-9, Tab, Shift+Tab, Backspace
  const onKey = (e) => {
    // Tab navigation entre cellules de saisie
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      moveFocus(wrap, e.shiftKey ? -1 : +1);
      return;
    }
    // 0-9 : ecrit dans la cellule focusee
    if (/^[0-9]$/.test(e.key)) {
      if (!focusKey) {
        // si rien de focus, on prend la 1ere cellule vide
        const first = firstEmptyKey();
        if (first) focusCellByKey(wrap, first);
      }
      if (focusKey) {
        e.preventDefault();
        e.stopPropagation();
        writeDigit(wrap, focusKey, e.key);
      }
      return;
    }
    // Backspace : efface la cellule focusee (ou recule)
    if (e.key === 'Backspace') {
      if (!focusKey) return;
      e.preventDefault();
      e.stopPropagation();
      const [zone, idx] = focusKey.split(':');
      const i = +idx;
      if (state[zone][i] != null) {
        clearDigit(wrap, focusKey);
      } else if (i > 0) {
        focusCell(wrap, zone, i - 1);
        clearDigit(wrap, `${zone}:${i - 1}`);
      }
      return;
    }
  };
  // capture: true pour passer avant le shell global qui prend Backspace.
  window.addEventListener('keydown', onKey, true);
  handlers.push([window, 'keydown', onKey, true]);

  // CTA
  const cta = wrap.querySelector('.step-E3__cta');
  const onCta = () => {
    if (!isAllFilled()) return;
    play('whoosh');
    enableKurnelOverlay();
    navAPI.next();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);
}

/* --------------------------------------------------------------------------
   Focus / saisie
   -------------------------------------------------------------------------- */
function focusCell(wrap, zone, idx) {
  if (!['couleur', 'pixel'].includes(zone)) return;
  if (idx < 0 || idx > 1) return;
  focusKey = `${zone}:${idx}`;
  refreshFocusVisuals(wrap);
}

function focusCellByKey(wrap, key) {
  const [zone, idx] = key.split(':');
  focusCell(wrap, zone, +idx);
}

function refreshFocusVisuals(wrap) {
  wrap.querySelectorAll('.step-E3__team-cells .cell-digit').forEach(cell => {
    const k = `${cell.dataset.zone}:${cell.dataset.idx}`;
    cell.classList.toggle('is-focus', k === focusKey);
  });
}

function moveFocus(wrap, delta) {
  const order = ['couleur:0', 'couleur:1', 'pixel:0', 'pixel:1'];
  let i = focusKey ? order.indexOf(focusKey) : -1;
  i = (i + delta + order.length) % order.length;
  focusCellByKey(wrap, order[i]);
}

function firstEmptyKey() {
  const order = ['couleur:0', 'couleur:1', 'pixel:0', 'pixel:1'];
  return order.find(k => {
    const [z, i] = k.split(':');
    return state[z][+i] == null;
  });
}

function writeDigit(wrap, key, digit) {
  const [zone, idx] = key.split(':');
  const i = +idx;
  state[zone][i] = digit;
  saveStepState('E3', { ...state });

  // Update cellule du HAUT
  const cell = wrap.querySelector(`.step-E3__team-cells .cell-digit[data-zone="${zone}"][data-idx="${i}"]`);
  if (cell) {
    cell.textContent = digit;
    cell.classList.add('is-filled');
    play('tic');
  }

  // Animation migration vers cellule du BAS
  const finalCell = wrap.querySelector(`.cell-digit.step-E3__final-cell[data-final-zone="${zone}"][data-final-idx="${i}"]`);
  if (cell && finalCell) {
    animateMigration(wrap, cell, finalCell, digit);
  }

  // Badge "equipe terminee" si 2/2 dans la zone
  const team = wrap.querySelector(`.step-E3__team--${zone}`);
  const badge = team?.querySelector(`.step-E3__team-badge[data-zone="${zone}"]`);
  if (badge && state[zone].every(d => d != null)) {
    badge.classList.add('is-shown');
    play('success');
  }

  // Avance focus si pas plein dans la zone
  if (i === 0 && state[zone][1] == null) {
    focusCell(wrap, zone, 1);
  } else {
    // Avance vers la prochaine cellule vide globale
    const next = firstEmptyKey();
    if (next) focusCellByKey(wrap, next);
    else focusKey = null;
    refreshFocusVisuals(wrap);
  }

  // Reward 4/4
  if (isAllFilled()) {
    fireReward(wrap);
  }
}

function clearDigit(wrap, key) {
  const [zone, idx] = key.split(':');
  const i = +idx;
  state[zone][i] = null;
  saveStepState('E3', { ...state });

  const cell = wrap.querySelector(`.step-E3__team-cells .cell-digit[data-zone="${zone}"][data-idx="${i}"]`);
  if (cell) {
    cell.textContent = '';
    cell.classList.remove('is-filled');
  }
  const finalCell = wrap.querySelector(`.cell-digit.step-E3__final-cell[data-final-zone="${zone}"][data-final-idx="${i}"]`);
  if (finalCell) {
    finalCell.classList.remove('is-filled');
    finalCell.textContent = '';
    const w = document.createElement('span');
    w.className = 'step-E3__waiting';
    w.textContent = '?';
    finalCell.appendChild(w);
  }
  // Cache le badge
  const badge = wrap.querySelector(`.step-E3__team-badge[data-zone="${zone}"]`);
  badge?.classList.remove('is-shown');

  // Cache CTA si plus 4/4
  const cta = wrap.querySelector('.step-E3__cta');
  cta?.classList.remove('is-shown');
}

function isAllFilled() {
  return state.couleur.every(d => d != null) && state.pixel.every(d => d != null);
}

/* --------------------------------------------------------------------------
   Migration animee haut -> bas (mini-Tuko transporteur)
   -------------------------------------------------------------------------- */
function animateMigration(wrap, fromCell, toCell, digit) {
  const fromRect = fromCell.getBoundingClientRect();
  const toRect = toCell.getBoundingClientRect();

  const migrant = document.createElement('div');
  migrant.className = 'step-E3__migrant';
  migrant.textContent = digit;
  migrant.style.left = `${fromRect.left}px`;
  migrant.style.top  = `${fromRect.top}px`;
  migrant.style.width = `${fromRect.width}px`;
  migrant.style.height = `${fromRect.height}px`;
  migrant.style.transition = `transform var(--d-slow) var(--ease-bounce), opacity 200ms ease-out 500ms`;
  document.body.appendChild(migrant);

  // force reflow
  void migrant.offsetWidth;

  const dx = toRect.left - fromRect.left + (toRect.width - fromRect.width) / 2;
  const dy = toRect.top  - fromRect.top  + (toRect.height - fromRect.height) / 2;
  migrant.style.transform = `translate(${dx}px, ${dy}px) scale(${toRect.width / fromRect.width}) rotate(360deg)`;

  const tDone = setTimeout(() => {
    migrant.style.opacity = '0';
    play('pop');
  }, 580);
  timers.push(tDone);

  const tCleanup = setTimeout(() => {
    migrant.remove();
    // Pose le digit dans la cellule finale
    toCell.textContent = digit;
    toCell.classList.add('is-filled', 'is-flash');
    setTimeout(() => toCell.classList.remove('is-flash'), 450);
  }, 800);
  timers.push(tCleanup);
}

/* --------------------------------------------------------------------------
   Reward 4/4 — onde de victoire + gerbe confettis via helpers partages
   -------------------------------------------------------------------------- */
function fireReward(wrap) {
  // Onde de victoire (composant 5.9, depuis le centre de la page)
  spawnShockwave(wrap, { rayonMax: 1100, duree: 900 });

  // Gerbe de confettis (composant 5.8, 16 pieces depuis le centre)
  spawnConfettis(wrap, { nombre: 16 });

  play('success');

  // Show CTA
  const cta = wrap.querySelector('.step-E3__cta');
  cta?.classList.add('is-shown');
}

/* --------------------------------------------------------------------------
   Restoration
   -------------------------------------------------------------------------- */
function restoreFromState(wrap) {
  // Re-applique l'etat sur le DOM (cellules haut + bas + badges + CTA).
  ['couleur', 'pixel'].forEach(zone => {
    state[zone].forEach((d, i) => {
      if (d == null) return;
      const top = wrap.querySelector(`.step-E3__team-cells .cell-digit[data-zone="${zone}"][data-idx="${i}"]`);
      if (top) {
        top.textContent = d;
        top.classList.add('is-filled');
      }
      const bot = wrap.querySelector(`.cell-digit.step-E3__final-cell[data-final-zone="${zone}"][data-final-idx="${i}"]`);
      if (bot) {
        bot.textContent = d;
        bot.classList.add('is-filled');
      }
    });
    const team = wrap.querySelector(`.step-E3__team--${zone}`);
    const badge = team?.querySelector(`.step-E3__team-badge[data-zone="${zone}"]`);
    if (badge && state[zone].every(x => x != null)) badge.classList.add('is-shown');
  });
  if (isAllFilled()) {
    const cta = wrap.querySelector('.step-E3__cta');
    cta?.classList.add('is-shown');
  }
}

/* --------------------------------------------------------------------------
   Module export
   -------------------------------------------------------------------------- */
export default {
  id: 'E3',
  phase: 'E',
  title: 'Saisie codes',
  estimatedDuration: 60,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();
    enableKurnelOverlay();

    // Restaure le state (ou init vierge)
    state = {
      couleur: savedState?.couleur?.slice(0, 2) || [null, null],
      pixel:   savedState?.pixel?.slice(0, 2)   || [null, null],
      logique: savedState?.logique?.slice(0, 2) || [null, null],
    };
    if (state.couleur.length < 2) state.couleur = [...state.couleur, ...Array(2 - state.couleur.length).fill(null)];
    if (state.pixel.length < 2)   state.pixel   = [...state.pixel,   ...Array(2 - state.pixel.length).fill(null)];
    if (state.logique.length < 2) state.logique = [...state.logique, ...Array(2 - state.logique.length).fill(null)];

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    // Restaure l'etat visuel apres l'apparition
    const tRestore = setTimeout(() => restoreFromState(wrap), 1500);
    timers.push(tRestore);

    // Focus initial : 1ere cellule vide
    const first = firstEmptyKey() || 'couleur:0';
    const tFocus = setTimeout(() => focusCellByKey(wrap, first), 1200);
    timers.push(tFocus);
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

    // Cleanup migrants residuels (si exit pendant migration)
    document.querySelectorAll('.step-E3__migrant').forEach(n => n.remove());

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
      couleur: [...state.couleur],
      pixel:   [...state.pixel],
      logique: [...state.logique],
    };
  },

  isComplete() {
    return isAllFilled();
  },

  replay() {
    // Pas de reset des chiffres (progression conservee), juste re-pop des cards.
    const wrap = domNodes[0];
    if (!wrap) return;
    wrap.querySelectorAll('.step-E3__team, .step-E3__final-col, .step-E3__titre, .step-E3__sep').forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  },
};

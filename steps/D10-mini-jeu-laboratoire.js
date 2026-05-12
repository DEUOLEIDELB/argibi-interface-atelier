// D10-mini-jeu-laboratoire.js : "LE LABORATOIRE" (chasse aux objets).
// Fiche : doc interne.
// Composants partages :
//   - `.chip` (composant partage) pour les objets classes
//   - `.input-mega` pour la saisie animateur
//   - `.tuko-mascotte[data-pose=scientifique]`
//   - `.cta-primary`
//   - `spawnEtincelles` cyan depuis `core/effects.js` :
//       * idle continu (duree:0) sur la colonne CONDUCTEUR, stop() en exit
//       * one-shot (duree:600) sur la chip ajoutee cote CONDUCTEUR
//
// Persistance lue par D12 (recap stats) :
//   state.steps.D10.conducteurs.length + state.steps.D10.isolants.length

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D10-styles';

const STYLE_TEXT = `
.step-D10 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6) var(--s-4);
  pointer-events: none;
}
.step-D10__header {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--s-1);
}
.step-D10__titre {
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
.step-D10__titre.is-in {
  animation: d10-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d10-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D10__sous {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(16px);
}
.step-D10__sous.is-in {
  animation: d10-fade-up var(--d-slow) var(--ease-out) 350ms forwards;
}
@keyframes d10-fade-up {
  to { opacity: 1; transform: translateY(0); }
}

/* Tableau 2 colonnes (composant local). */
.step-D10__tableau {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-5);
  align-items: stretch;
  pointer-events: auto;
  min-height: 0;
}
.step-D10__col {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-4);
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-2);
  position: relative;
  opacity: 0;
}
.step-D10__col--cond.is-in {
  animation: d10-slide-in-left var(--d-slow) var(--ease-out) 600ms forwards;
}
.step-D10__col--iso.is-in {
  animation: d10-slide-in-right var(--d-slow) var(--ease-out) 750ms forwards;
}
@keyframes d10-slide-in-left {
  from { opacity: 0; transform: translateX(-32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes d10-slide-in-right {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
.step-D10__col-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-2);
}
.step-D10__col-nom {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
}
.step-D10__col-bigbit {
  font-family: var(--display);
  font-size: var(--t-h1);
  font-weight: 900;
  line-height: 1;
}
.step-D10__col--cond .step-D10__col-bigbit { color: var(--accent-2); }
.step-D10__col--iso  .step-D10__col-bigbit { color: var(--ink); opacity: 0.5; }
.step-D10__col-sub {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0.7;
  margin: 0;
}
.step-D10__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--s-2);
  overflow-y: auto;
  min-height: 0;
}
.step-D10__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 700;
  background: var(--paper);
  color: var(--ink);
  border: var(--border-thin);
  box-shadow: var(--shadow-sm);
  padding: 8px var(--s-2);
  border-radius: var(--r-sm);
  width: auto;
  max-width: 100%;
  align-self: flex-start;
  opacity: 0;
  transform: scale(0);
  cursor: var(--cursor-pointer);
  animation: d10-chip-pop var(--d-normal) var(--ease-bounce) forwards;
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.step-D10__chip:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow);
}
.step-D10__chip-ico {
  font-family: var(--mono);
  font-size: var(--t-h2);
  font-weight: 700;
}
.step-D10__col--cond .step-D10__chip-ico { color: var(--accent-2); }
.step-D10__col--iso  .step-D10__chip-ico { opacity: 0.55; }
.step-D10__chip.is-jolt {
  animation: d10-jolt 0.8s ease-in-out 1;
}
.step-D10__col-total {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: 0.7;
  text-align: right;
  margin: 0;
}
.step-D10__col-total-num {
  display: inline-block;
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  color: var(--ink);
  margin-left: var(--s-1);
  transition: transform var(--d-fast) var(--ease-bounce);
}
.step-D10__col-total-num.is-pulsing { transform: scale(1.25); }
.step-D10__col-badge {
  position: absolute;
  top: -16px;
  right: var(--s-3);
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow-sm);
  padding: 4px var(--s-2);
  border-radius: var(--r-sm);
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
}
.step-D10__col-badge.is-show {
  animation: d10-badge-flash 2.4s var(--ease-out) 1 forwards;
}

/* Saisie animateur (input + boutons C / I). */
.step-D10__saisie {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--s-3);
  align-items: stretch;
  opacity: 0;
  pointer-events: auto;
  animation: d10-fade-up var(--d-slow) var(--ease-out) 1100ms forwards;
}
.step-D10__btn {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow);
  padding: var(--s-2) var(--s-4);
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.step-D10__btn--cond { background: var(--accent-2); }
.step-D10__btn--iso  { background: var(--paper); }
.step-D10__btn:hover { transform: translate(-3px, -3px); box-shadow: var(--shadow-lg); }

.step-D10__bottom {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: end;
  gap: var(--s-4);
  pointer-events: auto;
}
.step-D10__cta-wrap {
  display: grid;
  place-items: center;
  gap: var(--s-1);
  justify-self: center;
}
.step-D10__cta {
  opacity: 0;
  transform: scale(0);
}
.step-D10__cta.is-in {
  animation: d10-pop 350ms var(--ease-bounce) 1500ms forwards,
             cta-idle-pulse 2s var(--ease-out) 1900ms infinite;
}
@keyframes d10-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
/* Tuko hote en bas-gauche, shake aleatoire */
.step-D10__tuko-wrap {
  position: absolute;
  left: var(--s-5);
  bottom: var(--s-3);
  opacity: 0;
  transform: translateX(-120%);
  animation: d10-slide-in-tuko var(--d-slow) var(--ease-out) 1000ms forwards;
  z-index: 2;
  pointer-events: none;
}
.step-D10__tuko-img {
  display: block;
  width: clamp(140px, 12vw, 200px);
  height: auto;
  transform-origin: 50% 90%;
}
.step-D10__tuko-img.is-shaking {
  animation: d10-tuko-shake 600ms var(--ease-out);
}
@keyframes d10-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}
@keyframes d10-tuko-shake {
  0%   { transform: rotate(0deg)  translateX(0); }
  15%  { transform: rotate(-8deg) translateX(-4px); }
  30%  { transform: rotate(7deg)  translateX(4px); }
  45%  { transform: rotate(-6deg) translateX(-3px); }
  60%  { transform: rotate(5deg)  translateX(3px); }
  75%  { transform: rotate(-3deg) translateX(-2px); }
  100% { transform: rotate(0deg)  translateX(0); }
}
@keyframes d10-chip-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes d10-jolt {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(-2px, 1px); }
  40%      { transform: translate(2px, -1px); }
  60%      { transform: translate(-1px, 2px); }
  80%      { transform: translate(1px, -1px); }
}
@keyframes d10-badge-flash {
  0%   { opacity: 0; transform: scale(0) rotate(-3deg); }
  20%  { opacity: 1; transform: scale(1.2) rotate(-3deg); }
  60%  { opacity: 1; transform: scale(1) rotate(-3deg); }
  100% { opacity: 0; transform: scale(0.8) rotate(-3deg); }
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];

let containerRef = null;
let navAPIRef = null;
let savedStateRef = null;

// Etat metier persiste.
let conducteurs = [];
let isolants = [];

// References DOM.
let cols = { cond: null, iso: null };
let lists = { cond: null, iso: null };
let totals = { cond: null, iso: null };
let badges = { cond: null, iso: null };
let inputEl = null;
let ctaEl = null;
let ctaHelpEl = null;

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

function makeChip(kind, label) {
  const li = document.createElement('li');
  li.className = 'step-D10__chip';
  const ico = document.createElement('span');
  ico.className = 'step-D10__chip-ico';
  ico.textContent = kind === 'cond' ? '⚡' : '⊘';
  li.appendChild(ico);
  const span = document.createElement('span');
  span.textContent = label;
  li.appendChild(span);
  return li;
}

function buildColumn(kind) {
  const isCond = kind === 'cond';
  const col = document.createElement('section');
  col.className = `step-D10__col step-D10__col--${kind}`;

  const head = document.createElement('header');
  head.className = 'step-D10__col-head';
  const nom = document.createElement('h2');
  nom.className = 'step-D10__col-nom';
  nom.textContent = isCond ? 'CONDUCTEUR' : 'ISOLANT';
  head.appendChild(nom);
  const big = document.createElement('span');
  big.className = 'step-D10__col-bigbit';
  big.textContent = isCond ? '1' : '0';
  head.appendChild(big);
  col.appendChild(head);

  const sub = document.createElement('p');
  sub.className = 'step-D10__col-sub';
  sub.textContent = isCond ? 'laisse passer' : 'bloque le courant';
  col.appendChild(sub);

  const list = document.createElement('ul');
  list.className = 'step-D10__list';
  col.appendChild(list);

  const total = document.createElement('p');
  total.className = 'step-D10__col-total';
  total.textContent = 'total : ';
  const totalNum = document.createElement('span');
  totalNum.className = 'step-D10__col-total-num';
  totalNum.textContent = '0';
  total.appendChild(totalNum);
  col.appendChild(total);

  const badge = document.createElement('div');
  badge.className = 'step-D10__col-badge';
  badge.textContent = 'bien rempli';
  col.appendChild(badge);

  cols[kind] = col;
  lists[kind] = list;
  totals[kind] = totalNum;
  badges[kind] = badge;

  return col;
}

function joltNeighbors(kind) {
  const list = lists[kind];
  if (!list) return;
  const chips = list.querySelectorAll('.step-D10__chip');
  chips.forEach((c) => {
    c.classList.add('is-jolt');
    const t = setTimeout(() => c.classList.remove('is-jolt'), 850);
    timers.push(t);
  });
}

function updateTotal(kind) {
  const arr = kind === 'cond' ? conducteurs : isolants;
  const numEl = totals[kind];
  if (!numEl) return;
  numEl.textContent = String(arr.length);
  numEl.classList.add('is-pulsing');
  const t = setTimeout(() => numEl.classList.remove('is-pulsing'), 200);
  timers.push(t);
  // Badge "BIEN REMPLI" quand on atteint 5.
  if (arr.length === 5 && badges[kind]) {
    badges[kind].classList.add('is-show');
    const tb = setTimeout(() => badges[kind]?.classList.remove('is-show'), 2400);
    timers.push(tb);
  }
}

function updateCta() {
  if (!ctaEl) return;
  const ok = conducteurs.length >= 1 && isolants.length >= 1;
  ctaEl.disabled = !ok;
  ctaEl.classList.toggle('is-disabled', !ok);
}

function savePersist() {
  if (!navAPIRef) return;
  navAPIRef.saveState({
    steps: { D10: { conducteurs: [...conducteurs], isolants: [...isolants] } },
  });
}

function addObjet(kind, rawLabel) {
  const label = (rawLabel || '').trim();
  if (!label) return;
  const arr = kind === 'cond' ? conducteurs : isolants;
  arr.push(label);

  const li = makeChip(kind, label);
  lists[kind].appendChild(li);

  // Clic chip = supprime la chip.
  const onRemove = () => {
    const idx = arr.indexOf(label);
    if (idx >= 0) arr.splice(idx, 1);
    li.remove();
    savePersist();
    updateTotal(kind);
    updateCta();
  };
  li.addEventListener('click', onRemove);
  handlers.push([li, 'click', onRemove]);

  joltNeighbors(kind);

  updateTotal(kind);
  updateCta();
  savePersist();
  play('pop');
}

function submitInput(kind) {
  const value = inputEl?.value;
  if (!value || !value.trim()) return;
  addObjet(kind, value);
  inputEl.value = '';
  inputEl.focus();
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D10';

  // Header.
  const header = document.createElement('header');
  header.className = 'step-D10__header';
  const titre = document.createElement('h1');
  titre.className = 'step-D10__titre';
  titre.textContent = 'LE LABORATOIRE';
  header.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D10__sous';
  sous.textContent = 'approche l’objet, ne l’appuie pas';
  header.appendChild(sous);
  wrap.appendChild(header);

  // Tableau 2 colonnes.
  const tableau = document.createElement('div');
  tableau.className = 'step-D10__tableau';
  const colC = buildColumn('cond');
  const colI = buildColumn('iso');
  tableau.appendChild(colC);
  tableau.appendChild(colI);
  wrap.appendChild(tableau);

  // Saisie.
  const saisie = document.createElement('div');
  saisie.className = 'step-D10__saisie';
  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.className = 'input-mega step-D10__input';
  inputEl.maxLength = 30;
  saisie.appendChild(inputEl);
  const btnC = document.createElement('button');
  btnC.type = 'button';
  btnC.className = 'step-D10__btn step-D10__btn--cond';
  btnC.textContent = 'CONDUCTEUR';
  saisie.appendChild(btnC);
  const btnI = document.createElement('button');
  btnI.type = 'button';
  btnI.className = 'step-D10__btn step-D10__btn--iso';
  btnI.textContent = 'ISOLANT';
  saisie.appendChild(btnI);
  wrap.appendChild(saisie);

  // Bottom : CTA centre.
  const bottom = document.createElement('div');
  bottom.className = 'step-D10__bottom';
  bottom.appendChild(document.createElement('span'));

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'step-D10__cta-wrap';
  ctaEl = document.createElement('button');
  ctaEl.type = 'button';
  ctaEl.className = 'cta-primary step-D10__cta is-disabled';
  ctaEl.textContent = '▶ ON CONTINUE';
  ctaEl.disabled = true;
  ctaWrap.appendChild(ctaEl);
  bottom.appendChild(ctaWrap);

  bottom.appendChild(document.createElement('span'));
  wrap.appendChild(bottom);

  // Tuko hote en absolute bas-gauche
  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D10__tuko-wrap';
  const tukoImg = document.createElement('img');
  tukoImg.className = 'step-D10__tuko-img';
  tukoImg.src = 'assets/sprites/tuko_hote.png';
  tukoImg.alt = '';
  tukoWrap.appendChild(tukoImg);
  wrap.appendChild(tukoWrap);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Shake aleatoire (apres slide-in, intervalle 3-7s)
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

  // Entrance.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    colC.classList.add('is-in');
    colI.classList.add('is-in');
    ctaEl.classList.add('is-in');
  });

  // CTA enabled apres entrance (initial : disabled si conducteurs/isolants vides).
  const tEnable = setTimeout(() => updateCta(), 1700);
  timers.push(tEnable);

  // Markcomplete dès qu'au moins 1+1.
  const tComplete = setTimeout(() => {
    if (conducteurs.length >= 1 && isolants.length >= 1) navAPI.markComplete();
  }, 2000);
  timers.push(tComplete);

  // Restauration UI a partir de savedState (avant les listeners).
  conducteurs.forEach((label) => {
    const li = makeChip('cond', label);
    lists.cond.appendChild(li);
    const onRemove = () => {
      const idx = conducteurs.indexOf(label);
      if (idx >= 0) conducteurs.splice(idx, 1);
      li.remove();
      savePersist();
      updateTotal('cond');
      updateCta();
    };
    li.addEventListener('click', onRemove);
    handlers.push([li, 'click', onRemove]);
  });
  isolants.forEach((label) => {
    const li = makeChip('iso', label);
    lists.iso.appendChild(li);
    const onRemove = () => {
      const idx = isolants.indexOf(label);
      if (idx >= 0) isolants.splice(idx, 1);
      li.remove();
      savePersist();
      updateTotal('iso');
      updateCta();
    };
    li.addEventListener('click', onRemove);
    handlers.push([li, 'click', onRemove]);
  });
  totals.cond.textContent = String(conducteurs.length);
  totals.iso.textContent = String(isolants.length);
  updateCta();

  // Listeners boutons + raccourcis.
  const onClickC = () => submitInput('cond');
  const onClickI = () => submitInput('iso');
  btnC.addEventListener('click', onClickC);
  btnI.addEventListener('click', onClickI);
  handlers.push([btnC, 'click', onClickC]);
  handlers.push([btnI, 'click', onClickI]);

  const onInputKey = (e) => {
    if (e.key === 'Enter') {
      // On stoppe la propagation pour que nav.js ne fasse pas next().
      e.preventDefault();
      e.stopPropagation();
    }
  };
  inputEl.addEventListener('keydown', onInputKey);
  handlers.push([inputEl, 'keydown', onInputKey]);

  const onCta = () => {
    if (ctaEl.disabled) return;
    play('whoosh');
    ctaEl.disabled = true;
    navAPI.markComplete();
    navAPI.next();
  };
  ctaEl.addEventListener('click', onCta);
  handlers.push([ctaEl, 'click', onCta]);

  // Auto-focus l'input pour que l'animateur tape direct.
  requestAnimationFrame(() => inputEl.focus());
}

export default {
  id: 'D10',
  phase: 'D',
  title: 'Le laboratoire',
  estimatedDuration: 360,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    conducteurs = Array.isArray(savedState?.conducteurs) ? [...savedState.conducteurs] : [];
    isolants    = Array.isArray(savedState?.isolants)    ? [...savedState.isolants]    : [];

    scene = new Container();
    scene.label = 'step-D10';
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
    cols = { cond: null, iso: null };
    lists = { cond: null, iso: null };
    totals = { cond: null, iso: null };
    badges = { cond: null, iso: null };
    inputEl = ctaEl = ctaHelpEl = null;
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    return { conducteurs: [...conducteurs], isolants: [...isolants] };
  },

  isComplete() {
    return conducteurs.length >= 1 && isolants.length >= 1;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

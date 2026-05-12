// E2-activites-couleur-pixel.js — Choix d'epreuve (cards Couleur / Pixel).
//
// L'animateur lit les consignes oralement, demande aux enfants de choisir
// leur epreuve. Le clic sur la card focuse une zone, l'animateur peut alors
// debloquer des indices (Q/W/E) ou incrementer le compteur d'equipe (+).
// Les enfants travaillent sur PAPIER ; aucune saisie de chiffres ici.
// La saisie a lieu en E3.
//
// Composants utilises :
//   - card-clickable (les 2 cards de choix)
//   - cta-primary (action animateur "tous prets ?")
//   - placeholder-image (illustrations a redessiner par Taki)
//   - cadenas indices deverrouillables (E2/E4 pattern, declare § 5.5/5.6)
//
// Persistance : state.steps.E2 = {
//   couleur: { team: N },
//   pixel:   { team: N },
// }
// Les 4 chiffres viendront de la dictee en E3, pas d'ici.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { saveStepState } from '../core/state.js';
import { enableKurnelOverlay } from './_kurnel-overlay.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

let state = {
  couleur: { team: 0 },
  pixel:   { team: 0 },
};
let focusZone = null;  // 'couleur' | 'pixel'

const STYLE_ID = 'step-E2-style';

const CSS = `
.step-E2 {
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

.step-E2__titre {
  font-size: var(--t-h1);
  margin: 0;
  opacity: 0;
  transform: scale(0);
  animation: e2-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

/* ---- 2 cards parallel ---- */
.step-E2__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  width: min(1500px, 95%);
  align-items: stretch;
}

.step-E2__card {
  display: grid;
  grid-template-rows: auto auto auto auto auto auto;
  gap: var(--s-2);
  padding: var(--s-3);
  text-align: left;
  opacity: 0;
  transform: translateX(-60px);
  position: relative;
  align-self: stretch;
}
.step-E2__card--couleur { animation: e2-card-l-in var(--d-slow) var(--ease-out) 0.4s forwards; }
.step-E2__card--pixel   { animation: e2-card-r-in var(--d-slow) var(--ease-out) 0.55s forwards; transform: translateX(60px); }
.step-E2__card.is-focus {
  border-color: var(--accent-1);
  box-shadow: var(--shadow-accent-1);
  transform: translate(-3px, -3px);
}

@keyframes e2-card-l-in { to { opacity: 1; transform: translateX(0); } }
@keyframes e2-card-r-in { to { opacity: 1; transform: translateX(0); } }

.step-E2__card-title {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.04em;
}

.step-E2__card-illu {
  min-height: 220px;
  position: relative;
  overflow: hidden;
}

/* Illu COULEUR : 3 cercles RGB qui se superposent (synthese ADDITIVE).
   Fond noir pour que le blend "screen" donne les vraies couleurs RGB. */
.step-E2__illu-rgb {
  width: 100%;
  height: 220px;
  position: relative;
  background: #000;
  border-radius: var(--r-md);
}
.step-E2__rgb-circle {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  mix-blend-mode: screen;
  animation: e2-rgb-orbit 4s ease-in-out infinite;
}
.step-E2__rgb-circle--r { background: #FF0000; animation-delay: 0s;   }
.step-E2__rgb-circle--g { background: #00FF00; animation-delay: 1.3s; }
.step-E2__rgb-circle--b { background: #0000FF; animation-delay: 2.6s; }

@keyframes e2-rgb-orbit {
  0%, 100% { transform: translate(-50%, -50%) translate( 0,    0); }
  25%      { transform: translate(-50%, -50%) translate(-40px, -25px); }
  50%      { transform: translate(-50%, -50%) translate( 40px, -25px); }
  75%      { transform: translate(-50%, -50%) translate( 0,    25px); }
}
.step-E2__card.has-hint-1 .step-E2__rgb-circle--r,
.step-E2__card.has-hint-1 .step-E2__rgb-circle--g,
.step-E2__card.has-hint-1 .step-E2__rgb-circle--b { animation-duration: 3s; }
.step-E2__card.has-hint-2 .step-E2__rgb-circle { width: 130px; height: 130px; }

/* Illu PIXEL : matrice partagee 8x8 (composant .matrice-8x8) avec smiley statique */
.step-E2__illu-pix {
  margin: 0 auto;
}

.step-E2__card-consigne {
  font-family: var(--body);
  font-size: var(--t-body-xl);
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  color: var(--ink);
}

/* Compteur equipe + bouton + */
.step-E2__team-row {
  display: flex;
  gap: var(--s-2);
  align-items: center;
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.step-E2__team-bar {
  flex: 1;
  height: 16px;
  background: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.step-E2__team-fill {
  height: 100%;
  background: var(--accent-1);
  width: 0%;
  transition: width var(--d-slow) var(--ease-out);
}
.step-E2__team-num {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  min-width: 60px;
  text-align: right;
  transition: transform var(--d-fast) var(--ease-bounce);
}
.step-E2__team-num.is-pulsing { transform: scale(1.2); }

.step-E2__team-add {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--paper);
  border: var(--border-thin);
  padding: 6px 12px;
  border-radius: var(--r-sm);
  cursor: var(--cursor-pointer);
}

.step-E2__team-empty {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-1);
  margin-top: var(--s-1);
  display: none;
}
.step-E2__card.is-empty .step-E2__team-empty { display: block; }

/* Bottom row (Tuko mascotte = position absolue bas-gauche, ne prend pas de place) */
.step-E2__bottom {
  display: grid;
  place-items: start center;
  width: 100%;
  margin-top: var(--s-2);
}

/* Tuko epreuve grand en bas-gauche, shake aleatoire */
.step-E2__tuko-wrap {
  position: absolute;
  left: var(--s-5);
  bottom: var(--s-3);
  opacity: 0;
  transform: translateX(-120%);
  animation: e2-slide-in-tuko var(--d-slow) var(--ease-out) 0.8s forwards;
  z-index: 5;
  pointer-events: none;
}
.step-E2__tuko-img {
  display: block;
  width: clamp(220px, 22vw, 360px);
  height: auto;
  transform-origin: 50% 90%;
}
.step-E2__tuko-img.is-shaking {
  animation: e2-tuko-shake 600ms var(--ease-out);
}
@keyframes e2-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}
@keyframes e2-tuko-shake {
  0%   { transform: rotate(0deg)  translateX(0); }
  15%  { transform: rotate(-8deg) translateX(-4px); }
  30%  { transform: rotate(7deg)  translateX(4px); }
  45%  { transform: rotate(-6deg) translateX(-3px); }
  60%  { transform: rotate(5deg)  translateX(3px); }
  75%  { transform: rotate(-3deg) translateX(-2px); }
  100% { transform: rotate(0deg)  translateX(0); }
}
.step-E2__cta {
  opacity: 0;
  transform: scale(0);
  animation: e2-pop var(--d-normal) var(--ease-bounce) 1.2s forwards;
}

@keyframes e2-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes e2-pop {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
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
   Illustrations
   -------------------------------------------------------------------------- */
function buildIlluCouleur() {
  const wrap = document.createElement('div');
  wrap.className = 'step-E2__illu-rgb';
  ['r', 'g', 'b'].forEach(k => {
    const c = document.createElement('div');
    c.className = `step-E2__rgb-circle step-E2__rgb-circle--${k}`;
    wrap.appendChild(c);
  });
  return wrap;
}

function buildIlluPixel() {
  // Composant partage .matrice-8x8 (variante mini, respiration idle)
  const wrap = document.createElement('div');
  wrap.className = 'matrice-8x8 matrice-8x8--mini is-respirante step-E2__illu-pix';
  const pattern = generatePixelPattern();
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    cell.className = 'matrice-8x8__pixel';
    cell.dataset.idx = String(i);
    if (pattern.has(i)) cell.classList.add('is-pattern');
    wrap.appendChild(cell);
  }
  return wrap;
}

function generatePixelPattern() {
  // Petit smiley sur 8x8 (ligne 1=top)
  // Format : ligne * 8 + col
  const set = new Set();
  // Yeux
  [18, 21].forEach(i => set.add(i));
  // Sourire
  [42, 45, 49, 50, 51, 52].forEach(i => set.add(i));
  return set;
}

/* --------------------------------------------------------------------------
   Cards
   -------------------------------------------------------------------------- */
function buildCard(zone, label, illuFactory, consigne) {
  const card = document.createElement('div');
  card.className = `card-clickable step-E2__card step-E2__card--${zone}`;
  card.dataset.zone = zone;

  const t = document.createElement('h3');
  t.className = 'step-E2__card-title';
  t.textContent = label;
  card.appendChild(t);

  const illu = document.createElement('div');
  illu.className = 'step-E2__card-illu';
  illu.appendChild(illuFactory());
  card.appendChild(illu);

  const c = document.createElement('p');
  c.className = 'step-E2__card-consigne';
  c.textContent = consigne;
  card.appendChild(c);

  // Team row
  const team = document.createElement('div');
  team.className = 'step-E2__team-row';
  const lbl = document.createElement('span'); lbl.textContent = 'equipe';
  const bar = document.createElement('div'); bar.className = 'step-E2__team-bar';
  const fill = document.createElement('div'); fill.className = 'step-E2__team-fill'; fill.dataset.zone = zone;
  bar.appendChild(fill);
  const num = document.createElement('span'); num.className = 'step-E2__team-num'; num.dataset.zone = zone; num.textContent = '0';
  const add = document.createElement('button'); add.type = 'button'; add.className = 'step-E2__team-add'; add.textContent = '+ equipe';
  add.dataset.zone = zone;
  team.appendChild(lbl); team.appendChild(bar); team.appendChild(num); team.appendChild(add);
  card.appendChild(team);

  // Empty hint message
  const empty = document.createElement('span');
  empty.className = 'step-E2__team-empty';
  empty.textContent = 'il en faut aussi sur celle-ci !';
  card.appendChild(empty);

  return card;
}

/* --------------------------------------------------------------------------
   DOM principal
   -------------------------------------------------------------------------- */
function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-E2';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-E2__titre';
  titre.textContent = 'CHOISIS TON EPREUVE';
  wrap.appendChild(titre);

  const cards = document.createElement('div');
  cards.className = 'step-E2__cards';
  cards.appendChild(buildCard(
    'couleur', 'COULEUR', buildIlluCouleur,
    'melange les couleurs pour trouver le code',
  ));
  cards.appendChild(buildCard(
    'pixel', 'PIXEL', buildIlluPixel,
    'allume les pixels pour trouver le code',
  ));
  wrap.appendChild(cards);

  // Tuko epreuve grand en bas-gauche (sprite reel + shake aleatoire)
  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-E2__tuko-wrap';
  const tukoImg = document.createElement('img');
  tukoImg.className = 'step-E2__tuko-img';
  tukoImg.src = 'assets/sprites/tuko_epreuve.png';
  tukoImg.alt = '';
  tukoWrap.appendChild(tukoImg);
  wrap.appendChild(tukoWrap);

  // Shake aleatoire (intervalle 3-7s)
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

  // Bottom row : CTA centree (Tuko est en position absolue)
  const bottom = document.createElement('div');
  bottom.className = 'step-E2__bottom';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-E2__cta';
  cta.textContent = '▶ TOUS PRETS A DECHIFFRER ?';
  bottom.appendChild(cta);
  wrap.appendChild(bottom);

  attachListeners(wrap, navAPI);
  return wrap;
}

/* --------------------------------------------------------------------------
   Listeners
   -------------------------------------------------------------------------- */
function attachListeners(wrap, navAPI) {
  // Card click -> focus
  wrap.querySelectorAll('.step-E2__card').forEach(card => {
    const onClick = (e) => {
      // Ignore les cliques sur boutons internes
      if (e.target.closest('.step-E2__team-add')) return;
      setFocusZone(wrap, card.dataset.zone);
    };
    card.addEventListener('click', onClick);
    handlers.push([card, 'click', onClick]);
  });

  // + equipe
  wrap.querySelectorAll('.step-E2__team-add').forEach(btn => {
    const onClick = (e) => {
      e.stopPropagation();
      incrementTeam(wrap, btn.dataset.zone);
    };
    btn.addEventListener('click', onClick);
    handlers.push([btn, 'click', onClick]);
  });

  // Raccourcis animateur
  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === '1') {
      e.preventDefault(); e.stopPropagation();
      setFocusZone(wrap, 'couleur');
    } else if (k === '2') {
      e.preventDefault(); e.stopPropagation();
      setFocusZone(wrap, 'pixel');
    } else if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
      if (!focusZone) return;
      e.preventDefault(); e.stopPropagation();
      incrementTeam(wrap, focusZone);
    }
  };
  window.addEventListener('keydown', onKey, true);
  handlers.push([window, 'keydown', onKey, true]);

  // CTA
  const cta = wrap.querySelector('.step-E2__cta');
  const onCta = () => {
    play('whoosh');
    enableKurnelOverlay();
    navAPI.next();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);
}

/* --------------------------------------------------------------------------
   Actions
   -------------------------------------------------------------------------- */
function setFocusZone(wrap, zone) {
  if (!['couleur', 'pixel'].includes(zone)) return;
  focusZone = zone;
  wrap.querySelectorAll('.step-E2__card').forEach(c => {
    c.classList.toggle('is-focus', c.dataset.zone === zone);
  });
  play('pop');
  // Tuko regarde la card focusee : visuel implicite via la card mise en avant.
}

function incrementTeam(wrap, zone) {
  if (!['couleur', 'pixel'].includes(zone)) return;
  state[zone].team += 1;
  saveStepState('E2', { ...state });

  const num = wrap.querySelector(`.step-E2__team-num[data-zone="${zone}"]`);
  if (num) {
    num.textContent = String(state[zone].team);
    num.classList.add('is-pulsing');
    setTimeout(() => num.classList.remove('is-pulsing'), 200);
  }
  const fill = wrap.querySelector(`.step-E2__team-fill[data-zone="${zone}"]`);
  if (fill) {
    const total = state.couleur.team + state.pixel.team;
    const w = total > 0 ? Math.min(100, (state[zone].team / Math.max(total, state[zone].team + 1)) * 100) : 0;
    fill.style.width = `${Math.max(8, w)}%`;
  }
  play('pop');

  // Empty hint subtle : si une card a 0 et l'autre 5+, on signale.
  ['couleur', 'pixel'].forEach(z => {
    const card = wrap.querySelector(`.step-E2__card--${z}`);
    if (!card) return;
    const other = z === 'couleur' ? 'pixel' : 'couleur';
    card.classList.toggle(
      'is-empty',
      state[z].team === 0 && state[other].team >= 5,
    );
  });
}

/* --------------------------------------------------------------------------
   Restore from state
   -------------------------------------------------------------------------- */
function restoreFromState(wrap) {
  ['couleur', 'pixel'].forEach(zone => {
    const num = wrap.querySelector(`.step-E2__team-num[data-zone="${zone}"]`);
    if (num) num.textContent = String(state[zone].team);
    const fill = wrap.querySelector(`.step-E2__team-fill[data-zone="${zone}"]`);
    const total = state.couleur.team + state.pixel.team;
    if (fill && total > 0) {
      fill.style.width = `${Math.max(8, (state[zone].team / total) * 100)}%`;
    }
  });
}

/* --------------------------------------------------------------------------
   Module export
   -------------------------------------------------------------------------- */
export default {
  id: 'E2',
  phase: 'E',
  title: 'Choisis ton epreuve',
  estimatedDuration: 90,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();
    enableKurnelOverlay();

    state = {
      couleur: { team: savedState?.couleur?.team ?? 0 },
      pixel:   { team: savedState?.pixel?.team   ?? 0 },
    };

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    const tRestore = setTimeout(() => restoreFromState(wrap), 800);
    timers.push(tRestore);
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
      couleur: { team: state.couleur.team },
      pixel:   { team: state.pixel.team },
    };
  },

  isComplete() {
    // L'animateur decide quand passer a E3 ; pas de critere strict.
    // On considere complet des qu'au moins un eleve s'est positionne.
    return state.couleur.team + state.pixel.team > 0;
  },

  replay() {
    const wrap = domNodes[0];
    if (!wrap) return;
    wrap.querySelectorAll('.step-E2__titre, .step-E2__card, .step-E2__cta').forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  },
};

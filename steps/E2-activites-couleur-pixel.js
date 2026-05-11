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
//   couleur: { team: N, hintsRevealed: [bool, bool, bool] },
//   pixel:   { team: N, hintsRevealed: [bool, bool, bool] },
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
  couleur: { team: 0, hintsRevealed: [false, false, false] },
  pixel:   { team: 0, hintsRevealed: [false, false, false] },
};
let focusZone = null;  // 'couleur' | 'pixel'

const STYLE_ID = 'step-E2-style';

const HINTS_TEXT = {
  couleur: [
    'la lettre R, c\'est ton chiffre 0',
    'le code monte par 2 quand 2 cercles se croisent',
    'le secret tient sur la couleur la plus saturee',
  ],
  pixel: [
    'compte les pixels d\'une seule colonne',
    'le motif est symetrique : verifie l\'axe',
    'le chiffre c\'est la ligne du dernier pixel',
  ],
};

const CSS = `
.step-E2 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-3) var(--s-6) var(--s-3);
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

/* Illu COULEUR : 3 cercles RGB qui se superposent */
.step-E2__illu-rgb {
  width: 100%;
  height: 220px;
  position: relative;
}
.step-E2__rgb-circle {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  mix-blend-mode: multiply;
  animation: e2-rgb-orbit 4s ease-in-out infinite;
}
.step-E2__rgb-circle--r { background: var(--accent-4); animation-delay: 0s;   }
.step-E2__rgb-circle--g { background: var(--accent-3); animation-delay: 1.3s; }
.step-E2__rgb-circle--b { background: var(--accent-2); animation-delay: 2.6s; }

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

.step-E2__card-meta {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 0;
}

/* Bandeau hints : 3 cadenas (composant partage .cadenas) + zone d'affichage */
.step-E2__hints {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-2);
}
.step-E2__hints-row {
  display: flex;
  gap: var(--s-2);
  align-items: center;
}
.step-E2__hint-locker {
  --cadenas-size: 64px;
}
.step-E2__hint-locker:hover { transform: translate(-2px, -2px); box-shadow: var(--shadow); }

.step-E2__hints-revealed {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  min-height: 60px;
}
.step-E2__hint-bubble {
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 600;
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-md);
  padding: var(--s-1) var(--s-2);
  display: inline-block;
  animation: e2-hint-drop var(--d-normal) var(--ease-bounce);
  align-self: flex-start;
}
.step-E2__hint-bubble::before {
  content: '💡 ';
}
@keyframes e2-hint-drop {
  0%   { transform: translateY(-30px); opacity: 0; }
  100% { transform: translateY(0);     opacity: 1; }
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
  place-items: end center;
  width: 100%;
  padding-bottom: var(--s-1);
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
function buildCard(zone, label, illuFactory, consigne, mag) {
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

  const m = document.createElement('p');
  m.className = 'step-E2__card-meta';
  m.textContent = mag;
  card.appendChild(m);

  // Hints : 3 cadenas (composant partage .cadenas), initialement fermes + pulse
  const hints = document.createElement('div');
  hints.className = 'step-E2__hints';
  const hintsRow = document.createElement('div');
  hintsRow.className = 'step-E2__hints-row';
  for (let i = 0; i < 3; i++) {
    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'cadenas cadenas--ferme is-pulsing step-E2__hint-locker';
    lock.dataset.zone = zone;
    lock.dataset.hintIdx = String(i);
    lock.setAttribute('aria-label', `Indice ${i + 1}`);
    hintsRow.appendChild(lock);
  }
  hints.appendChild(hintsRow);
  const revealed = document.createElement('div');
  revealed.className = 'step-E2__hints-revealed';
  revealed.dataset.zone = zone;
  hints.appendChild(revealed);
  card.appendChild(hints);

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
    'feuille mag. p. 22',
  ));
  cards.appendChild(buildCard(
    'pixel', 'PIXEL', buildIlluPixel,
    'allume les pixels pour trouver le code',
    'feuille mag. p. 24',
  ));
  wrap.appendChild(cards);

  // Tuko arbitre — composant partage .tuko-mascotte (position absolue bas-gauche)
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'arbitre';
  tuko.dataset.position = 'bas-gauche';
  wrap.appendChild(tuko);

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
      // Ignore les cliques sur boutons internes (locks, +)
      if (e.target.closest('.step-E2__hint-locker, .step-E2__team-add')) return;
      setFocusZone(wrap, card.dataset.zone);
    };
    card.addEventListener('click', onClick);
    handlers.push([card, 'click', onClick]);
  });

  // Hint locker click -> reveal
  wrap.querySelectorAll('.step-E2__hint-locker').forEach(lock => {
    const onClick = (e) => {
      e.stopPropagation();
      revealHint(wrap, lock.dataset.zone, +lock.dataset.hintIdx);
    };
    lock.addEventListener('click', onClick);
    handlers.push([lock, 'click', onClick]);
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
    } else if (k === 'q' || k === 'w' || k === 'e') {
      if (!focusZone) return;
      const idx = { q: 0, w: 1, e: 2 }[k];
      e.preventDefault(); e.stopPropagation();
      revealHint(wrap, focusZone, idx);
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

function revealHint(wrap, zone, idx) {
  if (!['couleur', 'pixel'].includes(zone)) return;
  if (idx < 0 || idx > 2) return;
  if (state[zone].hintsRevealed[idx]) return;

  state[zone].hintsRevealed[idx] = true;
  saveStepState('E2', { ...state });

  const lock = wrap.querySelector(
    `.step-E2__hint-locker[data-zone="${zone}"][data-hint-idx="${idx}"]`,
  );
  if (lock) {
    lock.classList.remove('is-pulsing');
    lock.classList.add('is-unlocking');
    // A la fin de l'animation unlock, on bascule sur l'etat ouvert.
    const tOpen = setTimeout(() => {
      lock.classList.remove('cadenas--ferme');
      lock.classList.add('cadenas--ouvert');
    }, 600);
    timers.push(tOpen);
  }
  const revealed = wrap.querySelector(`.step-E2__hints-revealed[data-zone="${zone}"]`);
  if (revealed) {
    const bubble = document.createElement('div');
    bubble.className = 'step-E2__hint-bubble';
    bubble.textContent = HINTS_TEXT[zone][idx];
    revealed.appendChild(bubble);
  }
  play('unlock');

  // Reaction subtile de l'illu : la card couleur rapproche les cercles,
  // la card pixel illumine 1 pixel-indice supplementaire (composant .matrice-8x8 .is-hint).
  const card = wrap.querySelector(`.step-E2__card--${zone}`);
  card?.classList.add(`has-hint-${idx + 1}`);
  if (zone === 'pixel') {
    const cells = card?.querySelectorAll('.matrice-8x8__pixel');
    if (cells) {
      const hintTargets = [3, 12, 60][idx];
      cells.forEach((cell, ci) => {
        if (ci === hintTargets) cell.classList.add('is-hint');
      });
    }
  }
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
    state[zone].hintsRevealed.forEach((revealed, idx) => {
      if (!revealed) return;
      const lock = wrap.querySelector(
        `.step-E2__hint-locker[data-zone="${zone}"][data-hint-idx="${idx}"]`,
      );
      if (lock) {
        lock.classList.remove('is-pulsing', 'cadenas--ferme', 'is-unlocking');
        lock.classList.add('cadenas--ouvert');
      }
      const r = wrap.querySelector(`.step-E2__hints-revealed[data-zone="${zone}"]`);
      if (r) {
        const b = document.createElement('div');
        b.className = 'step-E2__hint-bubble';
        b.textContent = HINTS_TEXT[zone][idx];
        b.style.animation = 'none';
        b.style.opacity = '1';
        r.appendChild(b);
      }
      const card = wrap.querySelector(`.step-E2__card--${zone}`);
      card?.classList.add(`has-hint-${idx + 1}`);
      if (zone === 'pixel') {
        const cells = card?.querySelectorAll('.matrice-8x8__pixel');
        if (cells) {
          const target = [3, 12, 60][idx];
          cells.forEach((cell, ci) => { if (ci === target) cell.classList.add('is-hint'); });
        }
      }
    });
    // team count
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
      couleur: {
        team: savedState?.couleur?.team ?? 0,
        hintsRevealed: savedState?.couleur?.hintsRevealed?.slice(0, 3)
                       ?? [false, false, false],
      },
      pixel: {
        team: savedState?.pixel?.team ?? 0,
        hintsRevealed: savedState?.pixel?.hintsRevealed?.slice(0, 3)
                       ?? [false, false, false],
      },
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
      couleur: { team: state.couleur.team, hintsRevealed: [...state.couleur.hintsRevealed] },
      pixel:   { team: state.pixel.team,   hintsRevealed: [...state.pixel.hintsRevealed] },
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

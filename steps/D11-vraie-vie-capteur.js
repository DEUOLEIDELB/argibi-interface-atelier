// D11-vraie-vie-capteur.js : "DANS LA VRAIE VIE - CAPTEUR" (page mag 21).
// Composants partages :
//   - `.scenario-card` + `.scenario-card-grid` (composant 6.1)
//   - `.scenario-card__image` / `.scenario-card__title`
//   - `.tuko-mascotte` (placeholder)
//   - `.cta-primary`
//   - `spawnEtincelles` cyan depuis `core/effects.js` (composant 5.7)
//
// State :
//   state.steps.D11.scenarios = { 0..3: 'discussed' | null }

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { spawnEtincelles } from '../core/effects.js';

const STYLE_ID = 'step-D11-styles';

const STYLE_TEXT = `
.step-D11 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6) var(--s-4);
  pointer-events: none;
}
.step-D11__header {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--s-1);
}
.step-D11__titre {
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
.step-D11__titre.is-in {
  animation: d11-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d11-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D11__sous {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(16px);
}
.step-D11__sous.is-in {
  animation: d11-fade-up var(--d-slow) var(--ease-out) 350ms forwards;
}
@keyframes d11-fade-up {
  to { opacity: 1; transform: translateY(0); }
}

/* Grille partagee + cards partagees (composant 6.1). */
.step-D11__grid {
  position: relative;
  pointer-events: auto;
  min-height: 0;
}
.step-D11 .scenario-card {
  cursor: var(--cursor-pointer);
}
.step-D11 .scenario-card:nth-child(1) { animation-delay: 600ms; }
.step-D11 .scenario-card:nth-child(2) { animation-delay: 750ms; }
.step-D11 .scenario-card:nth-child(3) { animation-delay: 900ms; }
.step-D11 .scenario-card:nth-child(4) { animation-delay: 1050ms; }
.step-D11 .scenario-card.is-focus {
  transform: scale(1.03);
  box-shadow: var(--shadow-lg), 0 0 0 4px var(--accent-2);
  z-index: 3;
}
.step-D11 .scenario-card.is-discussed {
  border-color: var(--accent-3);
}
.step-D11 .scenario-card.is-discussed::after {
  content: '✓';
  position: absolute;
  top: -10px;
  left: -10px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 900;
  color: var(--ink);
  background: var(--accent-3);
  border: var(--border);
  border-radius: var(--r-pill);
  box-shadow: var(--shadow-sm);
  pointer-events: none;
}

/* Mime mini-Tuko qui apparait au focus dans la card. */
.step-D11__mime {
  position: absolute;
  bottom: var(--s-1);
  right: var(--s-2);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink);
  background: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  padding: 4px 8px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--d-fast) var(--ease-out),
              transform var(--d-fast) var(--ease-out);
  pointer-events: none;
}
.step-D11 .scenario-card.is-focus .step-D11__mime {
  opacity: 0.9;
  transform: translateY(0);
  animation: d11-mime 1.5s ease-in-out 1;
}
@keyframes d11-mime {
  0%, 100% { transform: translateY(0)   translateX(0); }
  50%      { transform: translateY(-3px) translateX(2px); }
}

/* Bouton "discutee" en haut-droite de la card. */
.step-D11__discutee {
  position: absolute;
  top: var(--s-1);
  right: var(--s-1);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: var(--paper);
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  padding: 4px 8px;
  cursor: var(--cursor-pointer);
  opacity: 0.7;
  transition: opacity var(--d-fast) var(--ease-out),
              background var(--d-fast) var(--ease-out);
}
.step-D11__discutee:hover { opacity: 1; }
.step-D11 .scenario-card.is-discussed .step-D11__discutee {
  background: var(--accent-3);
  opacity: 1;
}

.step-D11__bottom {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: end;
  gap: var(--s-4);
  pointer-events: auto;
}
.step-D11__cta {
  justify-self: center;
  align-self: end;
  opacity: 0;
  transform: scale(0);
}
.step-D11__cta.is-in {
  animation: d11-pop 350ms var(--ease-bounce) 1500ms forwards,
             cta-idle-pulse 2s var(--ease-out) 1900ms infinite;
}
@keyframes d11-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
`;

const SCENARIOS = [
  { idx: 0, titre: 'TU TOUCHES TON ECRAN',     placeholder: 'ecran tactile · smartphone',  mime: '[ tuko · doigt qui touche ]'   },
  { idx: 1, titre: 'TU APPROCHES TES MAINS',   placeholder: 'robinet automatique · toilettes', mime: '[ tuko · mains qui approchent ]' },
  { idx: 2, titre: 'TU PAIES SANS CARTE',      placeholder: 'paiement sans contact',       mime: '[ tuko · telephone qui s’approche ]' },
  { idx: 3, titre: 'TU ENTRES DANS UN MAGASIN', placeholder: 'porte automatique · magasin', mime: '[ tuko · corps qui passe ]'    },
];

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];

let containerRef = null;
let navAPIRef = null;
let savedStateRef = null;

// state.steps.D11.scenarios = { 0..3: 'discussed' | null }.
let scenariosState = {};
let cardEls = [];
let focusedIdx = -1;
let stopFocusSparks = null;

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

function buildCard(sc) {
  // Structure conforme au composant partage `.scenario-card`.
  const card = document.createElement('article');
  card.className = 'scenario-card is-in';
  card.dataset.idx = String(sc.idx);
  card.tabIndex = 0;

  const media = document.createElement('div');
  media.className = 'scenario-card__image placeholder-image';
  media.textContent = `[ image · ${sc.placeholder} ]`;
  card.appendChild(media);

  const title = document.createElement('h3');
  title.className = 'scenario-card__title';
  title.textContent = sc.titre;
  card.appendChild(title);

  // Mime mini-Tuko (visible quand .is-focus est present sur la card).
  const mime = document.createElement('div');
  mime.className = 'step-D11__mime';
  mime.textContent = sc.mime;
  card.appendChild(mime);

  // Bouton "discutee" en coin.
  const discBtn = document.createElement('button');
  discBtn.type = 'button';
  discBtn.className = 'step-D11__discutee';
  discBtn.textContent = 'discutee';
  card.appendChild(discBtn);

  return { card, discBtn };
}

function refreshDiscussedUI() {
  cardEls.forEach(({ card }, i) => {
    const isDiscussed = scenariosState[i] === 'discussed';
    card.classList.toggle('is-discussed', isDiscussed);
  });
}

function persist() {
  if (!navAPIRef) return;
  navAPIRef.saveState({
    steps: { D11: { scenarios: { ...scenariosState } } },
  });
}

function setFocus(idx) {
  const next = (idx === focusedIdx) ? -1 : idx;
  focusedIdx = next;
  cardEls.forEach(({ card }, i) => {
    card.classList.toggle('is-focus', i === next);
  });
  // spawnEtincelles continu autour de la card focusee. Stop l'ancien d'abord.
  if (stopFocusSparks) { stopFocusSparks(); stopFocusSparks = null; }
  if (next >= 0 && cardEls[next]) {
    stopFocusSparks = spawnEtincelles(cardEls[next].card, {
      densite: 'normale',
      duree: 0,
    });
  }
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D11';

  const header = document.createElement('header');
  header.className = 'step-D11__header';
  const titre = document.createElement('h1');
  titre.className = 'step-D11__titre';
  titre.textContent = 'DANS LA VRAIE VIE';
  header.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D11__sous';
  sous.textContent = 'pourquoi un capteur, pas un bouton ?';
  header.appendChild(sous);
  wrap.appendChild(header);

  // Grille partagee .scenario-card-grid (2x2 par defaut).
  const grid = document.createElement('div');
  grid.className = 'scenario-card-grid step-D11__grid';
  cardEls = SCENARIOS.map((sc) => {
    const built = buildCard(sc);
    grid.appendChild(built.card);
    return built;
  });
  wrap.appendChild(grid);

  refreshDiscussedUI();

  // Bottom : Tuko + CTA.
  const bottom = document.createElement('div');
  bottom.className = 'step-D11__bottom';
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'pedagogique';
  tuko.dataset.position = 'inline';
  bottom.appendChild(tuko);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D11__cta';
  cta.textContent = '▶ ON CONTINUE';
  bottom.appendChild(cta);

  bottom.appendChild(document.createElement('span'));
  wrap.appendChild(bottom);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Entrance : on declenche les classes au tick suivant.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // Mark complete des l'affichage : la page est "vue" et toujours navigable.
  const tComplete = setTimeout(() => navAPI.markComplete(), 1200);
  timers.push(tComplete);

  // Listeners.
  cardEls.forEach(({ card, discBtn }, i) => {
    const onCardClick = (e) => {
      // Si clic sur le bouton "discutee", on ne change pas le focus.
      if (e.target === discBtn || discBtn.contains(e.target)) return;
      play('pop');
      setFocus(i);
    };
    const onDiscClick = (e) => {
      e.stopPropagation();
      play('pop');
      scenariosState[i] = (scenariosState[i] === 'discussed') ? null : 'discussed';
      refreshDiscussedUI();
      persist();
    };
    card.addEventListener('click', onCardClick);
    discBtn.addEventListener('click', onDiscClick);
    handlers.push([card, 'click', onCardClick]);
    handlers.push([discBtn, 'click', onDiscClick]);
  });

  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if (e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < cardEls.length) {
        play('pop');
        setFocus(idx);
      }
    }
  };
  window.addEventListener('keydown', onKey);
  handlers.push([window, 'keydown', onKey]);

  const onCta = () => {
    play('whoosh');
    navAPI.markComplete();
    navAPI.next();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);

  // Premiere persistance (cle existe meme si vide).
  persist();
}

export default {
  id: 'D11',
  phase: 'D',
  title: 'Dans la vraie vie · capteur',
  estimatedDuration: 240,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    scenariosState = (savedState && typeof savedState.scenarios === 'object')
      ? { ...savedState.scenarios }
      : {};
    focusedIdx = -1;

    scene = new Container();
    scene.label = 'step-D11';
    container.addChild(scene);

    injectStyle();
    build(navAPI);
  },

  exit() {
    if (stopFocusSparks) { stopFocusSparks(); stopFocusSparks = null; }
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
    cardEls = [];
    focusedIdx = -1;
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    return { scenarios: { ...scenariosState } };
  },

  isComplete() {
    // La page est navigable des le boot ; on la marque complete au build.
    return true;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

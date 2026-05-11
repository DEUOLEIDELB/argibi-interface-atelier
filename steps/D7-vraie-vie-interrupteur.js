// D7-vraie-vie-interrupteur.js — Dans la vraie vie : interrupteur (intelligence collective).
// migration vers composants partages.
//   - .scenario-card-grid + .scenario-card (composant 6.1)
//   - .tuko-mascotte (mini en haut a droite par card, principal en bas)
//   - .titre-hero / .sous-titre / .cta-primary
//
// Grille 2x2 de 4 scenarios (chambre / console / telecommande / clavier).
// 2 mini-options binaires (RESSORT / POSITION), pas de scoring.
// State : { scenarios: { 0..3: 'ressort'|'position' } }.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

let cardsState = [null, null, null, null];
let mainTukoMoodEl = null;

const STYLE_ID = 'step-D7-style';

const SCENARIOS = [
  { id: 0, titre: 'TU ALLUMES TA CHAMBRE',  visuel: 'interrupteur de chambre' },
  { id: 1, titre: 'TU ALLUMES LA CONSOLE',  visuel: 'bouton on/off console' },
  { id: 2, titre: 'TU CHANGES DE CHAINE',   visuel: 'bouton de telecommande' },
  { id: 3, titre: 'TU TAPES UNE LETTRE',    visuel: 'touche de clavier' },
];

const CSS = `
.step-D7 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-5) var(--s-6) var(--s-3);
  gap: var(--s-3);
  cursor: var(--cursor-default);
}

.step-D7__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  text-align: center;
}

.step-D7__titre {
  opacity: 0;
  transform: scale(0);
  animation: step-D7-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D7__sous {
  opacity: 0;
  transform: translateY(16px);
  animation: step-D7-slide-up var(--d-slow) var(--ease-out) 0.5s forwards;
}

.step-D7__grid {
  width: 100%;
  max-width: 1400px;
  align-self: center;
}

.step-D7__grid .scenario-card {
  animation-delay: var(--step-D7-delay, 0ms);
}

.step-D7__grid .scenario-card:nth-child(1) { --step-D7-delay: 0.9s; }
.step-D7__grid .scenario-card:nth-child(2) { --step-D7-delay: 1.05s; }
.step-D7__grid .scenario-card:nth-child(3) { --step-D7-delay: 1.20s; }
.step-D7__grid .scenario-card:nth-child(4) { --step-D7-delay: 1.35s; }

/* Mini-marqueur Tuko en haut a droite de chaque card, anime apres vote */
.step-D7__mini-tuko {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--accent-4);
  color: var(--paper);
  border: var(--border-thin);
  border-radius: var(--r-pill);
  font-family: var(--display);
  font-size: 22px;
  font-weight: 900;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
  z-index: 2;
}

.step-D7__mini-tuko.is-active-position {
  animation: step-D7-mini-position 1.6s var(--ease-out) forwards;
}

.step-D7__mini-tuko.is-active-ressort {
  animation: step-D7-mini-ressort 1.6s var(--ease-out) forwards;
}

@keyframes step-D7-mini-position {
  0%   { opacity: 0; transform: scale(0)    rotate(0deg); }
  20%  { opacity: 1; transform: scale(1)    rotate(0deg); }
  50%  { opacity: 1; transform: scale(1)    rotate(40deg); }
  100% { opacity: 1; transform: scale(1)    rotate(40deg); }
}

@keyframes step-D7-mini-ressort {
  0%   { opacity: 0; transform: scale(0)    translateY(0); }
  20%  { opacity: 1; transform: scale(1)    translateY(0); }
  50%  { opacity: 1; transform: scale(1.1)  translateY(8px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}

.scenario-card.is-wave {
  animation: step-D7-card-wave var(--d-normal) var(--ease-bounce);
}

@keyframes step-D7-card-wave {
  0%   { transform: translateY(0)    scale(1); }
  50%  { transform: translateY(-8px) scale(1.04); }
  100% { transform: translateY(0)    scale(1); }
}

.step-D7__bottom {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  width: 100%;
  gap: var(--s-4);
  padding-bottom: var(--s-2);
}

.step-D7__tuko-wrap {
  justify-self: start;
  opacity: 0;
  transform: translateX(-120%);
  animation: step-D7-slide-in-tuko var(--d-slow) var(--ease-out) 1.5s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
}

.step-D7__tuko-mood {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  color: var(--accent-4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: opacity var(--d-fast) var(--ease-out);
}

.step-D7__cta {
  justify-self: center;
  opacity: 0.5;
  pointer-events: none;
  transform: scale(0);
  animation: step-D7-pop-cta var(--d-normal) var(--ease-bounce) 1.7s forwards;
}

.step-D7__cta.is-armed {
  opacity: 1;
  pointer-events: auto;
}

.step-D7__spacer {
  width: 160px;
}

@keyframes step-D7-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

@keyframes step-D7-slide-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes step-D7-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}

@keyframes step-D7-pop-cta {
  0%   { transform: scale(0);    }
  70%  { transform: scale(1.15); opacity: 0.5; }
  100% { transform: scale(1);    }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function chooseOption(card, scenario, choice, options, miniTuko, ctaEl) {
  cardsState[scenario.id] = choice;

  card.classList.add('is-decided');

  options.forEach(opt => {
    if (opt.dataset.choice === choice) {
      opt.classList.add('is-active');
    } else {
      opt.classList.remove('is-active');
    }
  });

  miniTuko.classList.remove('is-active-position', 'is-active-ressort');
  void miniTuko.offsetWidth;
  miniTuko.classList.add(`is-active-${choice}`);

  if (cardsState.some(s => s !== null)) {
    ctaEl.classList.add('is-armed');
  }

  // Wave de validation si 4/4
  if (cardsState.every(s => s !== null)) {
    const allCards = document.querySelectorAll('.step-D7__grid .scenario-card');
    allCards.forEach((c, i) => {
      const t = setTimeout(() => {
        c.classList.remove('is-wave');
        void c.offsetWidth;
        c.classList.add('is-wave');
      }, i * 120);
      timers.push(t);
    });
  }

  updateTukoMood();
}

function updateTukoMood() {
  if (!mainTukoMoodEl) return;
  const counts = cardsState.reduce(
    (acc, c) => { if (c) acc[c]++; return acc; },
    { ressort: 0, position: 0 }
  );
  if (counts.ressort === 0 && counts.position === 0) {
    mainTukoMoodEl.textContent = '...';
  } else if (counts.position > counts.ressort) {
    mainTukoMoodEl.textContent = 'CA RESTE';
  } else if (counts.ressort > counts.position) {
    mainTukoMoodEl.textContent = 'CA REVIENT';
  } else {
    mainTukoMoodEl.textContent = '↔';
  }
}

function buildCard(scenario, ctaEl) {
  const card = document.createElement('div');
  card.className = 'scenario-card is-in';
  card.setAttribute('data-scenario', String(scenario.id));

  // Image-placeholder (composant scenario-card__image)
  const image = document.createElement('div');
  image.className = 'scenario-card__image';
  image.textContent = `[ ${scenario.visuel} ]`;
  card.appendChild(image);

  // Mini-Tuko en haut a droite (anime apres vote)
  const miniTuko = document.createElement('div');
  miniTuko.className = 'step-D7__mini-tuko';
  miniTuko.textContent = '★';
  card.appendChild(miniTuko);

  // Titre court
  const titre = document.createElement('h3');
  titre.className = 'scenario-card__title';
  titre.textContent = scenario.titre;
  card.appendChild(titre);

  // 2 options
  const optionsRow = document.createElement('div');
  optionsRow.className = 'scenario-card__options';

  const opts = ['ressort', 'position'].map(choice => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scenario-card__option';
    btn.dataset.choice = choice;
    btn.textContent = choice.toUpperCase();
    optionsRow.appendChild(btn);
    return btn;
  });

  opts.forEach(opt => {
    const onOptClick = () => chooseOption(card, scenario, opt.dataset.choice, opts, miniTuko, ctaEl);
    opt.addEventListener('click', onOptClick);
    handlers.push([opt, 'click', onOptClick]);
  });

  card.appendChild(optionsRow);

  return card;
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-D7';

  // Heading
  const heading = document.createElement('div');
  heading.className = 'step-D7__heading';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-D7__titre';
  titre.textContent = 'DANS LA VRAIE VIE';

  const sous = document.createElement('p');
  sous.className = 'sous-titre step-D7__sous';
  sous.textContent = 'pourquoi un interrupteur, pas un bouton ?';

  heading.appendChild(titre);
  heading.appendChild(sous);
  wrap.appendChild(heading);

  // CTA reference
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D7__cta';
  cta.textContent = '▶ ON CONTINUE';

  // Grid 2x2 (composant scenario-card-grid)
  const grid = document.createElement('div');
  grid.className = 'scenario-card-grid step-D7__grid';

  SCENARIOS.forEach(scenario => {
    const card = buildCard(scenario, cta);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  // Bottom row
  const bottom = document.createElement('div');
  bottom.className = 'step-D7__bottom';

  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D7__tuko-wrap';

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.setAttribute('data-pose', 'mysterieux');
  tuko.setAttribute('data-position', 'inline');
  tukoWrap.appendChild(tuko);

  mainTukoMoodEl = document.createElement('span');
  mainTukoMoodEl.className = 'step-D7__tuko-mood';
  mainTukoMoodEl.textContent = '...';
  tukoWrap.appendChild(mainTukoMoodEl);

  bottom.appendChild(tukoWrap);

  bottom.appendChild(cta);

  const spacer = document.createElement('div');
  spacer.className = 'step-D7__spacer';
  bottom.appendChild(spacer);

  wrap.appendChild(bottom);

  // CTA → next (uniquement si arme)
  const onCtaClick = () => {
    if (cta.classList.contains('is-armed')) navAPI.next();
  };
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  // Raccourci R = reset votes
  const onKey = (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      cardsState = [null, null, null, null];
      const cards = wrap.querySelectorAll('.scenario-card');
      cards.forEach(c => {
        c.classList.remove('is-decided', 'is-wave');
        c.querySelectorAll('.scenario-card__option').forEach(o => o.classList.remove('is-active'));
        const mt = c.querySelector('.step-D7__mini-tuko');
        if (mt) mt.classList.remove('is-active-position', 'is-active-ressort');
      });
      cta.classList.remove('is-armed');
      updateTukoMood();
    }
  };
  document.addEventListener('keydown', onKey);
  handlers.push([document, 'keydown', onKey]);

  return wrap;
}

export default {
  id: 'D7',
  phase: 'D',
  title: 'Dans la vraie vie : interrupteur',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();

    cardsState = [null, null, null, null];

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    // Restaurer l'etat sauvegarde
    if (savedState && savedState.scenarios) {
      Object.entries(savedState.scenarios).forEach(([id, choice]) => {
        const idx = Number(id);
        if (Number.isInteger(idx) && (choice === 'ressort' || choice === 'position')) {
          cardsState[idx] = choice;
          const card = wrap.querySelectorAll('.scenario-card')[idx];
          if (!card) return;
          card.classList.add('is-decided');
          const opts = card.querySelectorAll('.scenario-card__option');
          opts.forEach(opt => {
            if (opt.dataset.choice === choice) opt.classList.add('is-active');
          });
        }
      });
      const ctaEl = wrap.querySelector('.step-D7__cta');
      if (ctaEl && cardsState.some(s => s !== null)) ctaEl.classList.add('is-armed');
      updateTukoMood();
    }
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
    mainTukoMoodEl = null;
  },

  serialize() {
    const out = {};
    cardsState.forEach((c, i) => { if (c) out[i] = c; });
    return { scenarios: out };
  },

  isComplete() {
    return cardsState.some(c => c !== null);
  },

  replay() {
    const wrap = domNodes[0];
    if (!wrap) return;
    const elems = wrap.querySelectorAll(
      '.step-D7__titre, .step-D7__sous, .scenario-card, .step-D7__tuko-wrap, .step-D7__cta'
    );
    elems.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  },
};

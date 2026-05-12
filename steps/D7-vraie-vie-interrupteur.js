// D7-vraie-vie-interrupteur.js — Dans la vraie vie : interrupteur (intelligence collective).
// migration vers composants partages.
//   - .scenario-card-grid + .scenario-card (composant 6.1)
//   - .tuko-mascotte (mini en haut a droite par card, principal en bas)
//   - .titre-hero / .sous-titre / .cta-primary
//
// Grille 2x2 de 4 scenarios (passage pieton / salle de bain / ascenseur / chauffage).
// 2 mini-options binaires (BOUTON / INTERRUPTEUR), pas de scoring.
// State : { scenarios: { 0..3: 'bouton'|'interrupteur' } }.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

let cardsState = [null, null, null, null];

const STYLE_ID = 'step-D7-style';

const SCENARIOS = [
  { id: 0, titre: 'TU APPUIES POUR TRAVERSER LA RUE', img: 'assets/sprites/D7/pieton.webp',        correct: 'bouton'       },
  { id: 1, titre: 'TU ALLUMES LA SALLE DE BAIN',      img: 'assets/sprites/D7/salle_de_bain.webp', correct: 'interrupteur' },
  { id: 2, titre: "TU APPELLES L'ASCENSEUR",          img: 'assets/sprites/D7/ascenseur.webp',     correct: 'bouton'       },
  { id: 3, titre: 'TU METS LE CHAUFFAGE EN MARCHE',   img: 'assets/sprites/D7/chauffage.png',      correct: 'interrupteur' },
];

const CSS = `
.step-D7 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: stretch;
  justify-items: center;
  padding: var(--s-2) var(--s-4) var(--s-8) var(--s-4);
  gap: var(--s-2);
  cursor: var(--cursor-default);
}

.step-D7__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  text-align: center;
  align-self: start;
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
  max-width: 1840px;
  height: 100%;
  align-self: stretch;
  justify-self: center;
  gap: var(--s-3);
  grid-auto-rows: 1fr;
  /* Force les cards a respecter leur cellule 1fr (sinon le min-content
     interne fait deborder a droite) */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

/* Override : cards en format paysage (image gauche / contenu droite).
   Stretch vertical pour remplir tout l'espace disponible. */
.step-D7__grid .scenario-card {
  animation-delay: var(--step-D7-delay, 0ms);
  grid-template-columns: 7fr 3fr;
  grid-template-rows: 1fr auto;
  align-items: stretch;
  gap: var(--s-3) var(--s-4);
  padding: var(--s-3) var(--s-4);
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.step-D7__grid .scenario-card__image {
  grid-column: 1;
  grid-row: 1 / 3;
  min-height: 0;
  height: 100%;
  width: 100%;
  padding: 0;
  background: var(--bg-2);
  overflow: hidden;
  display: block;
  animation: none; /* on retire le bobbing par defaut du composant */
}

.step-D7__card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.step-D7__grid .scenario-card__title {
  grid-column: 2;
  grid-row: 1;
  font-size: clamp(40px, 3.4vw, 58px);
  line-height: 1.0;
  text-align: left;
  text-wrap: balance;
  align-self: center;
}

.step-D7__grid .scenario-card__options {
  grid-column: 2;
  grid-row: 2;
  align-self: end;
  gap: var(--s-4);
}

.step-D7__grid .scenario-card__option {
  font-size: clamp(28px, 2.3vw, 38px);
  padding: var(--s-3) var(--s-4);
}

/* Feedback : contour Wubo cyan pour bonne reponse, contour rose + shake
   pour faux. Pas d'animation sur la bonne reponse pour eviter tout
   conflit avec l'animation d'entree. is-in est retire en JS au clic. */
.step-D7__grid .scenario-card.is-correct {
  border-color: var(--accent-2);
  box-shadow: 0 0 0 4px var(--accent-2), 8px 8px 0 var(--ink);
}
.step-D7__grid .scenario-card.is-wrong {
  border-color: var(--accent-4);
  animation: step-D7-wrong-shake 420ms var(--ease-out);
}
@keyframes step-D7-wrong-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-12px); }
  40%      { transform: translateX(12px); }
  60%      { transform: translateX(-8px); }
  80%      { transform: translateX(6px); }
}

/* Mini-tuko en haut a droite (taille standard) */
.step-D7__grid .step-D7__mini-tuko {
  width: 44px;
  height: 44px;
  font-size: 22px;
  top: 12px;
  right: 12px;
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

.step-D7__mini-tuko.is-active-interrupteur {
  animation: step-D7-mini-interrupteur 1.6s var(--ease-out) forwards;
}

.step-D7__mini-tuko.is-active-bouton {
  animation: step-D7-mini-bouton 1.6s var(--ease-out) forwards;
}

@keyframes step-D7-mini-interrupteur {
  0%   { opacity: 0; transform: scale(0)    rotate(0deg); }
  20%  { opacity: 1; transform: scale(1)    rotate(0deg); }
  50%  { opacity: 1; transform: scale(1)    rotate(40deg); }
  100% { opacity: 1; transform: scale(1)    rotate(40deg); }
}

@keyframes step-D7-mini-bouton {
  0%   { opacity: 0; transform: scale(0)    translateY(0); }
  20%  { opacity: 1; transform: scale(1)    translateY(0); }
  50%  { opacity: 1; transform: scale(1.1)  translateY(8px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}

/* Tuko hehe en bas a gauche (pattern canonique : au-dessus du footer). */
.step-D7__tuko-wrap {
  position: absolute;
  left: var(--s-5);
  bottom: var(--s-3);
  opacity: 0;
  transform: translateX(-120%);
  animation: step-D7-slide-in-tuko var(--d-slow) var(--ease-out) 1.2s forwards;
  z-index: 2;
  pointer-events: none;
}

/* Anim perpetuelle : un petit "giggle" rotation + float vertical
   leger. Logique avec tuko_hehe (il se marre doucement). */
.step-D7__tuko-img {
  display: block;
  width: clamp(160px, 14vw, 220px);
  height: auto;
  transform-origin: 50% 90%;
  animation: step-D7-tuko-giggle 2.4s var(--ease-in-out) 2.4s infinite;
}

@keyframes step-D7-tuko-giggle {
  0%   { transform: translateY(0)    rotate(-3deg); }
  25%  { transform: translateY(-4px) rotate(2deg); }
  50%  { transform: translateY(0)    rotate(-2deg); }
  75%  { transform: translateY(-3px) rotate(3deg); }
  100% { transform: translateY(0)    rotate(-3deg); }
}

.step-D7__cta-area {
  display: grid;
  justify-items: center;
  align-self: end;
}

/* Convention CTA (cf. memoire cta_button_convention) :
   animation:none par defaut, .is-in declenche le pop. */
.step-D7__cta {
  animation: none !important;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
}
.step-D7__cta.is-in {
  animation: step-D7-pop-cta var(--d-normal) var(--ease-bounce) forwards !important;
}
.step-D7__cta.is-armed {
  pointer-events: auto;
}
.step-D7__cta:not(.is-armed).is-in {
  opacity: 0.45;
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
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.1);  opacity: 1; }
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

function chooseOption(card, scenario, choice, options, miniTuko, ctaEl) {
  cardsState[scenario.id] = choice;

  // Retirer is-in avant tout pour ne pas que l'animation d'entree
  // interagisse avec is-correct/is-wrong (l'etat base de is-in est
  // opacity:0 + scale(0), il faut s'en debarrasser pour le feedback).
  card.classList.remove('is-in');
  card.classList.add('is-decided');

  options.forEach(opt => {
    if (opt.dataset.choice === choice) {
      opt.classList.add('is-active');
    } else {
      opt.classList.remove('is-active');
    }
  });

  miniTuko.classList.remove('is-active-bouton', 'is-active-interrupteur');
  void miniTuko.offsetWidth;
  miniTuko.classList.add(`is-active-${choice}`);

  // Feedback : juste border + (shake si faux). Reset puis re-apply.
  card.classList.remove('is-correct', 'is-wrong');
  void card.offsetWidth;
  if (choice === scenario.correct) {
    card.classList.add('is-correct');
  } else {
    card.classList.add('is-wrong');
  }

  if (cardsState.some(s => s !== null)) {
    ctaEl.classList.add('is-armed');
  }
}

function buildCard(scenario, ctaEl) {
  const card = document.createElement('div');
  card.className = 'scenario-card is-in';
  card.setAttribute('data-scenario', String(scenario.id));

  // Image reelle (composant scenario-card__image)
  const image = document.createElement('div');
  image.className = 'scenario-card__image';
  const img = document.createElement('img');
  img.src = scenario.img;
  img.alt = '';
  img.className = 'step-D7__card-img';
  image.appendChild(img);
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

  const opts = ['bouton', 'interrupteur'].map(choice => {
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
  sous.textContent = 'bouton (revient) ou interrupteur (reste) ?';

  heading.appendChild(titre);
  heading.appendChild(sous);
  wrap.appendChild(heading);

  // CTA reference (convention : pas de chevron, animation:none de base)
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D7__cta';
  cta.textContent = 'on continue';

  // Grid 2x2 (composant scenario-card-grid)
  const grid = document.createElement('div');
  grid.className = 'scenario-card-grid step-D7__grid';

  SCENARIOS.forEach(scenario => {
    const card = buildCard(scenario, cta);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  // CTA area (centre, a 128px du footer via padding wrap)
  const ctaArea = document.createElement('div');
  ctaArea.className = 'step-D7__cta-area';
  ctaArea.appendChild(cta);
  wrap.appendChild(ctaArea);

  // Tuko hehe en bas a gauche (pattern canonique : au-dessus du footer)
  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D7__tuko-wrap';

  const tuko = document.createElement('img');
  tuko.className = 'step-D7__tuko-img';
  tuko.src = 'assets/sprites/tuko_hehe.png';
  tuko.alt = '';
  tukoWrap.appendChild(tuko);

  wrap.appendChild(tukoWrap);

  // Reveal du CTA (apres les cards)
  const ctaInT = setTimeout(() => cta.classList.add('is-in'), 1700);
  timers.push(ctaInT);

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
        c.classList.remove('is-decided', 'is-correct', 'is-wrong');
        c.querySelectorAll('.scenario-card__option').forEach(o => o.classList.remove('is-active'));
        const mt = c.querySelector('.step-D7__mini-tuko');
        if (mt) mt.classList.remove('is-active-bouton', 'is-active-interrupteur');
      });
      cta.classList.remove('is-armed');
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
        if (Number.isInteger(idx) && (choice === 'bouton' || choice === 'interrupteur')) {
          cardsState[idx] = choice;
          const card = wrap.querySelectorAll('.scenario-card')[idx];
          if (!card) return;
          card.classList.add('is-decided');
          const scenario = SCENARIOS[idx];
          if (scenario && choice === scenario.correct) {
            card.classList.add('is-correct');
          } else if (scenario) {
            card.classList.add('is-wrong');
          }
          const opts = card.querySelectorAll('.scenario-card__option');
          opts.forEach(opt => {
            if (opt.dataset.choice === choice) opt.classList.add('is-active');
          });
        }
      });
      const ctaEl = wrap.querySelector('.step-D7__cta');
      if (ctaEl && cardsState.some(s => s !== null)) ctaEl.classList.add('is-armed');
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

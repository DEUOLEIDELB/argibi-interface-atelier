// D3-vraie-vie-collectif.js : "DANS LA VRAIE VIE", intelligence collective.
// Fiche : doc interne
// utilise .scenario-card + .scenario-card-grid + .scenario-card__options(--3)
// + .scenario-card__option (avec .is-active) + .scenario-card.is-decided partages.
// Zero duplication locale du composant scenario-card.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D3-styles';

// CSS local : uniquement layout page + overrides specifiques D3.
// .scenario-card et tout son sous-arbre sont fournis par components.css partage.
const STYLE_TEXT = `
.step-D3 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: var(--s-3) var(--s-5) var(--s-5);
  gap: var(--s-3);
}
.step-D3__title-block {
  text-align: center;
}
.step-D3__titre {
  font-family: var(--display);
  font-size: clamp(40px, 4vw, 56px);
  font-weight: 900;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
}
.step-D3__sous {
  font-family: var(--display);
  font-size: clamp(40px, 3.6vw, 56px);
  font-weight: 700;
  text-transform: lowercase;
  color: var(--ink);
  margin: var(--s-3) 0 0;
}
/* Grille 2 lignes x 2 colonnes, retrecie 1/3 pour cadrer les images. */
.step-D3__grid {
  pointer-events: auto;
  align-self: center;
  justify-self: center;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: auto;
  gap: var(--s-3);
  width: 82%;
  max-width: 1400px;
}
.step-D3 .scenario-card {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  margin: 0;
  gap: 0;
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  min-width: 0;
  overflow: hidden;
}
.step-D3 img.scenario-card__image {
  width: 100%;
  height: clamp(220px, 30vh, 360px);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  object-fit: cover;
  object-position: center top;
  display: block;
}
.step-D3 .scenario-card__title {
  padding: var(--s-3) var(--s-3) 0;
  margin: 0;
}
.step-D3 .scenario-card__options {
  padding: var(--s-3);
  margin: 0;
}
.step-D3 .scenario-card__title {
  font-family: var(--display);
  font-size: clamp(26px, 2vw, 34px);
  font-weight: 900;
  line-height: 1.1;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  text-wrap: balance;
}
.step-D3 .scenario-card__options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-2);
}
.step-D3 .scenario-card__option {
  padding: var(--s-3);
  font-family: var(--display);
  font-size: clamp(20px, 1.5vw, 26px);
  font-weight: 900;
  text-transform: uppercase;
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-sm);
  color: var(--ink);
  cursor: var(--cursor-pointer);
  box-shadow: var(--shadow-sm);
  transition: background 150ms ease-out, color 150ms ease-out,
              transform 150ms ease-out, box-shadow 150ms ease-out;
}
.step-D3 .scenario-card__option:hover {
  background: var(--bg-2);
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow);
}
.step-D3 .scenario-card__option:active {
  transform: translate(0, 0);
  box-shadow: var(--shadow-sm);
}
/* PASS : option choisie correcte (ou debat) = jaune ecrit + grosse cocher. */
.step-D3 .scenario-card__option.is-active {
  background: var(--accent-3);
  color: var(--ink);
  transform: scale(1.05);
  box-shadow: var(--shadow);
}
.step-D3 .scenario-card__option.is-active::after {
  content: ' ✓';
  font-weight: 900;
}
.step-D3 .scenario-card__option.is-dimmed {
  opacity: 0.35;
}
/* Mauvaise reponse : shake sur l'option clickee uniquement.
   La card reste stable (jamais d'animation sur .scenario-card). */
.step-D3 .scenario-card__option.is-wrong {
  animation: d3-option-wrong 480ms ease-out;
}
@keyframes d3-option-wrong {
  0%   { background: var(--paper);    color: var(--ink);   transform: translateX(0); }
  15%  { background: var(--accent-4); color: var(--paper); transform: translateX(-6px); }
  30%  { background: var(--accent-4); color: var(--paper); transform: translateX(6px); }
  45%  { background: var(--accent-4); color: var(--paper); transform: translateX(-4px); }
  60%  { background: var(--accent-4); color: var(--paper); transform: translateX(4px); }
  75%  { background: var(--accent-4); color: var(--paper); transform: translateX(0); }
  100% { background: var(--paper);    color: var(--ink);   transform: translateX(0); }
}
.step-D3__cta {
  position: absolute;
  bottom: var(--s-3);
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  z-index: 10;
}
.step-D3__cta.is-disabled {
  opacity: 0.5;
  cursor: var(--cursor-not-allowed);
}
`;

const SCENARIOS = [
  { id: 1, title: 'TU LANCES LE MICRO-ONDES', image: 'assets/sprites/D3/micro_onde.png',    correct: 'court'  },
  { id: 2, title: 'TU SÈCHES TES CHEVEUX',    image: 'assets/sprites/D3/seche_cheveux.jpg', correct: 'long'   },
  { id: 3, title: 'TU TOQUES À LA PORTE',     image: 'assets/sprites/D3/toque_porte.png',   correct: 'double' },
  { id: 4, title: 'TU SONNES CHEZ UN AMI',    image: 'assets/sprites/D3/sonnette.png',      debat: true       },
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

let scenariosState = {}; // id -> 'court'|'long'|'double'
let totalVotes = 0;
let cardsEls = [];
let optionsByCard = {}; // id -> { court, long, double }
let ctaEl = null;
let gridEl = null;

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

function pushTimer(t) { timers.push(t); return t; }

function persistState() {
  if (!navAPIRef) return;
  // Etat : scenarios = {1..4: 'court'|'long'|'double'}.
  navAPIRef.saveState({ steps: { D3: { scenarios: { ...scenariosState } } } });
}

function onVote(scenarioId, kind) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const optBtn = optionsByCard[scenarioId]?.[kind];
  if (!optBtn) return;

  // Carte deja validee : on ignore les clics suivants (option doree).
  if (scenariosState[scenarioId] !== undefined) return;

  // Mauvaise reponse (hors debat) : shake + flash rose sur l'option, retry possible.
  if (!scenario.debat && kind !== scenario.correct) {
    optBtn.classList.remove('is-wrong');
    void optBtn.offsetWidth; // reflow pour relancer l'anim
    optBtn.classList.add('is-wrong');
    pushTimer(setTimeout(() => optBtn.classList.remove('is-wrong'), 500));
    play('error');
    return;
  }

  // Reponse acceptee (correcte ou debat) : on dore l'option, on grise les autres.
  scenariosState[scenarioId] = kind;
  totalVotes++;
  Object.entries(optionsByCard[scenarioId] || {}).forEach(([k, btn]) => {
    btn.classList.remove('is-wrong');
    if (k === kind) {
      btn.classList.add('is-active');
      btn.classList.remove('is-dimmed');
    } else {
      btn.classList.add('is-dimmed');
      btn.classList.remove('is-active');
    }
  });
  play(scenario.debat ? 'pop' : 'success');

  persistState();
  if (navAPIRef) navAPIRef.markComplete();
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D3';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'step-D3__title-block';
  const titre = document.createElement('h1');
  titre.className = 'step-D3__titre';
  titre.textContent = 'DANS LA VRAIE VIE';
  titleBlock.appendChild(titre);
  const sous = document.createElement('p');
  sous.className = 'step-D3__sous';
  sous.textContent = 'comment tu appuierais ?';
  titleBlock.appendChild(sous);
  wrap.appendChild(titleBlock);

  // Grid 2x2 (override total : on n'utilise PAS .scenario-card-grid partage
  // pour eviter padding/gap injectes par le composant).
  gridEl = document.createElement('div');
  gridEl.className = 'step-D3__grid';
  cardsEls = [];
  optionsByCard = {};
  SCENARIOS.forEach((sc) => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.scenarioId = String(sc.id);

    const img = document.createElement('img');
    img.className = 'scenario-card__image';
    img.src = sc.image;
    img.alt = '';
    img.loading = 'lazy';
    card.appendChild(img);

    const title = document.createElement('h3');
    title.className = 'scenario-card__title';
    title.textContent = sc.title;
    card.appendChild(title);

    // Options : 3 boutons (court/long/double) via .scenario-card__options--3 partage.
    const opts = document.createElement('div');
    opts.className = 'scenario-card__options scenario-card__options--3';
    optionsByCard[sc.id] = {};
    ['court', 'long', 'double'].forEach((kind) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scenario-card__option';
      btn.dataset.kind = kind;
      btn.textContent = kind;

      const onClick = () => onVote(sc.id, kind);
      btn.addEventListener('click', onClick);
      handlers.push([btn, 'click', onClick]);

      opts.appendChild(btn);
      optionsByCard[sc.id][kind] = btn;
    });
    card.appendChild(opts);

    gridEl.appendChild(card);
    cardsEls.push(card);
  });
  wrap.appendChild(gridEl);

  // Pas de CTA : navigation par fleche / espace (shell) sur demande Taki.
  ctaEl = null;

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Restore state from savedState (reset puis re-applique via onVote
  // pour que les visuels soient appliques meme apres reload).
  if (savedStateRef && savedStateRef.scenarios) {
    const saved = { ...savedStateRef.scenarios };
    scenariosState = {};
    totalVotes = 0;
    Object.entries(saved).forEach(([sid, kind]) => {
      onVote(Number(sid), kind);
    });
  }
}

export default {
  id: 'D3',
  phase: 'D',
  title: 'Dans la vraie vie',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    scenariosState = (savedState && savedState.scenarios) ? { ...savedState.scenarios } : {};
    totalVotes = Object.keys(scenariosState).length;

    scene = new Container();
    scene.label = 'step-D3';
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
    cardsEls = [];
    optionsByCard = {};
    ctaEl = gridEl = null;
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    // Etat : scenarios = {1..4: 'court'|'long'|'double'}.
    return { scenarios: { ...scenariosState } };
  },

  isComplete() {
    return totalVotes >= 1;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

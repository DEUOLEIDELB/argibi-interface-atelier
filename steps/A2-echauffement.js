// A2-echauffement.js — Devine ce qui se cache (8 objets electroniques).
// Tuko_myst absolute top-left avec shake aleatoire toutes les 3-8s.
// Compteur absolute top-right. Titre + sous-titre centres vers le bas.
// Grille 4x2 de cards : face cachee (?) -> clic = flip vers image + label.
// Pas de CTA suivant : la fleche du footer shell pilote la nav vers A3.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';

const STYLE_ID = 'step-A2-style';

const OBJETS = [
  { id: 1, label: 'Télécommande', img: 'assets/sprites/A2/telecommande.png' },
  { id: 2, label: 'Micro-ondes',  img: 'assets/sprites/A2/micro-onde.png' },
  { id: 3, label: 'Ordinateur',   img: 'assets/sprites/A2/ordinateur.png' },
  { id: 4, label: 'Manette',      img: 'assets/sprites/A2/manette.png' },
  { id: 5, label: 'Téléphone',    img: 'assets/sprites/A2/telephone.jpg' },
  { id: 6, label: 'Ventilateur',  img: 'assets/sprites/A2/ventillateur.png' },
  { id: 7, label: 'Radio',        img: 'assets/sprites/A2/radio.png' },
  { id: 8, label: 'Imprimante',   img: 'assets/sprites/A2/imprimante.avif' },
];

const STYLES = `
.step-A2 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: 1fr auto auto auto 1fr;
  gap: var(--s-2);
  padding: var(--s-4) var(--s-5);
  background: var(--bg);
  overflow: hidden;
}

/* ----- Tuko_myst : top-left, shake aleatoire ------------------------------ */

.step-A2__tuko {
  position: absolute;
  top: var(--s-3);
  left: var(--s-4);
  --tuko-mascotte-size: clamp(140px, 13vw, 180px);
  background: url('assets/sprites/tuko_myst.png') center / contain no-repeat !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  animation: a2-tuko-bobbing 2.6s ease-in-out infinite !important;
  z-index: 3;
  pointer-events: none;
}

.step-A2__tuko::before,
.step-A2__tuko::after {
  content: none !important;
  display: none !important;
}

@keyframes a2-tuko-bobbing {
  0%, 100% { transform: translateY(0)    rotate(-1.5deg); }
  50%      { transform: translateY(-4px) rotate(1.5deg); }
}

.step-A2__tuko.is-shaking {
  animation: a2-tuko-shake 0.55s ease-in-out !important;
}

@keyframes a2-tuko-shake {
  0%, 100% { transform: translate(0, 0)       rotate(0); }
  15%      { transform: translate(-4px, -2px) rotate(-4deg); }
  30%      { transform: translate(4px, 1px)   rotate(4deg); }
  45%      { transform: translate(-3px, 2px)  rotate(-3deg); }
  60%      { transform: translate(3px, -1px)  rotate(3deg); }
  80%      { transform: translate(-2px, 1px)  rotate(-1.5deg); }
}

/* ----- Compteur : top-right ----------------------------------------------- */

.step-A2__counter {
  position: absolute;
  top: var(--s-3);
  right: var(--s-4);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.step-A2 .compteur-geant__value {
  font-size: clamp(48px, 4.4vw, 72px);
  color: var(--ink);
  line-height: 1;
}

.step-A2 .compteur-geant__label {
  font-size: var(--t-small);
  color: var(--ink);
  opacity: 0.65;
  letter-spacing: 0.18em;
}

/* ----- Headings centres, descendus vers le bas ---------------------------- */

.step-A2__title {
  grid-row: 2;
  font-family: var(--display);
  font-size: clamp(44px, 4.2vw, 64px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  justify-self: center;
}

.step-A2__subtitle {
  grid-row: 3;
  font-family: var(--display);
  font-size: clamp(28px, 2.6vw, 40px);
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--accent-1);
  margin: 0;
  text-align: center;
  justify-self: center;
}

/* ----- Grille de cards : 4 cols x 2 rows, tailles uniformes --------------- */

.step-A2__grid {
  grid-row: 4;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(2, 1fr);
  gap: var(--s-3);
  width: min(1500px, 100%);
  height: clamp(380px, 48vh, 580px);
  justify-self: center;
  margin-top: var(--s-2);
}

.step-A2__card {
  position: relative;
  width: 100%;
  height: 100%;
  perspective: 1200px;
  cursor: var(--cursor-pointer);
}

.step-A2__card-inner {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  transition: transform 550ms var(--ease-bounce);
}

.step-A2__card.is-revealed .step-A2__card-inner {
  transform: rotateY(180deg);
}

.step-A2__face {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.step-A2__face--back {
  background: var(--accent-1);
  color: var(--paper);
  display: grid;
  place-items: center;
  font-family: var(--display);
  font-weight: 900;
  font-size: clamp(60px, 6vw, 96px);
}

.step-A2__face--back::before {
  content: '?';
}

.step-A2__face--front {
  background: var(--paper);
  color: var(--ink);
  transform: rotateY(180deg);
  display: grid;
  grid-template-rows: 1fr auto;
  padding: var(--s-2);
  gap: var(--s-2);
}

.step-A2__card-img {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
  background: var(--paper);
  pointer-events: none;
}

.step-A2__card-label {
  font-family: var(--display);
  font-weight: 900;
  font-size: clamp(16px, 1.5vw, 24px);
  letter-spacing: -0.01em;
  line-height: 1.1;
  text-align: center;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  padding: 0 var(--s-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-A2__card.is-tremble .step-A2__card-inner {
  animation: a2-tremble 280ms ease-in-out;
}

@keyframes a2-tremble {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-3px); }
  75%      { transform: translateX(3px); }
}

.step-A2__card.is-revealed.is-just-revealed .step-A2__card-inner {
  animation: a2-reveal-pop 600ms var(--ease-bounce);
}

@keyframes a2-reveal-pop {
  0%   { transform: rotateY(0); }
  50%  { transform: rotateY(180deg) scale(1.08); }
  100% { transform: rotateY(180deg) scale(1); }
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let revealedCards = [];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function removeStyle() {
  const n = document.getElementById(STYLE_ID);
  if (n) n.remove();
}

function persist() {
  saveStepState('A2', { revealedCards: [...revealedCards] });
}

export default {
  id: 'A2',
  phase: 'A',
  title: 'Echauffement',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const restored = savedState || getStepState('A2') || {};
    revealedCards = Array.isArray(restored.revealedCards) ? [...restored.revealedCards] : [];

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A2';

    // ----- Tuko_myst : absolute top-left, shake aleatoire -----------------
    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte step-A2__tuko';
    tuko.setAttribute('data-pose', 'mysterieux');
    tuko.setAttribute('data-position', 'inline');
    wrap.appendChild(tuko);

    // ----- Compteur : absolute top-right ----------------------------------
    const counter = document.createElement('div');
    counter.className = 'compteur-geant step-A2__counter';
    const counterValue = document.createElement('div');
    counterValue.className = 'compteur-geant__value';
    counter.appendChild(counterValue);
    const counterLabel = document.createElement('div');
    counterLabel.className = 'compteur-geant__label';
    counterLabel.textContent = 'trouves';
    counter.appendChild(counterLabel);
    wrap.appendChild(counter);

    // ----- Titre + sous-titre centres -------------------------------------
    const title = document.createElement('h1');
    title.className = 'step-A2__title';
    title.textContent = '8 OBJETS ÉLECTRONIQUES DE LA MAISON';
    wrap.appendChild(title);

    const subtitle = document.createElement('h2');
    subtitle.className = 'step-A2__subtitle';
    subtitle.textContent = 'À vous de deviner !';
    wrap.appendChild(subtitle);

    // ----- Grille de cards 4x2 --------------------------------------------
    const grid = document.createElement('div');
    grid.className = 'step-A2__grid';
    wrap.appendChild(grid);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Helpers --------------------------------------------------------
    function refreshCounter() {
      counterValue.textContent = `${revealedCards.length}/8`;
      counterValue.classList.add('is-pulsing');
      const t = setTimeout(() => counterValue.classList.remove('is-pulsing'), 200);
      timers.push(t);
    }

    function revealCard(card, obj) {
      if (card.classList.contains('is-revealed')) return;
      card.classList.add('is-revealed', 'is-just-revealed');
      const t = setTimeout(() => card.classList.remove('is-just-revealed'), 650);
      timers.push(t);
      if (!revealedCards.includes(obj.id)) {
        revealedCards.push(obj.id);
        persist();
        refreshCounter();
      }
      // boule de neige : les autres cards face cachee tremblent
      grid.querySelectorAll('.step-A2__card').forEach(c => {
        if (!c.classList.contains('is-revealed')) {
          c.classList.add('is-tremble');
          const t2 = setTimeout(() => c.classList.remove('is-tremble'), 320);
          timers.push(t2);
        }
      });
    }

    // ----- Render des cards -----------------------------------------------
    OBJETS.forEach(obj => {
      const card = document.createElement('div');
      card.className = 'step-A2__card';
      card.dataset.id = String(obj.id);
      if (revealedCards.includes(obj.id)) card.classList.add('is-revealed');

      const inner = document.createElement('div');
      inner.className = 'step-A2__card-inner';

      const back = document.createElement('div');
      back.className = 'step-A2__face step-A2__face--back';
      inner.appendChild(back);

      const front = document.createElement('div');
      front.className = 'step-A2__face step-A2__face--front';

      const img = document.createElement('img');
      img.className = 'step-A2__card-img';
      img.src = obj.img;
      img.alt = obj.label;
      img.loading = 'lazy';
      front.appendChild(img);

      const label = document.createElement('div');
      label.className = 'step-A2__card-label';
      label.textContent = obj.label;
      front.appendChild(label);

      inner.appendChild(front);
      card.appendChild(inner);

      const onCardClick = () => revealCard(card, obj);
      card.addEventListener('click', onCardClick);
      handlers.push([card, 'click', onCardClick]);

      grid.appendChild(card);
    });

    refreshCounter();

    // ----- Tuko shake aleatoire toutes les 3-8s ---------------------------
    function scheduleTukoShake() {
      const delay = 3000 + Math.random() * 5000;
      const t = setTimeout(() => {
        if (!tuko.isConnected) return;
        tuko.classList.add('is-shaking');
        const t2 = setTimeout(() => {
          tuko.classList.remove('is-shaking');
          scheduleTukoShake();
        }, 600);
        timers.push(t2);
      }, delay);
      timers.push(t);
    }
    scheduleTukoShake();

    // ----- Raccourcis clavier 1-8 -----------------------------------------
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const n = parseInt(e.key, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 8) {
        e.preventDefault();
        const card = grid.querySelector(`.step-A2__card[data-id="${n}"]`);
        if (card && !card.classList.contains('is-revealed')) card.click();
      }
    };
    window.addEventListener('keydown', onKey);
    handlers.push([window, 'keydown', onKey]);
  },

  exit() {
    handlers.forEach(([t, e, f]) => t.removeEventListener(e, f));
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
    removeStyle();
    navAPIRef = null;
  },

  serialize() {
    return { revealedCards: [...revealedCards] };
  },

  isComplete() {
    return revealedCards.length >= 1;
  },

  replay() {
    return true;
  },
};

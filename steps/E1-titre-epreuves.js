// E1-titre-epreuves.js — Carte de chapitre LES EPREUVES.
// Specifique E1 : bandeau-pulsant alerte "SYSTEME CORROMPU" + couche Kurnel
// persistante (scan-lines en arriere-plan) + micro-glitch idle sur le titre.
//
// La couche Kurnel est armee defensivement ici (idempotent) au cas ou
// l'utilisateur arrive directement par M->E1 sans passer par E0. Elle ne
// sera coupee qu'en F1 quand l'antivirus sera complet.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';
import { enableKurnelOverlay } from './_kurnel-overlay.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

const STYLE_ID = 'step-E1-style';

const CSS = `
.step-E1 {
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

.step-E1__alerte {
  width: 100%;
  font-size: var(--t-h2);
  letter-spacing: 0.08em;
  opacity: 0;
  transform: translateY(-100%);
  animation: e1-bandeau-in var(--d-slow) var(--ease-out) 0.05s forwards;
}

.step-E1__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  align-self: center;
  margin-top: var(--s-4);
}

.step-E1__titre {
  display: inline-block;
  transform: scale(0);
  opacity: 0;
  animation: e1-smash var(--d-normal) var(--ease-bounce) 0.4s forwards,
             e1-glitch-idle 4s steps(1) 2s infinite;
  will-change: transform;
}

.step-E1__sous {
  opacity: 0;
  transform: translateY(24px);
  animation: e1-slide-up var(--d-slow) var(--ease-out) 1s forwards;
  max-width: 80%;
}

.step-E1__bottom {
  display: grid;
  place-items: end center;
  width: 100%;
  padding-bottom: var(--s-3);
}

.step-E1__tuko {
  opacity: 0;
  transform: translateX(-120%);
  animation: e1-slide-in-tuko var(--d-slow) var(--ease-out) 1.4s forwards;
}

.step-E1__cta {
  opacity: 0;
  transform: scale(0);
  animation: e1-pop var(--d-normal) var(--ease-bounce) 2s forwards;
}

.step-E1__cta:hover { cursor: var(--cursor-pointer); }

@keyframes e1-bandeau-in {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes e1-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

@keyframes e1-slide-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes e1-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}

@keyframes e1-pop {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* Mini-glitch idle 1 frame toutes les 4s (rappel post-attaque Kurnel) */
@keyframes e1-glitch-idle {
  0%, 96%, 100% { transform: translate(0, 0); filter: none; }
  97%           { transform: translate(-3px, 1px); filter: hue-rotate(30deg); }
  98%           { transform: translate(3px, -1px); filter: hue-rotate(-30deg); }
}

.step-E1--exit .step-E1__titre {
  animation: e1-retract var(--d-normal) var(--ease-in) forwards;
}

@keyframes e1-retract {
  0%   { transform: scale(1);   opacity: 1; }
  60%  { transform: scale(0.6); opacity: 1; filter: brightness(2); }
  100% { transform: scale(0);   opacity: 0; }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = CSS;
  document.head.appendChild(styleNode);
}

function buildDom(navAPI) {
  const wrap = document.createElement('div');
  wrap.className = 'step-E1';

  // Bandeau pulsant alerte SYSTEME CORROMPU (haut)
  const alerte = document.createElement('div');
  alerte.className = 'bandeau-pulsant bandeau-pulsant--alerte step-E1__alerte';
  alerte.textContent = '⚠⚠⚠   SYSTEME CORROMPU   ⚠⚠⚠';
  wrap.appendChild(alerte);

  // Heading (titre + sous-titre)
  const heading = document.createElement('div');
  heading.className = 'step-E1__heading';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-E1__titre';
  titre.textContent = 'LES EPREUVES';

  const sous = document.createElement('p');
  sous.className = 'sous-titre step-E1__sous';
  sous.textContent = 'repare la capsule';

  heading.appendChild(titre);
  heading.appendChild(sous);
  wrap.appendChild(heading);

  // Tuko prete au combat — composant partage .tuko-mascotte (position absolue bas-gauche)
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte step-E1__tuko';
  tuko.dataset.pose = 'combat';
  tuko.dataset.position = 'bas-gauche';
  wrap.appendChild(tuko);

  // Bottom row : CTA centree (Tuko est en position absolue, ne prend pas de place dans la grid)
  const bottom = document.createElement('div');
  bottom.className = 'step-E1__bottom';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-E1__cta';
  cta.textContent = '▶ ON Y VA';
  bottom.appendChild(cta);

  wrap.appendChild(bottom);

  const onCtaClick = () => {
    play('whoosh');
    triggerExitAndNext(wrap, navAPI);
  };
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  return wrap;
}

function triggerExitAndNext(wrap, navAPI) {
  if (!wrap || wrap.classList.contains('step-E1--exit')) return;
  wrap.classList.add('step-E1--exit');
  const t = setTimeout(() => navAPI.next(), 350);
  timers.push(t);
}

export default {
  id: 'E1',
  phase: 'E',
  title: 'Les epreuves',
  estimatedDuration: 6,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();
    enableKurnelOverlay();

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = buildDom(navAPI);
    stage.appendChild(wrap);
    domNodes.push(wrap);

    void savedState;
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
    // NOTE : on NE coupe PAS la couche Kurnel ici. Elle persiste jusqu'a F1.
  },

  serialize() {
    return { viewed: true };
  },

  isComplete() {
    return true;
  },

  replay() {
    const wrap = domNodes[0];
    if (!wrap) return;
    const els = wrap.querySelectorAll('.step-E1__alerte, .step-E1__titre, .step-E1__sous, .step-E1__tuko, .step-E1__cta');
    els.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
    wrap.classList.remove('step-E1--exit');
  },
};

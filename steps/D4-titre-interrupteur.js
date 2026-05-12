// D4-titre-interrupteur.js — Carte chapitre "L'interrupteur".
// migration vers .tuko-mascotte partage. Composants partages utilises :
//   - .titre-hero / .sous-titre (typo)
//   - .tuko-mascotte[data-pose="presentateur" data-position="inline"]
//   - .cta-primary
// Anim apparition smash+slide-up+pop ; interaction hover CTA ; reward retract titre au clic.
// State : { viewed: true } .

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleNode = null;

const STYLE_ID = 'step-D4-style';

const CSS = `
.step-D4 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-6) var(--s-5) var(--s-8);
  text-align: center;
  cursor: var(--cursor-default);
}

.step-D4__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  align-self: center;
}

.step-D4__titre {
  display: inline-block;
  transform: scale(0);
  opacity: 0;
  animation: step-D4-smash var(--d-normal) var(--ease-bounce) 0.1s forwards,
             step-D4-glitch-idle 5s steps(1) 1.6s infinite;
  will-change: transform;
}

.step-D4__sous {
  opacity: 0;
  transform: translateY(24px);
  animation: step-D4-slide-up var(--d-slow) var(--ease-out) 0.7s forwards;
  max-width: 80%;
}

.step-D4__tuko-build {
  position: absolute;
  bottom: var(--s-3);
  left: var(--s-3);
  width: clamp(280px, 22vw, 360px);
  height: auto;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-120px);
  will-change: opacity, transform;
  z-index: 1;
}
.step-D4__tuko-build.is-in {
  animation: step-D4-slide-in-tuko var(--d-slow) var(--ease-out) 1.2s forwards,
             step-D4-tuko-bobbing 2.6s ease-in-out 1.9s infinite;
}

.step-D4__cta {
  justify-self: center;
  opacity: 0;
  transform: scale(0);
  animation: step-D4-pop var(--d-normal) var(--ease-bounce) 1.8s forwards;
  position: relative;
  z-index: 2;
}

@keyframes step-D4-smash {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

@keyframes step-D4-slide-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes step-D4-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}

/* Bobbing leger, signature mascotte. */
@keyframes step-D4-tuko-bobbing {
  0%, 100% { transform: translate(0, 0)     rotate(-1deg); }
  50%      { transform: translate(0, -6px)  rotate(1deg); }
}

@keyframes step-D4-pop {
  0%   { transform: scale(0);    opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* Mini-glitch idle 1 frame toutes les 5s sur le titre stabilise — clin d'oeil tech. */
@keyframes step-D4-glitch-idle {
  0%, 96%, 100% { transform: translate(0, 0); filter: none; }
  97%           { transform: translate(-2px, 1px); filter: hue-rotate(20deg); }
  98%           { transform: translate(2px, -1px); filter: hue-rotate(-20deg); }
}

/* Reward au clic CTA : le titre se retracte avant la transition. */
.step-D4--exit .step-D4__titre {
  animation: step-D4-retract var(--d-normal) var(--ease-in) forwards;
}

@keyframes step-D4-retract {
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
  wrap.className = 'step-D4';

  // Heading bloc (titre + sous-titre)
  const heading = document.createElement('div');
  heading.className = 'step-D4__heading';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-D4__titre';
  titre.textContent = "L'INTERRUPTEUR";

  const sous = document.createElement('p');
  sous.className = 'sous-titre step-D4__sous';
  sous.textContent = 'celui qui se souvient';

  heading.appendChild(titre);
  heading.appendChild(sous);
  wrap.appendChild(heading);

  // CTA centre, en flow grid row 2 (aligne avec A1 via padding-bottom var(--s-8)).
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D4__cta';
  cta.textContent = '▶ ON Y VA';
  wrap.appendChild(cta);

  // Tuko_build en grand, bas-gauche, position absolue (n'occupe pas de cellule grid).
  const tuko = document.createElement('img');
  tuko.className = 'step-D4__tuko-build';
  tuko.src = 'assets/sprites/tuko_build.png';
  tuko.alt = '';
  wrap.appendChild(tuko);
  requestAnimationFrame(() => tuko.classList.add('is-in'));

  // Listener CTA : retraction du titre puis next.
  const onCtaClick = () => triggerExitAndNext(wrap, navAPI);
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  return wrap;
}

function triggerExitAndNext(wrap, navAPI) {
  if (!wrap || wrap.classList.contains('step-D4--exit')) return;
  wrap.classList.add('step-D4--exit');
  const t = setTimeout(() => navAPI.next(), 350);
  timers.push(t);
}

export default {
  id: 'D4',
  phase: 'D',
  title: "L'interrupteur",
  estimatedDuration: 8,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    injectStyle();

    // Scene Pixi vide (page DOM-only).
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
    const titre = wrap.querySelector('.step-D4__titre');
    const sous  = wrap.querySelector('.step-D4__sous');
    const tuko  = wrap.querySelector('.step-D4__tuko-build');
    const cta   = wrap.querySelector('.step-D4__cta');
    [titre, sous, tuko, cta].forEach(el => {
      if (!el) return;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
    wrap.classList.remove('step-D4--exit');
  },
};

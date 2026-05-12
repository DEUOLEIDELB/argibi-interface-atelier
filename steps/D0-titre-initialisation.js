// D0-titre-initialisation.js : Carte de chapitre "INITIALISATION".
// Fiche : doc interne
// utilise .tuko-mascotte (composant partage), .cta-primary, tokens uniquement.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D0-styles';

const STYLE_TEXT = `
.step-D0 {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.step-D0__centre {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  text-align: center;
  pointer-events: none;
}
.step-D0__titre {
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: scale(0);
  will-change: transform, filter;
}
.step-D0__titre.is-in {
  animation: d0-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d0-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.2); }
  80%  { transform: scale(0.95) translateX(-2px); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D0__titre.is-glitch-arrival {
  animation: d0-glitch 200ms steps(4) 1;
}
@keyframes d0-glitch {
  0%   { transform: translate(0,0); filter: none; }
  25%  { transform: translate(-3px,1px); filter: drop-shadow(2px 0 0 var(--accent-4)) drop-shadow(-2px 0 0 var(--accent-2)); }
  50%  { transform: translate(2px,-1px); filter: drop-shadow(-2px 0 0 var(--accent-4)) drop-shadow(2px 0 0 var(--accent-2)); }
  75%  { transform: translate(-1px,1px); filter: drop-shadow(1px 0 0 var(--accent-4)); }
  100% { transform: translate(0,0); filter: none; }
}
.step-D0__titre.is-idle-glitch {
  animation: d0-glitch-mini 100ms steps(2) 1;
}
@keyframes d0-glitch-mini {
  0%   { transform: translate(0,0); filter: none; }
  50%  { transform: translate(2px,0); filter: drop-shadow(1px 0 0 var(--accent-4)); }
  100% { transform: translate(0,0); filter: none; }
}
.step-D0__sous-titre {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 600;
  text-transform: lowercase;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  transform: translateY(40px);
  will-change: opacity, transform;
}
.step-D0__sous-titre.is-in {
  animation: d0-slide-up var(--d-slow) var(--ease-out) 800ms forwards;
}
@keyframes d0-slide-up {
  to { opacity: 1; transform: translateY(0); }
}
.step-D0__tuko-panic {
  position: absolute;
  bottom: var(--s-3);
  left: var(--s-3);
  width: clamp(320px, 26vw, 420px);
  height: auto;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-120px) rotate(0);
  transform-origin: 50% 70%;
  will-change: opacity, transform;
  z-index: 1;
}
.step-D0__tuko-panic.is-in {
  animation: d0-tuko-enter var(--d-slow) var(--ease-out) 1200ms forwards,
             d0-panic-shake 2.6s ease-in-out 1900ms infinite;
}
@keyframes d0-tuko-enter {
  to { opacity: 1; transform: translateX(0) rotate(0); }
}
/* Shake "panique" : sequence irreguliere de micro-deplacements + rotations
   pour donner l'impression d'un tremblement aleatoire. */
@keyframes d0-panic-shake {
  0%,100% { transform: translate(0, 0)     rotate(0); }
  4%    { transform: translate(-4px, 2px)  rotate(-1.6deg); }
  9%    { transform: translate(3px, -3px)  rotate(1.4deg); }
  14%   { transform: translate(-2px, 1px)  rotate(-0.6deg); }
  19%   { transform: translate(5px, 3px)   rotate(2deg); }
  25%   { transform: translate(-5px, -2px) rotate(-1.8deg); }
  32%   { transform: translate(1px, -4px)  rotate(0.8deg); }
  39%   { transform: translate(-3px, 4px)  rotate(-1.2deg); }
  46%   { transform: translate(4px, 1px)   rotate(1.6deg); }
  53%   { transform: translate(-1px, 4px)  rotate(-0.4deg); }
  61%   { transform: translate(5px, -3px)  rotate(2deg); }
  69%   { transform: translate(-4px, 2px)  rotate(-1.8deg); }
  77%   { transform: translate(2px, 3px)   rotate(0.6deg); }
  85%   { transform: translate(-3px, -1px) rotate(-1.2deg); }
  93%   { transform: translate(3px, 2px)   rotate(1deg); }
}
.step-D0__cta-anchor {
  position: absolute;
  bottom: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}
.step-D0__cta {
  opacity: 0;
  transform: scale(0);
  animation: none;
  will-change: opacity, transform;
}
.step-D0__cta.is-in {
  animation: d0-cta-pop 350ms var(--ease-bounce) 2000ms forwards,
             cta-idle-pulse 2s var(--ease-out) 2400ms infinite;
}
@keyframes d0-cta-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D0.is-leaving .step-D0__centre {
  animation: d0-leave 200ms var(--ease-in) forwards;
}
@keyframes d0-leave {
  to { transform: translate(-50%, -50%) scale(0.4); opacity: 0; filter: brightness(2); }
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
let viewed = false;

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

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D0';

  const centre = document.createElement('div');
  centre.className = 'step-D0__centre';

  const titre = document.createElement('h1');
  titre.className = 'step-D0__titre';
  titre.textContent = 'INITIALISATION';
  centre.appendChild(titre);

  const sous = document.createElement('p');
  sous.className = 'step-D0__sous-titre';
  sous.textContent = 'les premiers signaux';
  centre.appendChild(sous);

  wrap.appendChild(centre);

  // Tuko panic en grand, bas-gauche. Pose qui dit "ca commence vraiment !".
  const tuko = document.createElement('img');
  tuko.className = 'step-D0__tuko-panic';
  tuko.src = 'assets/sprites/tuko_panic.png';
  tuko.alt = '';
  wrap.appendChild(tuko);

  const ctaAnchor = document.createElement('div');
  ctaAnchor.className = 'step-D0__cta-anchor';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D0__cta';
  cta.textContent = '▶ ON Y VA';
  cta.disabled = true;
  ctaAnchor.appendChild(cta);
  wrap.appendChild(ctaAnchor);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Trigger entrance animations on next frame so initial styles apply.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    tuko.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // Mini-glitch arrival at 400ms (right after smash settles).
  const tGlitchOn = setTimeout(() => titre.classList.add('is-glitch-arrival'), 400);
  const tGlitchOff = setTimeout(() => titre.classList.remove('is-glitch-arrival'), 600);
  timers.push(tGlitchOn, tGlitchOff);

  // CTA enabled after entrance.
  const tEnable = setTimeout(() => { cta.disabled = false; }, 2400);
  timers.push(tEnable);

  // Mark complete after entrance complete.
  const tComplete = setTimeout(() => {
    viewed = true;
    navAPI.markComplete();
    navAPI.saveState({ steps: { D0: { viewed: true } } });
  }, 3000);
  timers.push(tComplete);

  // Idle micro-glitch every 4-5s (rappel univers numerique).
  const idleGlitch = setInterval(() => {
    titre.classList.add('is-idle-glitch');
    const tt = setTimeout(() => titre.classList.remove('is-idle-glitch'), 120);
    timers.push(tt);
  }, 4500);
  intervals.push(idleGlitch);

  // CTA click.
  const onCtaClick = () => {
    if (cta.disabled) return;
    play('whoosh');
    cta.disabled = true;
    wrap.classList.add('is-leaving');
    const tt = setTimeout(() => navAPI.next(), 200);
    timers.push(tt);
  };
  cta.addEventListener('click', onCtaClick);
  handlers.push([cta, 'click', onCtaClick]);

  // Pas d'auto-advance : l'animateur garde la main pour passer a D1 (sur demande Taki).
}

export default {
  id: 'D0',
  phase: 'D',
  title: 'Initialisation',
  estimatedDuration: 6,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    containerRef = container;
    navAPIRef = navAPI;
    savedStateRef = savedState;
    viewed = !!(savedState && savedState.viewed);

    scene = new Container();
    scene.label = 'step-D0';
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
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
  },

  serialize() {
    return { viewed };
  },

  isComplete() {
    return viewed;
  },

  replay() {
    this.exit();
    if (containerRef && navAPIRef) {
      this.enter(containerRef, savedStateRef, navAPIRef);
    }
  },
};

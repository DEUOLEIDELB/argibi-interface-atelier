// D8-titre-capteur.js : Carte de chapitre "LE CAPTEUR" (page magazine 17).
// Fiche : doc interne (template D0/D4).
// Composants partages : `.titre-hero`, `.sous-titre` (via styles locaux),
// `.cta-primary`, `.tuko-mascotte` .

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { play } from '../core/audio.js';

const STYLE_ID = 'step-D8-styles';

const STYLE_TEXT = `
.step-D8 {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.step-D8__centre {
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
.step-D8__titre {
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
.step-D8__titre.is-in {
  animation: d8-smash 400ms var(--ease-bounce) forwards;
}
@keyframes d8-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.2); }
  80%  { transform: scale(0.95) translateX(2px); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D8__sous-titre {
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
.step-D8__sous-titre.is-in {
  animation: d8-slide-up var(--d-slow) var(--ease-out) 800ms forwards;
}
@keyframes d8-slide-up {
  to { opacity: 1; transform: translateY(0); }
}
.step-D8__tuko-myst {
  position: absolute;
  bottom: var(--s-3);
  right: var(--s-3);
  width: clamp(280px, 22vw, 360px);
  height: auto;
  pointer-events: none;
  opacity: 0;
  transform: translateX(120px);
  transform-origin: 50% 70%;
  will-change: opacity, transform;
  z-index: 1;
}
.step-D8__tuko-myst.is-in {
  animation: d8-tuko-enter var(--d-slow) var(--ease-out) 1000ms forwards,
             d8-myst-shake 2.8s ease-in-out 1700ms infinite;
}
@keyframes d8-tuko-enter {
  to { opacity: 1; transform: translateX(0); }
}
/* Shake aleatoire (sequence irreguliere, sans rotation excessive). */
@keyframes d8-myst-shake {
  0%,100% { transform: translate(0, 0)     rotate(0); }
  5%   { transform: translate(-3px, 2px)   rotate(-1.2deg); }
  11%  { transform: translate(2px, -2px)   rotate(1deg); }
  17%  { transform: translate(-4px, 1px)   rotate(-1.6deg); }
  24%  { transform: translate(3px, 3px)    rotate(1.4deg); }
  31%  { transform: translate(-2px, -3px)  rotate(-0.8deg); }
  39%  { transform: translate(4px, 2px)    rotate(1.6deg); }
  47%  { transform: translate(-3px, 3px)   rotate(-1.4deg); }
  56%  { transform: translate(2px, -4px)   rotate(1.2deg); }
  65%  { transform: translate(-4px, 1px)   rotate(-1.8deg); }
  74%  { transform: translate(3px, 2px)    rotate(0.8deg); }
  83%  { transform: translate(-2px, 3px)   rotate(-1deg); }
  92%  { transform: translate(2px, -1px)   rotate(1.4deg); }
}
.step-D8__cta-anchor {
  position: absolute;
  bottom: var(--s-8);
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  z-index: 2;
}
.step-D8__cta {
  opacity: 0;
  transform: scale(0);
  animation: none;
  will-change: opacity, transform;
}
.step-D8__cta.is-in {
  animation: d8-cta-pop 350ms var(--ease-bounce) 1400ms forwards;
}
@keyframes d8-cta-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.step-D8.is-leaving .step-D8__centre {
  animation: d8-leave 200ms var(--ease-in) forwards;
}
@keyframes d8-leave {
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
  wrap.className = 'step-D8';

  const centre = document.createElement('div');
  centre.className = 'step-D8__centre';

  const titre = document.createElement('h1');
  titre.className = 'step-D8__titre';
  titre.textContent = 'LE CAPTEUR';
  centre.appendChild(titre);

  const sous = document.createElement('p');
  sous.className = 'step-D8__sous-titre';
  sous.textContent = 'celui qui sent ton corps';
  centre.appendChild(sous);

  wrap.appendChild(centre);

  // Tuko_myst en bas-droite (sprite reel + shake aleatoire).
  const tuko = document.createElement('img');
  tuko.className = 'step-D8__tuko-myst';
  tuko.src = 'assets/sprites/tuko_myst.png';
  tuko.alt = '';
  wrap.appendChild(tuko);

  const ctaAnchor = document.createElement('div');
  ctaAnchor.className = 'step-D8__cta-anchor';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D8__cta';
  cta.textContent = '▶ ON Y VA';
  cta.disabled = true;
  ctaAnchor.appendChild(cta);
  wrap.appendChild(ctaAnchor);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Animations d'entree (UNE seule fois : titre smash, sous slide-up,
  // tuko slide-in + shake en boucle, CTA pop). Aucune anim repetee sur titre.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    tuko.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // CTA enabled apres entrance.
  const tEnable = setTimeout(() => { cta.disabled = false; }, 1800);
  timers.push(tEnable);

  // Mark complete (mais pas d'auto-advance : passage manuel uniquement).
  const tComplete = setTimeout(() => {
    viewed = true;
    navAPI.markComplete();
  }, 2200);
  timers.push(tComplete);

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

  // Pas d'auto-advance : navigation manuelle uniquement (sur demande Taki).
}

export default {
  id: 'D8',
  phase: 'D',
  title: 'Le capteur',
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
    scene.label = 'step-D8';
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

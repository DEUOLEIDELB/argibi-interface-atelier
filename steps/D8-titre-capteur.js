// D8-titre-capteur.js : Carte de chapitre "LE CAPTEUR" (page magazine 17).
// Composants partages : `.titre-hero`, `.sous-titre` (via styles locaux),
// `.cta-primary`, `.tuko-mascotte` (composant design system § Tuko mascotte).

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
.step-D8__titre.is-flash {
  animation: d8-flash 200ms var(--ease-out) 1;
}
@keyframes d8-flash {
  0%   { filter: brightness(1)   drop-shadow(0 0 0   var(--accent-2)); }
  50%  { filter: brightness(1.4) drop-shadow(0 0 24px var(--accent-2)); }
  100% { filter: brightness(1)   drop-shadow(0 0 0   var(--accent-2)); }
}
.step-D8__titre.is-idle-microglitch {
  animation: d8-microglitch 100ms steps(2) 1;
}
@keyframes d8-microglitch {
  0%   { text-shadow: none; transform: translate(0,0); }
  50%  { text-shadow: -2px 0 var(--accent-2), 2px 0 var(--accent-4); transform: translate(-1px,0); }
  100% { text-shadow: none; transform: translate(0,0); }
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
.step-D8__tuko {
  opacity: 0;
  transform: translateX(-100px);
  will-change: opacity, transform;
}
.step-D8__tuko.is-in {
  animation: d8-tuko-enter var(--d-slow) var(--ease-out) 1400ms forwards;
}
@keyframes d8-tuko-enter {
  to { opacity: 1; transform: translateX(0); }
}
.step-D8__cta-anchor {
  position: absolute;
  bottom: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}
.step-D8__cta {
  opacity: 0;
  transform: scale(0);
  animation: none;
  will-change: opacity, transform;
}
.step-D8__cta.is-in {
  animation: d8-cta-pop 350ms var(--ease-bounce) 2000ms forwards,
             cta-idle-pulse 2s var(--ease-out) 2400ms infinite;
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

  // Tuko placeholder : composant partage `.tuko-mascotte`.
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte step-D8__tuko';
  tuko.dataset.pose = 'presentateur';
  tuko.dataset.position = 'bas-gauche';
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

  // Trigger entrance animations on next frame so initial styles apply.
  requestAnimationFrame(() => {
    titre.classList.add('is-in');
    sous.classList.add('is-in');
    tuko.classList.add('is-in');
    cta.classList.add('is-in');
  });

  // Flash cyan apres le smash (signature capteur capacitif).
  const tFlashOn = setTimeout(() => titre.classList.add('is-flash'), 400);
  const tFlashOff = setTimeout(() => titre.classList.remove('is-flash'), 600);
  timers.push(tFlashOn, tFlashOff);

  // CTA enabled apres entrance.
  const tEnable = setTimeout(() => { cta.disabled = false; }, 2400);
  timers.push(tEnable);

  // Mark complete after entrance complete.
  const tComplete = setTimeout(() => {
    viewed = true;
    navAPI.markComplete();
  }, 3000);
  timers.push(tComplete);

  // Idle micro-glitch toutes les 5s (clin d'oeil signature glitch A4).
  const idleGlitch = setInterval(() => {
    titre.classList.add('is-idle-microglitch');
    const tt = setTimeout(() => titre.classList.remove('is-idle-microglitch'), 120);
    timers.push(tt);
  }, 5000);
  intervals.push(idleGlitch);

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

  // Auto-advance apres 8s (template D0).
  const autoAdv = setTimeout(() => {
    if (!cta.disabled) onCtaClick();
  }, 8000);
  timers.push(autoAdv);
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

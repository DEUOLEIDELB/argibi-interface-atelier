// A0-chargement-tuko.js — Page de boot fullscreen.
// Tuko (sprite tuko_hote) centre qui shake doucement + barre de progression
// qui se remplit en stop-motion. Duree minimum 7s. Bascule auto vers A1.
// Espace ignore avant 7s (skip silencieux).
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';

const MIN_DURATION_MS = 7000;
const PROGRESS_TICK_MS = 750;
const PROGRESS_SEGMENTS = 8;
const STYLE_ID = 'step-A0-style';

const CSS = `
.step-A0 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  place-items: center;
  background: var(--bg);
  cursor: none;
  overflow: hidden;
  padding: var(--s-5);
}

.step-A0__center {
  position: relative;
  width: 100%;
  display: grid;
  place-items: center;
  align-self: center;
}

.step-A0__tuko-wrap {
  --tuko-mascotte-size: clamp(280px, 32vw, 420px);
  position: relative;
}

/* Surcharge du placeholder .tuko-mascotte : sprite tuko_hote + shake doux. */
.step-A0 .tuko-mascotte {
  background: url('assets/sprites/tuko_hote.png') center / contain no-repeat;
  border: none;
  box-shadow: none;
  border-radius: 0;
  color: transparent;
  animation: a0-tuko-shake 0.55s ease-in-out infinite;
  will-change: transform;
}

.step-A0 .tuko-mascotte::before,
.step-A0 .tuko-mascotte::after {
  content: none;
  display: none;
}

@keyframes a0-tuko-shake {
  0%, 100% { transform: translate(0, 0)         rotate(0); }
  20%      { transform: translate(-1.5px, -1px) rotate(-1deg); }
  40%      { transform: translate(1.5px, 1px)   rotate(1deg); }
  60%      { transform: translate(-1px, 1px)    rotate(-0.6deg); }
  80%      { transform: translate(1px, -1px)    rotate(0.6deg); }
}

.step-A0__bottom {
  align-self: end;
  width: min(560px, 70vw);
  display: grid;
  gap: var(--s-2);
  justify-items: center;
}

.step-A0 .barre-progression {
  width: 100%;
}

.step-A0__label {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.32em;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0.55;
}

.step-A0__final-flash {
  position: absolute;
  inset: 0;
  background: var(--paper);
  opacity: 0;
  pointer-events: none;
  z-index: 5;
}

.step-A0__final-flash.is-flashing {
  animation: a0-final-flash 600ms var(--ease-out) forwards;
}

@keyframes a0-final-flash {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let entryStartedAt = 0;
let advanceFired = false;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function removeStyle() {
  const node = document.getElementById(STYLE_ID);
  if (node) node.remove();
}

export default {
  id: 'A0',
  phase: 'A',
  title: 'Chargement Tuko',
  estimatedDuration: 7,
  isCollective: false,
  requiresAnimator: false,
  fullscreen: true,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    entryStartedAt = performance.now();
    advanceFired = false;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A0';

    const center = document.createElement('div');
    center.className = 'step-A0__center';

    const tukoWrap = document.createElement('div');
    tukoWrap.className = 'step-A0__tuko-wrap';
    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'hote');
    tukoWrap.appendChild(tuko);
    center.appendChild(tukoWrap);

    wrap.appendChild(center);

    const bottom = document.createElement('div');
    bottom.className = 'step-A0__bottom';

    const barre = document.createElement('div');
    barre.className = 'barre-progression';
    barre.setAttribute('role', 'progressbar');
    barre.setAttribute('aria-label', 'chargement');
    const segs = [];
    for (let i = 0; i < PROGRESS_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'barre-progression__seg';
      barre.appendChild(seg);
      segs.push(seg);
    }
    bottom.appendChild(barre);

    const label = document.createElement('div');
    label.className = 'step-A0__label';
    label.textContent = 'chargement';
    bottom.appendChild(label);

    wrap.appendChild(bottom);

    const flash = document.createElement('div');
    flash.className = 'step-A0__final-flash';
    wrap.appendChild(flash);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    let segIdx = 0;
    const fillNext = () => {
      if (segIdx >= segs.length) return;
      for (let i = 0; i < segIdx; i++) segs[i].classList.replace('is-current', 'is-done');
      segs[segIdx].classList.add('is-current');
      segIdx++;
      const t = setTimeout(fillNext, PROGRESS_TICK_MS + Math.random() * 200);
      timers.push(t);
    };
    fillNext();

    const goNext = () => {
      if (advanceFired) return;
      advanceFired = true;
      saveStepState('A0', { viewed: true });
      flash.classList.add('is-flashing');
      const t = setTimeout(() => {
        if (navAPIRef && typeof navAPIRef.next === 'function') navAPIRef.next();
      }, 350);
      timers.push(t);
    };

    const autoT = setTimeout(goNext, MIN_DURATION_MS + 200);
    timers.push(autoT);

    const onSkip = (evt) => {
      if (evt.type === 'keydown') {
        if (evt.key !== ' ' && evt.key !== 'Spacebar') return;
        if (evt.target?.tagName?.toLowerCase() === 'input') return;
      }
      const elapsed = performance.now() - entryStartedAt;
      if (elapsed < MIN_DURATION_MS) return;
      goNext();
    };
    window.addEventListener('keydown', onSkip);
    handlers.push([window, 'keydown', onSkip]);
    wrap.addEventListener('click', onSkip);
    handlers.push([wrap, 'click', onSkip]);

    void savedState;
  },

  exit() {
    handlers.forEach(([t, e, f]) => t.removeEventListener(e, f));
    handlers = [];
    timers.forEach(clearTimeout);
    timers = [];
    tickerFns.forEach((fn) => app.ticker.remove(fn));
    tickerFns = [];
    domNodes.forEach((n) => n.remove());
    domNodes = [];
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
    navAPIRef = null;
    advanceFired = false;
  },

  serialize() {
    return { viewed: true };
  },

  isComplete() {
    return advanceFired;
  },

  replay() {
    return true;
  },
};

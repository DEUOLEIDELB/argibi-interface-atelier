// A0-chargement-tuko.js — Page de boot fullscreen.
// Tuko (placeholder mascotte) centre + 5 chiffres binaires qui orbitent
// + barre de progression qui se remplit en stop-motion. Duree minimum 5s.
// Bascule auto vers A1 a la fin. Espace ignore avant 5s (skip silencieux).

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';

const MIN_DURATION_MS = 5000;
const PROGRESS_TICK_MS = 250;
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

.step-A0__orbit {
  position: relative;
  width: clamp(360px, 38vw, 560px);
  height: clamp(360px, 38vw, 560px);
  display: grid;
  place-items: center;
}

.step-A0__tuko-wrap {
  --tuko-mascotte-size: clamp(220px, 26vw, 340px);
  position: relative;
  z-index: 2;
}

.step-A0__digit {
  position: absolute;
  top: 50%;
  left: 50%;
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  color: var(--accent-1);
  user-select: none;
  pointer-events: none;
  text-shadow: 0 0 18px color-mix(in srgb, var(--accent-1) 40%, transparent);
  transform: translate(-50%, -50%);
  will-change: transform, opacity;
}

.step-A0__digit.is-falling {
  animation: a0-digit-fall 700ms var(--ease-bounce) forwards;
}

@keyframes a0-digit-fall {
  0%   { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
  60%  { transform: translate(-50%, calc(-50% - 8px)) scale(1.4) rotate(-12deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.9) rotate(0); opacity: 0.85; }
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

.step-A0__watermark {
  position: absolute;
  right: var(--s-4);
  bottom: var(--s-3);
  font-family: var(--mono);
  font-size: var(--t-tiny);
  color: var(--ink);
  opacity: 0.5;
  letter-spacing: 0.16em;
  pointer-events: none;
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
  estimatedDuration: 5,
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

    // ----- Centre : orbit + Tuko + chiffres ---------------------------------
    const center = document.createElement('div');
    center.className = 'step-A0__center';

    const orbit = document.createElement('div');
    orbit.className = 'step-A0__orbit';

    const tukoWrap = document.createElement('div');
    tukoWrap.className = 'step-A0__tuko-wrap';
    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'hote');
    tuko.setAttribute('data-position', 'inline');
    tukoWrap.appendChild(tuko);
    orbit.appendChild(tukoWrap);

    // 5 chiffres binaires (3 fois "1", 2 fois "0").
    const digitsConfig = [
      { glyph: '1', phase: 0 },
      { glyph: '0', phase: (Math.PI * 2) / 5 },
      { glyph: '1', phase: (Math.PI * 4) / 5 },
      { glyph: '0', phase: (Math.PI * 6) / 5 },
      { glyph: '1', phase: (Math.PI * 8) / 5 },
    ];
    const digitNodes = digitsConfig.map((cfg) => {
      const el = document.createElement('span');
      el.className = 'step-A0__digit';
      el.textContent = cfg.glyph;
      orbit.appendChild(el);
      return { el, basePhase: cfg.phase, lastFallAt: 0 };
    });

    center.appendChild(orbit);
    wrap.appendChild(center);

    // ----- Bas : barre progression + label ----------------------------------
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

    // ----- Watermark local (le shell est masqué en fullscreen) --------------
    const watermark = document.createElement('div');
    watermark.className = 'step-A0__watermark';
    watermark.textContent = 'wubo · argibi';
    wrap.appendChild(watermark);

    // ----- Flash de fin -----------------------------------------------------
    const flash = document.createElement('div');
    flash.className = 'step-A0__final-flash';
    wrap.appendChild(flash);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Animation orbite (Pixi ticker) -----------------------------------
    const orbitState = { t: 0 };
    const orbitTick = (delta) => {
      orbitState.t += delta * 0.012; // vitesse globale
      const radiusX = orbit.clientWidth * 0.42;
      const radiusY = orbit.clientHeight * 0.30;
      digitNodes.forEach((d) => {
        const angle = orbitState.t + d.basePhase;
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        // z-index visuel : devant Tuko quand y > 0 (en bas), derriere sinon.
        d.el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        d.el.style.zIndex = y > 0 ? '3' : '1';
      });
    };
    // Premier appel pour positionner les chiffres sur l'orbite des le frame 0.
    requestAnimationFrame(() => orbitTick(0));
    app.ticker.add(orbitTick);
    tickerFns.push(orbitTick);

    // ----- Chute aleatoire d'un chiffre toutes les ~3s ---------------------
    const scheduleFall = () => {
      const t = setTimeout(() => {
        if (!wrap.isConnected) return;
        const target = digitNodes[Math.floor(Math.random() * digitNodes.length)];
        target.el.classList.add('is-falling');
        const t2 = setTimeout(() => target.el.classList.remove('is-falling'), 750);
        timers.push(t2);
        scheduleFall();
      }, 2500 + Math.random() * 1500);
      timers.push(t);
    };
    scheduleFall();

    // ----- Remplissage barre en stop-motion --------------------------------
    let segIdx = 0;
    const fillNext = () => {
      if (segIdx >= segs.length) return;
      // tous les segs precedents en done
      for (let i = 0; i < segIdx; i++) segs[i].classList.replace('is-current', 'is-done');
      segs[segIdx].classList.add('is-current');
      segIdx++;
      const t = setTimeout(fillNext, PROGRESS_TICK_MS + Math.random() * 200);
      timers.push(t);
    };
    fillNext();

    // ----- Bascule auto vers A1 -------------------------------------------
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

    // ----- Skip (Espace ou clic) seulement apres MIN_DURATION_MS -----------
    const onSkip = (evt) => {
      if (evt.type === 'keydown') {
        if (evt.key !== ' ' && evt.key !== 'Spacebar') return;
        if (evt.target?.tagName?.toLowerCase() === 'input') return;
      }
      const elapsed = performance.now() - entryStartedAt;
      if (elapsed < MIN_DURATION_MS) return; // skip silencieux ignore
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
    // Pas de re-anim sans ecraser : la page se rejoue d'elle-meme via mountStep.
    return true;
  },
};

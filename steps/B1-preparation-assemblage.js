// B1-preparation-assemblage.js - Page tampon avant les 15 etapes.
// Titre "ASSEMBLAGE" + tuko_excitate en grand au centre + consigne sous tuko
// + CTA "ON COMMENCE" en bas (convention CTA bottom 128px du footer).
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

export default {
  id: 'B1',
  phase: 'B',
  title: 'Preparation assemblage',
  estimatedDuration: 30,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;

    scene = new Container();
    scene.label = 'step-B1-root';
    container.addChild(scene);

    injectStyles();
    const stage = document.querySelector('#stage');

    const wrap = document.createElement('div');
    wrap.className = 'step-B1';
    stage.appendChild(wrap);
    domNodes.push(wrap);

    const titre = document.createElement('h1');
    titre.className = 'step-B1__titre';
    titre.textContent = 'ASSEMBLAGE';
    wrap.appendChild(titre);

    const tukoWrap = document.createElement('div');
    tukoWrap.className = 'step-B1__tuko-wrap';
    const tukoImg = document.createElement('img');
    tukoImg.className = 'step-B1__tuko';
    tukoImg.src = 'assets/sprites/tuko_excitate.png';
    tukoImg.alt = 'Tuko enthousiaste';
    tukoWrap.appendChild(tukoImg);
    wrap.appendChild(tukoWrap);

    const consigne = document.createElement('p');
    consigne.className = 'step-B1__consigne';
    consigne.textContent = 'Sors tout devant toi.';
    wrap.appendChild(consigne);

    const ctaArea = document.createElement('div');
    ctaArea.className = 'step-B1__cta-area';
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'cta-primary step-B1__cta';
    cta.textContent = 'ON COMMENCE';
    ctaArea.appendChild(cta);
    wrap.appendChild(ctaArea);

    const advance = () => {
      if (cta.disabled) return;
      cta.disabled = true;
      const t = setTimeout(() => {
        navAPIRef?.markComplete?.();
        navAPIRef?.next?.();
      }, 180);
      timers.push(t);
    };
    cta.addEventListener('click', advance);
    handlers.push([cta, 'click', advance]);

    const onKey = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    handlers.push([window, 'keydown', onKey]);

    saveStepState('B1', { viewed: true });

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
    navAPIRef = null;
  },

  serialize() {
    return { viewed: true };
  },

  isComplete() {
    return true;
  },

  replay() {
    this.exit();
  },
};

function injectStyles() {
  if (document.querySelector('#step-B1-styles')) return;
  const css = `
    .step-B1 {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-rows: auto 1fr auto auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-3);
      padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
      text-align: center;
      background: var(--bg);
      overflow: hidden;
    }

    /* ----- Titre HERO --------------------------------------------------- */

    .step-B1__titre {
      font-family: var(--display);
      font-size: clamp(72px, 7vw, 128px);
      font-weight: 900;
      letter-spacing: -0.01em;
      line-height: 1;
      text-transform: uppercase;
      color: var(--ink);
      margin: 0;
      opacity: 0;
      transform: scale(0);
      animation: stepB1-titre-smash var(--d-normal) var(--ease-bounce) 100ms forwards;
    }

    /* ----- Tuko_excitate au CENTRE en grand ----------------------------- */

    .step-B1__tuko-wrap {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      min-height: 0;
      opacity: 0;
      transform: translateY(20px);
      animation: stepB1-fade-in var(--d-slow) var(--ease-out) 350ms forwards,
                 stepB1-bobbing 2.4s ease-in-out 950ms infinite;
    }

    .step-B1__tuko {
      max-height: 100%;
      max-width: min(560px, 45vw);
      height: auto;
      width: auto;
      object-fit: contain;
      display: block;
    }

    /* ----- Consigne sous tuko ------------------------------------------- */

    .step-B1__consigne {
      font-family: var(--display);
      font-size: clamp(32px, 3vw, 48px);
      font-weight: 700;
      line-height: 1.2;
      text-transform: lowercase;
      color: var(--ink);
      margin: 0;
      max-width: 900px;
      opacity: 0;
      transform: translateY(10px);
      animation: stepB1-fade-in var(--d-slow) var(--ease-out) 700ms forwards;
    }

    /* ----- CTA (convention bottom 128px du footer, identique A1/A3/A6) -- */

    .step-B1__cta-area {
      display: grid;
      justify-items: center;
      margin-top: var(--s-3);
    }

    .step-B1__cta {
      animation: none !important;
      opacity: 0;
      transform: translateY(10px) scale(0.95);
    }

    .step-B1__cta {
      animation: stepB1-cta-in var(--d-normal) var(--ease-bounce) 950ms forwards !important;
    }

    @keyframes stepB1-titre-smash {
      0%   { opacity: 0; transform: scale(0); }
      60%  { opacity: 1; transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes stepB1-fade-in {
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes stepB1-bobbing {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }

    @keyframes stepB1-cta-in {
      0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
      60%  { opacity: 1; transform: translateY(0)    scale(1.05); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
    }
  `;

  const style = document.createElement('style');
  style.id = 'step-B1-styles';
  style.textContent = css;
  document.head.appendChild(style);
  domNodes.push(style);
}

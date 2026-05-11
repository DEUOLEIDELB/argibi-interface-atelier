// B1-preparation-assemblage.js - Page tampon avant les 15 etapes.
// Source : doc interne.
//
// Page d'animateur. Aucune interaction enfant. Une respiration : titre,
// image-placeholder du poste range, une ligne de consigne, Tuko hote
// bas-gauche, CTA "ON COMMENCE". L'animateur clique quand la classe est prete.
// utilise .tuko-mascotte  au lieu d'une version locale.

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
    titre.className = 'titre-hero step-B1__titre';
    titre.textContent = 'ON ASSEMBLE TA CAPSULE';
    wrap.appendChild(titre);

    const image = document.createElement('div');
    image.className = 'placeholder-image step-B1__image';
    image.textContent = 'poste de travail range : sachets A et B separes, carte au centre';
    wrap.appendChild(image);

    const consigne = document.createElement('p');
    consigne.className = 'sous-titre step-B1__consigne';
    consigne.textContent = 'sors tout devant toi : garde A et B separes';
    wrap.appendChild(consigne);

    // Tuko mascotte partagee  : posture pedagogique en bas-gauche.
    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.dataset.pose = 'pedagogique';
    tuko.dataset.position = 'bas-gauche';
    wrap.appendChild(tuko);

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'cta-primary step-B1__cta';
    cta.textContent = 'on commence';
    wrap.appendChild(cta);

    const advance = () => {
      if (cta.disabled) return;
      cta.disabled = true;
      cta.classList.add('is-flashing');
      const t = setTimeout(() => {
        navAPIRef?.markComplete?.();
        navAPIRef?.next?.();
      }, 180);
      timers.push(t);
    };
    cta.addEventListener('click', advance);
    handlers.push([cta, 'click', advance]);

    // Raccourci Espace (cf. fiche § Technique).
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    handlers.push([window, 'keydown', onKey]);

    // Persistance : flag viewed des l'entree (page tampon, completion immediate).
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
    // Re-execute juste l'animation principale : on retire les nodes et relance
    // enter() via le shell (le shell appelle exit() + enter() au resetCurrentStep).
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
      gap: var(--s-5);
      padding: var(--s-6);
      text-align: center;
    }

    .step-B1__titre {
      opacity: 0;
      transform: scale(0);
      animation: stepB1-titre-smash var(--d-normal) var(--ease-bounce) 100ms forwards;
    }

    .step-B1__image {
      width: min(720px, 60%);
      max-height: 360px;
      opacity: 0;
      transform: translateY(20px);
      animation: stepB1-fade-in var(--d-slow) var(--ease-out) 350ms forwards,
                 stepB1-bobbing 3s ease-in-out 950ms infinite;
    }

    .step-B1__consigne {
      opacity: 0;
      transform: translateY(10px);
      animation: stepB1-fade-in var(--d-slow) var(--ease-out) 700ms forwards;
      max-width: 900px;
    }

    .step-B1__cta {
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      animation: stepB1-cta-in var(--d-normal) var(--ease-bounce) 950ms forwards;
    }

    .step-B1__cta.is-flashing {
      animation: stepB1-cta-flash var(--d-fast) var(--ease-out) forwards;
    }

    @keyframes stepB1-titre-smash {
      0%   { opacity: 0; transform: scale(0); }
      60%  { opacity: 1; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes stepB1-fade-in {
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes stepB1-bobbing {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-5px); }
    }

    @keyframes stepB1-cta-in {
      0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
      60%  { opacity: 1; transform: translateY(0)    scale(1.05); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
    }

    @keyframes stepB1-cta-flash {
      0%   { transform: scale(1);    box-shadow: var(--shadow-lg); }
      40%  { transform: scale(1.06); box-shadow: 0 0 0 12px var(--accent-3); }
      100% { transform: scale(1);    box-shadow: var(--shadow-lg); }
    }
  `;

  const style = document.createElement('style');
  style.id = 'step-B1-styles';
  style.textContent = css;
  document.head.appendChild(style);
  domNodes.push(style);
}

// D9-activite-capteur.js — Le capteur : conducteur (1) ou isolant (0).
// Version simple : 2 cards (doigt = conducteur, gomme = isolant),
// illustration du capteur tactile au centre, tuko_liberable bas-gauche.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

const STYLE_ID = 'step-D9-styles';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let styleNode = null;

const STYLE_TEXT = `
.step-D9 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  gap: var(--s-3);
  cursor: var(--cursor-default);
}

.step-D9__titre {
  font-family: var(--display);
  font-size: clamp(56px, 5.4vw, 88px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  align-self: start;
  opacity: 0;
  transform: scale(0);
  animation: d9-smash var(--d-normal) var(--ease-bounce) 0.1s forwards;
}

.step-D9__main {
  width: 100%;
  max-width: 1700px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--s-4);
  align-self: stretch;
  justify-self: center;
}

/* Cards conducteur / isolant */
.step-D9__card {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-4) var(--s-3);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--s-3);
  place-items: center;
  height: 80%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  align-self: center;
  opacity: 0;
}

.step-D9__card-titre {
  white-space: nowrap;
}
.step-D9__card.is-in-left  { animation: d9-pop-left  var(--d-normal) var(--ease-bounce) 0.5s forwards; }
.step-D9__card.is-in-right { animation: d9-pop-right var(--d-normal) var(--ease-bounce) 0.65s forwards; }

.step-D9__card-titre {
  font-family: var(--display);
  font-size: clamp(36px, 3.4vw, 56px);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--ink);
  margin: 0;
  text-align: center;
}

.step-D9__card-img-wrap {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.step-D9__card-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.step-D9__card-bigbit {
  font-family: var(--display);
  font-size: clamp(80px, 7vw, 120px);
  font-weight: 900;
  line-height: 1;
  margin: 0;
  text-align: center;
}
.step-D9__card--conducteur .step-D9__card-bigbit { color: var(--accent-2); }
.step-D9__card--isolant   .step-D9__card-bigbit { color: var(--ink); opacity: 0.65; }

/* Illustration capteur tactile au centre */
.step-D9__capteur-wrap {
  display: grid;
  place-items: center;
  opacity: 0;
  transform: scale(0.6);
  animation: d9-pop-center var(--d-normal) var(--ease-bounce) 0.8s forwards;
}
.step-D9__capteur-img {
  width: clamp(280px, 26vw, 420px);
  height: auto;
  display: block;
}

/* Sous-titre / rappel */
.step-D9__rappel {
  font-family: var(--body);
  font-size: clamp(20px, 1.7vw, 28px);
  font-weight: 600;
  text-align: center;
  color: var(--ink);
  margin: 0;
  opacity: 0;
  animation: d9-fade-up var(--d-slow) var(--ease-out) 1.1s forwards;
}

/* CTA convention (cf. memoire cta_button_convention) */
.step-D9__cta-area {
  display: grid;
  justify-items: center;
  align-self: end;
}
.step-D9__cta {
  animation: none !important;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
}
.step-D9__cta.is-in {
  animation: d9-pop-cta var(--d-normal) var(--ease-bounce) forwards !important;
  pointer-events: auto;
}

/* Tuko liberable, bas-gauche, au-dessus du footer */
.step-D9__tuko-wrap {
  position: absolute;
  left: var(--s-5);
  bottom: var(--s-3);
  opacity: 0;
  transform: translateX(-120%);
  animation: d9-slide-in-tuko var(--d-slow) var(--ease-out) 1.0s forwards;
  z-index: 2;
  pointer-events: none;
}
.step-D9__tuko-img {
  display: block;
  width: clamp(160px, 14vw, 220px);
  height: auto;
  transform-origin: 50% 90%;
}
.step-D9__tuko-img.is-shaking {
  animation: d9-tuko-shake 600ms var(--ease-out);
}
@keyframes d9-tuko-shake {
  0%   { transform: rotate(0deg)  translateX(0); }
  15%  { transform: rotate(-8deg) translateX(-4px); }
  30%  { transform: rotate(7deg)  translateX(4px); }
  45%  { transform: rotate(-6deg) translateX(-3px); }
  60%  { transform: rotate(5deg)  translateX(3px); }
  75%  { transform: rotate(-3deg) translateX(-2px); }
  100% { transform: rotate(0deg)  translateX(0); }
}

@keyframes d9-smash {
  0%   { transform: scale(0);    opacity: 0; }
  60%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes d9-pop-left {
  0%   { opacity: 0; transform: translateX(-40px) scale(0.92); }
  60%  { opacity: 1; transform: translateX(4px)   scale(1.03); }
  100% { opacity: 1; transform: translateX(0)     scale(1); }
}
@keyframes d9-pop-right {
  0%   { opacity: 0; transform: translateX(40px)  scale(0.92); }
  60%  { opacity: 1; transform: translateX(-4px)  scale(1.03); }
  100% { opacity: 1; transform: translateX(0)     scale(1); }
}
@keyframes d9-pop-center {
  0%   { opacity: 0; transform: scale(0.6); }
  70%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes d9-pop-cta {
  0%   { transform: scale(0);   opacity: 0; }
  70%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes d9-fade-up {
  to { opacity: 0.85; transform: translateY(0); }
}
@keyframes d9-slide-in-tuko {
  to { opacity: 1; transform: translateX(0); }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  styleNode = document.createElement('style');
  styleNode.id = STYLE_ID;
  styleNode.textContent = STYLE_TEXT;
  document.head.appendChild(styleNode);
}

function buildCard({ key, side, titre, bigbit, img, alt }) {
  const card = document.createElement('article');
  card.className = `step-D9__card step-D9__card--${key} is-in-${side}`;

  const h2 = document.createElement('h2');
  h2.className = 'step-D9__card-titre';
  h2.textContent = titre;
  card.appendChild(h2);

  const imgWrap = document.createElement('div');
  imgWrap.className = 'step-D9__card-img-wrap';
  const im = document.createElement('img');
  im.className = 'step-D9__card-img';
  im.src = img;
  im.alt = alt;
  imgWrap.appendChild(im);
  card.appendChild(imgWrap);

  const big = document.createElement('p');
  big.className = 'step-D9__card-bigbit';
  big.textContent = bigbit;
  card.appendChild(big);

  return card;
}

function build(navAPI) {
  const stage = document.querySelector('#stage');
  const wrap = document.createElement('div');
  wrap.className = 'step-D9';

  // Titre
  const titre = document.createElement('h1');
  titre.className = 'step-D9__titre';
  titre.textContent = 'LE CAPTEUR';
  wrap.appendChild(titre);

  // Zone principale : card conducteur | capteur illustration | card isolant
  const main = document.createElement('div');
  main.className = 'step-D9__main';

  const cardConducteur = buildCard({
    key: 'conducteur',
    side: 'left',
    titre: 'CONDUCTEUR',
    bigbit: '1',
    img: 'assets/sprites/D9/doigt.png',
    alt: 'doigt',
  });
  main.appendChild(cardConducteur);

  const capteurWrap = document.createElement('div');
  capteurWrap.className = 'step-D9__capteur-wrap';
  const capteurImg = document.createElement('img');
  capteurImg.className = 'step-D9__capteur-img';
  capteurImg.src = 'assets/sprites/D9/Touche-sensor.svg';
  capteurImg.alt = 'capteur tactile';
  capteurWrap.appendChild(capteurImg);
  main.appendChild(capteurWrap);

  const cardIsolant = buildCard({
    key: 'isolant',
    side: 'right',
    titre: 'ISOLANT',
    bigbit: '0',
    img: 'assets/sprites/D9/gomme.webp',
    alt: 'gomme',
  });
  main.appendChild(cardIsolant);

  wrap.appendChild(main);

  // Rappel
  const rappel = document.createElement('p');
  rappel.className = 'step-D9__rappel';
  rappel.textContent = 'regarde ta capsule · essaie 4 objets differents';
  wrap.appendChild(rappel);

  // CTA convention
  const ctaArea = document.createElement('div');
  ctaArea.className = 'step-D9__cta-area';
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-D9__cta';
  cta.textContent = 'on fait un mini-jeu';
  ctaArea.appendChild(cta);
  wrap.appendChild(ctaArea);

  // Tuko liberable absolute bas-gauche
  const tukoWrap = document.createElement('div');
  tukoWrap.className = 'step-D9__tuko-wrap';
  const tuko = document.createElement('img');
  tuko.className = 'step-D9__tuko-img';
  tuko.src = 'assets/sprites/tuko_liberable.png';
  tuko.alt = '';
  tukoWrap.appendChild(tuko);
  wrap.appendChild(tukoWrap);

  stage.appendChild(wrap);
  domNodes.push(wrap);

  // Reveal CTA apres entrance
  const tCta = setTimeout(() => cta.classList.add('is-in'), 1400);
  timers.push(tCta);

  const onCta = () => navAPI.next();
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);

  // Shake aleatoire de tuko (apres l'entree, intervalle 3-7s)
  const scheduleShake = () => {
    const delay = 3000 + Math.random() * 4000;
    const t = setTimeout(() => {
      tuko.classList.remove('is-shaking');
      void tuko.offsetWidth;
      tuko.classList.add('is-shaking');
      scheduleShake();
    }, delay);
    timers.push(t);
  };
  const tFirstShake = setTimeout(scheduleShake, 2400);
  timers.push(tFirstShake);
}

export default {
  id: 'D9',
  phase: 'D',
  title: 'Le capteur (conducteur ou isolant)',
  estimatedDuration: 120,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    scene = new Container();
    scene.label = 'step-D9';
    container.addChild(scene);

    injectStyle();
    build(navAPI);

    void savedState;
  },

  exit() {
    handlers.forEach(([t, e, fn]) => t.removeEventListener(e, fn));
    handlers = [];
    timers.forEach(clearTimeout);
    timers = [];
    domNodes.forEach((n) => n.remove());
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
    wrap.querySelectorAll('.step-D9__titre, .step-D9__card, .step-D9__capteur-wrap, .step-D9__rappel, .step-D9__cta, .step-D9__tuko-wrap')
      .forEach(el => {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
      });
  },
};

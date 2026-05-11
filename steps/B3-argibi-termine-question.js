// B3-argibi-termine-question.js - Argibi termine + Le Grand Vote.
// Source : doc interne.
//
// Slide 1 : showcase de l'Argibi monte (rotation CSS + glow + etincelles cyan
//           via spawnEtincelles partage).
// Slide 2 : Le Grand Vote. 4 cards d'options, barres verticales qui poussent,
//           leader pulse / glow / podium si ecart 3x. Clic = +1, clic-droit
//           = -1, 1-4 = +1 sur card correspondante. Combo +N si 3 clics
//           rapides. Confettis via spawnConfettis partage a chaque vote +
//           gerbe finale sur le winner.
//
// helpers partages (spawnEtincelles, spawnConfettis) au lieu d'une
// reimplementation Pixi locale. .tuko-mascotte au lieu de divs locales.
// Aucune couleur hexa hardcodee.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';
import { spawnEtincelles, spawnConfettis } from '../core/effects.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let stopSparkles = null;

let currentSlide = 1;
let votes = { 1: 0, 2: 0, 3: 0, 4: 0 };
let cardClickHistory = { 1: [], 2: [], 3: [], 4: [] };

const OPTIONS = [
  { id: 1, label: 'UNE LAMPE\nQUI DANSE',  image: 'lampe stylisee qui danse' },
  { id: 2, label: 'UN ROBOT\nMALIN',       image: 'petit robot avec engrenages' },
  { id: 3, label: 'UN DECODEUR\nSECRET',   image: 'message binaire et code' },
  { id: 4, label: 'UNE TELE\nMINIATURE',   image: 'mini-tele avec image' },
];

const MAX_BAR_VOTES = 20;

let slide1El = null;
let slide2El = null;
let argibiPlaceholderEl = null;
let cardsEl = {};
let counterEl = {};
let barFillEl = {};
let comboEl = {};
let cta2El = null;
let tuko1El = null;
let tuko2El = null;
let argibiBadgeEl = null;

export default {
  id: 'B3',
  phase: 'B',
  title: 'Argibi termine + Grand Vote',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;

    scene = new Container();
    scene.label = 'step-B3-root';
    container.addChild(scene);

    injectStyles();

    const stage = document.querySelector('#stage');

    const wrap = document.createElement('div');
    wrap.className = 'step-B3';
    stage.appendChild(wrap);
    domNodes.push(wrap);

    buildSlide1(wrap);
    buildSlide2(wrap);

    if (savedState?.slide === 2) {
      currentSlide = 2;
      votes = { 1: 0, 2: 0, 3: 0, 4: 0, ...(savedState.votes || {}) };
      showSlide2(true);
    } else {
      currentSlide = 1;
      votes = { 1: 0, 2: 0, 3: 0, 4: 0 };
      showSlide1();
    }

    const onKeyCapture = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (currentSlide === 1 && (e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        bascule12();
      } else if (currentSlide === 2 && /^[1-4]$/.test(e.key) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        addVote(parseInt(e.key, 10), 1);
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    handlers.push([window, 'keydown', onKeyCapture, true]);

    persist();
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => {
      target.removeEventListener(event, fn, !!capture);
    });
    handlers = [];

    timers.forEach(clearTimeout);
    timers = [];

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    if (stopSparkles) {
      stopSparkles();
      stopSparkles = null;
    }

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    navAPIRef = null;
    currentSlide = 1;
    votes = { 1: 0, 2: 0, 3: 0, 4: 0 };
    cardClickHistory = { 1: [], 2: [], 3: [], 4: [] };
    slide1El = null;
    slide2El = null;
    argibiPlaceholderEl = null;
    cardsEl = {};
    counterEl = {};
    barFillEl = {};
    comboEl = {};
    cta2El = null;
    tuko1El = null;
    tuko2El = null;
    argibiBadgeEl = null;
  },

  serialize() {
    return { slide: currentSlide, votes: { ...votes } };
  },

  isComplete() {
    return currentSlide === 2 && totalVotes() >= 1;
  },

  replay() {
    this.exit();
  },
};

function buildSlide1(wrap) {
  const slide = document.createElement('section');
  slide.className = 'step-B3__slide step-B3__slide--1';

  const argibi = document.createElement('div');
  argibi.className = 'step-B3__argibi placeholder-image';
  argibi.textContent = 'argibi monte, vue 3D legere rotation';
  slide.appendChild(argibi);
  argibiPlaceholderEl = argibi;

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-B3__titre1';
  titre.textContent = 'TA CAPSULE EST MONTEE !';
  slide.appendChild(titre);

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'triomphe';
  tuko.dataset.position = 'bas-gauche';
  slide.appendChild(tuko);
  tuko1El = tuko;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-B3__cta1';
  cta.textContent = 'alors, ca sert a quoi ?';
  slide.appendChild(cta);

  const onClick = () => bascule12();
  cta.addEventListener('click', onClick);
  handlers.push([cta, 'click', onClick]);

  wrap.appendChild(slide);
  slide1El = slide;
}

function showSlide1() {
  slide1El.classList.add('is-active');
  slide2El.classList.remove('is-active');
  argibiPlaceholderEl.classList.add('step-B3__argibi--rotating');

  // Etincelles cyan continues autour de l'Argibi (helper partage ).
  if (stopSparkles) stopSparkles();
  stopSparkles = spawnEtincelles(argibiPlaceholderEl, { duree: 0, densite: 'normale' });
}

function bascule12() {
  if (currentSlide !== 1) return;
  currentSlide = 2;
  argibiPlaceholderEl.classList.add('step-B3__argibi--shrinking');
  slide1El.classList.add('is-leaving');
  if (stopSparkles) { stopSparkles(); stopSparkles = null; }
  const t = setTimeout(() => {
    slide1El.classList.remove('is-active', 'is-leaving');
    showSlide2(false);
    persist();
  }, 350);
  timers.push(t);
}

function buildSlide2(wrap) {
  const slide = document.createElement('section');
  slide.className = 'step-B3__slide step-B3__slide--2';

  const titre = document.createElement('h1');
  titre.className = 'titre-hero step-B3__titre2';
  titre.textContent = 'A TON AVIS, CA SERT A QUOI ?';
  slide.appendChild(titre);

  const sous = document.createElement('p');
  sous.className = 'sous-titre step-B3__sous2';
  sous.textContent = 'vote en levant la main';
  slide.appendChild(sous);

  const grid = document.createElement('div');
  grid.className = 'step-B3__grid';
  slide.appendChild(grid);

  cardsEl = {};
  counterEl = {};
  barFillEl = {};
  comboEl = {};

  OPTIONS.forEach((opt, i) => {
    const card = document.createElement('div');
    card.className = 'card-clickable step-B3__card';
    card.style.setProperty('--rot', (i % 2 === 0 ? -1 : 1) + 'deg');
    card.dataset.opt = String(opt.id);

    const image = document.createElement('div');
    image.className = 'placeholder-image step-B3__card-image';
    image.textContent = opt.image;
    card.appendChild(image);

    const barWrap = document.createElement('div');
    barWrap.className = 'step-B3__bar-wrap';
    const barTrack = document.createElement('div');
    barTrack.className = 'step-B3__bar-track';
    const barFill = document.createElement('div');
    barFill.className = 'step-B3__bar-fill';
    barTrack.appendChild(barFill);
    barWrap.appendChild(barTrack);
    card.appendChild(barWrap);
    barFillEl[opt.id] = barFill;

    const counter = document.createElement('div');
    counter.className = 'step-B3__counter';
    counter.textContent = '0';
    card.appendChild(counter);
    counterEl[opt.id] = counter;

    const label = document.createElement('div');
    label.className = 'step-B3__label';
    opt.label.split('\n').forEach((line, idx) => {
      if (idx > 0) label.appendChild(document.createElement('br'));
      label.appendChild(document.createTextNode(line));
    });
    card.appendChild(label);

    const combo = document.createElement('span');
    combo.className = 'step-B3__combo';
    card.appendChild(combo);
    comboEl[opt.id] = combo;

    const onClick = (e) => {
      sendRipple(card, e);
      addVote(opt.id, 1);
    };
    const onContext = (e) => {
      e.preventDefault();
      addVote(opt.id, -1);
    };
    card.addEventListener('click', onClick);
    card.addEventListener('contextmenu', onContext);
    handlers.push([card, 'click', onClick]);
    handlers.push([card, 'contextmenu', onContext]);

    grid.appendChild(card);
    cardsEl[opt.id] = card;
  });

  const badge = document.createElement('div');
  badge.className = 'step-B3__argibi-badge';
  badge.textContent = 'argibi';
  slide.appendChild(badge);
  argibiBadgeEl = badge;

  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'presentateur';
  tuko.dataset.position = 'bas-gauche';
  slide.appendChild(tuko);
  tuko2El = tuko;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-B3__cta2 is-disabled';
  cta.disabled = true;
  cta.textContent = 'on le decouvre !';
  slide.appendChild(cta);
  cta2El = cta;

  const onCta = () => {
    if (cta.disabled) return;
    triggerVoteFinale();
  };
  cta.addEventListener('click', onCta);
  handlers.push([cta, 'click', onCta]);

  wrap.appendChild(slide);
  slide2El = slide;
}

function showSlide2(skipIntroAnim) {
  slide2El.classList.add('is-active');
  slide1El.classList.remove('is-active');

  if (skipIntroAnim) {
    Object.values(cardsEl).forEach(c => c.classList.add('is-shown'));
  } else {
    OPTIONS.forEach((opt, i) => {
      const card = cardsEl[opt.id];
      const t = setTimeout(() => card.classList.add('is-shown'), 80 * i);
      timers.push(t);
    });
  }

  renderVotes();
}

function addVote(optId, delta) {
  if (currentSlide !== 2) return;
  const next = Math.max(0, (votes[optId] || 0) + delta);
  votes[optId] = next;

  const now = performance.now();
  cardClickHistory[optId] = (cardClickHistory[optId] || []).filter(t => now - t < 1000);
  if (delta > 0) cardClickHistory[optId].push(now);
  if (cardClickHistory[optId].length >= 3) {
    triggerCombo(optId, cardClickHistory[optId].length);
    cardClickHistory[optId] = [];
  }

  renderVotes();
  if (delta > 0) {
    bumpCard(optId);
    spawnConfettiOnCard(optId);
    tukoLookAt(optId);
  }
  persist();
}

function renderVotes() {
  const max = Math.max(1, ...Object.values(votes));
  const total = totalVotes();

  OPTIONS.forEach(opt => {
    const card = cardsEl[opt.id];
    const counter = counterEl[opt.id];
    const fill = barFillEl[opt.id];
    const v = votes[opt.id] || 0;

    counter.textContent = String(v);

    const ratio = Math.min(1, v / MAX_BAR_VOTES);
    fill.style.transform = `scaleY(${ratio})`;

    const isLeader = v === max && max > 0;
    card.classList.toggle('is-leader', isLeader);

    const others = OPTIONS.filter(o => o.id !== opt.id).map(o => votes[o.id] || 0);
    const secondMax = others.length ? Math.max(...others) : 0;
    const isPodium = v === max && max > 0 && secondMax > 0 && v >= secondMax * 3
                     && Object.values(votes).filter(x => x === max).length === 1;
    card.classList.toggle('is-podium', isPodium);
  });

  if (total >= 1) {
    cta2El.disabled = false;
    cta2El.classList.remove('is-disabled');
  } else {
    cta2El.disabled = true;
    cta2El.classList.add('is-disabled');
  }
}

function bumpCard(optId) {
  const card = cardsEl[optId];
  card.classList.remove('is-bumping');
  void card.offsetWidth;
  card.classList.add('is-bumping');

  const counter = counterEl[optId];
  counter.classList.remove('is-pulsing');
  void counter.offsetWidth;
  counter.classList.add('is-pulsing');
}

function spawnConfettiOnCard(optId) {
  const card = cardsEl[optId];
  if (!card) return;
  // Helper partage . Origine = quart superieur de la card.
  spawnConfettis(card, {
    nombre: 2,
    origine: { x: card.clientWidth / 2, y: card.clientHeight / 4 },
  });
}

function sendRipple(card, e) {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const r = document.createElement('span');
  r.className = 'step-B3__ripple';
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  card.appendChild(r);
  const t = setTimeout(() => r.remove(), 600);
  timers.push(t);
}

function tukoLookAt(optId) {
  if (!tuko2El) return;
  // Override de l'animation bobbing partagee pendant 500ms pour tourner
  // brievement la tete vers la card votee.
  const rot = [-6, -2, 2, 6][optId - 1] || 0;
  tuko2El.classList.add('is-looking');
  tuko2El.style.transform = `rotate(${rot}deg)`;
  const t = setTimeout(() => {
    if (!tuko2El) return;
    tuko2El.style.transform = '';
    tuko2El.classList.remove('is-looking');
  }, 500);
  timers.push(t);
}

function triggerCombo(optId, n) {
  const combo = comboEl[optId];
  if (!combo) return;
  combo.textContent = `+${n} !`;
  combo.classList.remove('is-on');
  void combo.offsetWidth;
  combo.classList.add('is-on');
  const t = setTimeout(() => combo.classList.remove('is-on'), 700);
  timers.push(t);
}

function triggerVoteFinale() {
  const max = Math.max(...Object.values(votes));
  const leaders = OPTIONS.filter(o => votes[o.id] === max && max > 0).map(o => o.id);
  if (leaders.length) {
    const winId = leaders[0];
    const card = cardsEl[winId];
    card.classList.add('is-victory');
    // Pluie de confettis sur le leader : 8 bursts cadences.
    for (let i = 0; i < 8; i++) {
      const t = setTimeout(() => spawnConfettiOnCard(winId), i * 60);
      timers.push(t);
    }
  }
  if (tuko2El) {
    tuko2El.classList.add('is-celebrating');
  }

  const flash = document.createElement('div');
  flash.className = 'step-B3__flash';
  document.querySelector('#stage').appendChild(flash);
  domNodes.push(flash);
  requestAnimationFrame(() => flash.classList.add('is-on'));

  const t = setTimeout(() => {
    navAPIRef?.markComplete?.();
    navAPIRef?.next?.();
  }, 700);
  timers.push(t);
}

function totalVotes() {
  return Object.values(votes).reduce((a, b) => a + b, 0);
}

function persist() {
  saveStepState('B3', { slide: currentSlide, votes: { ...votes } });
}

function injectStyles() {
  if (document.querySelector('#step-B3-styles')) return;
  const css = `
    .step-B3 {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .step-B3__slide {
      position: absolute;
      inset: 0;
      display: none;
      transition: opacity var(--d-fast) var(--ease-out);
    }
    .step-B3__slide.is-active { display: grid; }
    .step-B3__slide.is-leaving { opacity: 0; }

    .step-B3__slide--1 {
      grid-template-rows: 1fr auto auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-6);
      text-align: center;
    }

    .step-B3__argibi {
      width: min(420px, 36vw);
      height: min(420px, 36vw);
      transform: scale(0);
      animation: stepB3-argibi-pop var(--d-normal) var(--ease-bounce) 100ms forwards;
      box-shadow: var(--shadow-accent-1);
    }
    .step-B3__argibi--rotating {
      animation: stepB3-argibi-pop var(--d-normal) var(--ease-bounce) 100ms forwards,
                 stepB3-argibi-rotate 6s linear 600ms infinite,
                 stepB3-argibi-glow 2s ease-in-out 600ms infinite;
    }
    .step-B3__argibi--shrinking {
      animation: stepB3-argibi-shrink var(--d-fast) var(--ease-out) forwards;
    }

    .step-B3__titre1 {
      opacity: 0;
      transform: scale(0);
      animation: stepB3-titre-smash var(--d-normal) var(--ease-bounce) 500ms forwards;
    }

    .step-B3__cta1 {
      opacity: 0;
      transform: translateY(10px);
      animation: stepB3-fade-in var(--d-normal) var(--ease-bounce) 800ms forwards;
    }

    .step-B3__slide--2 {
      grid-template-rows: auto auto 1fr auto;
      align-items: center;
      justify-items: center;
      gap: var(--s-3);
      padding: var(--s-5) var(--s-6) var(--s-6);
      text-align: center;
    }

    .step-B3__titre2 { font-size: var(--t-h1); }

    .step-B3__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--s-3);
      width: 100%;
      max-width: 1500px;
    }

    .step-B3__card {
      display: grid;
      grid-template-rows: 1fr auto auto auto;
      gap: var(--s-2);
      padding: var(--s-2);
      transform: scale(0) rotate(var(--rot, 0deg));
      opacity: 0;
      transition: transform var(--d-normal) var(--ease-out),
                  box-shadow var(--d-fast) var(--ease-out);
      position: relative;
      overflow: hidden;
    }
    .step-B3__card.is-shown {
      animation: stepB3-card-pop var(--d-normal) var(--ease-bounce) forwards;
    }
    .step-B3__card.is-bumping {
      animation: stepB3-card-bump var(--d-fast) var(--ease-bounce);
    }
    .step-B3__card.is-leader {
      animation: stepB3-card-leader 2s ease-in-out infinite;
      box-shadow: var(--shadow-accent-3), 0 0 24px var(--accent-3);
    }
    .step-B3__card.is-podium {
      animation: stepB3-card-podium 2s ease-in-out infinite;
    }
    .step-B3__card.is-victory {
      animation: stepB3-card-victory 600ms var(--ease-bounce);
    }

    .step-B3__card-image {
      min-height: 130px;
    }

    .step-B3__bar-wrap {
      display: grid;
      place-items: center;
      height: 110px;
    }
    .step-B3__bar-track {
      width: 36px;
      height: 100%;
      background: var(--bg-2);
      border: var(--border-thin);
      border-radius: var(--r-sm);
      position: relative;
      overflow: hidden;
    }
    .step-B3__bar-fill {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        to top,
        var(--accent-3) 0,
        var(--accent-3) 10px,
        var(--ink) 10px,
        var(--ink) 12px
      );
      transform-origin: bottom center;
      transform: scaleY(0);
      transition: transform var(--d-normal) var(--ease-bounce);
    }

    .step-B3__counter {
      font-family: var(--display);
      font-size: var(--t-h1);
      font-weight: 900;
      line-height: 1;
      transition: transform var(--d-fast) var(--ease-bounce);
    }
    .step-B3__counter.is-pulsing {
      animation: stepB3-counter-pulse var(--d-fast) var(--ease-bounce);
    }

    .step-B3__label {
      font-family: var(--display);
      font-size: var(--t-body-xl);
      font-weight: 900;
      line-height: 1.05;
      text-transform: uppercase;
      text-align: center;
    }

    .step-B3__combo {
      position: absolute;
      top: var(--s-1);
      right: var(--s-2);
      font-family: var(--display);
      font-size: var(--t-h2);
      font-weight: 900;
      color: var(--accent-1);
      opacity: 0;
      transform: scale(0.7);
      pointer-events: none;
    }
    .step-B3__combo.is-on {
      animation: stepB3-combo 700ms var(--ease-bounce) forwards;
    }

    .step-B3__ripple {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--accent-1);
      border-radius: var(--r-pill);
      transform: translate(-50%, -50%) scale(0);
      pointer-events: none;
      opacity: 0.6;
      animation: stepB3-ripple 600ms var(--ease-out) forwards;
    }

    .step-B3__argibi-badge {
      position: absolute;
      top: var(--s-2);
      right: var(--s-3);
      width: 80px;
      height: 80px;
      display: grid;
      place-items: center;
      font-family: var(--mono);
      font-size: var(--t-tiny);
      letter-spacing: 0.16em;
      color: var(--ink);
      background: var(--paper);
      border: var(--border);
      box-shadow: var(--shadow-sm);
      border-radius: var(--r-md);
      animation: stepB3-argibi-rotate 6s linear infinite;
      transform-origin: center;
    }

    .step-B3__cta2 {
      justify-self: center;
    }

    .step-B3__sous2 { margin: 0; }

    /* Override de l'anim partagee de .tuko-mascotte pendant 500ms : on stoppe
       l'animation pour pouvoir appliquer un transform inline (rotation tete). */
    .step-B3 .tuko-mascotte.is-looking {
      animation: none;
      transition: transform var(--d-fast) var(--ease-out);
    }
    .step-B3 .tuko-mascotte.is-celebrating {
      animation: stepB3-tuko-celebrate 600ms var(--ease-bounce) forwards;
    }

    .step-B3__flash {
      position: absolute;
      inset: 0;
      background: var(--paper);
      opacity: 0;
      pointer-events: none;
      z-index: 50;
    }
    .step-B3__flash.is-on {
      animation: stepB3-flash 350ms ease-out forwards;
    }

    @keyframes stepB3-argibi-pop {
      0%   { opacity: 0; transform: scale(0); }
      60%  { opacity: 1; transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes stepB3-argibi-rotate {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes stepB3-argibi-glow {
      0%, 100% { box-shadow: var(--shadow-accent-1); }
      50%      { box-shadow: 0 0 0 6px var(--accent-1), var(--shadow-accent-1); }
    }
    @keyframes stepB3-argibi-shrink {
      to { transform: scale(0.2); opacity: 0; }
    }
    @keyframes stepB3-titre-smash {
      0%   { opacity: 0; transform: scale(0); }
      60%  { opacity: 1; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes stepB3-fade-in {
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes stepB3-card-pop {
      0%   { opacity: 0; transform: scale(0)    rotate(var(--rot, 0deg)); }
      60%  { opacity: 1; transform: scale(1.08) rotate(var(--rot, 0deg)); }
      100% { opacity: 1; transform: scale(1)    rotate(var(--rot, 0deg)); }
    }
    @keyframes stepB3-card-bump {
      0%   { transform: scale(1)    rotate(var(--rot, 0deg)); }
      45%  { transform: scale(1.06) rotate(var(--rot, 0deg)); }
      100% { transform: scale(1)    rotate(var(--rot, 0deg)); }
    }
    @keyframes stepB3-card-leader {
      0%, 100% { transform: scale(1)    rotate(var(--rot, 0deg)); }
      50%      { transform: scale(1.04) rotate(var(--rot, 0deg)); }
    }
    @keyframes stepB3-card-podium {
      0%, 100% { transform: translateY(-15px) scale(1)    rotate(var(--rot, 0deg)); }
      50%      { transform: translateY(-15px) scale(1.04) rotate(var(--rot, 0deg)); }
    }
    @keyframes stepB3-card-victory {
      0%   { transform: scale(1)    rotate(var(--rot, 0deg)); }
      40%  { transform: scale(1.18) rotate(var(--rot, 0deg)); }
      100% { transform: scale(1)    rotate(var(--rot, 0deg)); }
    }
    @keyframes stepB3-counter-pulse {
      0%   { transform: scale(1); }
      45%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
    @keyframes stepB3-combo {
      0%   { opacity: 0; transform: scale(0.7) translateY(0); }
      50%  { opacity: 1; transform: scale(1.2) translateY(-8px); }
      100% { opacity: 0; transform: scale(1)   translateY(-16px); }
    }
    @keyframes stepB3-ripple {
      0%   { transform: translate(-50%, -50%) scale(0);  opacity: 0.6; }
      100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
    }
    @keyframes stepB3-tuko-celebrate {
      0%   { transform: translateY(0)    rotate(0deg)    scale(1); }
      40%  { transform: translateY(-18px) rotate(8deg)   scale(1.12); }
      100% { transform: translateY(0)    rotate(0deg)    scale(1); }
    }
    @keyframes stepB3-flash {
      0%   { opacity: 0; }
      40%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `;

  const style = document.createElement('style');
  style.id = 'step-B3-styles';
  style.textContent = css;
  document.head.appendChild(style);
  domNodes.push(style);
}

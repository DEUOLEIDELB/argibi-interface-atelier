// B2-assemblage-15-etapes.js - Moteur des 15 etapes d'assemblage.
// Source : doc interne.
//
// 3 panneaux egaux (passe / actuel / a venir) + barre 15 segments
// (.barre-progression partagee). L'animateur avance au rythme du retardataire.
// Transitions 500ms (fade + slide). Tooltip snapshot au hover sur etapes
// passees. Raccourcis : Espace / Droite (+1), Backspace / Gauche (-1),
// 1-9 saut direct, 0 = 10, Shift+1..Shift+5 = 11..15, R = replay panneau
// central. Tuko : 4 postures selon tranche d'etape via .tuko-mascotte
// partagee . Mini-animation d'attente apres 60s.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

let currentStepIdx = 1;
let viewedSteps = new Set([1]);
let waitTimer = null;

const STEPS = [
  { id: 1,  titre: 'ÉTAPE 1',  caption: 'Prends ta carte électronique.',                  image: 'assets/sprites/B2/step_1.svg' },
  { id: 2,  titre: 'ÉTAPE 2',  caption: 'Ouvre le sachet A, à placer en haut.',            image: 'assets/sprites/B2/step_2.svg' },
  { id: 3,  titre: 'ÉTAPE 3',  caption: 'Ouvre le sachet CT, à placer sous le capteur.',  image: 'assets/sprites/B2/step_2bis.svg' },
  { id: 4,  titre: 'ÉTAPE 4',  caption: 'Ouvre le sachet B, à placer en bas.',             image: 'assets/sprites/B2/step_3.svg' },
  { id: 5,  titre: 'ÉTAPE 5',  caption: 'Plaque inférieure.',                              image: 'assets/sprites/B2/step_4.svg' },
  { id: 6,  titre: 'ÉTAPE 6',  caption: 'Ouvre le sachet C et visse la plaque inférieure.', image: 'assets/sprites/B2/step_5.svg' },
  { id: 7,  titre: 'ÉTAPE 7',  caption: 'Installe la plaque supérieure.',                  image: 'assets/sprites/B2/step_7.svg' },
  { id: 8,  titre: 'ÉTAPE 8',  caption: 'Fais glisser les plaques de couleur.',            image: 'assets/sprites/B2/step_8.svg' },
  { id: 9,  titre: 'ÉTAPE 9',  caption: 'Installe la matrice dans le support jaune.',      image: 'assets/sprites/B2/step_9.svg' },
  { id: 10, titre: 'ÉTAPE 10', caption: 'Installe le diffuseur de la matrice.',            image: 'assets/sprites/B2/step_10.svg' },
  { id: 11, titre: 'ÉTAPE 11', caption: 'Branche le câble et le support rose.',            image: 'assets/sprites/B2/step_11.svg' },
  { id: 12, titre: 'ÉTAPE 12', caption: "TADA, c'est fini !",                              image: 'assets/sprites/B2/step_12.svg' },
];
const TOTAL = STEPS.length;

let barEl = null;
let segmentsEl = [];
let subLabelEl = null;
let panelsEl = { left: null, center: null, right: null };
let tukoEl = null;
let arrowLeftEl = null;
let arrowRightEl = null;
let ctaTermineEl = null;
let tooltipEl = null;

export default {
  id: 'B2',
  phase: 'B',
  title: 'Assemblage 15 etapes',
  estimatedDuration: 600,
  isCollective: false,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;

    scene = new Container();
    scene.label = 'step-B2-root';
    container.addChild(scene);

    injectStyles();

    const stage = document.querySelector('#stage');

    const wrap = document.createElement('div');
    wrap.className = 'step-B2';
    stage.appendChild(wrap);
    domNodes.push(wrap);

    buildBar(wrap);
    buildPanels(wrap);
    buildTuko(wrap);
    buildArrowsAndCTA(wrap);

    if (Number.isInteger(savedState?.currentStep)) {
      currentStepIdx = clamp(savedState.currentStep, 1, TOTAL);
    } else {
      currentStepIdx = 1;
    }
    viewedSteps = new Set(Array.isArray(savedState?.viewedSteps) ? savedState.viewedSteps : [currentStepIdx]);
    viewedSteps.add(currentStepIdx);

    render(true);
    persist();
    armWaitTimer();

    const onKeyCapture = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
      } else if (/^[1-9]$/.test(e.key) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        jumpTo(parseInt(e.key, 10));
      } else if (e.key === '0' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        jumpTo(10);
      } else if (e.shiftKey && /^[1-2]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        jumpTo(10 + parseInt(e.key, 10));
      } else if (e.key === 'r' || e.key === 'R') {
        replayCenterAnim();
      }
    };
    window.addEventListener('keydown', onKeyCapture, true);
    handlers.push([window, 'keydown', onKeyCapture, true]);
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => {
      target.removeEventListener(event, fn, !!capture);
    });
    handlers = [];

    timers.forEach(clearTimeout);
    timers = [];
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    navAPIRef = null;
    currentStepIdx = 1;
    viewedSteps = new Set([1]);
    segmentsEl = [];
    panelsEl = { left: null, center: null, right: null };
    tukoEl = null;
    arrowLeftEl = null;
    arrowRightEl = null;
    ctaTermineEl = null;
    barEl = null;
    subLabelEl = null;
    tooltipEl = null;
  },

  serialize() {
    return {
      currentStep: currentStepIdx,
      viewedSteps: [...viewedSteps].sort((a, b) => a - b),
    };
  },

  isComplete() {
    return currentStepIdx >= TOTAL && viewedSteps.size >= TOTAL;
  },

  replay() {
    this.exit();
  },
};

function buildBar(wrap) {
  const bar = document.createElement('div');
  bar.className = 'barre-progression step-B2__bar';

  segmentsEl = [];
  for (let i = 1; i <= TOTAL; i++) {
    const seg = document.createElement('div');
    seg.className = 'barre-progression__seg step-B2__seg';
    seg.dataset.step = String(i);
    bar.appendChild(seg);
    segmentsEl.push(seg);

    const onEnter = () => showTooltipFor(i, seg);
    const onLeave = () => hideTooltip();
    seg.addEventListener('mouseenter', onEnter);
    seg.addEventListener('mouseleave', onLeave);
    handlers.push([seg, 'mouseenter', onEnter]);
    handlers.push([seg, 'mouseleave', onLeave]);
  }

  const sub = document.createElement('p');
  sub.className = 'step-B2__sublabel';
  sub.textContent = `etape ${currentStepIdx} sur ${TOTAL}`;
  subLabelEl = sub;

  const barWrap = document.createElement('div');
  barWrap.className = 'step-B2__bar-wrap';
  barWrap.appendChild(bar);
  barWrap.appendChild(sub);
  wrap.appendChild(barWrap);
  barEl = bar;
}

let panelsWrapEl = null;

function buildPanels(wrap) {
  const panelsWrap = document.createElement('div');
  panelsWrap.className = 'step-B2__panels';

  panelsEl.left = makePanel('left');
  panelsEl.center = makePanel('center');
  panelsEl.right = makePanel('right');

  panelsWrap.appendChild(panelsEl.left);
  panelsWrap.appendChild(panelsEl.center);
  panelsWrap.appendChild(panelsEl.right);
  wrap.appendChild(panelsWrap);
  panelsWrapEl = panelsWrap;
}

function makePanel(role) {
  const panel = document.createElement('div');
  panel.className = `step-B2__panel step-B2__panel--${role}`;

  const titre = document.createElement('h3');
  titre.className = 'step-B2__panel-titre';
  panel.appendChild(titre);

  const image = document.createElement('div');
  image.className = 'step-B2__panel-image';
  // Vraie image SVG d'etape
  const stepImg = document.createElement('img');
  stepImg.className = 'step-B2__panel-img';
  stepImg.alt = '';
  image.appendChild(stepImg);
  panel.appendChild(image);

  // Tuko_assemblage en bas-gauche (visible uniquement sur le panel center).
  // Mirroir horizontal pour qu'il regarde a gauche (sprite pointe a droite).
  const tukoAss = document.createElement('img');
  tukoAss.className = 'step-B2__tuko-assemblage';
  tukoAss.src = 'assets/sprites/tuko_assemblage.png';
  tukoAss.alt = '';
  image.appendChild(tukoAss);

  const caption = document.createElement('p');
  caption.className = 'step-B2__panel-caption';
  panel.appendChild(caption);

  const badge = document.createElement('span');
  badge.className = 'step-B2__panel-badge';
  panel.appendChild(badge);

  return panel;
}

function buildTuko(wrap) {
  // Mascotte partagee . data-pose change dynamiquement
  // dans render() selon la tranche d'etape.
  const tuko = document.createElement('div');
  tuko.className = 'tuko-mascotte';
  tuko.dataset.pose = 'spectateur';
  tuko.dataset.position = 'bas-gauche';
  wrap.appendChild(tuko);
  tukoEl = tuko;
}

function buildArrowsAndCTA(wrap) {
  const ctrls = document.createElement('div');
  ctrls.className = 'step-B2__ctrls';

  const left = document.createElement('button');
  left.type = 'button';
  left.className = 'cta-secondary step-B2__arrow step-B2__arrow--left';
  left.textContent = '<';
  left.setAttribute('aria-label', 'etape precedente');
  ctrls.appendChild(left);
  arrowLeftEl = left;

  const right = document.createElement('button');
  right.type = 'button';
  right.className = 'cta-secondary step-B2__arrow step-B2__arrow--right';
  right.textContent = '>';
  right.setAttribute('aria-label', 'etape suivante');
  ctrls.appendChild(right);
  arrowRightEl = right;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'cta-primary step-B2__cta-termine';
  cta.textContent = 'argibi monte';
  ctrls.appendChild(cta);
  ctaTermineEl = cta;

  const onLeft = () => goPrev();
  const onRight = () => goNext();
  const onCta = () => {
    navAPIRef?.markComplete?.();
    navAPIRef?.next?.();
  };
  left.addEventListener('click', onLeft);
  right.addEventListener('click', onRight);
  cta.addEventListener('click', onCta);
  handlers.push([left, 'click', onLeft]);
  handlers.push([right, 'click', onRight]);
  handlers.push([cta, 'click', onCta]);

  wrap.appendChild(ctrls);
}

function goNext() {
  if (currentStepIdx >= TOTAL) {
    navAPIRef?.markComplete?.();
    navAPIRef?.next?.();
    return;
  }
  currentStepIdx += 1;
  viewedSteps.add(currentStepIdx);
  render(false);
  persist();
  armWaitTimer();
}

function goPrev() {
  if (currentStepIdx <= 1) return;
  currentStepIdx -= 1;
  render(false);
  persist();
  armWaitTimer();
}

function jumpTo(idx) {
  const target = clamp(idx, 1, TOTAL);
  if (target === currentStepIdx) return;
  currentStepIdx = target;
  viewedSteps.add(target);
  render(false);
  persist();
  armWaitTimer();
}

function render(skipTransition) {
  segmentsEl.forEach((seg, i) => {
    const stepNum = i + 1;
    seg.classList.toggle('is-done', stepNum < currentStepIdx);
    seg.classList.toggle('is-current', stepNum === currentStepIdx);
    seg.classList.toggle('is-warm', stepNum === currentStepIdx && currentStepIdx >= 10);
  });
  subLabelEl.textContent = `etape ${currentStepIdx} sur ${TOTAL}`;
  subLabelEl.classList.remove('is-fading');
  if (!skipTransition) {
    subLabelEl.classList.add('is-fading');
    const tSub = setTimeout(() => subLabelEl.classList.remove('is-fading'), 200);
    timers.push(tSub);
  }

  const prevStep = currentStepIdx > 1 ? STEPS[currentStepIdx - 2] : null;
  const curStep = STEPS[currentStepIdx - 1];
  const nextStep = currentStepIdx < TOTAL ? STEPS[currentStepIdx] : null;

  // Si pas d'etape precedente : masquer le panel gauche + passer en 2 colonnes
  panelsWrapEl?.classList.toggle('no-prev', !prevStep);

  fillPanel(panelsEl.left, prevStep, 'past');
  fillPanel(panelsEl.center, curStep, 'current');
  fillPanel(panelsEl.right, nextStep, 'future', { isFinal: currentStepIdx === TOTAL });

  if (skipTransition) {
    [panelsEl.left, panelsEl.center, panelsEl.right].forEach(p => p.classList.remove('is-entering'));
    triggerCenterPop();
  } else {
    [panelsEl.left, panelsEl.center, panelsEl.right].forEach(p => p.classList.add('is-entering'));
    const t = setTimeout(() => {
      [panelsEl.left, panelsEl.center, panelsEl.right].forEach(p => p.classList.remove('is-entering'));
      triggerCenterPop();
    }, 220);
    timers.push(t);
  }

  // Tuko : data-pose selon tranche d'etape (cf. fiche § Tuko reagit a l'etape).
  // is-waiting est nettoye a chaque transition.
  tukoEl.classList.remove('is-waiting');
  if (currentStepIdx <= 3) {
    tukoEl.dataset.pose = 'spectateur';
  } else if (currentStepIdx <= 7) {
    tukoEl.dataset.pose = 'pedagogique';
  } else if (currentStepIdx < TOTAL) {
    tukoEl.dataset.pose = 'presentateur';
  } else {
    tukoEl.dataset.pose = 'triomphe';
  }

  if (currentStepIdx >= TOTAL) {
    arrowRightEl.style.display = 'none';
    ctaTermineEl.classList.add('is-visible');
  } else {
    arrowRightEl.style.display = '';
    ctaTermineEl.classList.remove('is-visible');
  }
  arrowLeftEl.disabled = currentStepIdx <= 1;
}

function fillPanel(panel, step, role, opts = {}) {
  const titreEl = panel.querySelector('.step-B2__panel-titre');
  const imageEl = panel.querySelector('.step-B2__panel-image');
  const imgTag = panel.querySelector('.step-B2__panel-img');
  const captionEl = panel.querySelector('.step-B2__panel-caption');
  const badgeEl = panel.querySelector('.step-B2__panel-badge');

  panel.classList.remove('step-B2__panel--empty', 'step-B2__panel--final');
  badgeEl.textContent = '';

  if (!step) {
    panel.classList.add('step-B2__panel--empty');
    titreEl.textContent = role === 'past' ? '- DEBUT -' : '> TERMINE';
    if (imgTag) { imgTag.removeAttribute('src'); imgTag.style.display = 'none'; }
    captionEl.textContent = role === 'past' ? 'rien avant' : 'plus rien apres';
    if (opts.isFinal && role === 'future') {
      panel.classList.add('step-B2__panel--final');
      titreEl.textContent = '> TERMINE';
      captionEl.textContent = 'argibi monte';
      badgeEl.textContent = 'ok';
    }
    return;
  }

  titreEl.textContent = step.titre;
  if (imgTag) {
    imgTag.style.display = '';
    if (imgTag.getAttribute('src') !== step.image) imgTag.src = step.image;
  }
  captionEl.textContent = step.caption;
  if (role === 'past') badgeEl.textContent = 'ok';
  else if (role === 'future') badgeEl.textContent = '>';
  else badgeEl.textContent = '';
}

function triggerCenterPop() {
  const center = panelsEl.center;
  if (!center) return;
  center.classList.remove('is-popping');
  void center.offsetWidth;
  center.classList.add('is-popping');
}

function replayCenterAnim() {
  triggerCenterPop();
}

function showTooltipFor(stepNum, anchor) {
  if (stepNum >= currentStepIdx) return;
  const step = STEPS[stepNum - 1];
  if (!step) return;

  hideTooltip();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'step-B2__tooltip';
  const t = document.createElement('div');
  t.className = 'step-B2__tooltip-titre';
  t.textContent = step.titre;
  const c = document.createElement('div');
  c.className = 'step-B2__tooltip-caption';
  c.textContent = step.caption;
  tooltipEl.appendChild(t);
  tooltipEl.appendChild(c);

  const rect = anchor.getBoundingClientRect();
  const stage = document.querySelector('#stage').getBoundingClientRect();
  tooltipEl.style.left = `${rect.left + rect.width / 2 - stage.left}px`;
  tooltipEl.style.top = `${rect.bottom + 8 - stage.top}px`;

  document.querySelector('#stage').appendChild(tooltipEl);
  domNodes.push(tooltipEl);
  requestAnimationFrame(() => tooltipEl?.classList.add('is-visible'));
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('is-visible');
  const el = tooltipEl;
  tooltipEl = null;
  const t = setTimeout(() => el.remove(), 150);
  timers.push(t);
}

function armWaitTimer() {
  if (waitTimer) clearTimeout(waitTimer);
  waitTimer = setTimeout(() => {
    tukoEl?.classList.add('is-waiting');
  }, 60_000);
  timers.push(waitTimer);
}

function persist() {
  saveStepState('B2', {
    currentStep: currentStepIdx,
    viewedSteps: [...viewedSteps].sort((a, b) => a - b),
  });
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function injectStyles() {
  if (document.querySelector('#step-B2-styles')) return;
  const css = `
    .step-B2 {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: var(--s-3);
      padding: var(--s-3) var(--s-4) var(--s-8) var(--s-4);
    }

    .step-B2__bar-wrap {
      display: grid;
      gap: var(--s-2);
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
    }

    .step-B2__bar {
      gap: 4px;
    }

    .step-B2__seg {
      cursor: var(--cursor-pointer);
    }
    .step-B2__seg.is-current.is-warm::after {
      background: var(--accent-3);
      box-shadow: 0 0 12px var(--accent-3);
    }

    .step-B2__sublabel {
      font-family: var(--mono);
      font-size: var(--t-small);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.7;
      margin: 0;
      transition: opacity var(--d-fast) var(--ease-out);
    }
    .step-B2__sublabel.is-fading {
      opacity: 0;
    }

    .step-B2__panels {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--s-4);
      align-items: stretch;
      width: 100%;
      margin: 0 auto;
      min-height: 0;
    }

    /* Pas d'etape precedente : on retire le panel gauche et on bascule
       sur 2 colonnes BEAUCOUP plus larges (current + future, ~x2). */
    .step-B2__panels.no-prev {
      grid-template-columns: 1fr 1fr;
      max-width: 1800px;
    }
    .step-B2__panels.no-prev .step-B2__panel--left {
      display: none;
    }
    .step-B2__panels.no-prev .step-B2__panel-image {
      min-height: 480px;
    }

    .step-B2__panel {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: var(--s-2);
      background: var(--paper);
      border: var(--border);
      box-shadow: var(--shadow);
      border-radius: var(--r-md);
      padding: var(--s-3);
      position: relative;
      transition: opacity var(--d-fast) var(--ease-out),
                  transform var(--d-fast) var(--ease-out),
                  box-shadow var(--d-fast) var(--ease-out);
    }

    .step-B2__panel--left,
    .step-B2__panel--right {
      opacity: 0.6;
      transform: scale(0.95);
    }
    .step-B2__panel--left:hover,
    .step-B2__panel--right:hover {
      opacity: 0.85;
      transform: scale(0.97);
    }

    .step-B2__panel--center {
      box-shadow: var(--shadow-accent-1);
      animation: stepB2-center-glow 2.4s ease-in-out infinite;
    }

    .step-B2__panel.is-entering {
      opacity: 0;
      transform: translateX(-30px);
    }
    .step-B2__panel--center.is-popping {
      animation: stepB2-center-glow 2.4s ease-in-out infinite,
                 stepB2-center-pop var(--d-normal) var(--ease-bounce);
    }

    .step-B2__panel--empty .step-B2__panel-image {
      visibility: hidden;
    }
    .step-B2__panel--final .step-B2__panel-titre {
      color: var(--accent-1);
    }

    .step-B2__panel-titre {
      font-family: var(--display);
      font-size: var(--t-h2);
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
      text-align: center;
    }

    .step-B2__panel-image {
      min-height: 320px;
      width: 100%;
      position: relative;
      background: #F5EBD6;            /* fond creme derriere l'image */
      border: var(--border-thin);
      border-radius: var(--r-md);
      overflow: hidden;
      display: grid;
      place-items: center;
    }
    .step-B2__panel-img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    /* Tuko_assemblage : visible uniquement dans le panel courant (center),
       en bas-gauche du placeholder image, mirroré horizontal. */
    .step-B2__tuko-assemblage {
      display: none;
      position: absolute;
      bottom: var(--s-2);
      left: var(--s-2);
      width: clamp(140px, 18%, 240px);
      height: auto;
      transform: scaleX(-1);
      pointer-events: none;
      z-index: 2;
    }

    .step-B2__panel--center .step-B2__tuko-assemblage {
      display: block;
    }

    .step-B2__panel-caption {
      font-family: var(--display);
      font-size: var(--t-body-xl);
      font-weight: 600;
      margin: 0;
      text-align: center;
    }

    .step-B2__panel-badge {
      position: absolute;
      top: var(--s-2);
      right: var(--s-2);
      font-family: var(--mono);
      font-size: var(--t-small);
      letter-spacing: 0.1em;
      color: var(--accent-1);
    }

    .step-B2 .tuko-mascotte.is-waiting {
      animation: stepB2-tuko-waiting 2s ease-in-out infinite;
    }

    .step-B2__ctrls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--s-3);
    }
    .step-B2__arrow {
      font-size: var(--t-h2);
      padding: var(--s-2) var(--s-4);
    }
    .step-B2__arrow:disabled {
      opacity: 0.4;
      cursor: var(--cursor-not-allowed);
    }
    .step-B2__cta-termine {
      display: none;
    }
    .step-B2__cta-termine.is-visible {
      display: inline-block;
      animation: stepB2-cta-pop var(--d-normal) var(--ease-bounce);
    }

    .step-B2__tooltip {
      position: absolute;
      transform: translateX(-50%) translateY(4px);
      background: var(--paper);
      color: var(--ink);
      border: var(--border);
      box-shadow: var(--shadow);
      border-radius: var(--r-md);
      padding: var(--s-2) var(--s-3);
      min-width: 220px;
      max-width: 320px;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--d-fast) var(--ease-out),
                  transform var(--d-fast) var(--ease-out);
      z-index: 30;
    }
    .step-B2__tooltip.is-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .step-B2__tooltip-titre {
      font-family: var(--display);
      font-size: var(--t-body-xl);
      font-weight: 900;
      text-transform: uppercase;
    }
    .step-B2__tooltip-caption {
      font-family: var(--body);
      font-size: var(--t-body);
      opacity: 0.8;
    }

    @keyframes stepB2-center-glow {
      0%, 100% { box-shadow: var(--shadow-accent-1); }
      50%      { box-shadow: 0 0 0 4px var(--accent-1), var(--shadow-accent-1); }
    }
    @keyframes stepB2-center-pop {
      0%   { transform: scale(0.96); }
      55%  { transform: scale(1.04); }
      100% { transform: scale(1); }
    }
    @keyframes stepB2-cta-pop {
      0%   { opacity: 0; transform: translateY(8px) scale(0.95); }
      60%  { opacity: 1; transform: translateY(0)   scale(1.05); }
      100% { opacity: 1; transform: translateY(0)   scale(1); }
    }
    @keyframes stepB2-tuko-waiting {
      0%, 100% { transform: translateX(0); }
      25%      { transform: translateX(-2px); }
      75%      { transform: translateX(2px); }
    }
  `;

  const style = document.createElement('style');
  style.id = 'step-B2-styles';
  style.textContent = css;
  document.head.appendChild(style);
  domNodes.push(style);
}

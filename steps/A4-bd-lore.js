// A4-bd-lore.js — BD animee, 4 slides. Slides 1-3 = 2 panneaux paired,
// slide 4 = panneau solo + CTA ON SAUVE TUKO. Barre progression 4 segments.
// Caption stylisee en bas. Cap min 1.5s avant skip.
// Cf. doc interne.
//

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';

const STYLE_ID = 'step-A4-style';

const SLIDES = [
  {
    n: 1,
    panneaux: [
      { titre: 'panneau 1', desc: 'éclair traverse le ciel vers le sol' },
      { titre: 'panneau 2', desc: 'QG du Club BRIKZ, lumière étrange à l\'horizon' },
    ],
    mag: 'mag. p. 4-5',
  },
  {
    n: 2,
    panneaux: [
      { titre: 'panneau 3', desc: '4 BRIKZ : Zola, Ryu, Kaïs, Billie' },
      { titre: 'panneau 4', desc: 'Tuko émerge de la fumée, vivant' },
    ],
    mag: 'mag. p. 6-7',
  },
  {
    n: 3,
    panneaux: [
      { titre: 'panneau 5', desc: 'BRIKZ entourent Tuko, curieux' },
      { titre: 'panneau 6', desc: 'PROFESSEUR KURNEL apparaît en glitch' },
    ],
    mag: 'mag. p. 8 haut',
  },
  {
    n: 4,
    solo: { titre: 'panneau 7', desc: 'verrouillage : 6 cadenas qui claquent, Tuko captif rétrécit' },
    mag: 'mag. p. 8 bas',
  },
];

const MIN_SLIDE_MS = 1500;

const STYLES = `
.step-A4 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

.step-A4__progress-wrap {
  display: grid;
  justify-items: center;
  gap: var(--s-1);
}

.step-A4__progress {
  width: min(540px, 60vw);
}

.step-A4__progress-label {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.32em;
  text-transform: lowercase;
  opacity: 0.55;
}

.step-A4__panneaux {
  display: grid;
  gap: var(--s-3);
  align-content: center;
  justify-content: stretch;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  min-height: 0;
}

.step-A4__panneaux--paired {
  grid-template-rows: 1fr 1fr;
}

.step-A4__panneaux--solo {
  grid-template-rows: 1fr;
}

.step-A4__panneau {
  background: var(--bg-2);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  padding: var(--s-3) var(--s-4);
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 0;
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  color: var(--ink);
  opacity: 0;
  transform: translateY(40px);
}

.step-A4__panneau.is-in {
  animation: a4-panneau-in 600ms var(--ease-bounce) forwards;
}

@keyframes a4-panneau-in {
  0%   { opacity: 0; transform: translateY(40px) scale(0.95); }
  60%  { opacity: 1; transform: translateY(-6px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0)   scale(1); }
}

.step-A4__panneau-titre {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: var(--accent-1);
  margin-bottom: var(--s-2);
}

.step-A4__panneau-desc {
  opacity: 0.75;
  text-transform: lowercase;
  letter-spacing: 0.08em;
  font-family: var(--mono);
}

.step-A4__nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  width: 100%;
}

.step-A4__nav-btn {
  background: transparent;
  border: var(--border);
  color: var(--ink);
  font-family: var(--display);
  font-size: 32px;
  font-weight: 900;
  width: 56px;
  height: 56px;
  border-radius: var(--r-md);
  cursor: var(--cursor-pointer);
  display: grid;
  place-items: center;
}

.step-A4__nav-btn[disabled] {
  opacity: 0.3;
  cursor: var(--cursor-not-allowed);
}

.step-A4__cta-wrap {
  display: grid;
  justify-content: center;
}

.step-A4__cta {
  opacity: 0;
}

.step-A4__cta.is-in {
  animation: a4-cta-pop 500ms var(--ease-bounce) forwards;
}

@keyframes a4-cta-pop {
  0%   { opacity: 0; transform: scale(0.5); }
  60%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

.step-A4__mag {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  opacity: 0.4;
  letter-spacing: 0.18em;
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

let currentSlide = 1;
let viewedSlides = [];
let slideEnteredAt = 0;
let advancing = false;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function removeStyle() {
  const n = document.getElementById(STYLE_ID);
  if (n) n.remove();
}

function persist() {
  saveStepState('A4', { currentSlide, viewedSlides: [...viewedSlides] });
}

export default {
  id: 'A4',
  phase: 'A',
  title: 'BD lore',
  estimatedDuration: 90,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const restored = savedState || getStepState('A4') || {};
    currentSlide = Math.max(1, Math.min(4, restored.currentSlide || 1));
    viewedSlides = Array.isArray(restored.viewedSlides) ? [...restored.viewedSlides] : [];

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A4';

    // ----- Barre de progression --------------------------------------------
    const progressWrap = document.createElement('div');
    progressWrap.className = 'step-A4__progress-wrap';

    const progress = document.createElement('div');
    progress.className = 'barre-progression step-A4__progress';
    const segs = [];
    for (let i = 0; i < 4; i++) {
      const seg = document.createElement('div');
      seg.className = 'barre-progression__seg';
      progress.appendChild(seg);
      segs.push(seg);
    }
    progressWrap.appendChild(progress);

    const progressLabel = document.createElement('div');
    progressLabel.className = 'step-A4__progress-label';
    progressWrap.appendChild(progressLabel);

    wrap.appendChild(progressWrap);

    // ----- Zone panneaux ---------------------------------------------------
    const panneaux = document.createElement('div');
    panneaux.className = 'step-A4__panneaux';
    wrap.appendChild(panneaux);

    // ----- Nav (fleches + cta) ---------------------------------------------
    const nav = document.createElement('div');
    nav.className = 'step-A4__nav';

    const back = document.createElement('button');
    back.className = 'step-A4__nav-btn';
    back.type = 'button';
    back.textContent = '<';
    nav.appendChild(back);

    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'step-A4__cta-wrap';
    const cta = document.createElement('button');
    cta.className = 'cta-primary step-A4__cta';
    cta.type = 'button';
    cta.textContent = "▶ DÉBUT DE L'AVENTURE";
    cta.style.display = 'none';
    ctaWrap.appendChild(cta);
    nav.appendChild(ctaWrap);

    const fwd = document.createElement('button');
    fwd.className = 'step-A4__nav-btn';
    fwd.type = 'button';
    fwd.textContent = '>';
    nav.appendChild(fwd);

    wrap.appendChild(nav);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Render -----------------------------------------------------------
    function renderSlide() {
      const s = SLIDES[currentSlide - 1];
      slideEnteredAt = performance.now();

      // Progress
      segs.forEach((seg, i) => {
        seg.classList.remove('is-current', 'is-done');
        if (i + 1 < currentSlide) seg.classList.add('is-done');
        else if (i + 1 === currentSlide) seg.classList.add('is-current');
      });
      progressLabel.textContent = `slide ${currentSlide} sur 4 . ${s.mag}`;

      // Panneaux
      panneaux.replaceChildren();
      panneaux.classList.toggle('step-A4__panneaux--paired', currentSlide < 4);
      panneaux.classList.toggle('step-A4__panneaux--solo', currentSlide === 4);

      const items = currentSlide === 4 ? [s.solo] : s.panneaux;
      items.forEach((p, idx) => {
        const panneau = document.createElement('div');
        panneau.className = 'step-A4__panneau';
        if (currentSlide === 4) panneau.classList.add('step-A4__panneau--solo');

        const t = document.createElement('div');
        t.className = 'step-A4__panneau-titre';
        t.textContent = `[ ${p.titre} ]`;
        panneau.appendChild(t);

        const d = document.createElement('div');
        d.className = 'step-A4__panneau-desc';
        d.textContent = p.desc;
        panneau.appendChild(d);

        panneaux.appendChild(panneau);

        const tIn = setTimeout(() => panneau.classList.add('is-in'), 100 + idx * 600);
        timers.push(tIn);
      });

      // CTA slide 4
      if (currentSlide === 4) {
        cta.style.display = '';
        fwd.style.visibility = 'hidden';
        const tCta = setTimeout(() => cta.classList.add('is-in'), 2100);
        timers.push(tCta);
      } else {
        cta.style.display = 'none';
        cta.classList.remove('is-in');
        fwd.style.visibility = 'visible';
      }

      back.disabled = currentSlide <= 1;
      fwd.disabled = currentSlide >= 4;

      if (!viewedSlides.includes(currentSlide)) {
        viewedSlides.push(currentSlide);
      }
      persist();
    }

    function gotoSlide(n) {
      if (advancing) return;
      const target = Math.max(1, Math.min(4, n));
      if (target === currentSlide) return;
      // clear pending anim timers
      timers.forEach(clearTimeout);
      timers = [];
      currentSlide = target;
      renderSlide();
    }

    function tryNext() {
      if (currentSlide >= 4) return;
      const elapsed = performance.now() - slideEnteredAt;
      if (elapsed < MIN_SLIDE_MS) return;
      gotoSlide(currentSlide + 1);
    }

    function tryBack() {
      if (currentSlide <= 1) return;
      gotoSlide(currentSlide - 1);
    }

    renderSlide();

    const onBack = () => tryBack();
    const onFwd = () => tryNext();
    back.addEventListener('click', onBack);
    fwd.addEventListener('click', onFwd);
    handlers.push([back, 'click', onBack]);
    handlers.push([fwd, 'click', onFwd]);

    const onCta = () => {
      if (advancing) return;
      advancing = true;
      saveStepState('A4', { currentSlide: 4, viewedSlides: [...viewedSlides] });
      if (navAPIRef) navAPIRef.markComplete();
      if (navAPIRef) navAPIRef.next();
    };
    cta.addEventListener('click', onCta);
    handlers.push([cta, 'click', onCta]);

    // Intercepte ←/→/Espace en CAPTURE phase pour rerouter vers la nav
    // intra-page (slides) au lieu de laisser nav.js passer a la page suivante.
    // Sur slide 4, on laisse uniquement la CTA passer a A5.
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        if (currentSlide < 4) {
          e.preventDefault();
          e.stopImmediatePropagation();
          tryNext();
        }
        // Sur slide 4 on laisse passer : nav.js -> next() -> A5 OK,
        // mais la CTA reste le chemin canonique.
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (currentSlide > 1) {
          e.preventDefault();
          e.stopImmediatePropagation();
          tryBack();
        }
        return;
      }
      const n = parseInt(e.key, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 4) {
        e.preventDefault();
        gotoSlide(n);
      }
    };
    // capture: true pour passer AVANT le handler global de nav.js
    window.addEventListener('keydown', onKey, true);
    handlers.push([window, 'keydown', onKey, true]);

    void savedState;
  },

  exit() {
    handlers.forEach(([t, e, f, capture]) => t.removeEventListener(e, f, !!capture));
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
    removeStyle();
    navAPIRef = null;
    advancing = false;
  },

  serialize() {
    return { currentSlide, viewedSlides: [...viewedSlides] };
  },

  isComplete() {
    return viewedSlides.includes(4);
  },

  replay() {
    return true;
  },
};

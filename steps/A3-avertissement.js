// A3-avertissement.js — Page de regles de securite avant manipulation.
// Tuko_warning absolute top-left. Banderole jaune/noir rayee en haut avec
// "⚠ ATTENTION" hero, sous-titre en dessous. 2 cards cote a cote avec
// illustrations (carte electronique / batterie externe) + titre + bullets.
// CTA "C'EST COMPRIS" en bas. Espace = equivalent du clic CTA.
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState } from '../core/state.js';

const STYLE_ID = 'step-A3-style';

// colorIdx : 1=violet(paper), 2=cyan(ink), 3=jaune(ink), 4=rose(paper)
// Couleurs differentes par regle pour variation visuelle, palette Wubo.
const REGLES = [
  {
    titre: 'électronique',
    img: 'assets/sprites/A3/illu_carte_electronique.png',
    rules: [
      { text: 'ne force pas les connecteurs',           color: 1 },
      { text: 'ne regarde pas les LEDs de trop près',   color: 3 },
      { text: 'dans le doute, lève la main',            color: 2 },
    ],
  },
  {
    titre: 'batterie externe',
    img: 'assets/sprites/A3/illu_batterie_externe.webp',
    rules: [
      { text: "ne la perce pas, ne l'écrase pas, ne la mouille pas", color: 4 },
      { text: "branchement avec l'animateur uniquement",             color: 3 },
      { text: 'capsule allumée : pas dans un sac fermé',             color: 1 },
    ],
  },
];

const RULE_COLORS = {
  1: { bg: 'var(--accent-1)', text: 'var(--paper)' },
  2: { bg: 'var(--accent-2)', text: 'var(--ink)'   },
  3: { bg: 'var(--accent-3)', text: 'var(--ink)'   },
  4: { bg: 'var(--accent-4)', text: 'var(--paper)' },
};

const STYLES = `
.step-A3 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  padding: var(--s-8) var(--s-5); /* aligne sur A1 : 128px top/bottom */
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

/* ----- Tuko_warning : absolute top-left ----------------------------------- */

.step-A3__tuko {
  position: absolute !important;
  bottom: 0 !important;
  left: var(--s-4) !important;
  top: auto !important;
  right: auto !important;
  --tuko-mascotte-size: clamp(140px, 13vw, 390px);
  background: url('assets/sprites/tuko_warning.png') center / contain no-repeat !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  animation: a3-tuko-bobbing 2.4s ease-in-out infinite !important;
  z-index: 3;
  pointer-events: none;
}

.step-A3__tuko::before,
.step-A3__tuko::after {
  content: none !important;
  display: none !important;
}

@keyframes a3-tuko-bobbing {
  0%, 100% { transform: translateY(0)    rotate(-1.5deg); }
  50%      { transform: translateY(-4px) rotate(1.5deg); }
}

/* ----- Banderole jaune/noir + Hero "ATTENTION" ---------------------------- */

.step-A3__banner {
  position: relative;
  width: 100%;
  background-image: repeating-linear-gradient(
    45deg,
    var(--accent-3) 0 28px,
    var(--ink)      28px 56px
  );
  background-size: 80px 80px;
  border-top: var(--border);
  border-bottom: var(--border);
  padding: var(--s-3) var(--s-5);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: a3-banner-slide 1.6s linear infinite;
}

@keyframes a3-banner-slide {
  0%   { background-position: 0 0; }
  100% { background-position: 80px 0; }
}

.step-A3__hero {
  font-family: var(--display);
  font-size: clamp(56px, 5.6vw, 96px);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--paper);
  -webkit-text-stroke: 3px var(--ink);
  text-shadow:
    -3px -3px 0 var(--ink),
     3px -3px 0 var(--ink),
    -3px  3px 0 var(--ink),
     3px  3px 0 var(--ink),
     0   -3px 0 var(--ink),
     0    3px 0 var(--ink),
    -3px  0   0 var(--ink),
     3px  0   0 var(--ink);
  padding: var(--s-1) var(--s-4);
  margin: 0;
  text-align: center;
  opacity: 0;
}

.step-A3__hero.is-in {
  animation: a3-hero-pop 600ms var(--ease-bounce) forwards,
             a3-hero-pulse 2.4s ease-in-out 800ms infinite;
}

@keyframes a3-hero-pop {
  0%   { opacity: 0; transform: scale(0.5)  rotate(-2deg); }
  60%  { opacity: 1; transform: scale(1.1)  rotate(1deg); }
  100% { opacity: 1; transform: scale(1)    rotate(0); }
}

@keyframes a3-hero-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.03); }
}

/* ----- Sous-titre --------------------------------------------------------- */

.step-A3__sub {
  font-family: var(--body);
  font-size: clamp(36px, 1.4vw, 22px);
  font-weight: 600;
  text-align: center;
  margin: 0;
  color: var(--ink);
  justify-self: center;
  opacity: 0.85;
}

.step-A3__sub.is-in {
  opacity: 0;
  animation: a3-fade-in 400ms var(--ease-out) 400ms forwards;
}

.step-A3__sub.is-in {
  animation: a3-fade-in 400ms var(--ease-out) 400ms forwards;
}

@keyframes a3-fade-in {
  to { opacity: 1; }
}

/* ----- Cards 2x1 ---------------------------------------------------------- */

.step-A3__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  align-content: center; /* centre les 2 cards verticalement DANS leur container */
  width: min(1500px, 100%);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
}

.step-A3__card {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  display: grid;
  grid-template-rows: auto auto auto;
  gap: var(--s-3);
  place-items: center;
  align-content: center;
  opacity: 0;
  min-height: 0;
}

.step-A3__card--left.is-in {
  animation: a3-slide-left 600ms var(--ease-bounce) 700ms forwards;
}

.step-A3__card--right.is-in {
  animation: a3-slide-right 600ms var(--ease-bounce) 700ms forwards;
}

@keyframes a3-slide-left {
  0%   { opacity: 0; transform: translateX(-200px) scale(0.9); }
  100% { opacity: 1; transform: translateX(0)      scale(1); }
}

@keyframes a3-slide-right {
  0%   { opacity: 0; transform: translateX(200px) scale(0.9); }
  100% { opacity: 1; transform: translateX(0)     scale(1); }
}

.step-A3__card-img {
  height: clamp(120px, 16vh, 200px);
  width: auto;
  max-width: 70%;
  object-fit: contain;
  background: var(--paper);
  pointer-events: none;
  display: block;
}

.step-A3__card-titre {
  font-family: var(--display);
  font-size: clamp(28px, 2.6vw, 40px);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--ink);
}

/* Liste de regles : mini-cards colorees avec shadow, texte aligne gauche */
.step-A3__rules {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  width: 100%;
  max-width: 520px;
}

.step-A3__rule {
  background: var(--rule-bg, var(--paper));
  color: var(--rule-text, var(--ink));
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: 12px var(--s-3);
  font-family: var(--body);
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  text-wrap: balance;
  opacity: 0;
}

.step-A3__rule.is-in {
  animation: a3-rule-pop 350ms var(--ease-bounce) forwards;
}

@keyframes a3-rule-pop {
  0%   { opacity: 0; transform: translateX(-16px) scale(0.95); }
  60%  { opacity: 1; transform: translateX(0)     scale(1.03); }
  100% { opacity: 1; transform: translateX(0)     scale(1); }
}

/* ----- CTA bottom (memes proprietes que step-A1__cta-area) ---------------- */

.step-A3__cta-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3);
}

.step-A3__cta {
  animation: none !important;
  opacity: 0;
  font-size: clamp(28px, 2.4vw, 40px);
  padding: 12px var(--s-5);
}

.step-A3__cta.is-in {
  animation: a3-fade-in 400ms var(--ease-out) forwards !important;
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

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

export default {
  id: 'A3',
  phase: 'A',
  title: 'Avertissement',
  estimatedDuration: 60,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A3';

    // ----- Tuko_warning : absolute bottom-left, juste au-dessus du footer
    // (pas de data-position pour ne pas heriter du position:relative du shared)
    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte step-A3__tuko';
    tuko.setAttribute('data-pose', 'pedagogique');
    wrap.appendChild(tuko);

    // ----- Banderole jaune/noir + Hero "ATTENTION" ------------------------
    const banner = document.createElement('div');
    banner.className = 'step-A3__banner';

    const hero = document.createElement('h1');
    hero.className = 'step-A3__hero';
    hero.textContent = 'ATTENTION';
    banner.appendChild(hero);

    wrap.appendChild(banner);

    // ----- Sous-titre -----------------------------------------------------
    const sub = document.createElement('p');
    sub.className = 'step-A3__sub';
    sub.textContent = 'Avant de commencer, quelques règles de sécurité !';
    wrap.appendChild(sub);

    // ----- Cards 2x1 ------------------------------------------------------
    const cards = document.createElement('div');
    cards.className = 'step-A3__cards';

    REGLES.forEach((regle, idx) => {
      const card = document.createElement('div');
      card.className = `step-A3__card step-A3__card--${idx === 0 ? 'left' : 'right'}`;

      const img = document.createElement('img');
      img.className = 'step-A3__card-img';
      img.src = regle.img;
      img.alt = regle.titre;
      img.loading = 'lazy';
      card.appendChild(img);

      const titre = document.createElement('h2');
      titre.className = 'step-A3__card-titre';
      titre.textContent = regle.titre;
      card.appendChild(titre);

      const ul = document.createElement('ul');
      ul.className = 'step-A3__rules';
      regle.rules.forEach((rule) => {
        const li = document.createElement('li');
        li.className = 'step-A3__rule';
        const palette = RULE_COLORS[rule.color] || RULE_COLORS[1];
        li.style.setProperty('--rule-bg', palette.bg);
        li.style.setProperty('--rule-text', palette.text);
        li.textContent = rule.text;
        ul.appendChild(li);
      });
      card.appendChild(ul);

      cards.appendChild(card);
    });

    wrap.appendChild(cards);

    // ----- CTA bottom (calque sur step-A1__cta-area pour memes proprietes)
    const ctaArea = document.createElement('div');
    ctaArea.className = 'step-A3__cta-area';
    const cta = document.createElement('button');
    cta.className = 'cta-primary step-A3__cta';
    cta.type = 'button';
    cta.textContent = "C'EST COMPRIS";
    cta.disabled = true;
    ctaArea.appendChild(cta);
    wrap.appendChild(ctaArea);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Sequence d'apparition -------------------------------------------
    requestAnimationFrame(() => {
      hero.classList.add('is-in');
      sub.classList.add('is-in');
      cards.querySelectorAll('.step-A3__card').forEach(c => c.classList.add('is-in'));

      cards.querySelectorAll('.step-A3__card').forEach((card, ci) => {
        const rules = card.querySelectorAll('.step-A3__rule');
        rules.forEach((r, ri) => {
          const t = setTimeout(() => r.classList.add('is-in'), 1300 + ci * 80 + ri * 120);
          timers.push(t);
        });
      });

      const tCta = setTimeout(() => {
        cta.classList.add('is-in');
        cta.disabled = false;
      }, 1900);
      timers.push(tCta);
    });

    // ----- CTA + raccourci Espace ------------------------------------------
    const acknowledge = () => {
      if (cta.disabled) return;
      saveStepState('A3', { acknowledged: true });
      if (navAPIRef) navAPIRef.markComplete();
      if (navAPIRef) navAPIRef.next();
    };
    cta.addEventListener('click', acknowledge);
    handlers.push([cta, 'click', acknowledge]);

    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        acknowledge();
      }
    };
    window.addEventListener('keydown', onKey);
    handlers.push([window, 'keydown', onKey]);

    void savedState;
  },

  exit() {
    handlers.forEach(([t, e, f]) => t.removeEventListener(e, f));
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
  },

  serialize() {
    return { acknowledged: true };
  },

  isComplete() {
    return true;
  },

  replay() {
    return true;
  },
};

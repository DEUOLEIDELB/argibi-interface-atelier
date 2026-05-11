// A5-feuille-de-route.js — Feuille de route en 2 temps.
// Temps 1 : titre + chemin 5 waypoints (4x ? + Tuko captif final) + CTA prets ?
// Temps 2 : loot drop boite + pluie de prenoms + CTA on l'ouvre.
// Lit state.steps.A1.students en defensif (fallback sur pool standalone).
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';
import { startPluieDePrenoms, spawnConfettis, spawnShockwave } from '../core/effects.js';

const STYLE_ID = 'step-A5-style';

// 5 waypoints du chemin : 4 icones emojis + 1 image (Tuko liberable, final).
// La cohesion vient du cadre : meme cercle paper, meme animation. Le contenu
// varie : 4 glyphs + 1 image. Le design pourra remplacer les emojis par
// des SVG/sprites stylises plus tard.
const WAYPOINTS = [
  { kind: 'glyph', label: 'identification', glyph: '🔍' },
  { kind: 'glyph', label: 'assemblage',     glyph: '🏗️' },
  { kind: 'glyph', label: 'tester',         glyph: '⚡' },
  { kind: 'glyph', label: 'résoudre',       glyph: '?' },
  { kind: 'image', label: 'libérer Tuko',   src: 'assets/sprites/tuko_liberable.png' },
];

const STYLES = `
.step-A5 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  padding: var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

.step-A5__t1 {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--s-5);
  align-items: center;
  justify-items: center;
}

.step-A5__titre {
  font-family: var(--display);
  font-size: 100px;
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
  opacity: 0;
}

.step-A5__titre.is-in {
  animation: a5-smash 600ms var(--ease-bounce) forwards;
}

@keyframes a5-smash {
  0%   { opacity: 0; transform: scale(0.4); }
  60%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

.step-A5__chemin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  width: min(1500px, 95vw);
  padding: var(--s-5) 0 var(--s-6) 0; /* respiration pour numero et label hors-cercle */
}

.step-A5__waypoint {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(180px, 16vw, 240px);
  height: clamp(180px, 16vw, 240px);
  border-radius: 50%;
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  font-size: clamp(80px, 8vw, 120px);
  line-height: 1;
  color: var(--ink);
  opacity: 0;
  transform: scale(0);
}

.step-A5__waypoint.is-in {
  animation: a5-wp-pop 350ms var(--ease-bounce) forwards;
}

@keyframes a5-wp-pop {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.step-A5__waypoint--glyph-resolve {
  font-family: var(--display);
  font-weight: 900;
  color: var(--accent-1);
}

.step-A5__waypoint__num {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--display);
  font-size: clamp(28px, 2.4vw, 40px);
  font-weight: 900;
  letter-spacing: 0.04em;
  background: var(--ink);
  color: var(--paper);
  padding: 6px 18px;
  border-radius: var(--r-pill);
  border: var(--border);
  line-height: 1;
}

.step-A5__waypoint__label {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--display);
  font-size: clamp(22px, 1.8vw, 30px);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  color: var(--ink);
  white-space: nowrap;
}

.step-A5__waypoint--final {
  background: var(--accent-4);
  border-color: var(--ink);
  padding: 18px; /* respiration autour de Tuko, evite que les oreilles touchent le bord */
  /* PAS d'overflow: hidden : sinon le numero (top: -22px) et le label (top: 100%+16px) seraient clippes */
}

.step-A5__waypoint--final img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.step-A5__waypoint--final.is-in {
  animation: a5-wp-pop 450ms var(--ease-bounce) forwards,
             a5-wp-pulse 1.6s ease-in-out 600ms infinite;
}

@keyframes a5-wp-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); box-shadow: var(--shadow-lg); }
}

.step-A5__lien {
  flex: 1 1 40px;
  min-width: 40px;
  height: 12px;
  background: var(--ink);
  border-radius: var(--r-pill);
  opacity: 0;
  transform-origin: left center;
  transform: scaleX(0);
}

.step-A5__lien.is-in {
  animation: a5-lien 400ms var(--ease-out) forwards;
}

@keyframes a5-lien {
  to { opacity: 1; transform: scaleX(1); }
}

.step-A5__bottom {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}

/* Temps 2 -- loot drop ----------------------------------------------------- */

.step-A5__t2 {
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto auto;
  align-items: center;
  justify-items: center;
  gap: var(--s-3);
}

.step-A5__beam {
  position: absolute;
  top: 0;
  left: 50%;
  width: 220px;
  transform: translateX(-50%);
  height: 100%;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent-3) 50%, transparent),
    color-mix(in srgb, var(--accent-3) 8%, transparent)
  );
  pointer-events: none;
  opacity: 0;
  z-index: 1;
  filter: blur(4px);
}

.step-A5__beam.is-in {
  animation: a5-beam-in 500ms var(--ease-out) forwards,
             a5-beam-pulse 1.6s ease-in-out 800ms infinite;
}

@keyframes a5-beam-in {
  0%   { opacity: 0; transform: translateX(-50%) scaleY(0); transform-origin: top; }
  100% { opacity: 0.85; transform: translateX(-50%) scaleY(1); }
}

@keyframes a5-beam-pulse {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 0.55; }
}

.step-A5__boite {
  position: relative;
  z-index: 2;
  width: 320px;
  height: 240px;
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  display: grid;
  place-items: center;
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.005em;
  color: var(--ink);
  opacity: 0;
}

.step-A5__boite.is-in {
  animation: a5-boite-drop 1100ms var(--ease-bounce) 500ms forwards,
             a5-boite-idle 1.6s ease-in-out 1700ms infinite;
}

@keyframes a5-boite-drop {
  0%   { opacity: 0; transform: translateY(-280px) scale(0.9); }
  60%  { opacity: 1; transform: translateY(20px)   scale(1.05); }
  80%  { opacity: 1; transform: translateY(-8px)   scale(0.98); }
  100% { opacity: 1; transform: translateY(0)      scale(1); }
}

@keyframes a5-boite-idle {
  0%, 100% { transform: translateY(0)   scale(1); }
  50%      { transform: translateY(-4px) scale(1.02); }
}

.step-A5__t2-titre {
  position: relative;
  z-index: 2;
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
  opacity: 0;
}

.step-A5__t2-titre.is-in {
  animation: a5-smash 500ms var(--ease-bounce) 1900ms forwards;
}

.step-A5__t2-cta {
  position: relative;
  z-index: 3;
  opacity: 0;
}

.step-A5__t2-cta.is-in {
  animation: a5-cta-pop 500ms var(--ease-bounce) 2600ms forwards;
}

@keyframes a5-cta-pop {
  0%   { opacity: 0; transform: scale(0.5); }
  60%  { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let stopPluie = null;

let temps = 1;

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

function readPrenoms() {
  // Lecture defensive de A1.students avec fallback.
  try {
    const a1 = getStepState('A1');
    const list = a1?.students;
    if (Array.isArray(list) && list.length > 0) {
      return list.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
    }
  } catch { /* ignore */ }
  return ['Lea', 'Yanis', 'Mila', 'Adam', 'Ines', 'Noah', 'Zoe', 'Sami'];
}

export default {
  id: 'A5',
  phase: 'A',
  title: 'Feuille de route',
  estimatedDuration: 90,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const restored = savedState || getStepState('A5') || {};
    temps = restored.temps === 2 ? 2 : 1;

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A5';

    const main = document.createElement('div');
    wrap.appendChild(main);

    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'hote');
    tuko.setAttribute('data-position', 'bas-gauche');
    wrap.appendChild(tuko);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    function persist() {
      saveStepState('A5', { temps });
    }

    function renderTemps1() {
      tuko.setAttribute('data-pose', 'hote');
      if (stopPluie) { stopPluie(); stopPluie = null; }
      main.replaceChildren();
      main.className = 'step-A5__t1';

      const titre = document.createElement('h1');
      titre.className = 'step-A5__titre';
      titre.textContent = "voila ton aventure";
      main.appendChild(titre);

      const chemin = document.createElement('div');
      chemin.className = 'step-A5__chemin';

      const wpDelay = 600;
      const lienDelay = 700;

      WAYPOINTS.forEach((cfg, i) => {
        const wp = document.createElement('div');
        wp.className = 'step-A5__waypoint';
        if (cfg.kind === 'image') {
          wp.classList.add('step-A5__waypoint--final');
          const img = document.createElement('img');
          img.src = cfg.src;
          img.alt = cfg.label;
          wp.appendChild(img);
        } else {
          if (cfg.glyph === '?') wp.classList.add('step-A5__waypoint--glyph-resolve');
          const glyph = document.createElement('span');
          glyph.textContent = cfg.glyph;
          wp.appendChild(glyph);
        }

        const num = document.createElement('span');
        num.className = 'step-A5__waypoint__num';
        num.textContent = String(i + 1);
        wp.appendChild(num);

        const lbl = document.createElement('span');
        lbl.className = 'step-A5__waypoint__label';
        lbl.textContent = cfg.label;
        wp.appendChild(lbl);

        chemin.appendChild(wp);

        const tWp = setTimeout(() => wp.classList.add('is-in'), wpDelay + i * 200);
        timers.push(tWp);

        if (i < WAYPOINTS.length - 1) {
          const lien = document.createElement('div');
          lien.className = 'step-A5__lien';
          chemin.appendChild(lien);
          const tLien = setTimeout(() => lien.classList.add('is-in'), lienDelay + i * 200);
          timers.push(tLien);
        }
      });
      main.appendChild(chemin);

      requestAnimationFrame(() => titre.classList.add('is-in'));

      // Bottom CTA
      const oldBottom = wrap.querySelector('.step-A5__bottom');
      if (oldBottom) oldBottom.remove();
      const bottom = document.createElement('div');
      bottom.className = 'step-A5__bottom';
      const cta = document.createElement('button');
      cta.className = 'cta-primary';
      cta.type = 'button';
      cta.textContent = '> TOUT LE MONDE EST PRET ?';
      bottom.appendChild(cta);
      wrap.appendChild(bottom);

      const onCta = () => switchToTemps(2);
      cta.addEventListener('click', onCta);
      handlers.push([cta, 'click', onCta]);
    }

    function renderTemps2() {
      tuko.setAttribute('data-pose', 'triomphe');
      timers.forEach(clearTimeout);
      timers = [];
      main.replaceChildren();
      main.className = 'step-A5__t2';

      const beam = document.createElement('div');
      beam.className = 'step-A5__beam';
      main.appendChild(beam);

      const boite = document.createElement('div');
      boite.className = 'step-A5__boite';
      boite.textContent = 'argibi';
      main.appendChild(boite);

      const t2titre = document.createElement('h1');
      t2titre.className = 'step-A5__t2-titre';
      t2titre.textContent = 'ta capsule est prete';
      main.appendChild(t2titre);

      const oldBottom = wrap.querySelector('.step-A5__bottom');
      if (oldBottom) oldBottom.remove();
      const bottom = document.createElement('div');
      bottom.className = 'step-A5__bottom';
      const cta = document.createElement('button');
      cta.className = "cta-primary step-A5__t2-cta";
      cta.type = 'button';
      cta.textContent = "> ON L'OUVRE !";
      bottom.appendChild(cta);
      wrap.appendChild(bottom);

      requestAnimationFrame(() => {
        beam.classList.add('is-in');
        boite.classList.add('is-in');
        t2titre.classList.add('is-in');
        cta.classList.add('is-in');
      });

      // Pluie de prenoms et confettis quand boite atterrit
      const tPluie = setTimeout(() => {
        if (!wrap.isConnected) return;
        const prenoms = readPrenoms();
        stopPluie = startPluieDePrenoms(wrap, { prenoms, intensite: 'normale' });
        // confettis sur la boite
        if (boite.isConnected) spawnConfettis(boite, { nombre: 8 });
        if (boite.isConnected) spawnShockwave(boite, { rayonMax: 600, duree: 600 });
      }, 1700);
      timers.push(tPluie);

      const onCta = () => {
        if (stopPluie) { stopPluie(); stopPluie = null; }
        if (navAPIRef) navAPIRef.markComplete();
        if (navAPIRef) navAPIRef.next();
      };
      cta.addEventListener('click', onCta);
      handlers.push([cta, 'click', onCta]);
    }

    function switchToTemps(t) {
      temps = t;
      persist();
      if (temps === 1) renderTemps1();
      else renderTemps2();
    }

    if (temps === 1) renderTemps1();
    else renderTemps2();

    // Intercepte ←/→/Espace en CAPTURE phase pour rerouter vers la nav
    // intra-page (temps 1 -> 2 via switchToTemps), au lieu de laisser nav.js
    // sauter direct a la page suivante. Sur temps 2, seul le CTA passe a A6.
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        if (temps === 1) {
          e.preventDefault();
          e.stopImmediatePropagation();
          switchToTemps(2);
        } else {
          // sur temps 2 : on bloque aussi (le CTA "ON L'OUVRE" est le chemin canonique)
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (temps === 2) {
          e.preventDefault();
          e.stopImmediatePropagation();
          switchToTemps(1);
        }
        // sur temps 1 : on laisse passer pour reculer vers A4
        return;
      }
    };
    window.addEventListener('keydown', onKey, true);
    handlers.push([window, 'keydown', onKey, true]);
  },

  exit() {
    if (stopPluie) { try { stopPluie(); } catch {} stopPluie = null; }
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
  },

  serialize() {
    return { temps };
  },

  isComplete() {
    return temps === 2;
  },

  replay() {
    return true;
  },
};

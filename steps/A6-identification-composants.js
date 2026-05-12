// A6-identification-composants.js — 3 slides.
// Slide 1 : Affichage statique. Image carte au centre + 5 cards composants
//           autour (rotations aleatoires pour effet playful).
// Slide 2 : Meme image + 5 boules d'accroche dessus + 5 cards autour.
//           L'enfant TIRE une ligne d'un point-card vers le bon point-carte.
//           Faux = carte shake. Juste = confettis + ligne fige.
// Slide 3 : 2 colonnes ENTREE / SORTIE + 10 cards a drag&drop en bas.
//           Drop dans mauvaise colonne = shake colonne + retour pool.
//
// Pattern handlers : AbortController par slide pour cleanup propre lors des
// transitions. Les handlers globaux (CTA, keydown) restent dans le tableau
// classique car ils survivent aux changements de slide.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';
import { spawnConfettis } from '../core/effects.js';

const STYLE_ID = 'step-A6-style';

// 5 composants : labels + coords relatives (0-1) sur l'image.
// >>> AJUSTER ICI les x/y pour caler les points sur la carte reelle. <<<
// x : 0 = bord gauche de l'image, 1 = bord droit. y : 0 = haut, 1 = bas.
const COMPOSANTS = [
  { id: 'bouton',  label: 'Bouton',                type: 'entree', x: 0.47, y: 0.63 },
  { id: 'inter',   label: 'Interrupteur',          type: 'entree', x: 0.31, y: 0.64 },
  { id: 'capteur', label: 'Capteur capacitif',     type: 'entree', x: 0.64, y: 0.57 },
  { id: 'matrice', label: 'Microcontrôleur',       type: 'sortie', x: 0.68, y: 0.45 },
  { id: 'segm',    label: 'Afficheur 7 segments',  type: 'sortie', x: 0.45, y: 0.52 },
];

// Positions des CARDS-NOMS autour de la carte centrale, slides 1 et 2.
// Coords relatives au conteneur .step-A6__layout (0,0 = top-left, 1,1 = bot-right).
// `dotSide` : sur quel bord de la card se trouve le point d'ancrage
// pour la ligne. Choix : 'right' | 'left' | 'top' | 'bottom'.
// >>> AJUSTER ICI x/y et dotSide pour chaque card. <<<
const CARD_POSITIONS = {
  bouton:  { x: 0.30, y: 0.20, dotSide: 'right' },
  inter:   { x: 0.20, y: 0.52, dotSide: 'right' },
  capteur: { x: 0.74, y: 0.28, dotSide: 'left' },
  matrice: { x: 0.64, y: 0.78, dotSide: 'left' },
  segm:    { x: 0.30, y: 0.84, dotSide: 'top' },
};

const EXTRAS = [
  { id: 'micro',  label: 'Microphone',  type: 'entree' },
  { id: 'camera', label: 'Caméra',      type: 'entree' },
  { id: 'hp',     label: 'Haut-parleur', type: 'sortie' },
  { id: 'led',    label: 'LED',         type: 'sortie' },
  { id: 'tv',     label: 'Écran TV',    type: 'sortie' },
];

const ALL_ITEMS = [...COMPOSANTS, ...EXTRAS];

const STYLES = `
.step-A6 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-5) var(--s-8) var(--s-5);
  background: var(--bg);
  overflow: hidden;
}

/* ----- Top : progress + titre --------------------------------------------- */

.step-A6__progress-wrap {
  display: grid;
  justify-items: center;
  gap: var(--s-1);
}

.step-A6__progress {
  width: min(420px, 40vw);
}

.step-A6__progress-label {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.32em;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0.55;
}

.step-A6__title {
  font-family: var(--display);
  font-size: clamp(56px, 5.4vw, 88px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1.05;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  justify-self: center;
}

/* ----- Main : zone changeante --------------------------------------------- */
/* grid 1fr/1fr pour que le .step-A6__layout enfant prenne TOUTE la hauteur
   disponible. Sans ca, layout.height = auto et les % top des cards ne
   referencent rien -> impossible de bouger les cards en vertical. */

.step-A6__main {
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: 1fr;
  min-height: 0;
  width: 100%;
  height: 100%;
}

/* ----- Slides 1 & 2 : layout = canvas relatif. Carte centree, cards en --- */
/* ----- absolute autour selon CARD_POSITIONS.                              */

.step-A6__layout {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.step-A6__comp-card {
  position: absolute;
  transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
  width: clamp(280px, 24vw, 400px);
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  font-family: var(--display);
  font-size: clamp(24px, 2.2vw, 36px);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.1;
  color: var(--ink);
  z-index: 2;
  word-break: break-word;
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}

.step-A6__comp-card.is-connected {
  background: var(--accent-3);
}

.step-A6__comp-card.is-active {
  transform: translate(-50%, -50%) rotate(0deg) scale(1.04);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-1);
}

/* Dot sur le BORD de la card (data-side). x2 plus gros pour visibilite. */
.step-A6__comp-card-dot {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-1);
  border: 5px solid var(--ink);
  cursor: var(--cursor-pointer);
  z-index: 3;
  transform: translate(-50%, -50%);
}

.step-A6__comp-card-dot[data-side="right"]  { top: 50%; left: 100%; }
.step-A6__comp-card-dot[data-side="left"]   { top: 50%; left: 0; }
.step-A6__comp-card-dot[data-side="top"]    { top: 0;   left: 50%; }
.step-A6__comp-card-dot[data-side="bottom"] { top: 100%; left: 50%; }

/* Pulse box-shadow only pour ne pas casser le transform de positionnement */
.step-A6__comp-card-dot.is-pulsing {
  animation: a6-dot-pulse 1.6s ease-in-out infinite;
}

@keyframes a6-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-1) 70%, transparent); }
  50%      { box-shadow: 0 0 0 14px transparent; }
}

/* ----- Zone carte centrale ------------------------------------------------ */

.step-A6__carte-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(600px, 70vw, 1100px);
  aspect-ratio: 4 / 3;
  z-index: 1;
}

.step-A6__carte-wrap.is-shaking {
  animation: a6-carte-shake 360ms ease-in-out;
}

/* IMPORTANT : conserver le translate(-50%,-50%) du wrap dans chaque keyframe.
   Sans ca, l'animation overrirait le transform de centrage et la carte
   sauterait en bas-droite (origine top-left au point central) avant de shake. */
@keyframes a6-carte-shake {
  0%, 100% { transform: translate(-50%, -50%) translateX(0); }
  20%      { transform: translate(-50%, -50%) translateX(-12px); }
  40%      { transform: translate(-50%, -50%) translateX(12px); }
  60%      { transform: translate(-50%, -50%) translateX(-9px); }
  80%      { transform: translate(-50%, -50%) translateX(7px); }
}

.step-A6__carte-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.step-A6__lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 4; /* au-dessus de la carte (z:1), slots (z:2), cards (z:2), dots (z:3) */
}

.step-A6__line {
  stroke: var(--accent-4); /* rose Wubo */
  stroke-width: 5;
  fill: none;
  stroke-linecap: round;
}

.step-A6__line--dragging {
  stroke: var(--accent-4); /* rose aussi, dashed pour distinguer du fixe */
  stroke-dasharray: 8 8;
}

.step-A6__slot {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--paper);
  border: 5px solid var(--accent-3); /* bordure jaune Wubo */
  transform: translate(-50%, -50%);
  cursor: var(--cursor-pointer);
  z-index: 2;
  transition: transform var(--d-fast) var(--ease-bounce),
              background var(--d-fast) var(--ease-out);
  animation: a6-slot-pulse 2s ease-in-out infinite;
}

/* Halo rose Wubo (--accent-4) qui pulse pour signaler les points clicables */
@keyframes a6-slot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-4) 80%, transparent); }
  50%      { box-shadow: 0 0 0 20px transparent; }
}

.step-A6__slot.is-hover {
  background: var(--accent-3);
  transform: translate(-50%, -50%) scale(1.3);
}

.step-A6__slot.is-connected {
  background: var(--accent-3);
  animation: none;
}

/* ----- Slide 3 : entrees / sorties + pool --------------------------------- */

.step-A6__sort {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: var(--s-4);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.step-A6__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  min-height: 0;
  height: 100%;
}

.step-A6__col {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--s-3);
  min-height: 0;
}

.step-A6__col.is-shaking {
  animation: a6-col-shake 360ms ease-in-out;
}

@keyframes a6-col-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-10px); }
  40%      { transform: translateX(10px); }
  60%      { transform: translateX(-8px); }
  80%      { transform: translateX(6px); }
}

.step-A6__col-title {
  font-family: var(--display);
  font-size: clamp(48px, 4.6vw, 72px);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
}

.step-A6__col--entree .step-A6__col-title { color: var(--accent-2); }
.step-A6__col--sortie .step-A6__col-title { color: var(--accent-4); }

.step-A6__col-zone {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  align-content: flex-start;
  justify-content: center;
  padding: var(--s-3);
  border-radius: var(--r-md);
  min-height: 0;
  height: 100%;
  pointer-events: none; /* la col entiere capte les events, pas seulement la zone */
}

.step-A6__col-zone > * { pointer-events: auto; } /* mais les cards dedans restent draggables */

.step-A6__col.is-hover {
  background: color-mix(in srgb, var(--accent-1) 14%, transparent);
}

.step-A6__pool {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  justify-content: center;
  align-items: center;
  padding: var(--s-3);
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-md);
  min-height: 120px;
}

.step-A6__drag-card {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: 14px var(--s-3);
  font-family: var(--display);
  font-size: clamp(28px, 2.4vw, 40px);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  color: var(--ink);
  cursor: var(--cursor-grab);
  user-select: none;
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}

.step-A6__drag-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow-lg);
}

.step-A6__drag-card.is-dragging {
  opacity: 0.4;
  cursor: var(--cursor-grabbing);
}

.step-A6__drag-card--placed {
  background: var(--accent-3);
}

.step-A6__drag-card.is-rejecting {
  animation: a6-card-reject 320ms ease-in-out;
}

@keyframes a6-card-reject {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-6px); }
  75%      { transform: translateX(6px); }
}

/* ----- CTA bottom : identique a A1/A3 (var(--s-8) padding-bottom du wrap) */

.step-A6__cta-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3);
}

.step-A6__cta {
  animation: none !important;
}
`;

let scene = null;
let stableHandlers = [];   // handlers globaux (CTA, keydown) survivent au switch slide
let domNodes = [];
let timers = [];
let navAPIRef = null;
let slideAbort = null;     // AbortController du slide courant (nettoye au switch)

let slide = 1;
let connections = [];      // array d'ids composants connectes (slide 2)
let classifications = {};  // { itemId: 'entree'|'sortie' } (slide 3)

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
  saveStepState('A6', { slide, connections: [...connections], classifications: { ...classifications } });
}

function rotJitter() {
  return (Math.random() * 6 - 3).toFixed(2); // -3deg .. +3deg
}

export default {
  id: 'A6',
  phase: 'A',
  title: 'Identification composants',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const restored = savedState || getStepState('A6') || {};
    slide = Math.max(1, Math.min(3, restored.slide || 1));
    connections = Array.isArray(restored.connections) ? [...restored.connections] : [];
    classifications = (restored.classifications && typeof restored.classifications === 'object')
      ? { ...restored.classifications } : {};

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A6';

    // Progress
    const progressWrap = document.createElement('div');
    progressWrap.className = 'step-A6__progress-wrap';
    const progress = document.createElement('div');
    progress.className = 'barre-progression step-A6__progress';
    const segs = [];
    for (let i = 0; i < 3; i++) {
      const seg = document.createElement('div');
      seg.className = 'barre-progression__seg';
      progress.appendChild(seg);
      segs.push(seg);
    }
    progressWrap.appendChild(progress);
    const progressLabel = document.createElement('div');
    progressLabel.className = 'step-A6__progress-label';
    progressWrap.appendChild(progressLabel);
    wrap.appendChild(progressWrap);

    // Title
    const title = document.createElement('h1');
    title.className = 'step-A6__title';
    wrap.appendChild(title);

    // Main (zone changeante par slide)
    const main = document.createElement('div');
    main.className = 'step-A6__main';
    wrap.appendChild(main);

    // CTA
    const ctaArea = document.createElement('div');
    ctaArea.className = 'step-A6__cta-area';
    const cta = document.createElement('button');
    cta.className = 'cta-primary step-A6__cta';
    cta.type = 'button';
    ctaArea.appendChild(cta);
    wrap.appendChild(ctaArea);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    function refreshProgress() {
      segs.forEach((seg, i) => {
        seg.classList.remove('is-current', 'is-done');
        if (i < slide - 1) seg.classList.add('is-done');
        else if (i === slide - 1) seg.classList.add('is-current');
      });
      progressLabel.textContent = `identification · ${slide} sur 3`;
    }

    // ====================================================================
    // SLIDE 1 : affichage statique. Cards en absolute autour de la carte.
    // ====================================================================
    function renderSlide1(signal) {
      title.textContent = 'voici les 5 composants à découvrir';
      cta.textContent = 'ON CONTINUE';
      cta.disabled = false;
      main.replaceChildren();

      const layout = document.createElement('div');
      layout.className = 'step-A6__layout';

      const carteWrap = document.createElement('div');
      carteWrap.className = 'step-A6__carte-wrap';
      const carteImg = document.createElement('img');
      carteImg.className = 'step-A6__carte-img';
      carteImg.src = 'assets/sprites/A6/illu_carte_electronique.png';
      carteImg.alt = 'carte électronique Argibi';
      carteWrap.appendChild(carteImg);
      layout.appendChild(carteWrap);

      COMPOSANTS.forEach((c) => {
        const pos = CARD_POSITIONS[c.id] || { x: 0.5, y: 0.5 };
        const card = document.createElement('div');
        card.className = 'step-A6__comp-card';
        card.style.setProperty('--rot', `${rotJitter()}deg`);
        card.style.left = `${pos.x * 100}%`;
        card.style.top = `${pos.y * 100}%`;
        card.textContent = c.label;
        layout.appendChild(card);
      });

      main.appendChild(layout);
    }

    // ====================================================================
    // SLIDE 2 : tirer les lignes
    // ====================================================================
    function renderSlide2(signal) {
      title.textContent = 'tire une ligne entre chaque mot et son emplacement';
      cta.textContent = 'ON CONTINUE';
      cta.disabled = false;
      main.replaceChildren();

      const layout = document.createElement('div');
      layout.className = 'step-A6__layout';

      const carteWrap = document.createElement('div');
      carteWrap.className = 'step-A6__carte-wrap';
      const carteImg = document.createElement('img');
      carteImg.className = 'step-A6__carte-img';
      carteImg.src = 'assets/sprites/A6/illu_carte_electronique.png';
      carteImg.alt = 'carte électronique Argibi';
      carteWrap.appendChild(carteImg);

      // SVG overlay sur TOUT le layout pour relier cards (en absolute autour)
      // aux slots (sur la carte).
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'step-A6__lines');
      svg.setAttribute('preserveAspectRatio', 'none');
      layout.appendChild(svg);

      // Slots sur la carte (coords COMPOSANTS x/y relatifs a carteWrap)
      const slots = {};
      COMPOSANTS.forEach((c) => {
        const slot = document.createElement('div');
        slot.className = 'step-A6__slot';
        slot.dataset.id = c.id;
        slot.style.left = `${c.x * 100}%`;
        slot.style.top = `${c.y * 100}%`;
        if (connections.includes(c.id)) slot.classList.add('is-connected');
        carteWrap.appendChild(slot);
        slots[c.id] = slot;
      });

      layout.appendChild(carteWrap);

      // Cards en absolute selon CARD_POSITIONS (relatif au layout)
      const cards = {};
      COMPOSANTS.forEach((c) => {
        const pos = CARD_POSITIONS[c.id] || { x: 0.5, y: 0.5, dotSide: 'right' };
        const card = document.createElement('div');
        card.className = 'step-A6__comp-card';
        card.dataset.id = c.id;
        card.style.setProperty('--rot', `${rotJitter()}deg`);
        card.style.left = `${pos.x * 100}%`;
        card.style.top = `${pos.y * 100}%`;
        card.textContent = c.label;
        if (connections.includes(c.id)) card.classList.add('is-connected');

        const dot = document.createElement('div');
        dot.className = 'step-A6__comp-card-dot';
        dot.dataset.side = pos.dotSide || 'right';
        if (!connections.includes(c.id)) dot.classList.add('is-pulsing');
        card.appendChild(dot);

        layout.appendChild(card);
        cards[c.id] = card;
      });

      main.appendChild(layout);

      // Drag logique : coords toutes relatives au LAYOUT (svg layout-wide).
      let dragging = null;

      function relCoords(evt) {
        const r = layout.getBoundingClientRect();
        return {
          x: ((evt.clientX - r.left) / r.width) * 100,
          y: ((evt.clientY - r.top) / r.height) * 100,
        };
      }

      function elCenterRel(el) {
        const lr = layout.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        return {
          x: ((er.left + er.width / 2) - lr.left) / lr.width * 100,
          y: ((er.top + er.height / 2) - lr.top) / lr.height * 100,
        };
      }

      function drawFixedLines() {
        svg.querySelectorAll('.step-A6__line:not(.step-A6__line--dragging)').forEach(l => l.remove());
        connections.forEach((compId) => {
          const card = cards[compId];
          const slot = slots[compId];
          if (!card || !slot) return;
          const a = elCenterRel(card.querySelector('.step-A6__comp-card-dot'));
          const b = elCenterRel(slot);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'step-A6__line');
          line.setAttribute('x1', `${a.x}%`);
          line.setAttribute('y1', `${a.y}%`);
          line.setAttribute('x2', `${b.x}%`);
          line.setAttribute('y2', `${b.y}%`);
          svg.appendChild(line);
        });
      }

      const onMouseMove = (evt) => {
        if (!dragging) return;
        const c = relCoords(evt);
        dragging.lineEl.setAttribute('x2', `${c.x}%`);
        dragging.lineEl.setAttribute('y2', `${c.y}%`);
      };

      const onMouseUp = (evt) => {
        if (!dragging) return;
        const t = evt.target;
        const slotEl = t.classList?.contains('step-A6__slot') ? t : null;
        const matchedId = slotEl?.dataset.id;

        if (matchedId === dragging.compId) {
          connections.push(dragging.compId);
          slots[matchedId].classList.add('is-connected');
          cards[dragging.compId].classList.add('is-connected');
          cards[dragging.compId].querySelector('.step-A6__comp-card-dot').classList.remove('is-pulsing');
          dragging.lineEl.classList.remove('step-A6__line--dragging');
          spawnConfettis(carteWrap, { nombre: 6 });
          persist();
        } else {
          dragging.lineEl.remove();
          carteWrap.classList.add('is-shaking');
          const t1 = setTimeout(() => carteWrap.classList.remove('is-shaking'), 400);
          timers.push(t1);
        }
        dragging = null;
      };

      window.addEventListener('mousemove', onMouseMove, { signal });
      window.addEventListener('mouseup', onMouseUp, { signal });

      COMPOSANTS.forEach((c) => {
        const dot = cards[c.id].querySelector('.step-A6__comp-card-dot');
        const onMouseDown = (evt) => {
          if (connections.includes(c.id)) return;
          evt.preventDefault();
          const a = elCenterRel(dot);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'step-A6__line step-A6__line--dragging');
          line.setAttribute('x1', `${a.x}%`);
          line.setAttribute('y1', `${a.y}%`);
          line.setAttribute('x2', `${a.x}%`);
          line.setAttribute('y2', `${a.y}%`);
          svg.appendChild(line);
          dragging = { compId: c.id, lineEl: line };
        };
        dot.addEventListener('mousedown', onMouseDown, { signal });
      });

      Object.values(slots).forEach((slot) => {
        slot.addEventListener('mouseenter', () => slot.classList.add('is-hover'), { signal });
        slot.addEventListener('mouseleave', () => slot.classList.remove('is-hover'), { signal });
      });

      requestAnimationFrame(drawFixedLines);
      const onResize = () => drawFixedLines();
      window.addEventListener('resize', onResize, { signal });
    }

    // ====================================================================
    // SLIDE 3 : drag & drop entrees/sorties
    // ====================================================================
    function renderSlide3(signal) {
      title.textContent = 'glisse chaque objet dans la bonne colonne';
      cta.textContent = 'ON DÉMARRE LE MONTAGE';
      cta.disabled = false;
      main.replaceChildren();

      const sort = document.createElement('div');
      sort.className = 'step-A6__sort';

      const cols = document.createElement('div');
      cols.className = 'step-A6__columns';

      const colEntree = document.createElement('div');
      colEntree.className = 'step-A6__col step-A6__col--entree';
      colEntree.dataset.col = 'entree';
      const titleEntree = document.createElement('h2');
      titleEntree.className = 'step-A6__col-title';
      titleEntree.textContent = 'ENTRÉE';
      colEntree.appendChild(titleEntree);
      const zoneEntree = document.createElement('div');
      zoneEntree.className = 'step-A6__col-zone';
      zoneEntree.dataset.col = 'entree';
      colEntree.appendChild(zoneEntree);

      const colSortie = document.createElement('div');
      colSortie.className = 'step-A6__col step-A6__col--sortie';
      colSortie.dataset.col = 'sortie';
      const titleSortie = document.createElement('h2');
      titleSortie.className = 'step-A6__col-title';
      titleSortie.textContent = 'SORTIE';
      colSortie.appendChild(titleSortie);
      const zoneSortie = document.createElement('div');
      zoneSortie.className = 'step-A6__col-zone';
      zoneSortie.dataset.col = 'sortie';
      colSortie.appendChild(zoneSortie);

      cols.appendChild(colEntree);
      cols.appendChild(colSortie);
      sort.appendChild(cols);

      const pool = document.createElement('div');
      pool.className = 'step-A6__pool';
      sort.appendChild(pool);

      main.appendChild(sort);

      // Map id -> item pour valider au drop
      const itemMap = {};
      ALL_ITEMS.forEach((it) => { itemMap[it.id] = it; });

      function makeCard(item) {
        const card = document.createElement('div');
        card.className = 'step-A6__drag-card';
        card.draggable = true;
        card.dataset.id = item.id;
        card.dataset.type = item.type;
        card.textContent = item.label;

        card.addEventListener('dragstart', (e) => {
          card.classList.add('is-dragging');
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'move';
        }, { signal });

        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
        }, { signal });

        return card;
      }

      function placeCardIn(card, container) {
        const isInColumn = container === zoneEntree || container === zoneSortie;
        card.classList.toggle('step-A6__drag-card--placed', isInColumn);
        container.appendChild(card);
      }

      // Distribution initiale depuis classifications restaurees
      ALL_ITEMS.forEach((item) => {
        const card = makeCard(item);
        const col = classifications[item.id];
        if (col === 'entree') placeCardIn(card, zoneEntree);
        else if (col === 'sortie') placeCardIn(card, zoneSortie);
        else placeCardIn(card, pool);
      });

      // dropTarget = element qui capte dragover/drop (toute la col)
      // appendTarget = ou on append les cards reussies (zone interne)
      function setupDropZone(dropTarget, appendTarget, colName) {
        dropTarget.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          dropTarget.classList.add('is-hover');
        }, { signal });

        dropTarget.addEventListener('dragleave', (e) => {
          // dragleave fire aussi sur passages internes ; on retire le hover
          // seulement si on quitte vraiment le dropTarget
          if (!dropTarget.contains(e.relatedTarget)) {
            dropTarget.classList.remove('is-hover');
          }
        }, { signal });

        dropTarget.addEventListener('drop', (e) => {
          e.preventDefault();
          dropTarget.classList.remove('is-hover');
          const id = e.dataTransfer.getData('text/plain');
          const card = main.querySelector(`.step-A6__drag-card[data-id="${id}"]`);
          if (!card) return;
          const item = itemMap[id];
          if (!item) return;

          if (colName === null) {
            placeCardIn(card, pool);
            delete classifications[id];
            persist();
            return;
          }

          if (item.type === colName) {
            placeCardIn(card, appendTarget);
            classifications[id] = colName;
            spawnConfettis(appendTarget, { nombre: 4 });
            persist();
          } else {
            // mauvaise colonne : shake col + retour pool
            dropTarget.classList.add('is-shaking');
            const t1 = setTimeout(() => dropTarget.classList.remove('is-shaking'), 400);
            timers.push(t1);
            card.classList.add('is-rejecting');
            const t2 = setTimeout(() => card.classList.remove('is-rejecting'), 350);
            timers.push(t2);
            placeCardIn(card, pool);
            delete classifications[id];
            persist();
          }
        }, { signal });
      }

      // Drop zones = colonnes entieres (toute la card est receptive)
      setupDropZone(colEntree, zoneEntree, 'entree');
      setupDropZone(colSortie, zoneSortie, 'sortie');
      setupDropZone(pool, pool, null);
    }

    // ====================================================================
    // Switch slide : abort previous + render new
    // ====================================================================
    function switchSlide(n) {
      if (slideAbort) slideAbort.abort();
      slideAbort = new AbortController();
      slide = Math.max(1, Math.min(3, n));
      persist();
      refreshProgress();
      if (slide === 1) renderSlide1(slideAbort.signal);
      else if (slide === 2) renderSlide2(slideAbort.signal);
      else renderSlide3(slideAbort.signal);
    }

    // Init
    slideAbort = new AbortController();
    refreshProgress();
    if (slide === 1) renderSlide1(slideAbort.signal);
    else if (slide === 2) renderSlide2(slideAbort.signal);
    else renderSlide3(slideAbort.signal);

    // CTA et keydown : handlers globaux (stableHandlers, survivent au switch)
    const onCta = () => {
      if (slide < 3) switchSlide(slide + 1);
      else {
        if (navAPIRef) navAPIRef.markComplete();
        if (navAPIRef) navAPIRef.next();
      }
    };
    cta.addEventListener('click', onCta);
    stableHandlers.push([cta, 'click', onCta]);

    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onCta();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (slide > 1) {
          e.preventDefault();
          e.stopImmediatePropagation();
          switchSlide(slide - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    stableHandlers.push([window, 'keydown', onKey, true]);
  },

  exit() {
    if (slideAbort) { try { slideAbort.abort(); } catch {} slideAbort = null; }
    stableHandlers.forEach(([t, e, f, capture]) => t.removeEventListener(e, f, !!capture));
    stableHandlers = [];
    timers.forEach(clearTimeout);
    timers = [];
    domNodes.forEach((n) => n.remove());
    domNodes = [];
    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    removeStyle();
    navAPIRef = null;
  },

  serialize() {
    return { slide, connections: [...connections], classifications: { ...classifications } };
  },

  isComplete() {
    return slide === 3;
  },

  replay() {
    return true;
  },
};

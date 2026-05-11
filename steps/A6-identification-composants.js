// A6-identification-composants.js — 3 slides successives.
// Slide 1 : galerie 5 placeholders composants (referentiel, magazine p10).
// Slide 2 : drag&drop 5 etiquettes vers 5 zones cibles sur la carte Argibi.
// Slide 3 : 2 colonnes ENTREE/SORTIE + cards composants + input + AJOUTE.
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';
import { spawnConfettis, spawnShockwave } from '../core/effects.js';

const STYLE_ID = 'step-A6-style';

const COMPOSANTS = [
  { id: 'bouton',      label: 'bouton poussoir', col: 'entree' },
  { id: 'interrupteur', label: 'interrupteur',    col: 'entree' },
  { id: 'capteur',     label: 'capteur tactile', col: 'entree' },
  { id: 'mc',          label: 'µC',              col: 'cerveau' },
  { id: 'matrice',     label: 'matrice 8x8',     col: 'sortie' },
];

const STYLES = `
.step-A6 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

.step-A6__top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: var(--s-3);
}

.step-A6__progress-wrap {
  grid-column: 1 / 4;
  display: grid;
  justify-items: center;
  gap: var(--s-1);
}

.step-A6__progress {
  width: min(420px, 50vw);
}

.step-A6__progress-label {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.32em;
  text-transform: lowercase;
  opacity: 0.55;
}

.step-A6__counter {
  position: absolute;
  top: var(--s-5);
  right: var(--s-5);
}

.step-A6__consigne {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
}

.step-A6__main {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--s-3);
  position: relative;
}

.step-A6__galerie {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 180px));
  gap: var(--s-3);
}

.step-A6__placeholder {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-3);
  display: grid;
  gap: var(--s-2);
  text-align: center;
  animation: a6-pulse 2.4s ease-in-out infinite;
}

@keyframes a6-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.03); }
}

.step-A6__placeholder-img {
  background: var(--bg-2);
  border: 2px dashed var(--ink);
  border-radius: var(--r-md);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: var(--t-small);
  opacity: 0.55;
}

.step-A6__placeholder-label {
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.005em;
}

.step-A6__mag-note {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.12em;
  opacity: 0.55;
}

/* Slide 2 : drag&drop --------------------------------------------------- */

.step-A6__carte {
  position: relative;
  width: min(720px, 80vw);
  height: 280px;
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-md);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--s-3);
  padding: var(--s-3);
  align-items: center;
  justify-items: center;
}

.step-A6__zone {
  width: 100%;
  height: 100%;
  border: 2px dashed var(--accent-1);
  border-radius: var(--r-md);
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.12em;
  color: var(--accent-1);
  text-align: center;
  background: color-mix(in srgb, var(--accent-1) 6%, transparent);
  animation: a6-zone-pulse 2.2s ease-in-out infinite;
}

@keyframes a6-zone-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%      { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent-1) 12%, transparent); }
}

.step-A6__zone.is-hover {
  background: color-mix(in srgb, var(--accent-1) 18%, transparent);
  transform: scale(1.06);
}

.step-A6__zone.is-correct {
  border-color: var(--accent-3);
  background: var(--accent-3);
  color: var(--ink);
  font-family: var(--display);
  font-weight: 900;
  text-transform: uppercase;
  font-size: var(--t-body);
  letter-spacing: -0.005em;
  animation: none;
}

.step-A6__etiquettes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  justify-content: center;
  width: min(900px, 90vw);
}

.step-A6__etiquette {
  background: var(--paper);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  font-family: var(--display);
  font-size: var(--t-body-xl);
  font-weight: 900;
  text-transform: uppercase;
  cursor: var(--cursor-grab, grab);
  user-select: none;
  transition: transform 120ms var(--ease-out),
              box-shadow 120ms var(--ease-out);
}

.step-A6__etiquette.is-placed {
  visibility: hidden;
}

.step-A6__etiquette.is-dragging {
  cursor: var(--cursor-grabbing, grabbing);
  position: fixed;
  pointer-events: none;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  transform: scale(1.08);
}

.step-A6__etiquette.is-rejected {
  animation: a6-shake 320ms ease-in-out;
}

@keyframes a6-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-8px); }
  75%      { transform: translateX(8px); }
}

/* Slide 3 : entrees / sorties ------------------------------------------ */

.step-A6__cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
  width: min(1200px, 90vw);
}

.step-A6__col {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-3);
  display: grid;
  gap: var(--s-2);
  min-height: 280px;
}

.step-A6__col-titre {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
}

.step-A6__col-sub {
  font-family: var(--mono);
  font-size: var(--t-small);
  text-align: center;
  letter-spacing: 0.08em;
  opacity: 0.55;
}

.step-A6__cards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1);
  justify-content: center;
  align-content: flex-start;
}

.step-A6__card {
  background: var(--accent-3);
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  padding: 8px 12px;
  font-family: var(--display);
  font-size: var(--t-body);
  font-weight: 700;
  text-transform: lowercase;
}

.step-A6__card--custom::after {
  content: ' *';
  color: var(--accent-1);
}

.step-A6__add {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--s-2);
  width: min(540px, 60vw);
  margin: 0 auto;
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

let slide = 1;
let placedZones = {};   // { [zoneIdx: number]: composantId }
let customCards = [];   // Array<{name, column}>

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
  saveStepState('A6', { slide, placedZones: { ...placedZones }, customCards: [...customCards] });
}

export default {
  id: 'A6',
  phase: 'A',
  title: 'Identification composants',
  estimatedDuration: 240,
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
    placedZones = { ...(restored.placedZones || {}) };
    customCards = Array.isArray(restored.customCards) ? [...restored.customCards] : [];

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A6';

    const top = document.createElement('div');
    top.className = 'step-A6__top';

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
    top.appendChild(progressWrap);

    wrap.appendChild(top);

    const consigne = document.createElement('h2');
    consigne.className = 'step-A6__consigne';
    wrap.appendChild(consigne);

    const main = document.createElement('div');
    main.className = 'step-A6__main';
    wrap.appendChild(main);

    // Compteur (slide 2)
    const counter = document.createElement('div');
    counter.className = 'compteur-geant step-A6__counter';
    const counterValue = document.createElement('div');
    counterValue.className = 'compteur-geant__value';
    counter.appendChild(counterValue);
    const counterLabel = document.createElement('div');
    counterLabel.className = 'compteur-geant__label';
    counterLabel.textContent = 'places';
    counter.appendChild(counterLabel);
    wrap.appendChild(counter);

    const bottom = document.createElement('div');
    bottom.style.display = 'grid';
    bottom.style.justifyItems = 'center';
    bottom.style.gap = 'var(--s-2)';
    const cta = document.createElement('button');
    cta.className = 'cta-primary';
    cta.type = 'button';
    bottom.appendChild(cta);
    wrap.appendChild(bottom);

    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'pedagogique');
    tuko.setAttribute('data-position', 'bas-gauche');
    wrap.appendChild(tuko);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // Sub-renderers --------------------------------------------------------

    function refreshProgress() {
      segs.forEach((seg, i) => {
        seg.classList.remove('is-current', 'is-done');
        if (i + 1 < slide) seg.classList.add('is-done');
        else if (i + 1 === slide) seg.classList.add('is-current');
      });
      progressLabel.textContent = `identification . ${slide} sur 3`;
    }

    function renderSlide1() {
      consigne.textContent = 'ouvre ta boite et trouve ces 5 composants';
      counter.style.display = 'none';
      main.replaceChildren();

      const galerie = document.createElement('div');
      galerie.className = 'step-A6__galerie';
      COMPOSANTS.forEach(c => {
        const ph = document.createElement('div');
        ph.className = 'step-A6__placeholder';
        const img = document.createElement('div');
        img.className = 'step-A6__placeholder-img';
        img.textContent = '[ illu ]';
        ph.appendChild(img);
        const lbl = document.createElement('div');
        lbl.className = 'step-A6__placeholder-label';
        lbl.textContent = c.label;
        ph.appendChild(lbl);
        galerie.appendChild(ph);
      });
      main.appendChild(galerie);

      const note = document.createElement('div');
      note.className = 'step-A6__mag-note';
      note.textContent = 'magazine page 10 . relie chaque nom au composant';
      main.appendChild(note);

      cta.textContent = '> TOUT LE MONDE A FINI ?';
      cta.classList.remove('is-disabled');
      cta.disabled = false;
    }

    function renderSlide2() {
      consigne.textContent = 'glisse chaque nom au bon endroit';
      counter.style.display = '';
      main.replaceChildren();

      const carte = document.createElement('div');
      carte.className = 'step-A6__carte';
      const zones = [];
      COMPOSANTS.forEach((c, i) => {
        const zone = document.createElement('div');
        zone.className = 'step-A6__zone';
        zone.dataset.idx = String(i);
        zone.dataset.expectedId = c.id;
        if (placedZones[i] === c.id) {
          zone.classList.add('is-correct');
          zone.textContent = c.label;
        } else {
          zone.textContent = `zone ${i + 1}`;
        }
        carte.appendChild(zone);
        zones.push(zone);
      });
      main.appendChild(carte);

      const etiquettes = document.createElement('div');
      etiquettes.className = 'step-A6__etiquettes';
      COMPOSANTS.forEach(c => {
        const et = document.createElement('div');
        et.className = 'step-A6__etiquette';
        et.dataset.id = c.id;
        et.textContent = c.label;
        if (Object.values(placedZones).includes(c.id)) {
          et.classList.add('is-placed');
        }
        etiquettes.appendChild(et);
        attachDrag(et, zones);
      });
      main.appendChild(etiquettes);

      function refreshCounter() {
        const n = Object.keys(placedZones).length;
        counterValue.textContent = `${n}/5`;
        counterValue.classList.add('is-pulsing');
        const t = setTimeout(() => counterValue.classList.remove('is-pulsing'), 200);
        timers.push(t);

        const ok = n === 5;
        cta.textContent = '> ON CONTINUE';
        cta.classList.toggle('is-disabled', !ok);
        cta.disabled = !ok;
        cta.style.visibility = ok ? 'visible' : 'hidden';

        if (ok) {
          // reward
          if (carte.isConnected) spawnConfettis(carte, { nombre: 14 });
          if (carte.isConnected) spawnShockwave(carte, { rayonMax: 800, duree: 700 });
        }
      }

      function attachDrag(el, zonesList) {
        const onPointerDown = (e) => {
          if (el.classList.contains('is-placed')) return;
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const offX = e.clientX - rect.left;
          const offY = e.clientY - rect.top;
          el.classList.add('is-dragging');
          el.style.left = `${rect.left}px`;
          el.style.top = `${rect.top}px`;
          el.style.width = `${rect.width}px`;

          let hover = null;
          const onMove = (ev) => {
            el.style.left = `${ev.clientX - offX}px`;
            el.style.top = `${ev.clientY - offY}px`;
            // detecter survol zone
            zonesList.forEach(z => z.classList.remove('is-hover'));
            hover = null;
            for (const z of zonesList) {
              if (z.classList.contains('is-correct')) continue;
              const r = z.getBoundingClientRect();
              if (ev.clientX >= r.left && ev.clientX <= r.right &&
                  ev.clientY >= r.top && ev.clientY <= r.bottom) {
                z.classList.add('is-hover');
                hover = z;
                break;
              }
            }
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            zonesList.forEach(z => z.classList.remove('is-hover'));
            el.classList.remove('is-dragging');
            el.style.left = '';
            el.style.top = '';
            el.style.width = '';

            if (hover) {
              const idx = parseInt(hover.dataset.idx, 10);
              const expected = hover.dataset.expectedId;
              const dragged = el.dataset.id;
              if (expected === dragged) {
                placedZones[idx] = dragged;
                hover.classList.add('is-correct');
                hover.textContent = COMPOSANTS.find(c => c.id === dragged).label;
                el.classList.add('is-placed');
                persist();
                refreshCounter();
              } else {
                el.classList.add('is-rejected');
                const t = setTimeout(() => el.classList.remove('is-rejected'), 320);
                timers.push(t);
              }
            }
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };
        el.addEventListener('pointerdown', onPointerDown);
        handlers.push([el, 'pointerdown', onPointerDown]);
      }

      refreshCounter();
    }

    function renderSlide3() {
      consigne.textContent = 'un objet electronique a des entrees et sorties';
      counter.style.display = 'none';
      main.replaceChildren();

      const cols = document.createElement('div');
      cols.className = 'step-A6__cols';

      const colDefs = [
        { key: 'entree', titre: 'entree', sub: 'tu lui donnes une info' },
        { key: 'cerveau', titre: 'cerveau', sub: 'il pilote le tout' },
        { key: 'sortie', titre: 'sortie', sub: 'il te montre quelque chose' },
      ];

      colDefs.forEach(def => {
        const col = document.createElement('div');
        col.className = 'step-A6__col';
        col.dataset.col = def.key;

        const t = document.createElement('h3');
        t.className = 'step-A6__col-titre';
        t.textContent = def.titre;
        col.appendChild(t);

        const sub = document.createElement('div');
        sub.className = 'step-A6__col-sub';
        sub.textContent = def.sub;
        col.appendChild(sub);

        const cards = document.createElement('div');
        cards.className = 'step-A6__cards';
        cards.dataset.col = def.key;
        col.appendChild(cards);

        cols.appendChild(col);
      });

      main.appendChild(cols);

      function placeCards() {
        cols.querySelectorAll('.step-A6__cards').forEach(c => c.replaceChildren());
        // composants pre-classes
        COMPOSANTS.forEach(c => {
          const card = document.createElement('div');
          card.className = 'step-A6__card';
          card.textContent = c.label;
          const target = cols.querySelector(`.step-A6__cards[data-col="${c.col}"]`);
          if (target) target.appendChild(card);
        });
        // custom cards
        customCards.forEach(cc => {
          const card = document.createElement('div');
          card.className = 'step-A6__card step-A6__card--custom';
          card.textContent = cc.name;
          const target = cols.querySelector(`.step-A6__cards[data-col="${cc.column}"]`);
          if (target) target.appendChild(card);
        });
      }
      placeCards();

      // Add input
      const addWrap = document.createElement('div');
      addWrap.className = 'step-A6__add';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input-mega';
      input.placeholder = 'tape un objet + Entree';
      input.maxLength = 24;
      input.autocomplete = 'off';
      input.spellcheck = false;
      addWrap.appendChild(input);
      const addBtn = document.createElement('button');
      addBtn.className = 'cta-secondary';
      addBtn.type = 'button';
      addBtn.textContent = '+ AJOUTE';
      addWrap.appendChild(addBtn);
      main.appendChild(addWrap);

      function addCard() {
        const name = input.value.trim();
        if (!name) return;
        // colonne par defaut : entree (l'animateur peut deplacer plus tard si besoin)
        customCards.push({ name, column: 'entree' });
        input.value = '';
        persist();
        placeCards();
      }
      const onAddClick = () => addCard();
      const onAddKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCard();
        }
      };
      addBtn.addEventListener('click', onAddClick);
      input.addEventListener('keydown', onAddKey);
      handlers.push([addBtn, 'click', onAddClick]);
      handlers.push([input, 'keydown', onAddKey]);

      cta.textContent = '> ON DEMARRE LE MONTAGE';
      cta.classList.remove('is-disabled');
      cta.disabled = false;
    }

    function renderSlide() {
      refreshProgress();
      if (slide === 1) renderSlide1();
      else if (slide === 2) renderSlide2();
      else renderSlide3();
    }

    function gotoSlide(n) {
      timers.forEach(clearTimeout);
      timers = [];
      slide = Math.max(1, Math.min(3, n));
      persist();
      renderSlide();
    }

    renderSlide();

    const onCta = () => {
      if (cta.disabled) return;
      if (slide < 3) {
        gotoSlide(slide + 1);
      } else {
        if (navAPIRef) navAPIRef.markComplete();
        if (navAPIRef) navAPIRef.next();
      }
    };
    cta.addEventListener('click', onCta);
    handlers.push([cta, 'click', onCta]);

    // R = reset slide 2 (utilitaire animateur), bubble phase OK.
    const onKeyR = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'r' || e.key === 'R') {
        if (slide === 2) {
          placedZones = {};
          persist();
          renderSlide();
        }
      }
    };
    window.addEventListener('keydown', onKeyR);
    handlers.push([window, 'keydown', onKeyR]);

    // Intercepte ←/→/Espace en CAPTURE phase pour rerouter vers la nav
    // intra-page (slides 1 -> 2 -> 3 via gotoSlide), au lieu de laisser nav.js
    // sauter direct a la page suivante. Sur slide 3, seul le CTA passe a B1.
    const onKeyNav = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        if (slide < 3) {
          e.preventDefault();
          e.stopImmediatePropagation();
          gotoSlide(slide + 1);
        } else {
          // sur slide 3 : on bloque (CTA "ON DEMARRE LE MONTAGE" est le chemin canonique)
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (slide > 1) {
          e.preventDefault();
          e.stopImmediatePropagation();
          gotoSlide(slide - 1);
        }
        // sur slide 1 : on laisse passer pour reculer vers A5
        return;
      }
    };
    window.addEventListener('keydown', onKeyNav, true);
    handlers.push([window, 'keydown', onKeyNav, true]);
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
  },

  serialize() {
    return { slide, placedZones: { ...placedZones }, customCards: [...customCards] };
  },

  isComplete() {
    return slide === 3;
  },

  replay() {
    return true;
  },
};

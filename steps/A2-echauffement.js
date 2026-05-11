// A2-echauffement.js — Mini-jeu devinette en 2 phases.
// Phase 1 : 8 cartes face cachee (objets electroniques de la maison),
//           clic = flip + reveal. Bouton 'suivant' apparait des 3/8.
// Phase 2 : 3 slots a remplir (objets lumineux de la classe). Input + Entree.
//           CTA 'on continue' des 1 slot rempli (recommande 3).

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';

const STYLE_ID = 'step-A2-style';

const OBJETS = [
  { id: 1, label: 'manette' },
  { id: 2, label: 'smartphone' },
  { id: 3, label: 'enceinte' },
  { id: 4, label: 'trottinette' },
  { id: 5, label: 'telecommande' },
  { id: 6, label: 'micro-ondes' },
  { id: 7, label: 'sonnette' },
  { id: 8, label: 'casque' },
];

const STYLES = `
.step-A2 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

.step-A2__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: var(--s-4);
}

.step-A2__consigne {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1.05;
  margin: 0;
  text-align: center;
}

.step-A2__main {
  display: grid;
  place-content: center;
  position: relative;
}

.step-A2__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 180px));
  grid-template-rows: repeat(2, 1fr);
  gap: var(--s-3);
}

.step-A2__card {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  perspective: 1000px;
  cursor: var(--cursor-pointer);
}

.step-A2__card-inner {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  transition: transform 500ms var(--ease-bounce);
}

.step-A2__card.is-revealed .step-A2__card-inner {
  transform: rotateY(180deg);
}

.step-A2__face {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  display: grid;
  place-items: center;
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  font-family: var(--display);
  font-weight: 900;
  text-align: center;
  padding: var(--s-2);
}

.step-A2__face--back {
  background: var(--accent-1);
  color: var(--paper);
  font-size: 80px;
}

.step-A2__face--front {
  background: var(--paper);
  color: var(--ink);
  transform: rotateY(180deg);
  font-size: var(--t-h2);
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.step-A2__card.is-tremble .step-A2__card-inner {
  animation: a2-tremble 280ms ease-in-out;
}

@keyframes a2-tremble {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-3px); }
  75%      { transform: translateX(3px); }
}

.step-A2__slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 280px));
  gap: var(--s-3);
}

.step-A2__slot {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  display: grid;
  place-items: center;
  text-align: center;
  padding: var(--s-3);
}

.step-A2__slot-num {
  position: absolute;
  top: var(--s-2);
  left: var(--s-2);
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.18em;
  opacity: 0.45;
}

.step-A2__slot-content {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  text-transform: uppercase;
  color: var(--ink);
}

.step-A2__slot.is-empty .step-A2__slot-content {
  font-size: 80px;
  color: var(--accent-1);
  opacity: 0.6;
}

.step-A2__slot.is-filled {
  background: var(--accent-3);
  cursor: var(--cursor-pointer);
}

.step-A2__slot-input-wrap {
  width: min(540px, 60vw);
  justify-self: center;
  margin-top: var(--s-3);
}

.step-A2__bottom {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;

let phase = 1;
let revealedCards = [];
let lightObjects = ['', '', ''];

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
  saveStepState('A2', { phase, revealedCards: [...revealedCards], lightObjects: [...lightObjects] });
}

export default {
  id: 'A2',
  phase: 'A',
  title: 'Echauffement',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    const restored = savedState || getStepState('A2') || {};
    phase = restored.phase === 2 ? 2 : 1;
    revealedCards = Array.isArray(restored.revealedCards) ? [...restored.revealedCards] : [];
    lightObjects = Array.isArray(restored.lightObjects) && restored.lightObjects.length === 3
      ? [...restored.lightObjects]
      : ['', '', ''];

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A2';

    // ----- Top : Tuko + consigne + compteur ---------------------------------
    const top = document.createElement('div');
    top.className = 'step-A2__top';

    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'mysterieux');
    tuko.setAttribute('data-position', 'inline');
    top.appendChild(tuko);

    const consigne = document.createElement('h2');
    consigne.className = 'step-A2__consigne';
    top.appendChild(consigne);

    const counter = document.createElement('div');
    counter.className = 'compteur-geant';
    const counterValue = document.createElement('div');
    counterValue.className = 'compteur-geant__value';
    counter.appendChild(counterValue);
    const counterLabel = document.createElement('div');
    counterLabel.className = 'compteur-geant__label';
    counterLabel.textContent = 'trouves';
    counter.appendChild(counterLabel);
    top.appendChild(counter);

    wrap.appendChild(top);

    // ----- Main : zone changeante -------------------------------------------
    const main = document.createElement('div');
    main.className = 'step-A2__main';
    wrap.appendChild(main);

    // ----- Bottom : CTA -----------------------------------------------------
    const bottom = document.createElement('div');
    bottom.className = 'step-A2__bottom';
    const cta = document.createElement('button');
    cta.className = 'cta-secondary';
    cta.type = 'button';
    bottom.appendChild(cta);
    wrap.appendChild(bottom);

    const watermark = document.createElement('div');
    watermark.style.position = 'absolute';
    watermark.style.right = 'var(--s-4)';
    watermark.style.bottom = 'var(--s-3)';
    watermark.style.fontFamily = 'var(--mono)';
    watermark.style.fontSize = 'var(--t-tiny)';
    watermark.style.opacity = '0.5';
    watermark.style.letterSpacing = '0.16em';
    watermark.style.pointerEvents = 'none';
    watermark.textContent = 'wubo . argibi';
    wrap.appendChild(watermark);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Helpers ----------------------------------------------------------
    function refreshCounter() {
      if (phase === 1) {
        counterValue.textContent = `${revealedCards.length}/8`;
      } else {
        counterValue.textContent = `${lightObjects.filter(s => s.trim()).length}/3`;
      }
      counterValue.classList.add('is-pulsing');
      const t = setTimeout(() => counterValue.classList.remove('is-pulsing'), 200);
      timers.push(t);
    }

    function refreshCTA() {
      if (phase === 1) {
        const ok = revealedCards.length >= 3;
        cta.textContent = '> SUIVANT';
        cta.classList.toggle('is-disabled', !ok);
        cta.disabled = !ok;
        cta.style.visibility = revealedCards.length >= 3 ? 'visible' : 'hidden';
      } else {
        const filled = lightObjects.filter(s => s.trim()).length;
        const ok = filled >= 1;
        cta.textContent = '> ON CONTINUE';
        cta.classList.toggle('is-disabled', !ok);
        cta.disabled = !ok;
        cta.style.visibility = ok ? 'visible' : 'hidden';
      }
    }

    function renderPhase1() {
      consigne.textContent = "j'ai cache 8 objets electroniques de chez toi derriere ces cartes. devinez.";
      main.replaceChildren();

      const grid = document.createElement('div');
      grid.className = 'step-A2__grid';
      main.appendChild(grid);

      OBJETS.forEach(obj => {
        const card = document.createElement('div');
        card.className = 'step-A2__card';
        card.dataset.id = String(obj.id);
        if (revealedCards.includes(obj.id)) card.classList.add('is-revealed');

        const inner = document.createElement('div');
        inner.className = 'step-A2__card-inner';

        const back = document.createElement('div');
        back.className = 'step-A2__face step-A2__face--back';
        back.textContent = '?';
        inner.appendChild(back);

        const front = document.createElement('div');
        front.className = 'step-A2__face step-A2__face--front';
        front.textContent = obj.label;
        inner.appendChild(front);

        card.appendChild(inner);

        const onCardClick = () => {
          if (card.classList.contains('is-revealed')) return;
          card.classList.add('is-revealed');
          if (!revealedCards.includes(obj.id)) {
            revealedCards.push(obj.id);
            persist();
            refreshCounter();
            refreshCTA();
          }
          // boule de neige : autres cartes tremblent
          grid.querySelectorAll('.step-A2__card').forEach(c => {
            if (!c.classList.contains('is-revealed')) {
              c.classList.add('is-tremble');
              const t = setTimeout(() => c.classList.remove('is-tremble'), 320);
              timers.push(t);
            }
          });
        };
        card.addEventListener('click', onCardClick);
        handlers.push([card, 'click', onCardClick]);

        grid.appendChild(card);
      });
    }

    function renderPhase2() {
      consigne.textContent = 'et dans cette classe, citez-moi 3 objets qui ont de la lumiere.';
      main.replaceChildren();

      const slotsWrap = document.createElement('div');
      slotsWrap.style.display = 'grid';
      slotsWrap.style.gap = 'var(--s-3)';
      slotsWrap.style.justifyItems = 'center';

      const slots = document.createElement('div');
      slots.className = 'step-A2__slots';

      let activeSlot = lightObjects.findIndex(s => !s.trim());
      if (activeSlot < 0) activeSlot = 0;

      const inputWrap = document.createElement('div');
      inputWrap.className = 'step-A2__slot-input-wrap';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input-mega';
      input.placeholder = 'tape un objet + Entree';
      input.maxLength = 24;
      input.autocomplete = 'off';
      input.spellcheck = false;
      inputWrap.appendChild(input);

      function focusInput() {
        if (lightObjects.findIndex(s => !s.trim()) >= 0) {
          setTimeout(() => input.focus(), 50);
        } else {
          input.blur();
        }
      }

      function renderSlots() {
        slots.replaceChildren();
        for (let i = 0; i < 3; i++) {
          const slot = document.createElement('div');
          slot.className = 'step-A2__slot';
          slot.dataset.idx = String(i);

          const num = document.createElement('div');
          num.className = 'step-A2__slot-num';
          num.textContent = String(i + 1);
          slot.appendChild(num);

          const content = document.createElement('div');
          content.className = 'step-A2__slot-content';

          if (lightObjects[i] && lightObjects[i].trim()) {
            slot.classList.add('is-filled');
            content.textContent = lightObjects[i];
            const onClear = () => {
              lightObjects[i] = '';
              persist();
              renderSlots();
              refreshCounter();
              refreshCTA();
              focusInput();
            };
            slot.addEventListener('click', onClear);
            handlers.push([slot, 'click', onClear]);
          } else {
            slot.classList.add('is-empty');
            content.textContent = '?';
          }
          slot.appendChild(content);
          slots.appendChild(slot);
        }
      }
      renderSlots();

      const onInputKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          const idx = lightObjects.findIndex(s => !s.trim());
          if (idx < 0) return;
          lightObjects[idx] = val;
          input.value = '';
          persist();
          renderSlots();
          refreshCounter();
          refreshCTA();
          focusInput();
        } else if (e.key === 'Backspace' && input.value === '') {
          e.preventDefault();
          // vide le dernier slot rempli
          for (let i = 2; i >= 0; i--) {
            if (lightObjects[i] && lightObjects[i].trim()) {
              lightObjects[i] = '';
              persist();
              renderSlots();
              refreshCounter();
              refreshCTA();
              break;
            }
          }
        }
      };
      input.addEventListener('keydown', onInputKey);
      handlers.push([input, 'keydown', onInputKey]);

      slotsWrap.appendChild(slots);
      slotsWrap.appendChild(inputWrap);
      main.appendChild(slotsWrap);

      focusInput();
    }

    function switchToPhase(p) {
      phase = p;
      persist();
      if (phase === 1) renderPhase1();
      else renderPhase2();
      refreshCounter();
      refreshCTA();
    }

    if (phase === 1) renderPhase1();
    else renderPhase2();
    refreshCounter();
    refreshCTA();

    const onCTA = () => {
      if (phase === 1) {
        if (revealedCards.length >= 3) switchToPhase(2);
      } else {
        if (lightObjects.some(s => s.trim())) {
          if (navAPIRef) navAPIRef.markComplete();
          if (navAPIRef) navAPIRef.next();
        }
      }
    };
    cta.addEventListener('click', onCTA);
    handlers.push([cta, 'click', onCTA]);

    // ----- Raccourcis 1-8 phase 1, geres au niveau page --------------------
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (phase !== 1) return;
      const n = parseInt(e.key, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 8) {
        e.preventDefault();
        const card = main.querySelector(`.step-A2__card[data-id="${n}"]`);
        if (card && !card.classList.contains('is-revealed')) card.click();
      }
    };
    window.addEventListener('keydown', onKey);
    handlers.push([window, 'keydown', onKey]);
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
    return { phase, revealedCards: [...revealedCards], lightObjects: [...lightObjects] };
  },

  isComplete() {
    return phase === 2 && lightObjects.some(s => s.trim());
  },

  replay() {
    return true;
  },
};

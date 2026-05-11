// A1-qui-est-la.js — Saisie des prenoms de la classe.
// Input centre + nuage de chips + compteur haut-droite + CTA C'EST PARTI.
// Sas de bascule (3 . 2 . 1 . flash) au clic CTA, puis nav.next() vers A2.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';

const STYLE_ID = 'step-A1-style';

const STYLES = `
.step-A1 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: var(--s-5);
  gap: var(--s-3);
  background: var(--bg);
  overflow: hidden;
}

.step-A1__top {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: var(--s-4);
}

.step-A1__input-wrap {
  justify-self: center;
  width: min(540px, 60vw);
  display: grid;
  gap: var(--s-1);
}

.step-A1__input {
  text-align: center;
}

.step-A1__counter {
  justify-self: end;
}

.step-A1__cloud {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-3);
  justify-content: center;
  align-content: flex-start;
  padding: var(--s-4) var(--s-5);
  overflow: hidden;
}

.step-A1__chip {
  --rot: 0deg;
  animation: a1-chip-pop 320ms var(--ease-bounce) backwards;
}

.step-A1__chip.is-removing {
  animation: a1-chip-leave 220ms var(--ease-out) forwards;
}

@keyframes a1-chip-pop {
  0%   { opacity: 0; transform: rotate(var(--rot)) scale(0.4); }
  60%  { opacity: 1; transform: rotate(var(--rot)) scale(1.1); }
  100% { opacity: 1; transform: rotate(var(--rot)) scale(1); }
}

@keyframes a1-chip-leave {
  0%   { opacity: 1; transform: rotate(var(--rot)) scale(1); }
  100% { opacity: 0; transform: rotate(var(--rot)) scale(0.4); }
}

.step-A1__bottom {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}

.step-A1__cta-hint {
  font-family: var(--mono);
  font-size: var(--t-tiny);
  letter-spacing: 0.18em;
  text-transform: lowercase;
  color: var(--ink);
  opacity: 0.55;
}

.step-A1__overlay {
  position: absolute; inset: 0;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--display);
  font-size: 240px;
  font-weight: 900;
  z-index: 50;
  opacity: 0;
  pointer-events: none;
}

.step-A1__overlay.is-active {
  opacity: 0.92;
  pointer-events: auto;
}

.step-A1__overlay-num {
  animation: a1-countdown 400ms var(--ease-bounce);
}

@keyframes a1-countdown {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

.step-A1__flash {
  position: absolute; inset: 0;
  background: var(--paper);
  opacity: 0;
  pointer-events: none;
  z-index: 60;
}

.step-A1__flash.is-flashing {
  animation: a1-flash 400ms var(--ease-out) forwards;
}

@keyframes a1-flash {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let navAPIRef = null;
let students = [];

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
  saveStepState('A1', { students: students.map(s => ({ name: s.name, addedAt: s.addedAt })) });
}

export default {
  id: 'A1',
  phase: 'A',
  title: 'Qui est la',
  estimatedDuration: 90,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    ensureStyle();

    scene = new Container();
    container.addChild(scene);

    students = [];
    const restored = (savedState?.students || getStepState('A1')?.students || []);
    if (Array.isArray(restored)) {
      students = restored
        .map(s => ({ name: typeof s === 'string' ? s : s?.name, addedAt: s?.addedAt || Date.now() }))
        .filter(s => s.name && typeof s.name === 'string');
    }

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A1';

    // ----- Top : input + compteur ------------------------------------------
    const top = document.createElement('div');
    top.className = 'step-A1__top';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'step-A1__input-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-mega step-A1__input';
    input.placeholder = 'tape un prenom + Entree';
    input.maxLength = 24;
    input.autocomplete = 'off';
    input.spellcheck = false;
    inputWrap.appendChild(input);

    top.appendChild(inputWrap);

    const counter = document.createElement('div');
    counter.className = 'compteur-geant step-A1__counter';
    const counterValue = document.createElement('div');
    counterValue.className = 'compteur-geant__value';
    counterValue.textContent = String(students.length);
    counter.appendChild(counterValue);
    const counterLabel = document.createElement('div');
    counterLabel.className = 'compteur-geant__label';
    counterLabel.textContent = 'eleves';
    counter.appendChild(counterLabel);
    top.appendChild(counter);

    wrap.appendChild(top);

    // ----- Cloud -----------------------------------------------------------
    const cloud = document.createElement('div');
    cloud.className = 'step-A1__cloud';
    wrap.appendChild(cloud);

    // ----- Bottom : Tuko + CTA ---------------------------------------------
    const bottom = document.createElement('div');
    bottom.className = 'step-A1__bottom';

    const cta = document.createElement('button');
    cta.className = 'cta-primary';
    cta.type = 'button';
    cta.textContent = '> C\'EST PARTI';
    bottom.appendChild(cta);

    const ctaHint = document.createElement('div');
    ctaHint.className = 'step-A1__cta-hint';
    ctaHint.textContent = 'ajoute au moins un prenom';
    bottom.appendChild(ctaHint);

    wrap.appendChild(bottom);

    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte';
    tuko.setAttribute('data-pose', 'spectateur');
    tuko.setAttribute('data-position', 'bas-gauche');
    wrap.appendChild(tuko);

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

    // ----- Overlay countdown + flash ---------------------------------------
    const overlay = document.createElement('div');
    overlay.className = 'step-A1__overlay';
    wrap.appendChild(overlay);

    const flash = document.createElement('div');
    flash.className = 'step-A1__flash';
    wrap.appendChild(flash);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Logique ---------------------------------------------------------
    function refreshCounter() {
      counterValue.textContent = String(students.length);
      counterValue.classList.add('is-pulsing');
      const t = setTimeout(() => counterValue.classList.remove('is-pulsing'), 200);
      timers.push(t);
    }

    function refreshCTA() {
      const ok = students.length > 0;
      cta.classList.toggle('is-disabled', !ok);
      cta.disabled = !ok;
      ctaHint.style.visibility = ok ? 'hidden' : 'visible';
    }

    function renderChip(student) {
      const chip = document.createElement('span');
      chip.className = 'chip step-A1__chip';
      const rot = (Math.random() * 6 - 3).toFixed(2);
      chip.style.setProperty('--rot', `${rot}deg`);
      chip.textContent = student.name;
      chip.dataset.name = student.name;

      const onChipClick = (e) => {
        e.stopPropagation();
        chip.classList.add('is-removing');
        const t = setTimeout(() => {
          chip.remove();
          students = students.filter(s => s !== student);
          persist();
          refreshCounter();
          refreshCTA();
        }, 220);
        timers.push(t);
      };
      chip.addEventListener('click', onChipClick);
      handlers.push([chip, 'click', onChipClick]);
      cloud.appendChild(chip);
      return chip;
    }

    students.forEach(renderChip);
    refreshCounter();
    refreshCTA();

    function addStudent(rawName) {
      const name = (rawName || '').trim();
      if (!name) return;
      if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
      const student = { name, addedAt: Date.now() };
      students.push(student);
      renderChip(student);
      persist();
      refreshCounter();
      refreshCTA();
    }

    function removeLast() {
      if (students.length === 0) return;
      const last = students[students.length - 1];
      const chip = cloud.querySelector(`.chip[data-name="${CSS.escape ? CSS.escape(last.name) : last.name}"]`);
      if (chip) chip.click();
      else {
        students.pop();
        persist();
        refreshCounter();
        refreshCTA();
      }
    }

    const onInputKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.value.trim()) {
          addStudent(input.value);
          input.value = '';
        }
      } else if (e.key === 'Backspace' && input.value === '') {
        e.preventDefault();
        removeLast();
      }
    };
    input.addEventListener('keydown', onInputKey);
    handlers.push([input, 'keydown', onInputKey]);

    setTimeout(() => input.focus(), 50);

    // ----- Sas de bascule au clic CTA --------------------------------------
    let launching = false;

    function launchSequence() {
      if (launching || students.length === 0) return;
      launching = true;
      persist();

      const steps = ['3', '2', '1'];
      let i = 0;
      overlay.classList.add('is-active');

      function tick() {
        if (i >= steps.length) {
          overlay.classList.remove('is-active');
          flash.classList.add('is-flashing');
          const t = setTimeout(() => {
            if (navAPIRef) navAPIRef.markComplete();
            if (navAPIRef) navAPIRef.next();
          }, 350);
          timers.push(t);
          return;
        }
        const num = document.createElement('div');
        num.className = 'step-A1__overlay-num';
        num.textContent = steps[i];
        overlay.replaceChildren(num);
        i++;
        const t = setTimeout(tick, 450);
        timers.push(t);
      }
      tick();
    }

    const onCTA = (e) => {
      e.preventDefault();
      launchSequence();
    };
    cta.addEventListener('click', onCTA);
    handlers.push([cta, 'click', onCTA]);
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
    students = [];
  },

  serialize() {
    return { students: students.map(s => ({ name: s.name, addedAt: s.addedAt })) };
  },

  isComplete() {
    return students.length > 0;
  },

  replay() {
    return true;
  },
};

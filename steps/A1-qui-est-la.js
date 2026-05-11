// A1-qui-est-la.js — Saisie des prenoms de la classe.
// Layout vertical centre : tuko absolute top-left, titre, input, cloud
// (zone papier grande pour 25+ chips) avec compteur a droite, CTA en bas.
// Chaque chip prend une couleur aleatoire des 4 accents Wubo avec
// texte adapte pour le contraste (paper sur violet/rose, ink sur cyan/jaune).
// CTA non anime, sans chevron. Sas de bascule (3.2.1.flash) au clic CTA.
// Bandeaux shell visibles (pas fullscreen).
// Cf. doc interne.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { saveStepState, getStepState } from '../core/state.js';

const STYLE_ID = 'step-A1-style';

// Couleurs accent Wubo + texte contraste adapte (AA min).
const CHIP_COLORS = [
  { bg: 'var(--accent-1)', text: 'var(--paper)' }, // violet -> texte blanc
  { bg: 'var(--accent-2)', text: 'var(--ink)'   }, // cyan   -> texte noir
  { bg: 'var(--accent-3)', text: 'var(--ink)'   }, // jaune  -> texte noir
  { bg: 'var(--accent-4)', text: 'var(--paper)' }, // rose   -> texte blanc
];

const STYLES = `
.step-A1 {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--s-2);
  padding: var(--s-8) var(--s-5); /* 128px top/bottom : grosse respiration cible Taki */
  background: var(--bg);
  overflow: hidden;
}

/* ----- Tuko : pose sur le bord superieur gauche du cloud, derriere -------- */

.step-A1__tuko {
  position: absolute;
  top: 7px;
  left: var(--s-3);
  --tuko-mascotte-size: clamp(140px, 13vw, 180px);
  background: url('assets/sprites/tuko_spectate.png') center / contain no-repeat !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  animation: a1-tuko-bobbing 2.4s ease-in-out infinite !important;
  z-index: 1; /* derriere le cloud (z-index 2) */
  pointer-events: none;
}

.step-A1__tuko::before,
.step-A1__tuko::after {
  content: none !important;
  display: none !important;
}

@keyframes a1-tuko-bobbing {
  0%, 100% { transform: translateY(0)    rotate(-2deg); }
  50%      { transform: translateY(-6px) rotate(2deg); }
}

/* ----- Title (centre) ----------------------------------------------------- */

.step-A1__title {
  font-family: var(--display);
  font-size: clamp(44px, 4.2vw, 64px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
  text-align: center;
  justify-self: center;
}

/* ----- Input (centre) ----------------------------------------------------- */

.step-A1__input-wrap {
  width: min(640px, 60vw);
  justify-self: center;
}

.step-A1__input {
  text-align: center;
  font-size: clamp(22px, 1.9vw, 30px);
  padding: 30px var(--s-3);
}

/* ----- Cloud-area : cloud centre, tuko + compteur en absolute sur le frame */

.step-A1__cloud-area {
  display: flex;
  justify-content: center;
  align-items: stretch;
  min-height: 0;
  width: 100%;
  height: 80%;
}

/* Frame autour du cloud : permet de poser tuko (gauche) et compteur (droite)
   en absolute relatifs au cloud, soit en debord au-dessus, soit poses sur
   le bord superieur du cloud. Le cloud (z-index 2) passe devant. */
.step-A1__cloud-frame {
  position: relative;
  width: min(1700px, 100%);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.step-A1__cloud {
  position: relative;
  z-index: 2; /* devant le tuko (z-index 1) */
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--paper);
  border: var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  justify-content: center;
  align-content: center;
  padding: var(--s-3) var(--s-4);
  overflow-y: auto;
  overflow-x: hidden;
}

.step-A1__cloud::-webkit-scrollbar { width: 8px; }
.step-A1__cloud::-webkit-scrollbar-thumb { background: var(--ink); border-radius: 4px; opacity: 0.3; }

.step-A1__cloud-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: var(--t-body);
  color: var(--ink);
  opacity: 0.35;
  letter-spacing: 0.16em;
  text-transform: lowercase;
  pointer-events: none;
  text-align: center;
  padding: var(--s-3);
}

/* ----- Chips : couleur aleatoire parmi 4 accents Wubo --------------------- */

.step-A1__chip {
  --rot: 0deg;
  --float-delay: 0s;
  font-size: clamp(20px, 1.6vw, 28px);
  padding: 10px var(--s-3);
  border: var(--border);
  box-shadow: var(--shadow-sm);
  /* background + color setes inline par renderChip() depuis CHIP_COLORS */
  animation-name: a1-chip-pop, a1-chip-float;
  animation-duration: 320ms, 3.6s;
  animation-timing-function: var(--ease-bounce), ease-in-out;
  animation-delay: 0s, calc(320ms + var(--float-delay));
  animation-fill-mode: backwards, none;
  animation-iteration-count: 1, infinite;
}

.step-A1__chip.is-removing {
  animation-name: a1-chip-leave !important;
  animation-duration: 220ms !important;
  animation-timing-function: var(--ease-out) !important;
  animation-delay: 0s !important;
  animation-fill-mode: forwards !important;
  animation-iteration-count: 1 !important;
}

@keyframes a1-chip-pop {
  0%   { opacity: 0; transform: rotate(var(--rot)) scale(0.4); }
  60%  { opacity: 1; transform: rotate(var(--rot)) scale(1.1); }
  100% { opacity: 1; transform: rotate(var(--rot)) scale(1); }
}

@keyframes a1-chip-float {
  0%, 100% { transform: rotate(var(--rot))              translateY(0); }
  50%      { transform: rotate(calc(var(--rot) + 2deg)) translateY(-5px); }
}

@keyframes a1-chip-leave {
  0%   { opacity: 1; transform: rotate(var(--rot)) scale(1); }
  100% { opacity: 0; transform: rotate(var(--rot)) scale(0.4); }
}

/* ----- Compteur : pose sur le bord superieur droit du cloud (symetrique tuko) */

.step-A1__counter {
  position: absolute;
  top: 7px;
  right: var(--s-3);
  z-index: 1; /* derriere le cloud, comme tuko */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.step-A1 .compteur-geant__value {
  font-size: clamp(48px, 4.4vw, 72px);
  color: var(--ink);
  line-height: 1;
}

.step-A1 .compteur-geant__label {
  font-size: var(--t-small);
  color: var(--ink);
  opacity: 0.65;
  letter-spacing: 0.18em;
}

/* ----- CTA (centre, non anime) -------------------------------------------- */

.step-A1__cta-area {
  display: grid;
  justify-items: center;
  margin-top: var(--s-3); /* +24px d'air entre le cloud et le CTA */
}

.step-A1__cta {
  animation: none !important;
  font-size: clamp(28px, 2.4vw, 40px);
  padding: 12px var(--s-5);
}

/* ----- Sas de bascule (countdown + flash) --------------------------------- */

.step-A1__overlay {
  position: absolute; inset: 0;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--display);
  font-size: clamp(180px, 22vw, 280px);
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
  0%   { transform: scale(0.4);  opacity: 0; }
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
  saveStepState('A1', { students: students.map(s => ({ name: s.name, addedAt: s.addedAt, colorIdx: s.colorIdx })) });
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
        .map(s => ({
          name: typeof s === 'string' ? s : s?.name,
          addedAt: s?.addedAt || Date.now(),
          colorIdx: Number.isInteger(s?.colorIdx) ? s.colorIdx : Math.floor(Math.random() * CHIP_COLORS.length),
        }))
        .filter(s => s.name && typeof s.name === 'string');
    }

    const stage = document.querySelector('#stage');
    const wrap = document.createElement('div');
    wrap.className = 'step-A1';

    // ----- Title (centre) -------------------------------------------------
    const title = document.createElement('h1');
    title.className = 'step-A1__title';
    title.textContent = 'QUI EST LÀ ?';
    wrap.appendChild(title);

    // ----- Input (centre) -------------------------------------------------
    const inputWrap = document.createElement('div');
    inputWrap.className = 'step-A1__input-wrap';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-mega step-A1__input';
    input.placeholder = 'Prénom';
    input.maxLength = 24;
    input.autocomplete = 'off';
    input.spellcheck = false;
    inputWrap.appendChild(input);
    wrap.appendChild(inputWrap);

    // ----- Cloud-area : cloud-frame centre. Tuko (gauche) et compteur ----
    // (droite) sont en absolute dans le frame, poses sur le bord du cloud.
    const cloudArea = document.createElement('div');
    cloudArea.className = 'step-A1__cloud-area';

    const cloudFrame = document.createElement('div');
    cloudFrame.className = 'step-A1__cloud-frame';

    const tuko = document.createElement('div');
    tuko.className = 'tuko-mascotte step-A1__tuko';
    tuko.setAttribute('data-pose', 'spectateur');
    tuko.setAttribute('data-position', 'inline');
    cloudFrame.appendChild(tuko);

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
    cloudFrame.appendChild(counter);

    const cloud = document.createElement('div');
    cloud.className = 'step-A1__cloud';

    const cloudEmpty = document.createElement('div');
    cloudEmpty.className = 'step-A1__cloud-empty';
    cloudEmpty.textContent = '...';
    cloud.appendChild(cloudEmpty);

    cloudFrame.appendChild(cloud);
    cloudArea.appendChild(cloudFrame);

    wrap.appendChild(cloudArea);

    // ----- CTA (centre, non anime) ----------------------------------------
    const ctaArea = document.createElement('div');
    ctaArea.className = 'step-A1__cta-area';
    const cta = document.createElement('button');
    cta.className = 'cta-primary step-A1__cta';
    cta.type = 'button';
    cta.textContent = "C'EST PARTI";
    ctaArea.appendChild(cta);
    wrap.appendChild(ctaArea);

    // ----- Overlay countdown + flash --------------------------------------
    const overlay = document.createElement('div');
    overlay.className = 'step-A1__overlay';
    wrap.appendChild(overlay);

    const flash = document.createElement('div');
    flash.className = 'step-A1__flash';
    wrap.appendChild(flash);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // ----- Logique --------------------------------------------------------
    function refreshCounter() {
      counterValue.textContent = String(students.length);
      counterValue.classList.add('is-pulsing');
      const t = setTimeout(() => counterValue.classList.remove('is-pulsing'), 200);
      timers.push(t);
    }

    function refreshCloudEmpty() {
      cloudEmpty.style.display = students.length === 0 ? '' : 'none';
    }

    function refreshCTA() {
      const ok = students.length > 0;
      cta.classList.toggle('is-disabled', !ok);
      cta.disabled = !ok;
    }

    function renderChip(student) {
      const chip = document.createElement('span');
      chip.className = 'chip step-A1__chip';
      const rot = (Math.random() * 6 - 3).toFixed(2);
      const floatDelay = (Math.random() * 2).toFixed(2);
      const palette = CHIP_COLORS[student.colorIdx % CHIP_COLORS.length];
      chip.style.setProperty('--rot', `${rot}deg`);
      chip.style.setProperty('--float-delay', `${floatDelay}s`);
      chip.style.background = palette.bg;
      chip.style.color = palette.text;
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
          refreshCloudEmpty();
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
    refreshCloudEmpty();
    refreshCTA();

    function addStudent(rawName) {
      const name = (rawName || '').trim();
      if (!name) return;
      if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
      const student = {
        name,
        addedAt: Date.now(),
        colorIdx: Math.floor(Math.random() * CHIP_COLORS.length),
      };
      students.push(student);
      renderChip(student);
      persist();
      refreshCounter();
      refreshCloudEmpty();
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
        refreshCloudEmpty();
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
    return { students: students.map(s => ({ name: s.name, addedAt: s.addedAt, colorIdx: s.colorIdx })) };
  },

  isComplete() {
    return students.length > 0;
  },

  replay() {
    return true;
  },
};

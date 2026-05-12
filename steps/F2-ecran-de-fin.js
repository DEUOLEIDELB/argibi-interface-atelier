// F2 — Ecran de fin .
// Source : doc interne.
// Page paisible apres le pic d'F1. L'animateur recolte les retours A L'ORAL.
// Aucune saisie, aucun chip, aucun feu d'artifice : decompression.
//
// Mode shell : standard (fullscreen: false) -> watermark visible.
// Composants partages :
//   - .titre-hero `MERCI` (smash doux + heartbeat lent)
//   - .sous-titre `vous avez sauvé la capsule`
//   - .matrice-8x8 + .matrice-8x8__pixel (respiration + pattern signature coeur/sourire)
//   - .tuko-mascotte[data-pose="stop"] bas-gauche : Tuko qui ecoute
//   - .cta-primary `> FIN DE L'ATELIER`
//
// Specials :
//   - 3 formulations alternees toutes les 30s
//   - Pattern signature occasionnel sur la matrice (coeur ou sourire ~chaque 12s)
//   - "Pose une oreille" : Tuko avance discretement pendant les silences
//   - Bouton `RAPPORT` -> overlay step-local avec export CSV / JSON
//
// Persistance : { ended: true, endedAt: timestamp }.

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { getState } from '../core/state.js';

let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let intervals = [];
let tickerFns = [];
let styleEl = null;
let nav = null;

const QUESTIONS = [
  '« c\'était bien ? · qu\'avez-vous retenu ? »',
  '« qu\'avez-vous préféré ? · ce qui vous a surpris ? »',
  '« et la prochaine fois, vous voulez quoi ? »',
];
let questionIdx = 0;

const QUESTION_CYCLE_MS  = 30000;
const PATTERN_CYCLE_MS   = 12000;
const PATTERN_DISPLAY_MS = 2500;
const EAR_POSE_INTERVAL  = 22000;
const EAR_POSE_DURATION  = 1800;

// Patterns 8x8 signature (cf. B4). 1 = pixel allume, 0 = eteint.
const PATTERN_COEUR = [
  0,1,1,0,0,1,1,0,
  1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,
  0,1,1,1,1,1,1,0,
  0,0,1,1,1,1,0,0,
  0,0,0,1,1,0,0,0,
  0,0,0,0,0,0,0,0,
];

const PATTERN_SOURIRE = [
  0,0,0,0,0,0,0,0,
  0,1,1,0,0,1,1,0,
  0,1,1,0,0,1,1,0,
  0,0,0,0,0,0,0,0,
  1,0,0,0,0,0,0,1,
  1,1,0,0,0,0,1,1,
  0,1,1,1,1,1,1,0,
  0,0,1,1,1,1,0,0,
];

const PATTERNS = [PATTERN_COEUR, PATTERN_SOURIRE];
const PATTERN_COLORS = ['is-on-rose', 'is-on-jaune', 'is-on-cyan'];

// --------------------------------------------------------------------------
// CSS local — scope .step-F2.
// --------------------------------------------------------------------------

const CSS = `
.step-F2 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  align-items: center;
  justify-items: center;
  gap: var(--s-4);
  padding: var(--s-6) var(--s-6) var(--s-8);
  background: var(--bg);
}

.step-F2__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  text-align: center;
}

.step-F2__title {
  transform: scale(0);
  animation: f2-title-smash var(--d-slow) var(--ease-bounce) forwards,
             f2-heartbeat 4s ease-in-out infinite var(--d-slow);
}

@keyframes f2-title-smash {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes f2-heartbeat {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.015); }
}

.step-F2__subtitle {
  opacity: 0;
  transform: translateY(10px);
  animation: f2-fade-up var(--d-slow) var(--ease-out) var(--d-fast) forwards;
}

@keyframes f2-fade-up {
  to { opacity: 1; transform: translateY(0); }
}

.step-F2__hero-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--s-5);
  transform: scale(0);
  animation: f2-hero-arrive var(--d-slow) var(--ease-bounce) var(--d-normal) forwards,
             f2-hero-breathe 4s ease-in-out infinite var(--d-hero);
}

@keyframes f2-hero-arrive {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes f2-hero-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.015); }
}

/* Question oralisee. */
.step-F2__qwrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  max-width: 1300px;
  text-align: center;
}

.step-F2__question {
  font-family: var(--display);
  font-size: clamp(28px, 2.4vw, 40px);
  font-weight: 600;
  font-style: italic;
  color: var(--ink);
  white-space: nowrap;
  margin: 0;
  opacity: 0;
  animation: f2-fade-in var(--d-slow) var(--ease-out) var(--d-hero) forwards;
}

@keyframes f2-fade-in {
  to { opacity: 1; }
}

/* Zone bottom : CTA + bouton rapport. */
.step-F2__bottom {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--s-3);
  position: relative;
}

.step-F2__cta {
  opacity: 0;
  transform: translateY(10px);
  animation: f2-fade-up var(--d-slow) var(--ease-out) calc(var(--d-hero) + var(--d-slow)) forwards;
}

.step-F2__report-btn {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: transparent;
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  cursor: var(--cursor-pointer);
  opacity: 0;
  transform: translateY(10px);
  animation: f2-fade-up var(--d-slow) var(--ease-out) calc(var(--d-hero) + var(--d-slow)) forwards;
  transition: background var(--d-fast) var(--ease-out),
              color var(--d-fast) var(--ease-out);
}

.step-F2__report-btn:hover {
  background: var(--ink);
  color: var(--paper);
}

/* Overlay rapport — step-local, modale simple. */
.step-F2__report-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: color-mix(in srgb, var(--ink) 65%, transparent);
  display: none;
  align-items: center;
  justify-content: center;
  padding: var(--s-4);
}

.step-F2__report-overlay.is-open { display: flex; }

.step-F2__report-panel {
  background: var(--paper);
  border: var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--r-lg);
  padding: var(--s-5);
  width: min(720px, 90vw);
  max-height: 90vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.step-F2__report-title {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
}

.step-F2__report-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: var(--s-3);
  font-family: var(--mono);
  font-size: var(--t-body);
  padding: var(--s-1) 0;
  border-bottom: 1px dashed var(--ink);
}

.step-F2__report-row .label {
  opacity: 0.55;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.step-F2__report-row .value {
  font-weight: 700;
  text-align: right;
}

.step-F2__report-actions {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
  margin-top: var(--s-2);
}

.step-F2__report-action {
  font-family: var(--mono);
  font-size: var(--t-small);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: var(--bg-2);
  color: var(--ink);
  border: var(--border-thin);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  cursor: var(--cursor-pointer);
  transition: background var(--d-fast) var(--ease-out);
}

.step-F2__report-action.is-primary {
  background: var(--accent-1);
  color: var(--paper);
}

.step-F2__report-action:hover {
  background: var(--ink);
  color: var(--paper);
}
`;

// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

function injectStyle() {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.id = 'step-F2-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
}

function setT(ms, fn) {
  const t = setTimeout(fn, ms);
  timers.push(t);
  return t;
}

function setI(ms, fn) {
  const t = setInterval(fn, ms);
  intervals.push(t);
  return t;
}

function clearAll() {
  timers.forEach(clearTimeout);
  timers = [];
  intervals.forEach(clearInterval);
  intervals = [];
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

function readFinalCode() {
  const state = getState();
  const couleur = state.steps?.E3?.couleur || ['_', '_'];
  const pixel   = state.steps?.E3?.pixel   || ['_', '_'];
  const d5 = state.steps?.E4?.digit5 ?? '_';
  const d6 = state.steps?.E4?.digit6 ?? '_';
  return [
    couleur[0], couleur[1], pixel[0], pixel[1], d5, d6,
  ].map(String).join('');
}

function readReport() {
  const state = getState();
  const students = (state.steps?.A1?.students || [])
    .map(s => (typeof s === 'string' ? s : s?.name))
    .filter(Boolean);
  const code = readFinalCode();
  const codeComplete = !code.includes('_');
  const duration = state.startedAt ? Date.now() - state.startedAt : null;
  const history = state.history || [];
  return {
    sessionId: state.sessionId || '—',
    startedAt: state.startedAt,
    endedAt: Date.now(),
    durationMs: duration,
    durationLabel: fmtDuration(duration),
    students,
    studentsCount: students.length,
    code,
    codeComplete,
    pagesVisited: [...history, state.currentStepId].filter(Boolean),
    pagesCount: history.length + 1,
  };
}

// --------------------------------------------------------------------------
// Matrice 8x8 — respiration + pattern signature occasionnel.
// --------------------------------------------------------------------------

function buildMatrice(anchor) {
  const grid = document.createElement('div');
  grid.className = 'matrice-8x8 matrice-8x8--mini is-respirante';

  const pixels = [];
  for (let i = 0; i < 64; i++) {
    const pix = document.createElement('span');
    pix.className = 'matrice-8x8__pixel';
    grid.appendChild(pix);
    pixels.push(pix);
  }
  anchor.appendChild(grid);
  return { grid, pixels };
}

function applyPattern(pixels, pattern, colorClass) {
  pixels.forEach((pix, i) => {
    pix.classList.remove('is-pattern', 'is-on-cyan', 'is-on-jaune', 'is-on-rose', 'is-on-violet');
    if (pattern[i]) {
      pix.classList.add('is-pattern', colorClass);
    }
  });
}

function clearPattern(pixels) {
  pixels.forEach(pix => {
    pix.classList.remove('is-pattern', 'is-on-cyan', 'is-on-jaune', 'is-on-rose', 'is-on-violet');
  });
}

function startPatternCycle(pixels) {
  let idx = 0;
  const tick = () => {
    const pattern = PATTERNS[idx % PATTERNS.length];
    const color = PATTERN_COLORS[idx % PATTERN_COLORS.length];
    applyPattern(pixels, pattern, color);
    setT(PATTERN_DISPLAY_MS, () => clearPattern(pixels));
    idx++;
  };
  // Premier pattern apres ~3s, puis toutes les PATTERN_CYCLE_MS.
  setT(3000, tick);
  setI(PATTERN_CYCLE_MS, tick);
}

// --------------------------------------------------------------------------
// Question cycle.
// --------------------------------------------------------------------------

function startQuestionCycle(questionEl) {
  setI(QUESTION_CYCLE_MS, () => {
    questionEl.classList.add('is-fading');
    setT(600, () => {
      questionIdx = (questionIdx + 1) % QUESTIONS.length;
      questionEl.textContent = QUESTIONS[questionIdx];
      questionEl.classList.remove('is-fading');
    });
  });
}

// --------------------------------------------------------------------------
// Tuko "pose une oreille" occasionnel.
// --------------------------------------------------------------------------

function startEarPoseCycle(tukoEl) {
  setI(EAR_POSE_INTERVAL, () => {
    tukoEl.classList.remove('is-listening');
    void tukoEl.offsetWidth;
    tukoEl.classList.add('is-listening');
    setT(EAR_POSE_DURATION, () => tukoEl.classList.remove('is-listening'));
  });
}

// --------------------------------------------------------------------------
// Overlay rapport — export CSV / JSON / clipboard.
// --------------------------------------------------------------------------

function buildReportOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'step-F2__report-overlay';

  const panel = document.createElement('div');
  panel.className = 'step-F2__report-panel';

  const title = document.createElement('h2');
  title.className = 'step-F2__report-title';
  title.textContent = 'Rapport d\'atelier';
  panel.appendChild(title);

  const r = readReport();

  const rows = [
    ['Session', r.sessionId],
    ['Durée totale', r.durationLabel],
    ['Élèves', `${r.studentsCount} (${r.students.join(', ') || '—'})`],
    ['Code final saisi', r.code],
    ['Code complet ?', r.codeComplete ? 'oui' : 'non'],
    ['Pages parcourues', String(r.pagesCount)],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'step-F2__report-row';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'value';
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    panel.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'step-F2__report-actions';

  const btnCsv = document.createElement('button');
  btnCsv.className = 'step-F2__report-action is-primary';
  btnCsv.type = 'button';
  btnCsv.textContent = '⬇ csv';
  btnCsv.addEventListener('click', () => downloadCsv(r));
  actions.appendChild(btnCsv);

  const btnJson = document.createElement('button');
  btnJson.className = 'step-F2__report-action';
  btnJson.type = 'button';
  btnJson.textContent = '⬇ json';
  btnJson.addEventListener('click', () => downloadJson(r));
  actions.appendChild(btnJson);

  const btnCopy = document.createElement('button');
  btnCopy.className = 'step-F2__report-action';
  btnCopy.type = 'button';
  btnCopy.textContent = '📋 copier';
  btnCopy.addEventListener('click', () => copyJsonToClipboard(r, btnCopy));
  actions.appendChild(btnCopy);

  const btnClose = document.createElement('button');
  btnClose.className = 'step-F2__report-action';
  btnClose.type = 'button';
  btnClose.textContent = 'fermer';
  btnClose.addEventListener('click', () => overlay.classList.remove('is-open'));
  actions.appendChild(btnClose);

  panel.appendChild(actions);
  overlay.appendChild(panel);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('is-open');
  });

  return overlay;
}

function reportToCsv(r) {
  const rows = [
    ['key', 'value'],
    ['session', r.sessionId],
    ['startedAt', r.startedAt ? new Date(r.startedAt).toISOString() : ''],
    ['endedAt', r.endedAt ? new Date(r.endedAt).toISOString() : ''],
    ['durationMs', String(r.durationMs ?? '')],
    ['durationLabel', r.durationLabel],
    ['studentsCount', String(r.studentsCount)],
    ['students', r.students.join('|')],
    ['code', r.code],
    ['codeComplete', r.codeComplete ? 'true' : 'false'],
    ['pagesCount', String(r.pagesCount)],
    ['pagesVisited', r.pagesVisited.join('|')],
  ];
  return rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setT(500, () => URL.revokeObjectURL(url));
}

function downloadCsv(r) {
  triggerDownload(reportToCsv(r), `wubo-atelier-${r.sessionId || 'demo'}.csv`, 'text/csv;charset=utf-8');
}

function downloadJson(r) {
  triggerDownload(JSON.stringify(r, null, 2), `wubo-atelier-${r.sessionId || 'demo'}.json`, 'application/json;charset=utf-8');
}

function copyJsonToClipboard(r, btn) {
  const text = JSON.stringify(r, null, 2);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => { btn.textContent = '✓ copié'; setT(1500, () => { btn.textContent = '📋 copier'; }); },
      () => { btn.textContent = '✗ refusé'; setT(1500, () => { btn.textContent = '📋 copier'; }); },
    );
  } else {
    btn.textContent = '✗ indisponible';
    setT(1500, () => { btn.textContent = '📋 copier'; });
  }
}

// --------------------------------------------------------------------------
// Contrat de step.
// --------------------------------------------------------------------------

export default {
  id: 'F2',
  phase: 'F',
  title: 'Écran de fin',
  estimatedDuration: 0,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    nav = navAPI;
    questionIdx = 0;
    injectStyle();

    scene = new Container();
    container.addChild(scene);

    const stage = document.querySelector('#stage');
    const root = document.createElement('div');
    root.className = 'step-F2';

    // Head : MERCI + sous-titre.
    const head = document.createElement('div');
    head.className = 'step-F2__head';

    const titre = document.createElement('h1');
    titre.className = 'titre-hero step-F2__title';
    titre.textContent = 'MERCI';
    head.appendChild(titre);

    const sub = document.createElement('p');
    sub.className = 'sous-titre step-F2__subtitle';
    sub.textContent = 'vous avez sauvé la capsule';
    head.appendChild(sub);

    root.appendChild(head);

    // Hero : juste la matrice qui respire (sans card argibi, sans Tuko presentateur).
    const heroWrap = document.createElement('div');
    heroWrap.className = 'step-F2__hero-wrap';
    const matrice = buildMatrice(heroWrap);
    root.appendChild(heroWrap);

    // Question unique sur une ligne (plus de hint, plus de cycle).
    const qWrap = document.createElement('div');
    qWrap.className = 'step-F2__qwrap';

    const question = document.createElement('p');
    question.className = 'step-F2__question';
    question.textContent = '« qu’avez-vous préféré ? · ce qui vous a surpris ? »';
    qWrap.appendChild(question);

    root.appendChild(qWrap);

    // Bottom : CTA + bouton rapport.
    const bottom = document.createElement('div');
    bottom.className = 'step-F2__bottom';

    const cta = document.createElement('button');
    cta.className = 'cta-primary step-F2__cta';
    cta.textContent = '▶ FIN DE L\'ATELIER';
    cta.type = 'button';
    bottom.appendChild(cta);

    const reportBtn = document.createElement('button');
    reportBtn.className = 'step-F2__report-btn';
    reportBtn.type = 'button';
    reportBtn.textContent = '📋 rapport';
    bottom.appendChild(reportBtn);

    root.appendChild(bottom);

    // (Tuko bas-gauche retire sur demande Taki.)

    // Overlay rapport (step-local, monte separement sur body pour ne pas etre
    // soumis aux transformations du shell).
    const reportOverlay = buildReportOverlay();
    document.body.appendChild(reportOverlay);
    domNodes.push(reportOverlay);

    stage.appendChild(root);
    domNodes.push(root);

    // Cycles auto (plus de earPose : pas de Tuko bas-gauche).
    startPatternCycle(matrice.pixels);
    void question; // question fixe, plus de cycle

    // Listeners.
    const onClose = () => {
      try {
        navAPI.saveState({ steps: { F2: { ended: true, endedAt: Date.now() } } });
        navAPI.markComplete();
      } catch (err) { console.warn('[F2] save failed', err); }
      window.dispatchEvent(new CustomEvent('argibi:atelier-ended', {
        detail: { endedAt: Date.now() },
      }));
    };
    cta.addEventListener('click', onClose);
    handlers.push([cta, 'click', onClose]);

    const onReport = () => {
      // Re-builds the report a chaque ouverture pour avoir des donnees fraiches.
      const fresh = buildReportOverlay();
      reportOverlay.replaceWith(fresh);
      // Maj de la ref dans domNodes.
      const idx = domNodes.indexOf(reportOverlay);
      if (idx >= 0) domNodes[idx] = fresh;
      fresh.classList.add('is-open');
    };
    reportBtn.addEventListener('click', onReport);
    handlers.push([reportBtn, 'click', onReport]);

    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      // Espace fait office de CTA (l'animateur peut quitter au clavier).
      // Note : nav.js gere deja Espace -> next(). Comme F2 est le dernier step
      // et qu'il n'y a pas de step suivant, next() loggera "pas de step suivant"
      // sans crash. On laisse passer.
      void e;
    };
    window.addEventListener('keydown', onKey, true);
    handlers.push([window, 'keydown', onKey, true]);

    // Restauration : si deja ended, l'etat reste identique (page passive).
    void savedState;
  },

  exit() {
    handlers.forEach(([target, event, fn, capture]) => target.removeEventListener(event, fn, capture));
    handlers = [];

    clearAll();

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    domNodes.forEach(n => n.remove());
    domNodes = [];

    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }

    nav = null;
  },

  serialize() {
    const st = getState().steps?.F2 || {};
    return { ended: !!st.ended, endedAt: st.endedAt ?? null };
  },

  isComplete() {
    return Boolean(getState().steps?.F2?.ended);
  },

  replay() {
    return true;
  },
};

// nav.js — API de navigation. Source : doc interne §6.2.
//
// Le navAPI est passé à chaque step.enter(container, savedState, navAPI).
// Il maintient currentStepId, history, unlockedSteps. Il charge dynamiquement
// le module step par son ID (/steps/<id>-<slug>.js).
//
// Auto-discovery  : on importe /steps/<id>-<slug>.js a la volee.
// En cas d'echec (fichier absent), on log info et on reste sur le step courant.
// Plus de manifest steps/index.json a maintenir cote .

import { Container } from 'pixi.js';
import { app } from './app.js';
import { loadBundleInBackground } from './assets.js';
import {
  STEP_ORDER, STEP_SLUGS, PHASE_OF, phaseOfStep,
} from './step-order.js';
import {
  getState, saveState, saveStepState, getStepState, startSessionIfNeeded,
} from './state.js';

const PHASES = ['A', 'B', 'C', 'D', 'E', 'F'];

let currentStep = null;        // module step actuellement monté
let currentStepId = null;
let currentContainer = null;   // Pixi Container parent du step
const stepCache = {};          // id -> module (mémoïse les imports)
let isTransitioning = false;

export const navAPI = {
  next: () => goRelative(+1),
  back: () => goRelative(-1),
  goTo: (stepId) => mountStep(stepId),
  markComplete: () => {
    const id = currentStepId;
    if (!id) return;
    saveStepState(id, { isComplete: true });
    notifyShellUpdate();
  },
  unlock: (stepId) => {
    const state = getState();
    const list = state.unlockedSteps || [];
    if (!list.includes(stepId)) {
      saveState({ unlockedSteps: [...list, stepId] });
      notifyShellUpdate();
    }
  },
  requestAnimatorAction: (label) => {
    window.dispatchEvent(new CustomEvent('argibi:request-animator-action', { detail: { label } }));
  },
  saveState: (partial) => saveState(partial),
  // Lecture utile aux pages
  get currentStepId() { return currentStepId; },
  get history() { return [...(getState().history || [])]; },
};

// Exposition globale pour debug + accès depuis Alpine.
globalThis.__navAPI = navAPI;
if (typeof window !== 'undefined') {
  window.nav = navAPI;
}

export async function bootNav() {
  startSessionIfNeeded('demo');

  currentContainer = new Container();
  currentContainer.label = 'step-root';
  app.stage.addChild(currentContainer);

  // Au boot : on cherche dans l'ordre :
  //  1. Le step persiste en localStorage (reprise de session) s'il existe encore.
  //  2. Le premier step de STEP_ORDER dont le module est trouvable (typiquement A0).
  //  3. _template (fallback pedagogique si AUCUN step livre, donc plus jamais en prod).
  const persisted = getState().currentStepId;
  let initialId = null;

  if (persisted && persisted !== '_template') {
    const mod = await loadStepModule(persisted);
    if (mod) initialId = persisted;
  }

  if (!initialId) {
    for (const id of STEP_ORDER) {
      const mod = await loadStepModule(id);
      if (mod) { initialId = id; break; }
    }
  }

  if (!initialId) initialId = '_template';

  await mountStep(initialId);

  installKeyboardShortcuts();
  notifyShellUpdate();
}

async function loadStepModule(stepId) {
  if (stepCache[stepId]) return stepCache[stepId];

  if (stepId === '_template') {
    try {
      const mod = await import('../steps/_template.js');
      stepCache[stepId] = mod.default;
      return mod.default;
    } catch (err) {
      console.error('[nav] _template introuvable :', err.message);
      return null;
    }
  }

  const slug = STEP_SLUGS[stepId];
  if (!slug) {
    console.warn(`[nav] Aucun slug défini pour stepId="${stepId}"`);
    return null;
  }
  // Auto-discovery : try-import direct. Si le fichier n'existe pas
  // (step pas encore livre par son ), on log info et retourne null.
  try {
    const mod = await import(`../steps/${stepId}-${slug}.js`);
    stepCache[stepId] = mod.default;
    return mod.default;
  } catch (err) {
    console.info(`[nav] step "${stepId}" non implémenté (${err.message})`);
    return null;
  }
}

async function mountStep(stepId) {
  if (isTransitioning) {
    console.info('[nav] transition déjà en cours, ignore', stepId);
    return;
  }
  isTransitioning = true;
  try {
    const newStep = await loadStepModule(stepId);
    if (!newStep) {
      // Step pas encore implémenté : on reste sur le step courant.
      isTransitioning = false;
      return;
    }

    // 1. Exit du step courant.
    if (currentStep) {
      try { currentStep.exit(); }
      catch (err) { console.error(`[nav] exit() de ${currentStepId} a échoué`, err); }
    }

    // 2. Maj de l'historique + state.
    if (currentStepId && currentStepId !== stepId && stepId !== '_template') {
      const state = getState();
      const hist = [...(state.history || []), currentStepId];
      saveState({ history: hist });
    }
    saveState({ currentStepId: stepId });
    currentStepId = stepId;

    // 3. Toggle fullscreen sur le shell.
    const shell = document.querySelector('#shell');
    if (shell) shell.classList.toggle('is-fullscreen', Boolean(newStep.fullscreen));

    // 4. Enter du nouveau step.
    const savedState = getStepState(stepId);
    try {
      await newStep.enter(currentContainer, savedState, navAPI);
    } catch (err) {
      console.error(`[nav] enter() de ${stepId} a échoué`, err);
    }
    currentStep = newStep;

    // 5. Précharge la phase suivante en arrière-plan.
    const phase = phaseOfStep(stepId);
    if (phase) {
      const idx = PHASES.indexOf(phase);
      if (idx >= 0 && idx < PHASES.length - 1) {
        loadBundleInBackground(`phase-${PHASES[idx + 1]}`);
      }
    }

    notifyShellUpdate();
  } finally {
    isTransitioning = false;
  }
}

async function goRelative(delta) {
  if (currentStepId === '_template') {
    return mountStep(delta > 0 ? 'A0' : '_template');
  }
  const idx = STEP_ORDER.indexOf(currentStepId);
  if (idx < 0) {
    console.warn(`[nav] currentStepId="${currentStepId}" hors STEP_ORDER`);
    return;
  }
  // Cherche le prochain step livre dans la direction (skip ceux non implementes).
  for (let i = idx + delta; i >= 0 && i < STEP_ORDER.length; i += delta) {
    const target = STEP_ORDER[i];
    const mod = await loadStepModule(target);
    if (mod) return mountStep(target);
  }
  console.info(`[nav] pas de step ${delta > 0 ? 'suivant' : 'précédent'} livré`);
}

export function resetCurrentStep() {
  return mountStep(currentStepId || '_template');
}

function notifyShellUpdate() {
  const state = getState();
  const phase = phaseOfStep(currentStepId);
  const phaseSteps = phase ? PHASE_OF[phase] : [];
  const stepInPhaseIdx = phaseSteps.indexOf(currentStepId);

  window.dispatchEvent(new CustomEvent('argibi:nav-changed', {
    detail: {
      currentStepId,
      phase,
      phaseSteps,
      stepInPhaseIdx,
      isComplete: Boolean(state.steps?.[currentStepId]?.isComplete),
      history: [...(state.history || [])],
      fullscreen: Boolean(currentStep?.fullscreen),
    },
  }));
}

function installKeyboardShortcuts() {
  const onKey = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

    if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      navAPI.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navAPI.back();
    } else if (e.key === 'm' || e.key === 'M') {
      window.dispatchEvent(new CustomEvent('argibi:toggle-phases'));
    } else if (e.key === 'h' || e.key === 'H') {
      window.dispatchEvent(new CustomEvent('argibi:toggle-animator'));
    } else if (e.key === 'r' || e.key === 'R') {
      try { currentStep?.replay?.(); }
      catch (err) { console.error('[nav] replay() failed', err); }
    } else if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('argibi:close-overlays'));
    }
  };
  window.addEventListener('keydown', onKey);
}

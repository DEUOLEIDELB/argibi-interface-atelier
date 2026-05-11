// state.js — Persistance localStorage. Source : doc interne

const STORAGE_KEY = 'argibi-atelier';
const VERSION = '1.0';

const DEFAULT_STATE = {
  version: VERSION,
  sessionId: null,
  startedAt: null,
  updatedAt: null,
  currentStepId: null,
  history: [],
  unlockedSteps: [],
  steps: {},
  audio: { muted: false },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (parsed.version !== VERSION) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...parsed, steps: parsed.steps || {} };
  } catch (err) {
    console.warn('[state] localStorage parse failed, fresh start.', err);
    return { ...DEFAULT_STATE };
  }
}

function persist() {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[state] localStorage write failed.', err);
  }
}

export function getState() {
  return state;
}

export function saveState(partial = {}) {
  if (partial.steps) {
    state.steps = { ...state.steps, ...partial.steps };
    delete partial.steps;
  }
  Object.assign(state, partial);
  persist();
  return state;
}

export function saveStepState(stepId, partial) {
  state.steps[stepId] = { ...(state.steps[stepId] || {}), ...partial };
  persist();
}

export function getStepState(stepId) {
  return state.steps[stepId] || null;
}

export function startSessionIfNeeded(schoolId = 'demo') {
  if (state.sessionId && isSameDay(state.startedAt)) return false;
  state.sessionId = `${schoolId}-${formatDate(new Date())}`;
  state.startedAt = Date.now();
  state.updatedAt = Date.now();
  state.currentStepId = null;
  state.history = [];
  state.unlockedSteps = [];
  state.steps = {};
  persist();
  return true;
}

export function resetSession() {
  state = { ...DEFAULT_STATE };
  try { localStorage.removeItem(STORAGE_KEY); }
  catch (err) { console.warn('[state] reset failed.', err); }
  return state;
}

export function hasResumableSession() {
  return Boolean(state.sessionId)
    && Boolean(state.currentStepId)
    && isSameDay(state.startedAt);
}

function isSameDay(timestamp) {
  if (!timestamp) return false;
  const a = new Date(timestamp);
  const b = new Date();
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDate(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

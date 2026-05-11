// audio.js — Gestion sons + mute global. Pas d'autoplay.
// Sons préchargés au boot.
//
// Liste des sons disponibles tenue dans `assets/sounds/index.json` (manifest
// edite a la main des qu'un MP3 est livre dans le dossier).
// Tant que la liste est vide, preloadSounds() ne fait AUCUN appel reseau sur
// les MP3, donc aucun 404. Format attendu :
//
//   { "sounds": [ "pop", "success", ... ] }
//
// Chaque entree fait correspondre `<nom>.mp3` dans `assets/sounds/`.

import { saveState, getState } from './state.js';

const SOUNDS_DIR = 'assets/sounds';
const MANIFEST_URL = `${SOUNDS_DIR}/index.json`;
const MAX_VOLUME = 0.7;

const audioCache = {};
let muted = !!getState().audio?.muted;

async function loadSoundsManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.sounds) ? json.sounds : [];
  } catch {
    // Pas d'index.json -> pas de sons. Comportement attendu.
    return [];
  }
}

export async function preloadSounds() {
  const list = await loadSoundsManifest();
  for (const name of list) {
    try {
      const a = new Audio(`${SOUNDS_DIR}/${name}.mp3`);
      a.preload = 'auto';
      a.volume = MAX_VOLUME;
      audioCache[name] = a;
    } catch { /* ignore : son ignore */ }
  }
}

export function play(soundName) {
  if (muted) return;
  const a = audioCache[soundName];
  if (!a) {
    // Son non charge (pas encore livre) : info dev, pas warning.
    console.info(`[audio] sound "${soundName}" non charge (fichier manquant ?)`);
    return;
  }
  try {
    const clone = a.cloneNode(true);
    clone.volume = MAX_VOLUME;
    clone.play().catch(() => { /* navigateur refuse autoplay sans interaction */ });
  } catch (err) {
    console.info(`[audio] play "${soundName}" a echoue :`, err.message);
  }
}

export function stop(soundName) {
  const a = audioCache[soundName];
  if (!a) return;
  try { a.pause(); a.currentTime = 0; } catch { /* noop */ }
}

export function setMuted(value) {
  muted = !!value;
  saveState({ audio: { muted } });
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

export function isMuted() { return muted; }

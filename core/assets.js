// assets.js — Wrapper Pixi Assets (preload par phase, cache).
// Source : doc interne + §8.

import { Assets } from 'pixi.js';

let manifestLoaded = false;
const loadedBundles = new Set();

export async function initAssets(manifestUrl = 'assets/manifest.json') {
  if (manifestLoaded) return;
  await Assets.init({ manifest: manifestUrl });
  manifestLoaded = true;
}

export async function loadBundle(name) {
  if (!manifestLoaded) {
    console.warn('[assets] initAssets() pas appelé avant loadBundle');
    return null;
  }
  if (loadedBundles.has(name)) return Assets.get(name);
  try {
    const result = await Assets.loadBundle(name);
    loadedBundles.add(name);
    return result;
  } catch (err) {
    console.warn(`[assets] loadBundle("${name}") failed:`, err.message);
    return null;
  }
}

export function loadBundleInBackground(name) {
  if (!manifestLoaded || loadedBundles.has(name)) return;
  loadBundle(name).catch(() => { /* déjà loggué */ });
}

export function getAsset(alias) {
  return Assets.get(alias);
}

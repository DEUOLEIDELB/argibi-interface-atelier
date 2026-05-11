// app.js — Bootstrap Pixi v8. UNE SEULE Application pour toute la session.
// Source : doc interne

import { Application } from 'pixi.js';
import { initAssets, loadBundle, loadBundleInBackground } from './assets.js';

export const app = new Application();

let initialized = false;

export async function bootApp() {
  if (initialized) return app;
  const stage = document.querySelector('#stage');
  if (!stage) throw new Error('[app] #stage introuvable dans le DOM');

  await app.init({
    resizeTo: stage,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  app.canvas.id = 'pixi-canvas';
  app.canvas.style.position = 'absolute';
  app.canvas.style.inset = '0';
  app.canvas.style.pointerEvents = 'none'; // les overlays DOM gèrent les events
  stage.appendChild(app.canvas);

  await initAssets('assets/manifest.json');
  await loadBundle('common');
  loadBundleInBackground('phase-A');

  initialized = true;
  return app;
}

// _template.js — Squelette du contrat de step. Les  dupliquent
// ce fichier en /steps/<id>-<slug>.js puis remplissent enter()/exit().
// Source : doc interne + doc interne

import { Container } from 'pixi.js';
import { app } from '../core/app.js';

// État interne au module — garde les références pour exit() propre.
let scene = null;       // Container Pixi de la page (vide ici)
let domNodes = [];      // Éléments DOM ajoutés à la zone de contenu
let handlers = [];      // [target, event, fn] pour cleanup
let timers = [];        // setTimeout IDs
let tickerFns = [];     // fonctions registered sur app.ticker

export default {
  id: '_template',
  phase: '_',
  title: 'Template (page factice)',
  estimatedDuration: 0,
  isCollective: false,
  requiresAnimator: false,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    // 1. Scène Pixi VIDE — pattern de demonstration uniquement.
    //    En vraie page : populer `scene` (sprites, particles, drag&drop, etc.)
    //    Cf. doc interne et §8.
    scene = new Container();
    container.addChild(scene);

    // 2. DOM principal — createElement + textContent (jamais innerHTML
    //    avec contenu dynamique cf. doc interne).
    const stage = document.querySelector('#stage');

    const wrap = document.createElement('div');
    wrap.className = 'tpl-wrap';
    wrap.style.position = 'absolute';
    wrap.style.inset = '0';
    wrap.style.display = 'grid';
    wrap.style.placeContent = 'center';
    wrap.style.textAlign = 'center';
    wrap.style.gap = '24px';
    wrap.style.cursor = 'var(--cursor-pointer)';

    const titre = document.createElement('h1');
    titre.className = 'titre-hero';
    titre.textContent = '_template.js OK';
    wrap.appendChild(titre);

    const sous = document.createElement('p');
    sous.className = 'sous-titre';
    sous.textContent = 'template pret. clique pour navAPI.next()';
    wrap.appendChild(sous);

    stage.appendChild(wrap);
    domNodes.push(wrap);

    // 3. Listener (garde en reference pour cleanup).
    const onClick = () => navAPI.next();
    wrap.addEventListener('click', onClick);
    handlers.push([wrap, 'click', onClick]);

    // 4. Restaurer savedState si pertinent (rien ici).
    void savedState;
  },

  exit() {
    handlers.forEach(([target, event, fn]) => target.removeEventListener(event, fn));
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
  },

  serialize() {
    return {};
  },

  isComplete() {
    return false;
  },

  replay() {
    // En vraie page : exit() puis re-jouer juste l'animation principale
    // sans ecraser le state de progression. Pour le template (pas d'animation),
    // on signale juste que c'est OK.
    return true;
  },
};

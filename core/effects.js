// effects.js — Helpers JS pour animations DOM riches : étincelles cyan,
// confettis reward, shockwave, pluie de prénoms, fireworks.
//
// Contrat de chaque helper :
//   - prend un anchor DOM (parent du noeud cree) ou des coords {x, y}
//   - cree des noeuds DOM stylises (classes .etincelles-cyan/.confettis-reward
//     /.shockwave/.pluie-de-prenoms/.fireworks definies dans components.css)
//   - lance l'animation
//   - retourne une fonction stop() OU une Promise resolvant a la fin
//   - garantit le cleanup : tous les noeuds crees sont retires du DOM
//
// Aucune couleur hardcodee : les palettes viennent des tokens via CSS custom
// properties (--fireworks-color, etc.).

// --------------------------------------------------------------------------
// Etincelles cyan (composant 5.7)
// --------------------------------------------------------------------------

/**
 * Spawn des etincelles cyan qui orbitent autour d'un anchor DOM.
 *
 * @param {HTMLElement} anchor  noeud dans lequel monter le container (positionne)
 * @param {object} [opts]
 * @param {'douce'|'normale'|'dense'} [opts.densite='normale']
 * @param {number} [opts.duree=2000] duree totale en ms, 0 = jusqu'a stop()
 * @param {{x:number, y:number}} [opts.origine] origine relative a anchor (defaut centre)
 * @returns {() => void} fonction stop : annule + nettoie
 */
export function spawnEtincelles(anchor, opts = {}) {
  if (!(anchor instanceof HTMLElement)) return () => {};
  const densite = opts.densite || 'normale';
  const duree = opts.duree ?? 2000;
  const count = densite === 'dense' ? 12 : densite === 'douce' ? 4 : 8;

  // Container
  const container = document.createElement('div');
  container.className = 'etincelles-cyan';
  anchor.appendChild(container);

  // Si anchor n'a pas de positionnement, on le force relative (sans casser
  // le layout : on retabli au cleanup si on l'a change).
  const oldPosition = anchor.style.position;
  if (!oldPosition && getComputedStyle(anchor).position === 'static') {
    anchor.style.position = 'relative';
  }

  const ox = opts.origine?.x ?? anchor.clientWidth / 2;
  const oy = opts.origine?.y ?? anchor.clientHeight / 2;

  let stopped = false;
  const timers = [];
  const sparks = [];

  function emit() {
    if (stopped) return;
    for (let i = 0; i < 3; i++) {
      const spark = document.createElement('span');
      spark.className = 'etincelles-cyan__spark';
      spark.style.left = `${ox}px`;
      spark.style.top = `${oy}px`;
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      spark.style.setProperty('--etincelles-cyan-tx', `${Math.cos(angle) * dist}px`);
      spark.style.setProperty('--etincelles-cyan-ty', `${Math.sin(angle) * dist}px`);
      const sparkDuration = 700 + Math.random() * 400;
      spark.style.setProperty('--etincelles-cyan-duration', `${sparkDuration}ms`);
      container.appendChild(spark);
      sparks.push(spark);
      const t = setTimeout(() => spark.remove(), sparkDuration + 50);
      timers.push(t);
    }
    if (!stopped && duree === 0) {
      timers.push(setTimeout(emit, 250));
    }
  }

  // Rafale cadencee
  if (duree > 0) {
    const interval = duree / Math.max(1, count / 3);
    for (let i = 0; i < Math.ceil(count / 3); i++) {
      timers.push(setTimeout(emit, i * interval));
    }
    timers.push(setTimeout(() => stop(), duree + 1000));
  } else {
    emit();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    sparks.forEach(s => s.remove());
    container.remove();
    if (!oldPosition) anchor.style.position = '';
  }

  return stop;
}

// --------------------------------------------------------------------------
// Confettis reward (composant 5.8)
// --------------------------------------------------------------------------

/**
 * Spawn d'une gerbe de confettis depuis un point.
 *
 * @param {HTMLElement} anchor
 * @param {object} [opts]
 * @param {number} [opts.nombre=5] entre 3 et 5 par defaut
 * @param {{x:number, y:number}} [opts.origine] coords relatives a anchor
 * @returns {Promise<void>} resolved quand toutes les particules ont disparu
 */
export function spawnConfettis(anchor, opts = {}) {
  if (!(anchor instanceof HTMLElement)) return Promise.resolve();
  const nombre = Math.max(2, opts.nombre ?? 5);
  const palette = [
    'var(--accent-1)',
    'var(--accent-2)',
    'var(--accent-3)',
    'var(--accent-4)',
  ];

  const container = document.createElement('div');
  container.className = 'confettis-reward';
  anchor.appendChild(container);

  const oldPosition = anchor.style.position;
  if (!oldPosition && getComputedStyle(anchor).position === 'static') {
    anchor.style.position = 'relative';
  }

  const ox = opts.origine?.x ?? anchor.clientWidth / 2;
  const oy = opts.origine?.y ?? anchor.clientHeight / 2;

  const pieces = [];
  for (let i = 0; i < nombre; i++) {
    const piece = document.createElement('span');
    piece.className = 'confettis-reward__piece';
    piece.style.left = `${ox}px`;
    piece.style.top = `${oy}px`;
    piece.style.background = palette[(i + Math.floor(Math.random() * palette.length)) % palette.length];
    const dx = (Math.random() - 0.5) * 220;
    const dy = -80 - Math.random() * 120;
    const rot = (Math.random() - 0.5) * 720;
    const duration = 800 + Math.random() * 400;
    piece.style.setProperty('--confettis-reward-dx', `${dx}px`);
    piece.style.setProperty('--confettis-reward-dy', `${dy}px`);
    piece.style.setProperty('--confettis-reward-rot', `${rot}deg`);
    piece.style.setProperty('--confettis-reward-duration', `${duration}ms`);
    container.appendChild(piece);
    pieces.push({ piece, duration });
  }

  const maxDuration = Math.max(...pieces.map(p => p.duration));
  return new Promise(resolve => {
    setTimeout(() => {
      pieces.forEach(({ piece }) => piece.remove());
      container.remove();
      if (!oldPosition) anchor.style.position = '';
      resolve();
    }, maxDuration + 50);
  });
}

// --------------------------------------------------------------------------
// Shockwave (composant 5.9 - onde de victoire)
// --------------------------------------------------------------------------

/**
 * Spawn d'une onde de choc qui s'etend depuis un point.
 *
 * @param {HTMLElement} anchor
 * @param {object} [opts]
 * @param {{x:number, y:number}} [opts.origine] coords relatives a anchor (defaut centre)
 * @param {number} [opts.rayonMax=1200] rayon final en px
 * @param {number} [opts.duree=700] duree en ms
 * @param {string} [opts.couleur='var(--accent-3)'] couleur de la bordure
 * @returns {Promise<void>}
 */
export function spawnShockwave(anchor, opts = {}) {
  if (!(anchor instanceof HTMLElement)) return Promise.resolve();
  const rayonMax = opts.rayonMax ?? 1200;
  const duree = opts.duree ?? 700;
  const couleur = opts.couleur ?? 'var(--accent-3)';

  const wave = document.createElement('div');
  wave.className = 'shockwave';
  wave.style.borderColor = couleur;
  wave.style.setProperty('--shockwave-rayon', `${rayonMax}px`);
  wave.style.setProperty('--shockwave-duration', `${duree}ms`);

  const oldPosition = anchor.style.position;
  if (!oldPosition && getComputedStyle(anchor).position === 'static') {
    anchor.style.position = 'relative';
  }

  if (opts.origine) {
    wave.style.top = `${opts.origine.y}px`;
    wave.style.left = `${opts.origine.x}px`;
  }
  anchor.appendChild(wave);

  return new Promise(resolve => {
    setTimeout(() => {
      wave.remove();
      if (!oldPosition) anchor.style.position = '';
      resolve();
    }, duree + 50);
  });
}

// --------------------------------------------------------------------------
// Pluie de prenoms (composant 5.2 - parallax 3 niveaux)
// --------------------------------------------------------------------------

/**
 * Lance une pluie de prenoms qui tombent en parallax 3 niveaux.
 *
 * @param {HTMLElement} anchor
 * @param {object} [opts]
 * @param {string[]} [opts.prenoms] liste de prenoms (defaut lus depuis state.steps.A1.students)
 * @param {'douce'|'normale'|'dense'} [opts.intensite='normale']
 * @param {number} [opts.delayStart=0] delai avant le 1er spawn
 * @returns {() => void} fonction cleanup : stoppe + retire tous les noeuds
 */
export function startPluieDePrenoms(anchor, opts = {}) {
  if (!(anchor instanceof HTMLElement)) return () => {};
  const intensite = opts.intensite || 'normale';
  const minDelay = intensite === 'dense' ? 200 : intensite === 'douce' ? 1200 : 600;
  const jitter = intensite === 'dense' ? 200 : intensite === 'douce' ? 1500 : 800;

  // Source des prenoms : opts.prenoms > state.steps.A1.students > pool default
  const prenoms = readPrenomsSource(opts.prenoms);

  const container = document.createElement('div');
  container.className = 'pluie-de-prenoms';
  anchor.appendChild(container);

  const timers = [];
  let stopped = false;
  let recent = [];
  const POOL_SIZE = Math.min(prenoms.length, 6);

  function pickName() {
    const candidates = prenoms.filter(n => !recent.includes(n));
    const pool = candidates.length > 0 ? candidates : prenoms;
    const name = pool[Math.floor(Math.random() * pool.length)];
    recent.push(name);
    if (recent.length > POOL_SIZE) recent.shift();
    return name;
  }

  function spawn() {
    if (stopped || !container.isConnected) return;
    const drop = document.createElement('div');
    drop.className = 'pluie-de-prenoms__prenom';
    drop.textContent = pickName();
    const depth = Math.random();
    const size = depth < 0.33 ? 28 : depth < 0.66 ? 40 : 56;
    const opacity = 0.30 + Math.random() * 0.4;
    const duration = 4 + Math.random() * 6;
    const x = 5 + Math.random() * 90;
    const rot = (Math.random() * 10 - 5).toFixed(2);
    drop.style.setProperty('--pluie-de-prenoms-size', `${size}px`);
    drop.style.setProperty('--pluie-de-prenoms-opacity', String(opacity));
    drop.style.setProperty('--pluie-de-prenoms-duration', `${duration}s`);
    drop.style.setProperty('--pluie-de-prenoms-x', `${x}%`);
    drop.style.setProperty('--pluie-de-prenoms-rot', `${rot}deg`);
    container.appendChild(drop);
    timers.push(setTimeout(() => drop.remove(), duration * 1000 + 200));
  }

  function loop() {
    if (stopped) return;
    spawn();
    timers.push(setTimeout(loop, minDelay + Math.random() * jitter));
  }

  timers.push(setTimeout(loop, opts.delayStart ?? 0));

  return function cleanup() {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    container.remove();
  };
}

function readPrenomsSource(override) {
  if (Array.isArray(override) && override.length > 0) return override;
  try {
    // Import paresseux pour ne pas creer de dependance cyclique au boot.
    const state = (globalThis.__argibiState__) || null;
    const list = state?.steps?.A1?.students;
    if (Array.isArray(list) && list.length > 0) {
      return list.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
    }
  } catch {
    /* ignore */
  }
  // Fallback pool standalone (demo, F1 sans atelier reel).
  return ['Lea', 'Yanis', 'Mila', 'Adam', 'Ines', 'Noah', 'Zoe', 'Sami', 'Camille', 'Theo'];
}

// --------------------------------------------------------------------------
// Fireworks (extensible) - palette tinta complete
// --------------------------------------------------------------------------

/**
 * Spawn un feu d'artifice. N etincelles partent d'un point en rayons.
 *
 * @param {HTMLElement} anchor
 * @param {object} [opts]
 * @param {number} [opts.nombre=18]
 * @param {{x:number, y:number}} [opts.origine] coords relatives a anchor
 * @param {'tinta'|'jaune'|'cyan'|'violet'|'rose'} [opts.palette='tinta']
 * @returns {Promise<void>}
 */
export function spawnFireworks(anchor, opts = {}) {
  if (!(anchor instanceof HTMLElement)) return Promise.resolve();
  const nombre = Math.max(4, opts.nombre ?? 18);
  const paletteName = opts.palette || 'tinta';
  const palette = resolveFireworksPalette(paletteName);

  const container = document.createElement('div');
  container.className = 'fireworks';
  anchor.appendChild(container);

  const oldPosition = anchor.style.position;
  if (!oldPosition && getComputedStyle(anchor).position === 'static') {
    anchor.style.position = 'relative';
  }

  const ox = opts.origine?.x ?? anchor.clientWidth / 2;
  const oy = opts.origine?.y ?? anchor.clientHeight / 2;

  const sparks = [];
  for (let i = 0; i < nombre; i++) {
    const spark = document.createElement('span');
    spark.className = 'fireworks__spark';
    spark.style.setProperty('--fireworks-x', `${ox}px`);
    spark.style.setProperty('--fireworks-y', `${oy}px`);
    const angle = (i / nombre) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
    const dist = 180 + Math.random() * 220;
    spark.style.setProperty('--fireworks-dx', `${Math.cos(angle) * dist}px`);
    spark.style.setProperty('--fireworks-dy', `${Math.sin(angle) * dist}px`);
    spark.style.setProperty('--fireworks-color', palette[i % palette.length]);
    const duration = 900 + Math.random() * 600;
    spark.style.setProperty('--fireworks-duration', `${duration}ms`);
    container.appendChild(spark);
    sparks.push({ spark, duration });
  }

  const maxDuration = Math.max(...sparks.map(s => s.duration));
  return new Promise(resolve => {
    setTimeout(() => {
      sparks.forEach(({ spark }) => spark.remove());
      container.remove();
      if (!oldPosition) anchor.style.position = '';
      resolve();
    }, maxDuration + 50);
  });
}

function resolveFireworksPalette(name) {
  switch (name) {
    case 'jaune':  return ['var(--accent-3)'];
    case 'cyan':   return ['var(--accent-2)'];
    case 'violet': return ['var(--accent-1)'];
    case 'rose':   return ['var(--accent-4)'];
    case 'tinta':
    default:
      return [
        'var(--accent-1)',
        'var(--accent-2)',
        'var(--accent-3)',
        'var(--accent-4)',
      ];
  }
}

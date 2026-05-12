// D12-synthese-comptes-rendus.js
// Page de synthese de la Phase D : "ON A APPRIS QUOI ?"
// 2 slides : Slide 1 recap (3 cards + revelation binaire), Slide 2 vote
// prefere + chips retentions. Source : doc interne.
//
// reuse des composants partages (.tuko-mascotte, .compteur-geant)
// + reward spawnConfettis a la convergence finale
// + alignement state keys canoniques (D6.score V2 raffinee).

import { Container } from 'pixi.js';
import { app } from '../core/app.js';
import { getState } from '../core/state.js';
import { play as playSound } from '../core/audio.js';
import { spawnConfettis } from '../core/effects.js';

// ----- Etat module (references gardees pour exit() propre) -----
let scene = null;
let domNodes = [];
let handlers = [];
let timers = [];
let tickerFns = [];
let styleEl = null;

let navAPIRef = null;
let containerRef = null;

let currentSlide = 1;
let votes = { bouton: 0, interrupteur: 0, capteur: 0 };
let retentions = []; // [{ text, isKeyword }]

// Refs DOM par slide (re-affectees a chaque rendu)
let slideEl = null;
let voteCardEls = null;     // { bouton, interrupteur, capteur } -> .d12-vote-card
let voteBarEls = null;      // idem -> .d12-vote-card__bar
let voteCountEls = null;    // idem -> .compteur-geant__value (composant partage)
let chipsContainerEl = null;
let inputEl = null;
let ctaEl = null;
let captureKeyHandler = null;

const KEYS = ['bouton', 'interrupteur', 'capteur'];

// Mots-cles pedagogiques qui declenchent le glow d'une chip retention.
// Normalises (minuscules, sans accents) pour la comparaison.
const KEYWORDS_GLOW = ['binaire', '0', '1', 'signal', 'etat', 'conducteur', 'isolant', 'cadenas'];

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function isKeyword(text) {
  const tokens = normalize(text).split(/\s+/);
  return tokens.some(t => KEYWORDS_GLOW.includes(t));
}

function persist() {
  if (!navAPIRef) return;
  navAPIRef.saveState({
    steps: { D12: { slide: currentSlide, votes: { ...votes }, retentions: [...retentions] } },
  });
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function defer(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
  return id;
}

// ----- Construction des slides --------------------------------------------

function buildEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function attach(target, event, fn, opts) {
  target.addEventListener(event, fn, opts);
  handlers.push([target, event, fn, opts]);
}

function removeSlide() {
  if (!slideEl) return;
  // Anim de sortie courte avant retrait reel.
  const old = slideEl;
  old.classList.add('is-leaving');
  defer(() => {
    if (old.parentNode) old.parentNode.removeChild(old);
    domNodes = domNodes.filter(n => n !== old);
  }, 300);
  slideEl = null;
  voteCardEls = null;
  voteBarEls = null;
  voteCountEls = null;
  chipsContainerEl = null;
  inputEl = null;
  ctaEl = null;
}

function setSlide(n) {
  if (n === currentSlide && slideEl) return;
  removeSlide();
  currentSlide = n;
  if (n === 1) renderSlide1();
  else renderSlide2();
  persist();
}

// ----- Slide 1 -------------------------------------------------------------

function renderSlide1() {
  const root = buildEl('div', 'step-D12 step-D12--slide-1');

  const title = buildEl('h1', 'titre-hero d12-title', 'ON A APPRIS QUOI ?');
  root.appendChild(title);

  const recap = buildEl('div', 'd12-recap');

  const cardsRow = buildEl('div', 'd12-cards');
  const items = [
    { key: 'bouton',       name: 'BOUTON',       image: 'assets/sprites/D12/bouton.png'       },
    { key: 'interrupteur', name: 'INTERRUPTEUR', image: 'assets/sprites/D12/switch.png'       },
    { key: 'capteur',      name: 'CAPTEUR',      image: 'assets/sprites/D12/touch-sensor.svg' },
  ];
  items.forEach((it, i) => {
    const card = buildEl('div', `d12-card d12-card--${it.key}`);
    card.style.setProperty('--i', String(i));
    card.dataset.key = it.key;
    card.setAttribute('aria-label', it.name);

    const img = buildEl('img', 'd12-card__img');
    img.src = it.image;
    img.alt = '';
    img.loading = 'lazy';
    card.appendChild(img);

    cardsRow.appendChild(card);
  });
  recap.appendChild(cardsRow);

  const arrows = buildEl('div', 'd12-arrows', 'v   v   v');
  recap.appendChild(arrows);

  recap.appendChild(buildEl('p', 'd12-three-one', '3 MECANIQUES, 1 SEUL RESULTAT'));

  const binaire = buildEl('h2', 'd12-binaire');
  // Wrap du texte dans un span pour permettre un faux pseudo-glitch via
  // pseudo-elements (RGB shift sur ::before / ::after).
  const binaireText = buildEl('span', 'd12-binaire__text', '0 OU 1 : C’EST DU BINAIRE');
  binaireText.dataset.text = '0 OU 1 : C’EST DU BINAIRE';
  binaire.appendChild(binaireText);
  recap.appendChild(binaire);

  root.appendChild(recap);

  // Tuko_surf en bas-droite : la vibe "cool, on a fini un truc ensemble".
  const tuko = buildEl('img', 'd12-tuko-surf');
  tuko.src = 'assets/sprites/tuko_surf.png';
  tuko.alt = '';
  root.appendChild(tuko);

  // CTA
  const cta = buildEl('button', 'cta-primary d12-cta', '▶ COMMENT VOUS L’AVEZ VECU ?');
  attach(cta, 'click', () => {
    playSound('pop');
    setSlide(2);
  });
  root.appendChild(cta);
  ctaEl = cta;

  containerRef.appendChild(root);
  slideEl = root;
  domNodes.push(root);

  // Reflow puis kick l'animation d'entree.
  void root.offsetWidth;
  root.classList.add('is-entered');

  // Sons declenches en cascade avec l'apparition (volontairement timides).
  defer(() => playSound('whoosh'), 100);
  defer(() => playSound('whoosh'), 2300); // au moment du smash binaire
}

// ----- Slide 2 -------------------------------------------------------------

function renderSlide2() {
  const root = buildEl('div', 'step-D12 step-D12--slide-2');

  const title = buildEl('h1', 'titre-hero d12-title', 'VOTRE PREFERE ?');
  root.appendChild(title);

  // Bloc des stats vecues (defensif : masque si rien dans state)
  const statsLine = buildLivedStats();
  if (statsLine) root.appendChild(statsLine);

  // 3 cards de vote (pattern Grand Vote B3, scoped local).
  // compteur via .compteur-geant partage.
  const voteRow = buildEl('div', 'd12-vote-row');
  voteCardEls = {};
  voteBarEls = {};
  voteCountEls = {};

  const voteItems = [
    { key: 'bouton',       label: 'BOUTON' },
    { key: 'interrupteur', label: 'INTERRUPTEUR' },
    { key: 'capteur',      label: 'CAPTEUR' },
  ];
  voteItems.forEach((it, i) => {
    const card = buildEl('button', `d12-vote-card d12-vote-card--${it.key}`);
    card.style.setProperty('--i', String(i));
    card.dataset.key = it.key;
    card.setAttribute('aria-label', `voter pour ${it.label}`);

    card.appendChild(buildEl('div', 'd12-vote-card__name', it.label));

    const barWrap = buildEl('div', 'd12-vote-card__bar-wrap');
    const bar = buildEl('div', 'd12-vote-card__bar');
    barWrap.appendChild(bar);
    card.appendChild(barWrap);

    // Composant partage : .compteur-geant .
    const counter = buildEl('div', 'compteur-geant d12-vote-card__counter');
    const value = buildEl('div', 'compteur-geant__value', String(votes[it.key]));
    const label = buildEl('div', 'compteur-geant__label', votes[it.key] === 1 ? 'vote' : 'votes');
    counter.appendChild(value);
    counter.appendChild(label);
    card.appendChild(counter);

    attach(card, 'click', () => addVote(it.key));

    voteRow.appendChild(card);
    voteCardEls[it.key] = card;
    voteBarEls[it.key] = bar;
    // On garde la ref vers le ::value pour pulser le compteur partage.
    voteCountEls[it.key] = { value, label };
  });
  root.appendChild(voteRow);

  // Separateur + zone retentions
  const sep = buildEl('div', 'd12-sep', 'et qu’est-ce que vous avez retenu ?');
  root.appendChild(sep);

  const retZone = buildEl('div', 'd12-retentions');

  const inputWrap = buildEl('div', 'd12-retentions__input-wrap');
  const input = buildEl('input', 'input-mega d12-retentions__input');
  input.type = 'text';
  input.maxLength = 24;
  inputWrap.appendChild(input);
  retZone.appendChild(inputWrap);

  const chipsCt = buildEl('div', 'd12-retentions__chips');
  retZone.appendChild(chipsCt);

  root.appendChild(retZone);
  chipsContainerEl = chipsCt;
  inputEl = input;

  attach(input, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value.trim();
      if (v.length === 0) return;
      addRetention(v);
      input.value = '';
    }
  });

  // Tuko_surf bas-droite (meme pose qu'en slide 1 : continuite visuelle).
  const tuko = buildEl('img', 'd12-tuko-surf');
  tuko.src = 'assets/sprites/tuko_surf.png';
  tuko.alt = '';
  root.appendChild(tuko);

  // Message "tout vous a plu" (cache par defaut)
  const balance = buildEl('div', 'd12-balance', 'tout vous a plu !');
  root.appendChild(balance);

  // CTA (desactive tant qu'aucun vote ni chip)
  const cta = buildEl('button', 'cta-primary d12-cta', '▶ ON ARRIVE A LA SUITE');
  attach(cta, 'click', () => {
    if (cta.classList.contains('is-disabled')) return;
    convergeAndAdvance(root);
  });
  root.appendChild(cta);
  ctaEl = cta;

  containerRef.appendChild(root);
  slideEl = root;
  domNodes.push(root);

  // Restaure les chips deja saisies dans une session reprise.
  retentions.forEach(r => spawnChip(r.text, r.isKeyword, false));

  // Met a jour les barres (en cas de session reprise).
  updateAllBars();
  updateCTAEnabled();
  updateBalanceMessage();

  void root.offsetWidth;
  root.classList.add('is-entered');
}

function buildLivedStats() {
  // Lecture defensive du state des steps amont .
  // Aucune cle obligatoire : si absente, on degrade gracieusement (ligne masquee).
  const state = getState();
  const lines = [];

  // D2 : score reconnu
  const d2Score = state.steps?.D2?.score;
  if (typeof d2Score === 'number') {
    lines.push(`${d2Score}/3 signaux reconnus`);
  }

  // D6 raffinee : score (cadenas ouverts) cf. fiche D6 persistance.
  // Le schema precedent marquait D6 TBD a la date de migration : lecture defensive.
  const d6Score = state.steps?.D6?.score;
  if (typeof d6Score === 'number') {
    lines.push(`${d6Score}/3 cadenas ouverts`);
  }

  // D10 : conducteurs + isolants .
  const d10c = state.steps?.D10?.conducteurs;
  const d10i = state.steps?.D10?.isolants;
  const d10Total = (Array.isArray(d10c) ? d10c.length : 0) + (Array.isArray(d10i) ? d10i.length : 0);
  if (d10Total > 0) {
    lines.push(`${d10Total} objets classes`);
  }

  if (lines.length === 0) return null;
  const wrap = buildEl('div', 'd12-lived-stats');
  lines.forEach(t => wrap.appendChild(buildEl('span', 'd12-lived-stat', t)));
  return wrap;
}

// ----- Vote logic ---------------------------------------------------------

function addVote(key) {
  if (!KEYS.includes(key)) return;
  votes[key] = (votes[key] || 0) + 1;
  playSound('pop');

  const card = voteCardEls?.[key];
  if (card) {
    card.classList.remove('is-incremented');
    void card.offsetWidth;
    card.classList.add('is-incremented');
  }
  // Pulse du compteur partage (.compteur-geant__value.is-pulsing).
  const counter = voteCountEls?.[key];
  if (counter?.value) {
    counter.value.textContent = String(votes[key]);
    counter.value.classList.remove('is-pulsing');
    void counter.value.offsetWidth;
    counter.value.classList.add('is-pulsing');
    defer(() => counter.value?.classList.remove('is-pulsing'), 300);
  }
  if (counter?.label) {
    counter.label.textContent = votes[key] === 1 ? 'vote' : 'votes';
  }

  updateAllBars();
  updateLeader();
  updateCTAEnabled();
  updateBalanceMessage();
  persist();
}

function maxVotes() {
  return Math.max(votes.bouton, votes.interrupteur, votes.capteur, 1);
}

function updateAllBars() {
  if (!voteBarEls) return;
  const max = maxVotes();
  KEYS.forEach((k) => {
    const ratio = votes[k] / max; // 0..1
    if (voteBarEls[k]) voteBarEls[k].style.setProperty('--vote-ratio', String(ratio));
  });
}

function updateLeader() {
  if (!voteCardEls) return;
  const max = maxVotes();
  KEYS.forEach((k) => {
    const isLeader = votes[k] === max && max > 0;
    voteCardEls[k].classList.toggle('is-leader', isLeader);
  });
}

function updateBalanceMessage() {
  const root = slideEl;
  if (!root) return;
  const balance = root.querySelector('.d12-balance');
  if (!balance) return;
  const total = votes.bouton + votes.interrupteur + votes.capteur;
  const max = Math.max(votes.bouton, votes.interrupteur, votes.capteur);
  const min = Math.min(votes.bouton, votes.interrupteur, votes.capteur);
  // Tres partage : ecart <= 1 ET au moins 3 votes deposes.
  balance.classList.toggle('is-visible', total >= 3 && (max - min) <= 1);
}

function updateCTAEnabled() {
  if (!ctaEl) return;
  const someVote = votes.bouton + votes.interrupteur + votes.capteur > 0;
  const someChip = retentions.length > 0;
  ctaEl.classList.toggle('is-disabled', !(someVote || someChip));
}

// ----- Retentions ---------------------------------------------------------

function addRetention(text) {
  const trimmed = text.slice(0, 24);
  const kw = isKeyword(trimmed);
  retentions.push({ text: trimmed, isKeyword: kw });
  spawnChip(trimmed, kw, true);
  playSound(kw ? 'success' : 'pop');
  updateCTAEnabled();
  persist();
}

function spawnChip(text, kw, animate) {
  if (!chipsContainerEl) return;
  const chip = buildEl('span', `chip d12-chip${kw ? ' is-keyword' : ''}`, text);
  // Rotation aleatoire -3 a +3 deg (cf. composants chip).
  const rot = ((Math.random() * 6) - 3).toFixed(2);
  chip.style.setProperty('--rot', `${rot}deg`);
  chipsContainerEl.appendChild(chip);
  if (animate) {
    chip.classList.add('is-spawning');
    defer(() => chip.classList.remove('is-spawning'), 400);
    // Trembling effet boule de neige : voisines tremblent 1s.
    Array.from(chipsContainerEl.children).forEach((c) => {
      if (c === chip) return;
      c.classList.add('is-trembling');
      defer(() => c.classList.remove('is-trembling'), 1100);
    });
  }
}

// ----- CTA Slide 2 : convergence puis next -------------------------------

function convergeAndAdvance(root) {
  if (!root) {
    navAPIRef?.next();
    return;
  }
  // Reward fin de page : confettis depuis le CTA (composant partage).
  if (ctaEl) {
    try { spawnConfettis(ctaEl, { nombre: 24 }); }
    catch (_) { /* effects.js indisponible : on continue sans bloquer la nav */ }
  }
  root.classList.add('is-converging');
  playSound('whoosh');
  // 600ms de convergence visuelle, puis on passe le step suivant.
  defer(() => {
    if (navAPIRef) navAPIRef.next();
  }, 600);
}

// ----- Raccourcis clavier (capture phase, AVANT le shell) -----------------

function isTypingTarget(target) {
  const tag = (target?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
}

function installKeys() {
  captureKeyHandler = (e) => {
    // 1/2/3 : votes en slide 2 (sauf si on tape dans l'input)
    if (currentSlide === 2 && !isTypingTarget(e.target)) {
      if (e.key === '1') { e.preventDefault(); e.stopImmediatePropagation(); addVote('bouton'); return; }
      if (e.key === '2') { e.preventDefault(); e.stopImmediatePropagation(); addVote('interrupteur'); return; }
      if (e.key === '3') { e.preventDefault(); e.stopImmediatePropagation(); addVote('capteur'); return; }
    }

    // Espace / -> : avancer (slide 1 -> slide 2, sinon next page)
    // Backspace / <- : reculer (slide 2 -> slide 1, sinon prev page)
    if (isTypingTarget(e.target)) return;

    if (e.key === ' ' || e.key === 'ArrowRight') {
      if (currentSlide === 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSlide(2);
      }
      // En slide 2, on laisse le shell gerer next() sauf si CTA disabled.
      else if (ctaEl?.classList.contains('is-disabled')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      if (currentSlide === 2) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSlide(1);
      }
      // En slide 1, on laisse le shell faire back() vers D10.
    }
  };
  window.addEventListener('keydown', captureKeyHandler, { capture: true });
}

function removeKeys() {
  if (captureKeyHandler) {
    window.removeEventListener('keydown', captureKeyHandler, { capture: true });
    captureKeyHandler = null;
  }
}

// ----- Styles scopes (.step-D12) -----------------------------------------
//
// on ne style PAS .tuko-mascotte ni .compteur-geant ici (composants
// partages, styles dans argibi-atelier/styles/components.css).
// La convergence finale .is-converging applique transform/opacity sur tous
// les enfants directs : le .tuko-mascotte sera donc englobe sans CSS local.

const SCOPED_CSS = `
.step-D12 {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: var(--s-4) var(--s-5) var(--s-8);
  gap: var(--s-4);
  opacity: 0;
  transition: opacity var(--d-fast) var(--ease-out);
}
/* Tuko_surf en bas-droite, presence cool, pas envahissante. */
.d12-tuko-surf {
  position: absolute;
  bottom: var(--s-3);
  right: var(--s-3);
  width: clamp(220px, 18vw, 320px);
  height: auto;
  pointer-events: none;
  opacity: 0;
  transform: translateX(80px);
  animation: d12-tuko-in var(--d-slow) var(--ease-out) 800ms forwards,
             d12-tuko-bobbing 3.2s ease-in-out 1700ms infinite;
  z-index: 1;
}
@keyframes d12-tuko-in {
  to { opacity: 1; transform: translateX(0); }
}
@keyframes d12-tuko-bobbing {
  0%, 100% { transform: translate(0, 0)    rotate(-1.5deg); }
  50%      { transform: translate(0, -6px) rotate(1.5deg); }
}
.step-D12.is-entered { opacity: 1; }
.step-D12.is-leaving { opacity: 0; transition: opacity var(--d-fast) var(--ease-in); }

.d12-title {
  text-align: center;
  transform: scale(0);
  animation: d12-smash var(--d-normal) var(--ease-bounce) forwards;
}
@keyframes d12-smash {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* ----- Slide 1 ----- */

.step-D12--slide-1 .d12-recap {
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: var(--s-4);
  justify-items: center;
  align-content: center;
}

.d12-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
  width: min(1400px, 100%);
}
.d12-card {
  background: var(--paper);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-4);
  display: grid;
  grid-template-rows: auto auto auto;
  gap: var(--s-2);
  text-align: center;
  cursor: var(--cursor-pointer);
  font-family: var(--display);
  /* Apparition cascade : delai par index */
  opacity: 0;
  transform: scale(0);
  animation: d12-pop var(--d-normal) var(--ease-bounce) forwards;
  animation-delay: calc(400ms + var(--i, 0) * 200ms);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.d12-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow-lg);
}
@keyframes d12-pop {
  0%   { opacity: 0; transform: scale(0); }
  70%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
.d12-card {
  grid-template-rows: 1fr;
  padding: var(--s-3);
  cursor: var(--cursor-default);
}
.d12-card:hover {
  transform: none;
  box-shadow: var(--shadow);
}
.d12-card__img {
  width: 100%;
  height: clamp(180px, 22vh, 280px);
  object-fit: contain;
  object-position: center;
  display: block;
}

.d12-arrows {
  font-family: var(--display);
  font-size: var(--t-h1);
  font-weight: 900;
  letter-spacing: 0.5em;
  color: var(--ink);
  opacity: 0;
  transform: translateY(-20px);
  animation: d12-arrows-in var(--d-normal) var(--ease-bounce) 1200ms forwards;
}
@keyframes d12-arrows-in {
  0%   { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.d12-three-one {
  font-family: var(--display);
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--ink);
  text-align: center;
  margin: 0;
  opacity: 0;
  animation: d12-fade-in var(--d-normal) var(--ease-out) 1700ms forwards;
}
@keyframes d12-fade-in {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

.d12-binaire {
  font-family: var(--display);
  font-size: var(--t-hero);
  font-weight: 900;
  letter-spacing: -0.01em;
  text-align: center;
  margin: 0;
  color: var(--ink);
  opacity: 0;
  transform: scale(0);
  animation: d12-binaire-smash 400ms var(--ease-bounce) 2000ms forwards;
}
.d12-binaire__text { display: inline-block; }
@keyframes d12-binaire-smash {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

.d12-cta {
  justify-self: center;
  align-self: end;
  margin-bottom: var(--s-2);
  opacity: 0;
  animation: d12-pop var(--d-normal) var(--ease-bounce) 3300ms forwards;
}
.step-D12--slide-2 .d12-cta {
  animation: d12-pop var(--d-normal) var(--ease-bounce) 600ms forwards;
}

/* ----- Slide 2 ----- */

.step-D12--slide-2 {
  grid-template-rows: auto auto 1fr auto auto auto;
  align-items: start;
  justify-items: center;
}

.d12-lived-stats {
  display: flex;
  gap: var(--s-3);
  flex-wrap: wrap;
  justify-content: center;
  opacity: 0;
  animation: d12-fade-in var(--d-normal) var(--ease-out) 200ms forwards;
}
.d12-lived-stat {
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.06em;
  color: var(--ink);
  background: var(--accent-3);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  padding: 6px 12px;
  text-transform: lowercase;
}

.d12-vote-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
  width: min(1900px, 100%);
  margin-top: var(--s-3);
}
.d12-vote-card {
  background: var(--paper);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--r-md);
  padding: var(--s-3);
  display: grid;
  grid-template-rows: auto 220px auto;
  gap: var(--s-2);
  text-align: center;
  cursor: var(--cursor-pointer);
  font-family: var(--display);
  align-content: start;
  position: relative;
  min-width: 0;
  box-sizing: border-box;
  opacity: 0;
  transform: scale(0);
  animation: d12-pop var(--d-normal) var(--ease-bounce) forwards;
  animation-delay: calc(200ms + var(--i, 0) * 100ms);
  transition: transform var(--d-fast) var(--ease-out),
              box-shadow var(--d-fast) var(--ease-out);
}
.d12-vote-card__name {
  min-width: 0;
  white-space: nowrap;
}
.d12-vote-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--shadow-lg);
}
.d12-vote-card.is-leader {
  box-shadow: var(--shadow-accent-1);
}
.d12-vote-card__name {
  font-size: var(--t-h2);
  font-weight: 900;
  letter-spacing: -0.01em;
}
.d12-vote-card__bar-wrap {
  position: relative;
  width: 100%;
  height: 220px;
  background: var(--bg-2);
  border: var(--border-thin);
  border-radius: var(--r-sm);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  min-width: 0;
}
.d12-vote-card__bar {
  width: 100%;
  background: var(--accent-1);
  height: calc(var(--vote-ratio, 0) * 100%);
  transition: height var(--d-slow) var(--ease-bounce);
}
.d12-vote-card--bouton .d12-vote-card__bar       { background: var(--accent-1); }
.d12-vote-card--interrupteur .d12-vote-card__bar { background: var(--accent-2); }
.d12-vote-card--capteur .d12-vote-card__bar      { background: var(--accent-3); }

/* Le compteur des votes vit dans .compteur-geant (composant partage).
   On re-centre juste le wrapper local pour le grid de la card. */
.d12-vote-card__counter {
  justify-self: center;
}

.d12-sep {
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.08em;
  color: var(--ink);
  opacity: 0.85;
  text-align: center;
  position: relative;
  padding: 0 var(--s-3);
  margin-top: var(--s-3);
  text-transform: lowercase;
}
.d12-sep::before, .d12-sep::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 80px;
  height: 2px;
  background: var(--ink);
  opacity: 0.4;
}
.d12-sep::before { right: 100%; margin-right: var(--s-2); }
.d12-sep::after  { left: 100%; margin-left: var(--s-2); }

.d12-retentions {
  width: min(1100px, 100%);
  display: grid;
  grid-template-rows: auto auto;
  gap: var(--s-3);
  position: relative;
}
.d12-retentions__input-wrap { display: grid; }
.d12-retentions__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  min-height: 60px;
  justify-content: center;
}
.d12-chip { font-size: var(--t-body); }
.d12-chip.is-keyword {
  background: var(--accent-3);
  box-shadow: 0 0 0 3px var(--accent-1) inset, var(--shadow-sm);
}
.d12-chip.is-spawning { animation: d12-pop var(--d-normal) var(--ease-bounce); }
.d12-chip.is-trembling { animation: d12-tremble 900ms ease-in-out; }
@keyframes d12-tremble {
  0%, 100% { transform: rotate(var(--rot, 0deg)) translate(0, 0); }
  20%      { transform: rotate(var(--rot, 0deg)) translate(-2px, 1px); }
  60%      { transform: rotate(var(--rot, 0deg)) translate(2px, -1px); }
  80%      { transform: rotate(var(--rot, 0deg)) translate(-1px, 1px); }
}

.d12-balance {
  font-family: var(--mono);
  font-size: var(--t-body);
  letter-spacing: 0.08em;
  color: var(--ink);
  opacity: 0;
  transition: opacity var(--d-fast) var(--ease-out);
  text-transform: lowercase;
  margin-top: var(--s-2);
}
.d12-balance.is-visible { opacity: 0.7; }

/* CTA Slide 2 desactive si rien encore saisi */
.d12-cta.is-disabled {
  opacity: 0.45;
  cursor: var(--cursor-not-allowed);
  animation: none;
  transform: none;
  box-shadow: var(--shadow);
}

/* Convergence finale (clic CTA Slide 2) */
.step-D12--slide-2.is-converging > * {
  transition: transform var(--d-slow) var(--ease-in),
              opacity var(--d-slow) var(--ease-in);
  transform: scale(0.6);
  opacity: 0;
}
.step-D12--slide-2.is-converging .d12-tuko-surf {
  transform: scale(0.6) translateY(40px);
}
`;

function injectStyles() {
  styleEl = document.createElement('style');
  styleEl.id = 'step-D12-styles';
  styleEl.textContent = SCOPED_CSS;
  document.head.appendChild(styleEl);
}

// ----- Lifecycle (contrat de step) ---------------------------------------

export default {
  id: 'D12',
  phase: 'D',
  title: 'Synthese : on a appris quoi ?',
  estimatedDuration: 180,
  isCollective: true,
  requiresAnimator: true,
  fullscreen: false,

  async enter(container, savedState, navAPI) {
    navAPIRef = navAPI;
    containerRef = document.querySelector('#stage');

    // Scene Pixi vide (D12 est full-DOM/CSS, cf. § 3 stack-technique).
    scene = new Container();
    scene.label = 'step-D12';
    container.addChild(scene);

    // Restaure le state si une session est reprise.
    if (savedState && typeof savedState === 'object') {
      currentSlide = savedState.slide === 2 ? 2 : 1;
      if (savedState.votes && typeof savedState.votes === 'object') {
        votes = {
          bouton: Number(savedState.votes.bouton) || 0,
          interrupteur: Number(savedState.votes.interrupteur) || 0,
          capteur: Number(savedState.votes.capteur) || 0,
        };
      } else {
        votes = { bouton: 0, interrupteur: 0, capteur: 0 };
      }
      retentions = Array.isArray(savedState.retentions)
        ? savedState.retentions
            .filter(r => r && typeof r.text === 'string')
            .map(r => ({ text: r.text, isKeyword: !!r.isKeyword }))
        : [];
    } else {
      currentSlide = 1;
      votes = { bouton: 0, interrupteur: 0, capteur: 0 };
      retentions = [];
    }

    injectStyles();
    installKeys();

    if (currentSlide === 1) renderSlide1();
    else renderSlide2();

    persist();
  },

  exit() {
    handlers.forEach(([target, event, fn, opts]) => {
      try { target.removeEventListener(event, fn, opts); }
      catch (_) { /* noop */ }
    });
    handlers = [];

    removeKeys();

    clearTimers();

    tickerFns.forEach(fn => app.ticker.remove(fn));
    tickerFns = [];

    domNodes.forEach(n => { if (n.parentNode) n.parentNode.removeChild(n); });
    domNodes = [];

    if (scene) {
      scene.destroy({ children: true });
      scene = null;
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    styleEl = null;

    slideEl = null;
    voteCardEls = null;
    voteBarEls = null;
    voteCountEls = null;
    chipsContainerEl = null;
    inputEl = null;
    ctaEl = null;
    navAPIRef = null;
    containerRef = null;
  },

  serialize() {
    return {
      slide: currentSlide,
      votes: { ...votes },
      retentions: retentions.map(r => ({ text: r.text, isKeyword: r.isKeyword })),
    };
  },

  isComplete() {
    // Considere complet si on a au moins 1 vote OU 1 chip retention.
    return (votes.bouton + votes.interrupteur + votes.capteur > 0) || retentions.length > 0;
  },

  replay() {
    // Re-rejoue l'animation principale du slide courant sans ecraser le state.
    const slide = currentSlide;
    const savedVotes = { ...votes };
    const savedRet = retentions.map(r => ({ ...r }));
    // exit partiel : on retire seulement le DOM de la slide, pas le scene Pixi.
    if (slideEl && slideEl.parentNode) slideEl.parentNode.removeChild(slideEl);
    domNodes = domNodes.filter(n => n !== slideEl);
    slideEl = null;
    voteCardEls = null;
    voteBarEls = null;
    voteCountEls = null;
    chipsContainerEl = null;
    inputEl = null;
    ctaEl = null;
    clearTimers();
    votes = savedVotes;
    retentions = savedRet;
    currentSlide = slide;
    if (slide === 1) renderSlide1();
    else renderSlide2();
  },
};

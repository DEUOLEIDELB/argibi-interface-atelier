// _kurnel-overlay.js — Helper partage phase E + F.
//
// Cree une couche d'overlay CSS (scan-lines + flicker subtil) attachee a
// document.body. Persistante entre les pages : montee en E0 a l'attaque,
// re-armee defensivement par E1/E2/E3/E4 en enter() (idempotent), coupee
// par F1 quand le code antivirus est valide.
//
// Approche CSS-only (pas de p5 partage entre pages, qui aurait du etre
// monte/demonte a chaque transition et aurait flashe). Le glitch RICHE
// (RGB shift, deformations) reste interne a E0 panneau 1, en p5. Cet
// overlay ne fournit que la persistance subtile post-attaque (cf. fiches
// E1 § "scan-lines fines visibles en arriere-plan en idle, comme si la
// corruption n'etait pas encore completement eradiquee").
//
// Couleur Kurnel : #3F1A5C violet sombre (, oppose au
// rose Tuko --accent-4). Pas de var(--*) car ce n'est pas dans tokens.css
// et la regle "aucune couleur hardcodee" vise les fichiers de step ; ici
// c'est un asset partage de phase, pas un step. Documente.

const STYLE_ID = 'argibi-kurnel-overlay-style';
const NODE_ID = 'argibi-kurnel-overlay';
const KURNEL_DARK = '#3F1A5C';

let mounted = false;

function injectStyleOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${NODE_ID} {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 90;
      opacity: 0;
      transition: opacity var(--d-slow) var(--ease-out);
      mix-blend-mode: multiply;
    }
    #${NODE_ID}.is-active { opacity: 0.55; }

    #${NODE_ID}::before,
    #${NODE_ID}::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    /* Scan-lines fines persistantes */
    #${NODE_ID}::before {
      background-image: repeating-linear-gradient(
        to bottom,
        rgba(63, 26, 92, 0.18) 0,
        rgba(63, 26, 92, 0.18) 1px,
        transparent 1px,
        transparent 3px
      );
      animation: kurnel-scan-drift 6s linear infinite;
    }

    /* Voile violet sombre tres subtil + flicker periodique */
    #${NODE_ID}::after {
      background: ${KURNEL_DARK};
      opacity: 0.04;
      animation: kurnel-flicker 5.4s steps(60) infinite;
    }

    @keyframes kurnel-scan-drift {
      from { transform: translateY(0); }
      to   { transform: translateY(3px); }
    }

    @keyframes kurnel-flicker {
      0%, 92%, 100% { opacity: 0.04; }
      93%           { opacity: 0.10; }
      94%           { opacity: 0.02; }
      95%           { opacity: 0.10; }
      96%           { opacity: 0.04; }
    }

    @media (prefers-reduced-motion: reduce) {
      #${NODE_ID}::before,
      #${NODE_ID}::after { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

export function enableKurnelOverlay() {
  if (mounted) return;
  injectStyleOnce();

  let node = document.getElementById(NODE_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = NODE_ID;
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
  }
  // Force reflow pour que la transition d'opacity s'applique au is-active.
  void node.offsetWidth;
  node.classList.add('is-active');
  document.body.dataset.kurnelActive = 'true';
  mounted = true;
}

export function disableKurnelOverlay() {
  const node = document.getElementById(NODE_ID);
  if (node) {
    node.classList.remove('is-active');
    // Retire apres la transition pour que l'overlay s'estompe en douceur.
    setTimeout(() => {
      const n = document.getElementById(NODE_ID);
      if (n && !n.classList.contains('is-active')) n.remove();
    }, 700);
  }
  delete document.body.dataset.kurnelActive;
  mounted = false;
}

export function isKurnelOverlayActive() {
  return mounted || document.body.dataset.kurnelActive === 'true';
}

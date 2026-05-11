// step-order.js — Liste centralisée des steps (ordre canonique de l'atelier).
// Source : doc interne.
// Modifiable seulement par  (les  n'y touchent pas).

export const STEP_ORDER = [
  // Phase A — Embarquement
  'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  // Phase B — Assemblage
  'B1', 'B2', 'B3', 'B4',
  // Phase C — Tutoriel contrôles
  'C1',
  // Phase D — Initialisation entrées (bouton)
  'D0', 'D1', 'D2', 'D3',
  // Phase D — Initialisation entrées (interrupteur)
  'D4', 'D5', 'D6', 'D7',
  // Phase D — Initialisation entrées (capteur)
  'D8', 'D9', 'D10', 'D11',
  // Phase D — Synthèse
  'D12',
  // Phase E — Attaque + épreuves
  'E0', 'E1', 'E2', 'E3', 'E4',
  // Phase F — Final
  'F1', 'F2',
];

export const PHASE_OF = {
  A: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  B: ['B1', 'B2', 'B3', 'B4'],
  C: ['C1'],
  D: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'],
  E: ['E0', 'E1', 'E2', 'E3', 'E4'],
  F: ['F1', 'F2'],
};

export const PHASE_INFO = {
  A: { id: 'A', label: 'Embarquement',   count: PHASE_OF.A.length },
  B: { id: 'B', label: 'Assemblage',     count: PHASE_OF.B.length },
  C: { id: 'C', label: 'Tutoriel',       count: PHASE_OF.C.length },
  D: { id: 'D', label: 'Initialisation', count: PHASE_OF.D.length },
  E: { id: 'E', label: 'Épreuves',       count: PHASE_OF.E.length },
  F: { id: 'F', label: 'Final',          count: PHASE_OF.F.length },
};

// Slug par défaut pour résoudre /steps/<id>-<slug>.js. Les
// renseignent cette table au fur et à mesure de l'implémentation des pages.
export const STEP_SLUGS = {
  A0: 'chargement-tuko',
  A1: 'qui-est-la',
  A2: 'echauffement',
  A3: 'avertissement',
  A4: 'bd-lore',
  A5: 'feuille-de-route',
  A6: 'identification-composants',
  B1: 'preparation-assemblage',
  B2: 'assemblage-15-etapes',
  B3: 'argibi-termine-question',
  B4: 'allumage',
  C1: 'tutoriel-controles',
  D0: 'titre-initialisation',
  D1: 'activite-bouton',
  D2: 'mini-jeu-reconnais-le-signal',
  D3: 'vraie-vie-collectif',
  D4: 'titre-interrupteur',
  D5: 'activite-interrupteur',
  D6: 'mini-jeu-avatar-tuko',
  D7: 'vraie-vie-interrupteur',
  D8: 'titre-capteur',
  D9: 'activite-capteur',
  D10: 'mini-jeu-laboratoire',
  D11: 'vraie-vie-capteur',
  D12: 'synthese-comptes-rendus',
  E0: 'attaque-kurnel',
  E1: 'titre-epreuves',
  E2: 'activites-couleur-pixel',
  E3: 'saisie-codes',
  E4: 'epreuve-logique',
  F1: 'animation-finale-code-6',
  F2: 'ecran-de-fin',
};

export function phaseOfStep(stepId) {
  for (const [phase, ids] of Object.entries(PHASE_OF)) {
    if (ids.includes(stepId)) return phase;
  }
  return null;
}

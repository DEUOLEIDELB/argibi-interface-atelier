# Capsule Argibi · Interface atelier

Interface web projetée pendant l'atelier scolaire Wubo (CM1-6e). Séquence pédagogique de 32 pages cadencées en 1h30, format projection 1920×1080, lisible à 5 mètres.

L'atelier accompagne les élèves dans la construction et l'animation d'un petit objet électronique (Argibi). L'interface guide la classe étape par étape, du déballage à la victoire finale.

## Lancer en local

Aucune installation. Aucun build. Les imports ESM nécessitent un serveur HTTP (le double-clic sur `index.html` échoue à cause de CORS).

```bash
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000/>.

Alternative : extension *Live Server* de VS Code.

## Démo en ligne

Le site est servi via GitHub Pages. URL : voir l'onglet **About** du dépôt.

## Naviguer

| Touche | Effet |
|---|---|
| `→` ou `Espace` | Étape suivante |
| `←` | Étape précédente |
| `M` | Panneau des phases (sauter à une phase) |
| `H` | Panneau animateur (état session, mute, reset) |
| `R` | Rejouer l'animation principale de l'étape |
| `Esc` | Fermer les overlays |

État sauvegardé en localStorage. Pour repartir d'une session vierge : `?reset=1` dans l'URL.

## Structure

```
argibi-atelier/
├── index.html          # shell (bandeaux + zone de contenu + overlays)
├── config.json         # config runtime
├── styles/
│   ├── tokens.css      # variables CSS (palette, typo, motion, layout)
│   ├── base.css        # reset + layout du shell
│   └── components.css  # composants partagés (CTA, chips, cards, etc.)
├── core/
│   ├── app.js          # bootstrap Pixi v8
│   ├── nav.js          # API de navigation entre étapes
│   ├── state.js        # persistance localStorage
│   ├── step-order.js   # ordre canonique des étapes
│   ├── audio.js        # sons + mute global
│   ├── assets.js       # wrapper Pixi Assets (preload par phase)
│   ├── effects.js      # animations DOM partagées
│   └── grist.js        # synchro Grist optionnelle (fallback localStorage)
├── steps/              # une étape par fichier `<id>-<slug>.js`
└── assets/
    ├── sprites/        # sprites par phase
    ├── sounds/         # MP3 (pop, success, error, unlock, etc.)
    └── manifest.json   # bundles Pixi (common + phase-A à F)
```

## Stack technique

- HTML5, CSS vanilla, [Alpine.js 3](https://alpinejs.dev/), [Pixi.js v8](https://pixijs.com/), [p5.js](https://p5js.org/) — tous via CDN.
- Aucun build step. Import map pour Pixi en ESM.
- Cible : 60 fps stable, transitions ≤ 350 ms, préchargement par phase.
- Hors-ligne first. Grist optionnel (fallback localStorage).

## Phases de l'atelier

| Phase | Thème | Étapes |
|---|---|---|
| A | Embarquement | A0–A6 |
| B | Assemblage | B1–B4 |
| C | Tutoriel contrôles | C1 |
| D | Initialisation des entrées (bouton, interrupteur, capteur) | D0–D12 |
| E | Attaque + épreuves | E0–E4 |
| F | Final | F1, F2 |

Le moteur de navigation charge dynamiquement chaque étape (`/steps/<id>-<slug>.js`) à la volée et saute silencieusement celles qui ne sont pas encore livrées.

## Licence

Tous droits réservés. © Wubo.

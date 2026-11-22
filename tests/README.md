# Tests de l'interface

Les tests utilisent le module intégré `node:test` de Node.js ; aucun paquet npm tiers n'est nécessaire.

Depuis la racine :

```bash
node --check app/app.js
node --test tests/interface.test.mjs
python3 tools/validate_profile.py
```

Les tests vérifient le nombre et le mapping de touches, les identifiants de la carte clavier, les fonctions Fn documentées, les ressources PWA locales, la taille logique du canvas et les points de rupture CSS. Ils ne remplacent pas un essai tactile sur un Galaxy Z Flip6.

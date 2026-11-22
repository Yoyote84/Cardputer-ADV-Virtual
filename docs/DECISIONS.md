# Décisions techniques

## ADR-0001 — Créer un adaptateur Cardputer ADV, ne pas prétendre que Velxio le fournit déjà

**Statut : accepté — 22 novembre 2026**

Le dépôt Velxio public ne contient pas l'implémentation Cardputer ADV en ligne uniquement. Le projet utilisera les concepts et composants génériques autorisés après vérification de licence, mais développera son propre profil et ses propres modèles périphériques Cardputer ADV à partir de la documentation publique M5Stack.

Conséquence : aucune dépendance obligatoire à velxio.dev et aucun accès à son code privé.

## ADR-0002 — Le runtime doit être local pour l'usage hors ligne

**Statut : accepté — technologie du moteur à prototyper**

Le backend QEMU standard de Velxio s'exécute comme processus serveur. L'application finale doit exécuter le moteur localement sur Android. Trois voies seront évaluées : QEMU natif ARM64, QEMU WebAssembly ou service Android local.

Aucune voie ne sera déclarée acquise avant un test sur Galaxy Z Flip6.

## ADR-0003 — Séparer le contrat de runtime des périphériques

**Statut : accepté**

Les modèles ST7789V2, TCA8418, BMI270, ES8311 et microSD ne doivent pas dépendre de la bibliothèque d'interface ou d'un moteur spécifique. Le remplacement du runtime ne doit pas obliger à réécrire le rendu visuel et les modèles de périphériques.

## ADR-0004 — La compatibilité est démontrée par tests, pas par apparence

**Statut : accepté**

Les états « visuel uniquement », « modèle partiel », « émulé et testé » et « non pris en charge » seront distingués. Les logs et erreurs doivent refléter le vrai statut du runtime.

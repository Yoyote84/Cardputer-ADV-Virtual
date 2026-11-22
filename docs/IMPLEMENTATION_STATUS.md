# État d'implémentation

**Dernière mise à jour : 22 novembre 2026**

## Étape 1/5 — Fondations

**Statut : terminée côté audit et structure**

- [x] Dépôt public vérifié.
- [x] Dépôt Velxio analysé (README, licence, carte en ligne uniquement, registre de cartes, moteur ESP32 QEMU).
- [x] Contraintes de réutilisation et d'attribution documentées.
- [x] Profil matériel officiel Cardputer ADV K132-Adv créé.
- [x] Schéma JSON et validateur standard-library créés.
- [x] CI GitHub ajoutée pour valider le profil.
- [x] Architecture hors ligne et prototype moteur requis documentés.
- [x] Feuille de route en cinq étapes définie.

## Étape 2/5 — Interface du Cardputer virtuel

**Statut : interface livrée ; validation tactile sur le Galaxy Z Flip6 à effectuer.**

- [x] Interface PWA sans ressource CDN.
- [x] Coque responsive au rapport 84 × 54.
- [x] Canvas 240 × 135.
- [x] Clavier interactif de 56 touches sur 4 × 14.
- [x] Entrées tactiles et clavier physique.
- [x] Modificateurs FN, CTRL, OPT, ALT et Aa.
- [x] Moniteur d'événements et commandes de l'interface.
- [x] Manifeste, icône SVG et cache hors ligne des ressources UI.
- [x] Huit tests automatisés réussis sur Node.js.
- [ ] Essai manuel sur le vrai Z Flip6 en portrait et paysage.

## Pas encore implémenté

- [ ] Modèle de clavier TCA8418 (le clavier UI est présent, le contrôleur matériel n'est pas encore émulé).
- [ ] Modèle d'écran ST7789V2 piloté par le firmware.
- [ ] Modèles BMI270, ES8311, microSD, batterie, IR et extensions.
- [ ] Runtime ESP32-S3 local Android.
- [ ] Import et exécution de BIN.
- [ ] Validation PWA installée sur le Z Flip6 ; l'interface possède pour l'instant les fichiers du manifeste et du service worker.

Ces éléments appartiennent aux étapes suivantes et ne doivent pas être annoncés comme déjà disponibles.

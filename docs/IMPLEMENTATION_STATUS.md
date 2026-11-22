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

## Étape 3/5 — Modèles matériels Cardputer ADV

**Statut : socle de modèles logiciels livré ; 23/23 tests GitHub Actions réussis. Aucun firmware natif n'est encore exécuté.**

- [x] Bus I²C, SPI et I²S local.
- [x] Clavier mappé sur les 56 touches physiques et modèle TCA8418 avec FIFO.
- [x] Écran ST7789V2 et framebuffer RGB565 240×135.
- [x] Modèles de registres/mesures de base BMI270 et ES8311.
- [x] Modèle numérique NS4150B et injection d'échantillons microphone.
- [x] microSD SPI SDHC avec CSD v2, blocs sparse et capacité annoncée de 128 Go.
- [x] GPIO, ADC batterie, capture IR et table Grove/EXT.
- [x] Rack de périphériques et panneau de diagnostic dans l'interface.
- [x] 23 tests automatisés réussis (interface, mapping clavier, bus et modèles périphériques).
- [ ] Comparaison tactile/visuelle sur le vrai Z Flip6.
- [ ] Modèle SX1262/GNSS optionnel non inclus au socle.

**Limite majeure :** aucun firmware BIN n'est encore exécuté. Le runtime ESP32-S3 et son raccordement aux bus restent l'étape 4.

## Pas encore implémenté

- [ ] Modèles avancés/électriques non couverts : configuration complète BMI270, chemin analogique ES8311/NS4150B, CRC/modes SD complets et module SX1262/GNSS.
- [ ] Runtime ESP32-S3 local Android.
- [ ] Import et exécution de BIN.
- [ ] Validation PWA installée sur le Z Flip6 ; l'interface possède pour l'instant les fichiers du manifeste et du service worker.

Ces éléments appartiennent aux étapes suivantes et ne doivent pas être annoncés comme déjà disponibles.


## Étape 4/5 — Runtime ESP32-S3 et import firmware

**Statut : intégration logicielle préparée ; exécution réelle à valider après installation du bundle ESP-EMU et test d'un BIN ESP32-S3.**

- [x] Choix du moteur officiel Espressif esp-emu 1.2.0 (WebAssembly, ESP32-S3) et licence Apache-2.0 vérifiés.
- [x] Installateur reproductible épinglé sur une version et un SHA-256 ; extraction limitée aux fichiers attendus.
- [x] Worker d'intégration : cible ESP32-S3, ROM intégrée, chargement BIN, commandes démarrer/arrêter/reset, erreurs et fautes CPU.
- [x] Import BIN avec limite de 8 Mio, détection ELF mal placé, inspection prudente des en-têtes ESP et calcul SHA-256 local.
- [x] Panneau d'import, commandes CPU et console UART dans l'interface.
- [x] Contrats d'import, d'exécution et limites documentés.
- [ ] Installer le bundle ESP-EMU et vérifier le chargement de son module WASM dans le navigateur.
- [ ] Démarrer un vrai firmware fusionné compilé pour ESP32-S3 et vérifier sa sortie UART.
- [ ] Raccorder les modèles Cardputer ADV (écran, clavier TCA8418, IMU, codec, SD) via des composants de co-simulation compatibles.
- [ ] Tester stabilité, mémoire et performances sur le Galaxy Z Flip6.
- [ ] Ajouter l'import ELF pour symboles, la réception UART et le débogage interactif.

**Résultat honnête :** le dépôt contient maintenant le chemin d'intégration et le contrôle des BIN, mais le moteur CPU ne peut pas être considéré comme validé tant qu'un firmware réel n'a pas été exécuté avec le bundle installé.

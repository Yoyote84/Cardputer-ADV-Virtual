# Feuille de route — 5 étapes

Le projet est découpé en cinq étapes. L'étape 5 doit produire le simulateur complet prévu ; les tests réalisés ensuite sur le Cardputer physique serviront à corriger les écarts, pas à terminer une fonction manquante.

## 1/5 — Fondations et audit technique

**État : terminée.**

Livrables réalisés :
- dépôt identifié et vérifié ;
- audit du code et des limites de Velxio ;
- vérification de la licence publiée et des composants non distribués ;
- profil matériel Cardputer ADV fondé sur la documentation M5Stack ;
- architecture par adaptateurs et stratégie hors ligne documentées ;
- structure de projet initialisée ;
- validation automatique du profil matériel.

Critères de sortie :
- [x] Les possibilités et limites de réutilisation de Velxio sont écrites.
- [x] Le modèle matériel et les broches principales sont versionnés.
- [x] Les inconnues importantes ne sont pas présentées comme des fonctionnalités acquises.
- [x] Le dépôt peut contrôler automatiquement la cohérence du profil.

## 2/5 — Interface du Cardputer virtuel

**Statut : interface livrée et tests automatisés réussis ; essai physique sur le Galaxy Z Flip6 à confirmer.**

Livrables réalisés :
- [x] interface Web autonome, en français, sans dépendance CDN ;
- [x] coque responsive dessinée au format physique 84 × 54 ;
- [x] écran canvas logique de 240 × 135 pixels ;
- [x] clavier tactile avec 56 touches sur quatre rangées de 14 ;
- [x] prise en charge du clavier physique via `KeyboardEvent.code` ;
- [x] touches FN, CTRL, OPT, ALT et bascule Aa ;
- [x] état actif des touches, dernière touche et moniteur d'événements ;
- [x] commandes d'alimentation de l'écran, reset UI et plein écran ;
- [x] manifeste PWA, icône SVG originale et service worker local ;
- [x] contrat d'événements `cardputer:keyboard` isolé des futurs pilotes ;
- [x] huit tests automatisés Node.js.

Critères de sortie :
- [x] le layout CSS prévoit le portrait et les petites largeurs de téléphone ;
- [x] l'écran conserve son rapport 240:135 ;
- [x] les 56 touches sont actionnables par pointeur ;
- [x] les événements sont exposés sans dépendre du runtime ;
- [x] les ressources d'interface sont mises en cache localement par le service worker ;
- [ ] le fonctionnement tactile et la mise en page doivent être confirmés sur le véritable Galaxy Z Flip6.

**Limite :** le clavier UI n'est pas encore un TCA8418 émulé, le canvas n'est pas piloté par l'ESP32-S3 et aucun fichier BIN n'est exécuté. Ces fonctions relèvent des étapes 3 et 4.

## 3/5 — Modèles matériels Cardputer ADV

**Statut : socle de modèles logiciels livré ; 23 tests automatisés réussis. Validation physique sur le Z Flip6 à confirmer.**

Objectif : fournir des périphériques virtuels accessibles via leurs bus, sans prétendre encore exécuter un firmware natif.

Livrables réalisés :
- [x] bus I²C avec scan, lecture/écriture registre et trace ;
- [x] bus SPI avec sélection CS et séparation commande/donnée, plus transport I²S par blocs ;
- [x] TCA8418 à 0x34 : FIFO 10 événements, codes réels, appui/relâchement, flags et clear W1C ;
- [x] clavier tactile de 56 touches utilisant le keymap empirique du Cardputer ADV et le vrai modèle FIFO ;
- [x] ST7789V2 : commandes de base, fenêtres, RAMWR, RGB565 et framebuffer 240×135 ;
- [x] BMI270 : identité, registres de statut, valeurs d'axes brutes pilotables et reset ;
- [x] ES8311 : registres de contrôle et transport d'échantillons I²S ;
- [x] NS4150B : modèle numérique de gain/mute/saturation raccordé aux blocs de sortie ES8311 ;
- [x] microphone : injection d'échantillons numériques ;
- [x] microSD SPI : initialisation SDHC, CSD v2, lecture/écriture de blocs et capacité sparse de 128 Go ;
- [x] batterie : valeur ADC brute contrôlable ;
- [x] GPIO, ports Grove/EXT et capture de trames IR ;
- [x] rack central et panneau de diagnostics intégré à l'interface ;
- [x] limites des modèles décrites et aucune fonction non simulée annoncée comme réelle.

Critères de sortie :
- [x] chaque modèle possède une fiche de couverture et des tests de protocole ;
- [x] les fonctions non implémentées sont signalées explicitement ;
- [x] les modèles sont rattachés aux adresses I²C, broches SPI, GPIO et bus du profil ;
- [x] les événements du clavier UI passent par les registres et le FIFO TCA8418 virtuels ;
- [ ] test manuel de l'interface et des interactions sur le Galaxy Z Flip6 à confirmer indépendamment.

Limites conservées pour l'étape 4 :
- le CPU ESP32-S3 n'est pas encore émulé et aucun BIN n'est exécuté ;
- BMI270 : image de configuration Bosch et fonctions avancées absentes ;
- ES8311/NS4150B : niveau numérique par blocs uniquement, pas de simulation électrique/acoustique ;
- microSD : stockage sparse bloc par SPI, pas de CRC ni d'émulation complète de tous les modes SD ;
- Cap LoRa/GNSS : emplacement d'extension réservé, module SX1262/GNSS non modélisé à ce stade.

Le détail des capacités et des limites est consigné dans [la matrice de compatibilité](docs/COMPATIBILITY_MATRIX.md) et [le guide des périphériques](app/emulator/README.md).

## 4/5 — Exécution et débogage des firmwares

Objectif : exécuter le vrai code compilé pour ESP32-S3 et le raccorder aux modèles matériels.

Prototype bloquant à réaliser en premier :
- construire et lancer le moteur ESP32-S3 sur Android ARM64, ou démontrer une solution WebAssembly locale viable ;
- lancer un firmware de test ESP32-S3 sans réseau ;
- vérifier l'accès au stockage flash, à l'UART et aux événements GPIO ;
- mesurer mémoire, temps de démarrage et stabilité sur le Z Flip6.

Livrables attendus :
- import sécurisé de fichiers BIN et, si le moteur le permet, ELF ;
- vérification de taille, format, cible et éventuelles partitions ;
- chargement de la flash virtuelle et séquence de reset ;
- console UART, journaux du moteur et rapport de crash ;
- arrêt, redémarrage et rechargement du firmware ;
- raccordement des périphériques virtuels au moteur.

Critères de sortie :
- [ ] un firmware ESP32-S3 de test démarre réellement dans le moteur local ;
- [ ] la console série reçoit les sorties réelles du firmware ;
- [ ] les accès périphériques sont reliés aux modèles correspondants ;
- [ ] l'application reste hors ligne pendant l'exécution ;
- [ ] les erreurs de compatibilité sont explicites.

**Limite de compatibilité :** un fichier BIN assemblé pour une carte différente, une version matérielle différente ou un périphérique non pris en charge ne sera pas garanti compatible.

## 5/5 — Intégration, validation et livraison

Objectif : réunir l'interface, l'émulateur et les périphériques dans une application installable.

Livrables attendus :
- intégration complète de l'écran, du clavier, des périphériques et du moteur ;
- importation, sélection et historique des firmwares ;
- sauvegarde des cartes SD et états virtuels ;
- stockage local et lancement hors ligne ;
- installation Android (APK si enveloppe native retenue, sinon PWA installable) ;
- tests automatisés et scénarios de référence ;
- documentation utilisateur en français ;
- rapport de compatibilité et paquet de livraison.

Critères de sortie :
- [ ] installation et premier lancement documentés sur Android ;
- [ ] une session de simulation fonctionne sans Internet ;
- [ ] les scénarios de test passent sur le Z Flip6 ;
- [ ] les limites des périphériques et des firmwares sont visibles ;
- [ ] les sauvegardes survivent à la fermeture de l'application ;
- [ ] les artefacts de livraison sont publiés.

## Règle de qualité

Une fonctionnalité est marquée « prise en charge » uniquement lorsqu'un test reproductible la démontre. Les écrans simulés, les périphériques modélisés et l'exécution réelle du code sont trois niveaux différents et seront suivis séparément.


## Avancement détaillé — étape 4/5

Le dépôt sélectionne Espressif esp-emu 1.2.0 en WebAssembly comme runtime, ajoute l'installateur vérifié SHA-256, le worker ESP32-S3, l'import contrôlé des BIN, les commandes CPU et une console UART. L'exécution réelle d'un firmware, le raccordement des périphériques Cardputer ADV et les mesures sur Z Flip6 restent des critères de validation non cochés.

- [x] moteur retenu, version épinglée et installateur vérifiant l'archive par SHA-256 ;
- [x] interface d'import BIN, contrôle taille/format, calcul SHA-256 et worker d'intégration ;
- [x] commandes de cycle de vie du worker (start/stop/reset), console UART et suivi des cycles CPU ;
- [x] import d'un ELF Xtensa optionnel pour les symboles et pas manuel par lot d'instructions ;
- [ ] bundle WebAssembly installé et chargé réellement dans un navigateur ;
- [ ] firmware ESP32-S3 de test démarré avec sortie UART vérifiée ;
- [ ] accès écran, clavier et périphériques Cardputer reliés aux modèles correspondants ;
- [ ] application testée hors ligne après mise en cache complète du runtime ;
- [ ] tests de performances et mémoire sur Galaxy Z Flip6 ;
- [ ] réception de caractères UART et débogueur interactif registres/mémoire.

Un BIN accepté par l'importeur ne constitue pas une garantie de compatibilité : seul le moteur puis un démarrage de référence peuvent le confirmer.

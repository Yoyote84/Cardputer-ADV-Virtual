# Audit technique de Velxio

**Date de vérification : 22 novembre 2026**

Dépôt analysé : [github.com/davidmonterocrespo24/velxio](https://github.com/davidmonterocrespo24/velxio), branche `master`.

## Résultat résumé

Velxio est une base utile pour comprendre et réutiliser des briques génériques d'un simulateur multi-cartes, mais **le dépôt open source public ne contient pas le simulateur Cardputer ADV complet**.

La documentation publique de Velxio décrit 40 cartes et cinq familles de processeurs. Son README distingue les cartes disponibles dans l'image auto-hébergée des cartes proposées uniquement sur velxio.dev.

Le Cardputer ADV est dans le groupe des cartes de marque disponibles uniquement dans le catalogue hébergé. Le commentaire source de `frontend/src/lib/onlineOnlyBoards.ts` précise explicitement que les moteurs d'émulation et les connexions matérielles de ces cartes ne sont pas dans l'arbre OSS. Le module `frontend/src/lib/proBoardRegistry.ts` est un point d'extension destiné à une surcouche privée ; ce n'est pas l'implémentation Cardputer elle-même.

## Composants utiles à étudier

| Élément Velxio | Intérêt pour ce projet | Décision |
| --- | --- | --- |
| Architecture frontend TypeScript/React | UI de simulation et séparation des panneaux | Étudier, ne pas recopier tout le produit |
| Types de cartes et registres | Interfaces de carte, identifiants et capacités | S'inspirer des contrats génériques |
| Gestionnaire ESP32 QEMU | Lancement du processeur ESP32, flash, UART et GPIO | Étudier pour l'adaptateur de runtime |
| Routes de simulation et WebSocket | Contrôle et remontée des événements | Adapter au transport local |
| Modèle de carte SD | Référence pour le stockage virtuel | Étudier les interfaces et tests |
| Exemples Cardputer ADV affichés par le catalogue | Confirment des cas d'usage visés | Ne pas supposer que l'émulation est disponible dans l'OSS |
| Images de cartes et composants | Aide visuelle potentielle | Ne pas intégrer sans vérifier les droits de chaque ressource |

## Moteur ESP32-S3 : contrainte déterminante

Le chemin d'émulation ESP32 documenté par Velxio utilise principalement une bibliothèque QEMU partagée (`libqemu-xtensa`) chargée par le backend Python via `ctypes`. Le pont `backend/app/services/esp32_lib_bridge.py` décrit des callbacks pour GPIO, direction des broches, UART, I2C, SPI et RMT ; la documentation `docs/ESP32_EMULATION.md` mentionne également ADC, PWM/LEDC et Wi-Fi. Le backend lance la boucle QEMU dans un thread et raccorde ses événements au serveur de simulation.

Le fichier `backend/app/services/esp_qemu_manager.py` représente un chemin de repli plus simple : il lance un processus QEMU et expose notamment UART et GPIO par sockets TCP lorsque le mode bibliothèque n'est pas disponible. Il ne faut donc pas confondre ce chemin de repli avec le pont principal.

Le moteur partagé est fourni dans les builds Velxio Linux/Docker et Windows ; la documentation publique ne fournit pas de build Android. Cela donne une base ESP32-S3 réelle à étudier, mais ne constitue pas directement un moteur embarqué dans une application Android hors ligne. Il faut porter et intégrer la bibliothèque QEMU adaptée pour un hôte Android ARM64, ou démontrer une autre approche locale.

La documentation `docs/BUILD-QEMU.md` décrit la construction des bibliothèques et la mise à disposition de la source QEMU modifiée. Elle annonce que QEMU et les modifications correspondantes sont sous GPL-2.0 et que la source correspondante est disponible pour les destinataires des binaires. Aucun binaire ou archive QEMU n'a été importé dans ce dépôt pendant l'étape 1.

À noter : une installation Velxio auto-hébergée peut fonctionner hors ligne une fois démarrée sur une machine hôte locale. Cela ne signifie pas que l'application complète et son backend sont déjà empaquetés pour tourner directement sur le Z Flip6.

## Licence et attribution

Les fichiers du projet Velxio déclarent :
- `LICENSE` : GNU Affero General Public License version 3 ;
- `COMMERCIAL_LICENSE.md` : option commerciale distincte pour les usages propriétaires ou fermés ;
- le README explique que les modifications et œuvres dérivées distribuées ou exécutées comme service réseau doivent respecter les conditions AGPLv3.

L'API GitHub renvoie une métadonnée SPDX `NOASSERTION` pour le dépôt malgré le fichier de licence et les déclarations du README. Cette différence de métadonnées est notée ; elle ne doit pas être masquée. Avant d'intégrer des fichiers précis, leur en-tête, leur licence et leur historique devront être revus individuellement.

Ce dépôt adopte AGPLv3 pour son propre code, mais cela ne donne aucun droit sur le code privé de Velxio, ses ressources graphiques ou ses binaires. Aucun code Velxio n'a été copié à l'étape 1.

## Faisabilité hors ligne sur Android

Le mode hors ligne est un objectif obligatoire, mais le moteur ne doit pas être choisi sur une simple supposition.

Pistes à évaluer dans l'étape 4 :
1. **QEMU natif ARM64 Android** : exécuter un moteur QEMU intégré dans un service local Android. Il faut valider la chaîne de compilation, les bibliothèques natives, la stabilité et les performances.
2. **QEMU compilé en WebAssembly** : garder un moteur dans le navigateur local. Il faut démontrer la prise en charge de la machine ESP32-S3, des accès flash, UART/GPIO et les performances sur le téléphone.
3. **Service local Android séparé** : application Android et moteur natif communiquant par IPC local. L'interface peut rester WebView/TypeScript.

Une première preuve de concept doit démarrer un firmware ESP32-S3 de test, fournir sa sortie UART et fonctionner sans accès réseau. Tant que ce test n'existe pas, la compatibilité BIN Cardputer est **non démontrée**.

## Décisions à ne pas prendre

- Ne pas intégrer l'URL velxio.dev comme dépendance obligatoire.
- Ne pas utiliser le catalogue en ligne comme substitut au support local.
- Ne pas prétendre que le Cardputer ADV est pris en charge par l'image auto-hébergée.
- Ne pas copier l'implémentation privée ou les assets en ligne.
- Ne pas promettre une exécution universelle de tous les BIN.


## Fichiers Velxio consultés

- `README.md` : distinction entre cartes de l'image auto-hébergée et cartes du catalogue en ligne.
- `frontend/src/lib/onlineOnlyBoards.ts` : commentaire indiquant que les moteurs et le câblage des cartes online-only ne sont pas dans l'arbre OSS.
- `frontend/src/lib/proBoardRegistry.ts` : contrat d'extension pour les cartes fournies par une surcouche hébergée.
- `backend/app/services/esp32_lib_bridge.py` : pont callback entre Python et `libqemu-xtensa`.
- `backend/app/services/esp_qemu_manager.py` : moteur QEMU de repli via processus et sockets.
- `docs/ESP32_EMULATION.md` et `docs/BUILD-QEMU.md` : capacités, plateformes, construction et informations de licence du moteur.

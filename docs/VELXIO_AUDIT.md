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

Le service `backend/app/services/esp_qemu_manager.py` indique qu'il lance un processus QEMU Xtensa pour ESP32 et ESP32-S3, charge le firmware comme image flash et utilise des canaux TCP pour UART et GPIO.

Ce fonctionnement est adapté à un backend de simulation. Il ne constitue pas directement un moteur embarqué dans une application Android hors ligne : il faut remplacer le lancement du processus serveur et les sockets distantes par un runtime local, ou démontrer une autre approche locale.

La documentation `docs/BUILD-QEMU.md` du dépôt Velxio décrit la construction des bibliothèques QEMU et l'obtention de la source QEMU modifiée via le mécanisme de téléchargement sous licence Velxio. Elle annonce que l'archive source QEMU fournie est sous GPL-2.0. Aucun binaire ou archive QEMU n'a été importé dans ce dépôt pendant l'étape 1.

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

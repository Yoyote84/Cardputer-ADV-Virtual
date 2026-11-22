# Architecture cible

## Principes

1. **Le firmware doit réellement s'exécuter.** Une simulation d'interface seule est un mode de démonstration, pas une émulation.
2. **Le matériel est modulaire.** Chaque périphérique est branché au moteur par une interface définie, sans dépendre de l'interface visuelle.
3. **Hors ligne d'abord.** Après installation et mise en cache des ressources, l'import et l'exécution doivent fonctionner sans service distant.
4. **Aucune réussite fictive.** Une fonctionnalité non implémentée doit renvoyer un état explicite.
5. **Traçabilité.** Chaque capacité annoncée possède un test et un niveau de compatibilité.

## Couches prévues

| Couche | Responsabilité |
| --- | --- |
| Application Android / PWA | Installation, cycle de vie, fichiers, permissions, mode plein écran |
| Interface Cardputer | Boîtier, écran, clavier tactile, menus de simulation |
| Gestion de session | Import firmware, reset, arrêt, sauvegarde, logs |
| Contrat de runtime | Démarrage, arrêt, reset, mémoire flash, UART, événements GPIO |
| Runtime ESP32-S3 | Exécution du CPU et des images flash |
| Bus et adaptateurs | SPI, I2C, I2S, GPIO, ADC, UART |
| Modèles Cardputer | ST7789V2, TCA8418, BMI270, ES8311, microSD, batterie, IR |
| Stockage virtuel | Flash, microSD virtuelle, snapshots et métadonnées |

## Contrat de runtime

Le moteur devra être remplaçable. L'interface de haut niveau doit au minimum représenter :
- chargement d'une image flash et de sa configuration ;
- démarrage, reset et arrêt ;
- flux UART entrant et sortant ;
- changements GPIO horodatés ;
- requêtes vers les contrôleurs SPI, I2C et I2S ;
- erreurs d'exécution, exception CPU et état de session.

Ce contrat ne fixe pas encore de technologie concrète. Le choix entre QEMU natif ARM64, compilation WebAssembly ou service local sera arrêté après une preuve de concept sur le téléphone.

## Architecture hors ligne

L'application ne devra pas envoyer de firmware sur velxio.dev ou un autre service distant pour le simuler.

Les éléments statiques de l'application peuvent être empaquetés dans une PWA ou une application native. Le runtime doit cependant pouvoir tourner localement. Une page WebView seule ne donne pas automatiquement accès à un processus QEMU natif et ne résout pas les contraintes de compilation ARM64.

La preuve de concept de l'étape 4 devra :
1. fonctionner en mode avion ;
2. démarrer un firmware ESP32-S3 de test ;
3. remonter une sortie UART réelle ;
4. piloter au moins un GPIO ;
5. s'arrêter proprement et permettre un redémarrage.

Si une PWA seule ne peut pas satisfaire ces critères, une enveloppe Android native et un service local seront utilisés.

## Import des firmwares

Formats envisagés :
- **BIN** : priorité pour le démarrage d'une image compilée ;
- **ELF** : complément potentiel pour les symboles et le débogage, si le moteur les exploite ;
- **ZIP** : paquet de projet ou de flash multi-images, uniquement avec un manifeste explicite.

L'import doit conserver le fichier original, calculer un SHA-256, vérifier les tailles autorisées et afficher la cible et la disposition flash quand elles peuvent être déterminées. Aucun fichier importé ne doit être exécuté par le système hôte comme programme Android.

## Modèle de compatibilité

Chaque périphérique possède l'un des états :
- **Émulé et testé** : protocole et interaction testés avec un firmware de référence.
- **Modèle partiel** : certains registres ou fonctions sont supportés.
- **Visuel uniquement** : représenté à l'écran, sans émulation de protocole.
- **Non pris en charge** : pas d'émulation ; un accès doit être signalé.

Un firmware complet peut dépendre de périphériques et de fonctions sans modèle. La compatibilité est donc établie par version et configuration, pas seulement par extension de fichier.

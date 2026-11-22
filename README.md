# Cardputer ADV Virtual

Simulateur dédié au **M5Stack Cardputer ADV (K132-Adv)**, avec pour cible d'utilisation un Samsung Galaxy Z Flip6 et un fonctionnement hors ligne.

> **État du projet : étape 3/5 — modèles matériels logiciels livrés ; vérification sur le Galaxy Z Flip6 à effectuer.**
>
> Le dépôt contient l'interface PWA, le clavier réel mappé depuis un relevé matériel public et les modèles logiciels des bus et périphériques Cardputer ADV. Le runtime ESP32-S3 n'est pas encore intégré : aucune image BIN Cardputer n'est exécutée à cette étape.

## Objectif final

L'application devra permettre de charger un firmware compilé pour le Cardputer ADV, de le démarrer dans un environnement simulé, d'utiliser un écran et un clavier virtuels, de gérer une carte microSD virtuelle et d'observer les sorties série et les erreurs. L'utilisation normale du simulateur devra être possible sans connexion Internet après installation des ressources nécessaires.

La compatibilité sera annoncée par fonctionnalité et testée avec des firmwares réels. Un écran dessiné à l'identique ne sera jamais présenté comme une preuve que le code ESP32-S3 a été exécuté.

## Interface disponible — étape 2

L'interface est dans [app/](app/) : coque virtuelle au format du Cardputer ADV, écran logique 240 × 135, clavier tactile de 56 touches, prise en charge du clavier physique Android, modificateurs et moniteur d'événements.

Pour lancer un aperçu local depuis la racine du dépôt :

```bash
python3 -m http.server 8080 --directory app
```

Ouvrir `http://localhost:8080`. Pour l'installation PWA et le cache hors ligne, servir le dossier `app/` depuis une origine HTTPS. Le cache contient l'interface, la feuille de style, le script et le keymap. Il ne contient pas de moteur de simulation.

Voir [les instructions de prévisualisation](README-PREVIEW.md) et [le contrat du clavier](docs/KEYBOARD_INTERFACE.md).

## Modèles matériels disponibles — étape 3

Les périphériques logiciels sont dans [app/emulator/](app/emulator/) : bus I²C/SPI/I²S, FIFO TCA8418, framebuffer ST7789V2, BMI270, ES8311, NS4150B, microSD SPI sparse de 128 Go, GPIO, ADC batterie et capture IR. Le clavier interactif envoie désormais les événements au modèle TCA8418 avant de les exposer à l'interface.

Lancer tous les tests :

\`\`\`bash
node --check app/app.js
node --check app/app.mjs
for file in app/emulator/*.mjs; do node --check "$file"; done
node --test tests/*.test.mjs
python3 tools/validate_profile.py
\`\`\`

Les modèles restent partiels sur certaines fonctions : configuration avancée BMI270, chemin analogique audio, CRC/modes SD complets et extension LoRa/GNSS. Voir [la matrice de compatibilité](docs/COMPATIBILITY_MATRIX.md).

## Ce que l'audit a établi

- Velxio constitue une source technique utile pour l'architecture d'émulation ESP32, les flux de compilation, la communication série et les interfaces de périphériques.
- La version auto-hébergée de Velxio ne fournit pas l'implémentation du Cardputer ADV. Le catalogue en ligne référence ce modèle, mais les moteurs et le câblage propres aux cartes en ligne uniquement sont explicitement absents de l'arbre open source.
- Le moteur ESP32 de Velxio s'appuie sur un processus QEMU côté serveur et des connexions de communication. Le rendre utilisable localement et hors ligne sur Android demande un travail spécifique ; ce n'est pas une fonction prête à l'emploi.
- Nous allons réutiliser les interfaces génériques et les connaissances open source vérifiées, et développer notre propre adaptateur matériel Cardputer ADV à partir des documents publics M5Stack.

Voir [l'audit Velxio](docs/VELXIO_AUDIT.md) et [l'architecture cible](docs/ARCHITECTURE.md).

## Matériel ciblé

Le profil officiel est conservé dans [cardputer/cardputer-adv.json](cardputer/cardputer-adv.json). Les principales références documentées sont :

- SoC ESP32-S3FN8, Xtensa LX7 double cœur, 240 MHz, flash 8 Mo.
- Écran ST7789V2, 240 × 135 pixels.
- Clavier 56 touches (4 × 14), contrôleur TCA8418.
- IMU BMI270, codec audio ES8311, amplificateur NS4150B, microphone MEMS.
- Émetteur infrarouge, lecteur microSD, connecteurs Grove et EXT.
- Batterie : la fiche M5Stack actuellement publiée indique 1 500 mAh ; les anciennes fiches indiquaient 1 750 mAh. La valeur du profil suit la fiche actualisée du 13 juillet 2026.

Les détails et brochages sont dans [le profil matériel](docs/HARDWARE_PROFILE.md). Les accessoires d'extension, notamment le module LoRa/GNSS, ne sont pas inclus dans le modèle de base ; ils pourront être ajoutés comme modules séparés.

## Feuille de route — 5 étapes

| Étape | Objectif | État |
| --- | --- | --- |
| 1/5 | Audit de Velxio, étude du matériel, architecture, structure et validation du profil | **Terminée** |
| 2/5 | Interface du Cardputer virtuel : boîtier, écran, clavier et interactions tactiles | **Livrée — essai sur Z Flip6 à confirmer** |
| 3/5 | Modèles des périphériques : I2C, écran, clavier, IMU, audio, batterie, microSD et extensions | **Socle logiciel livré — couverture partielle documentée** |
| 4/5 | Moteur ESP32-S3 local, import BIN/ELF, démarrage, console et débogage | À faire |
| 5/5 | Intégration finale, mode hors ligne, tests de compatibilité et paquet Android installable | À faire |

Les critères de sortie de chaque étape sont détaillés dans [ROADMAP.md](ROADMAP.md).

## Structure actuelle

- `app/` : interface PWA, écran ST7789V2 virtuel, clavier TCA8418 de 56 touches et modèles de périphériques dans `app/emulator/`.
- `cardputer/` : profil matériel et schéma de validation.
- `docs/` : audit, architecture, compatibilité, décisions et état d'avancement.
- `tools/` : validation locale du profil matériel.
- `tests/` : tests Node intégrés pour le mapping réel, le rendu responsive, les bus et les périphériques.
- `.github/workflows/` : validation du profil matériel et des contrats d'interface à chaque push et pull request.

## Vérifier le projet

Prérequis : Python 3 et Node.js 18 ou ultérieur.

```bash
node --check app/app.js
node --check app/app.mjs
for file in app/emulator/*.mjs; do node --check "$file"; done
node --test tests/*.test.mjs
python3 tools/validate_profile.py
```

## Vérifier le profil

Prérequis : Python 3.

```bash
python3 tools/validate_profile.py
```

La validation contrôle les champs matériels essentiels et les correspondances de brochage. Elle ne compile pas de firmware et ne valide pas encore l'émulation.

## Sources de référence

- [Documentation officielle M5Stack — Cardputer-Adv](https://docs.m5stack.com/en/core/Cardputer-Adv)
- [Dépôt Velxio](https://github.com/davidmonterocrespo24/velxio)
- [Licence et conditions publiées par Velxio](https://github.com/davidmonterocrespo24/velxio/blob/master/LICENSE) et [licence commerciale](https://github.com/davidmonterocrespo24/velxio/blob/master/COMMERCIAL_LICENSE.md)

## Licence

Ce projet est publié sous **GNU AGPL v3.0**. Les composants tiers conservent leurs licences et mentions propres. Voir [NOTICE.md](NOTICE.md) pour les règles d'attribution et l'état des éléments tiers.

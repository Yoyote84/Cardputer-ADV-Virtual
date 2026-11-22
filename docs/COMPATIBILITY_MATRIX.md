# Matrice de compatibilité — Cardputer ADV Virtual

**État après l'implémentation logicielle de l'étape 3/5.**  
Les modèles matériels ci-dessous sont exécutables comme modules JavaScript autonomes et sont couverts par des tests Node.js. Ils ne sont pas encore pilotés par un firmware ESP32-S3 : le raccordement CPU est l'objet de l'étape 4.

| Élément | Modèle présent | Couverture réelle | Limite ou preuve à ajouter |
| --- | --- | --- | --- |
| ESP32-S3FN8 / Xtensa LX7 | Non | Aucun CPU émulé | Étape 4 : démarrer un vrai firmware BIN local |
| Flash interne 8 Mo | Profil seulement | Capacité documentée | Étape 4 : image flash, partitions, NVS et reset |
| Bus I²C | Oui | Adresses 7 bits, lecture/écriture registre, scan et trace | Les périphériques non raccordés au rack restent absents du scan |
| TCA8418 clavier | Oui | Adresse 0x34, registres utilisés, FIFO 10 événements, press/release, flags et W1C | Scan électrique, debounce et fonctions GPIO avancées non émulés |
| Clavier visuel | Oui | 56 légendes et codes empiriques, 4×14, Fn momentané, Aa toggle, press/release | Dimensions/texture des keycaps et comparaison photographique à confirmer sur le Z Flip6 |
| ST7789V2 | Oui | Commandes de base, fenêtres, RAMWR, RGB565 et framebuffer 240×135 | Timings électriques, tearing, consommation et commandes rares non modélisés |
| BMI270 | Partiel | CHIP_ID, statut de base, axes bruts contrôlables, reset et trace d'initialisation | Image de configuration Bosch, FIFO capteur, algorithmes intégrés et interruptions avancées absents |
| ES8311 | Partiel | ID, registres de contrôle et files d'échantillons I²S | Horloges bit/word, conversions analogiques et configuration audio complète non garanties |
| NS4150B / haut-parleur | Partiel | Gain numérique, mute et saturation de blocs audio | Étape Class-D, rail d'alimentation, impédance/charge et acoustique non émulés |
| Microphone MEMS | Partiel | Injection d'échantillons numériques dans l'entrée I²S simulée | Réponse fréquentielle, bruit et capsule physique non modélisés |
| microSD | Partiel | SPI, init SDHC, CSD v2, CMD17/CMD24 et stockage sparse annoncé 128 Go | CMD18/CMD25, CRC, timing et modes SD complets à vérifier |
| Batterie / ADC GPIO10 | Partiel | Valeur ADC brute contrôlable | Diviseur, tension de référence, courbe tension/% et autodécharge non calibrés |
| IR TX GPIO44 | Partiel | Capture des durées de pulse et fréquence porteuse | Porteuse électrique, LED IR et propagation optique non modélisées |
| GPIO / Grove / EXT | Partiel | Entrées/sorties, ADC brut et table de contacts | Électricité analogique, protections et modules branchés non simulés |
| Cap LoRa/GNSS optionnel | Réservé | Ports et contrat d'extension préparés, aucun modèle radio concret | Profil SX1262/GNSS séparé à documenter avant implémentation |
| Wi‑Fi / BLE | Non | Aucun réseau ESP32 simulé | À traiter avec le runtime/protocole de l'étape 4 |

## Règle d'annonce

- **Modélisé et testé** : les tests du modèle logiciel passent.
- **Partiel** : certaines fonctions du composant sont modélisées ; les limites ci-dessus restent applicables.
- **Non implémenté** : ne doit pas être présenté comme fonctionnel.
- **Firmware compatible** : uniquement après un test reproductible avec le vrai runtime ESP32-S3 de l'étape 4.

Un modèle d'écran ou de clavier ne prouve pas, à lui seul, qu'un fichier BIN est exécuté.


## Runtime Espressif (étape 4)

Le moteur choisi peut exécuter le firmware ESP32-S3 dans WebAssembly. Le worker et l'importeur sont intégrés au projet, mais le bundle binaire doit être installé avec `tools/install_esp_emu.py`. Tant que ce bundle et un firmware de test n'ont pas été lancés, la prise en charge CPU reste **intégrée mais non validée**.

Les périphériques que l'émulateur Espressif possède déjà ne sont pas équivalents aux périphériques Cardputer ADV. Les modèles TCA8418, ST7789V2, BMI270, ES8311, NS4150B et microSD demandent des composants WebAssembly spécifiques et un câblage de co-simulation ; ils ne sont pas automatiquement raccordés à l'ESP32-S3.

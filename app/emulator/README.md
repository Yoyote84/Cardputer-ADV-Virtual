# Modèles matériels — étape 3

Les classes de ce dossier sont des modèles déterministes du matériel de base Cardputer ADV. Elles sont utilisables indépendamment du futur moteur ESP32-S3.

## Périphériques et bus

| Élément | Liaison | Couverture de cette étape |
| --- | --- | --- |
| TCA8418 | I²C 0x34, IRQ GPIO11 | Registres principaux, FIFO 10 événements, press/release, statut d'interruption, initialisation Cardputer ADV |
| ST7789V2 | SPI CS GPIO37 + DC GPIO34 | Commandes reset/sleep/display, fenêtre CASET/RASET, COLMOD RGB565, RAMWR, framebuffer 240×135 |
| BMI270 | I²C 0x69 | CHIP_ID, ERR_REG, STATUS, données brutes accel/gyro, commandes reset et suivi du transfert de configuration |
| ES8311 | I²C 0x18 + flux I²S | Registres de contrôle 0x00–0x45, ID de puce 0x83/0x11/0x00, files d'échantillons I²S lecture/écriture |
| microSD | SPI CS GPIO12 | Initialisation SPI (CMD0/CMD8/CMD55/ACMD41/CMD58), CSD v2 (CMD9), CMD16, CMD17, CMD24 et stockage bloc sparse de 128 Go |
| GPIO | GPIO0–48 | Modes, entrées/sorties numériques, valeurs ADC contrôlables et changements |
| Batterie | ADC GPIO10 | Échantillon brut contrôlable ; pas de calibration tension/pourcentage inventée |
| IR TX | GPIO44 | Capture de trames de durées et fréquence porteuse demandées |
| Grove / EXT | GPIO et bus documentés | Table de routage des contacts, sans modèle d'extension LoRa/GNSS ajouté au matériel de base |

## Contrats de bus

- `VirtualI2CBus` route les lectures/écritures registre par adresse 7 bits.
- `VirtualSPIBus` route les transactions par CS et passe le niveau DC au contrôleur écran.
- `VirtualI2SBus` transmet des blocs d'échantillons, sans prétendre reproduire le timing des horloges au niveau fil.
- `VirtualGPIOBank` permet aux prochains adaptateurs CPU de lire et piloter les broches.

## Contrôleur clavier : fonctionnement fidèle

Le mapping 4×14 et les codes raw sont ceux du pilote public [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard), qui indique les avoir relevés touche par touche sur un Cardputer ADV réel. La couche TCA8418 suit la fiche TI SCPS215G : événements press/release dans un FIFO de 10 octets, bit 7 = press, bits 6:0 = code, lecture destructive de KEY_EVENT_A et indicateur K_INT.

Le composant est initialisé selon la séquence du pilote ADV : KP_GPIO1=0xFF, KP_GPIO2=0xFF, KP_GPIO3=0x00, GPI_EM1=0x00 et CFG=0x3E.

## Couverture partielle et limites

- Le TCA8418 modélise les registres utilisés par le clavier et les flags principaux. Il ne reproduit pas le scan électrique analogique, le debounce interne au niveau microseconde ni toutes les fonctions GPIO/locks du circuit.
- Le ST7789V2 modèle les commandes et la mémoire graphique, sans timings SPI, tearing, variations d'alimentation/rétroéclairage ni toutes les commandes du contrôleur.
- Le BMI270 expose les registres d'identité, statut et axes. L'image de configuration Bosch nécessaire à l'activation complète des fonctions embarquées n'est pas fournie : l'algorithme de mouvement, les fonctions avancées, FIFO et interruptions capteur ne sont pas annoncés comme émulés.
- L'ES8311 accepte les écritures de registres et des blocs d'échantillons I²S. Les échantillons de sortie passent par un modèle numérique NS4150B (gain/mute/saturation). Le circuit Class-D, les tensions analogiques, les timings électriques et l'acoustique du haut-parleur ne sont pas émulés.
- La microSD est un bloc-device SPI en RAM volatile. Le stockage annoncé fait 128 Go décimaux, comme la carte physique visée. Les secteurs sont creux (sparse) : 128 Go sont annoncés dans le CSD sans réserver cette quantité de RAM ; seuls les blocs écrits sont alloués. Le système FAT/FAT32 est géré par la pile logicielle/firmware de l'invité ; le modèle matériel fournit les blocs via SPI. Le CRC de données n'est pas validé.
- La batterie expose le raw ADC sur GPIO10. La relation ADC → tension → pourcentage nécessite calibration matérielle.
- Le transmetteur IR capture les trames logiques, sans modéliser le rayonnement ou la propagation.

Aucun de ces modèles n'exécute encore le code du firmware. L'intégration du bus avec le CPU Xtensa local est prévue à l'étape 4.

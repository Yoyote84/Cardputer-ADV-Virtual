# Matrice de compatibilité initiale

**État à la fin de l'étape 1 : aucune exécution de firmware Cardputer n'est encore démontrée.**

| Élément | Objectif | État actuel | Preuve requise |
| --- | --- | --- | --- |
| ESP32-S3FN8 / Xtensa LX7 | Exécution du vrai firmware | Non implémenté dans ce dépôt | Firmware de test démarré localement |
| Flash 8 Mo | Image flash virtuelle | Profil documenté | Lecture/écriture et reset vérifiés |
| ST7789V2 | Framebuffer 240 × 135 | Spécification documentée | Test SPI et image de référence |
| TCA8418 | Clavier 56 touches | Spécification documentée | Lecture du registre de touches depuis un firmware |
| BMI270 | Accéléromètre + gyroscope | Spécification documentée | Lecture de registres I2C et valeurs de capteurs |
| ES8311 | Codec audio | Broches documentées | Séquence I2C et flux I2S testés |
| NS4150B / haut-parleur | Sortie sonore | Spécification documentée | Test de sortie audio |
| Microphone MEMS | Entrée audio | Spécification documentée | Échantillons injectés vers le chemin audio |
| microSD | Système de fichiers virtuel | Brochage documenté | Lecture/écriture FAT depuis un firmware |
| IR TX | Transmission IR | Brochage documenté | Capture de forme d'onde |
| Batterie ADC | Mesure batterie | Brochage documenté | Valeur ADC contrôlable |
| Grove / EXT | Extensions GPIO et bus | Brochage documenté | Tests GPIO et bus |
| Wi-Fi / BLE ESP32-S3 | Réseau simulé | Non implémenté | Contrat local et tests isolés |

## Règle d'annonce

Un élément ne passe à « émulé et testé » qu'après un test reproductible. La documentation matérielle ou une représentation graphique ne suffit pas.

# Profil matériel — M5Stack Cardputer ADV

**Modèle ciblé : K132-Adv (Cardputer-Adv)**  
**Source principale :** [documentation officielle M5Stack](https://docs.m5stack.com/en/core/Cardputer-Adv)  
**Vérification :** 22 novembre 2026

## Contrôleur principal

| Élément | Valeur |
| --- | --- |
| Module | Stamp-S3A |
| SoC | ESP32-S3FN8 |
| CPU | Xtensa LX7 double cœur, 240 MHz |
| Flash intégrée | 8 Mo |
| Écran | ST7789V2, 1,14 pouce, 240 × 135 |
| Clavier | 56 touches, disposition 4 × 14 |
| Contrôleur clavier | TCA8418RTWR, bus I2C |
| IMU | BMI270, accéléromètre + gyroscope 6 axes |
| Codec audio | ES8311 |
| Amplificateur | NS4150B, haut-parleur 8 ohms / 1 W |
| Microphone | MEMS |
| Infrarouge | Émetteur IR |
| Stockage externe | microSD |
| Ports | HY2.0-4P (Grove) et EXT 2.54-14P |
| Batterie | 1 500 mAh selon la fiche M5Stack mise à jour le 13 juillet 2026 |

### Évolution de la capacité de batterie

Les anciennes versions de la documentation indiquaient 1 750 mAh. La fiche officielle actuelle signale une modification à 1 500 mAh au 13 juillet 2026. Le profil JSON utilise 1 500 mAh et garde cette évolution documentée afin d'éviter les confusions entre révisions.

## Brochage publié

Les noms de signaux ci-dessous reprennent le tableau PinMap M5Stack. Les broches sont des GPIO du Stamp-S3A.

### Écran ST7789V2

| Signal | GPIO |
| --- | --- |
| Rétroéclairage DISP_BL | G38 |
| RESET | G33 |
| RS / DC | G34 |
| DAT | G35 |
| SCK | G36 |
| CS | G37 |

Résolution logique : 240 × 135 pixels. Le simulateur conservera ce framebuffer logique et mettra l'image à l'échelle sans modifier son rapport.

### Clavier et IMU

| Signal | GPIO |
| --- | --- |
| I2C SDA | G8 |
| I2C SCL | G9 |
| Interruption clavier TCA8418 | G11 |

Le keymap de référence communautaire utilise l'adresse I2C 7 bits `0x34` pour le TCA8418. Cette adresse est notée à titre provisoire et devra être confirmée sur le Cardputer ADV physique ou dans les sources officielles avant de valider le pilote virtuel.
| Contrôleur clavier | TCA8418RTWR |
| Capteur de mouvement | BMI270 |

Les deux composants utilisent le bus I2C publié. Les adresses I2C et détails de registres devront être validés à partir des fiches techniques des composants et/ou des sources M5Stack avant d'implémenter les modèles.

### Audio ES8311

| Signal | GPIO |
| --- | --- |
| I2C SDA | G8 |
| I2C SCL | G9 |
| SCLK | G41 |
| ASDOUT | G46 |
| LRCK | G43 |
| DSDIN | G42 |

L'implémentation devra respecter les directions et séquences de registres du codec. La seule présence des broches ne suffit pas à garantir une simulation audio fidèle.

### Infrarouge, batterie et microSD

| Fonction | GPIO |
| --- | --- |
| IR TX | G44 |
| Mesure batterie ADC | G10 |
| microSD CS | G12 |
| microSD MOSI | G14 |
| microSD CLK | G40 |
| microSD MISO | G39 |

### Port Grove HY2.0-4P

| Contact | Fonction |
| --- | --- |
| Noir | GND |
| Rouge | 5V |
| Jaune | G2 |
| Blanc | G1 |

### Port EXT 2.54-14P

| Contact | Fonction publiée |
| --- | --- |
| 1 | G3 — RESET |
| 2 | 5V IN |
| 3 | G4 — INT |
| 4 | GND |
| 5 | G6 — BUSY |
| 6 | 5V OUT |
| 7 | G40 — SCK |
| 8 | G8 — I2C SDA |
| 9 | G14 — MOSI |
| 10 | G9 — I2C SCL |
| 11 | G39 — MISO |
| 12 | G13 — UART TX |
| 13 | G5 — CS |
| 14 | G15 — UART RX |

## Éléments hors du modèle de base

Le Cardputer ADV de base ne doit pas être confondu avec un module d'extension externe. Les accessoires tels que le module LoRa/GNSS Cap LoRa-1262 seront modélisés comme extensions distinctes, avec leur propre fiche de matériel, leurs bus et leurs broches.

## Références et réserves

- La fiche officielle M5Stack est la référence pour les caractéristiques et le pinmap du produit.
- Les adresses I2C, registres, timings et comportements électriques détaillés ne sont pas tous donnés dans la fiche produit ; ils devront être confirmés par les datasheets et les sources firmware officielles.
- Les variantes Cardputer, Cardputer v1.1 et Cardputer ADV ne sont pas interchangeables. Ce profil vise uniquement le K132-Adv.

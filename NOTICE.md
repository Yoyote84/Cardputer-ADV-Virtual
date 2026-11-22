# Mentions et composants tiers

## Velxio

- Projet : [davidmonterocrespo24/velxio](https://github.com/davidmonterocrespo24/velxio)
- Auteur mentionné par le dépôt : David Montero Crespo.
- Le dépôt Velxio publie une licence AGPLv3 ainsi qu'une offre de licence commerciale distincte.
- À la date de l'audit (22 novembre 2026), aucun fichier source Velxio n'a été copié dans ce dépôt.
- Velxio est une référence d'architecture et une base potentielle de réutilisation pour les composants génériques, sous réserve de conserver les avis, licences et obligations AGPL applicables à chaque composant intégré.

### Limite particulière du Cardputer ADV

Le fichier public `frontend/src/lib/onlineOnlyBoards.ts` de Velxio précise que, pour les cartes réservées à l'instance hébergée, les moteurs d'émulation et le câblage de carte ne font pas partie de l'arbre open source. Le dépôt public auto-hébergé ne doit donc pas être considéré comme contenant l'implémentation complète du Cardputer ADV.

Le présent projet ne copie pas et ne cherche pas à contourner les éléments privés de Velxio. Les modèles matériels Cardputer ADV seront développés à partir de la documentation matérielle publique de M5Stack et de composants open source dont la licence aura été vérifiée.

Le guide Velxio de construction QEMU renvoie à une archive source QEMU adaptée disponible via leur mécanisme de licence. Cette archive et les binaires associés ne sont pas inclus ici. Leur obtention, leur licence GPL-2.0 annoncée dans la documentation et leur compatibilité Android devront être vérifiées séparément avant intégration.

## Disposition du clavier Cardputer ADV

- Référence : [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard).
- Licence annoncée dans le dépôt de référence : MIT.
- Utilisation dans ce projet : référence du positionnement des touches, des codes et de quelques combinaisons Fn ; aucun code source du pilote n'a été copié.
- Les détails matériels de l'interface TCA8418 (FIFO, registres, interruptions et timings) seront modélisés et vérifiés séparément à l'étape 3.

## Modèles et documentation des périphériques

- **TCA8418** : la disposition 4 × 14, l'adresse 0x34 et les codes FIFO du clavier viennent de [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard), publié sous licence MIT. Seuls les faits matériels et le mapping sont repris ; le code source du pilote n'est pas copié.
- **TCA8418 datasheet** : [Texas Instruments, SCPS215G](https://www.ti.com/lit/ds/symlink/tca8418.pdf), référence technique du modèle de registres et de FIFO.
- **BMI270** : [Bosch Sensortec datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi270-ds000.pdf), référence pour le CHIP_ID, les registres et l'initialisation. L'image de configuration Bosch n'est pas copiée ni incluse.
- **ES8311** : [Everest Semiconductor product brief](https://www.everest-semi.com/pdf/ES8311%20PB.pdf), référence fonctionnelle du codec. Le modèle de ce projet n'intègre aucun code tiers du codec.
- **ST7789V2, microSD, GPIO, ADC et IR** : modèles indépendants écrits à partir des spécifications publiques et du profil M5Stack ; aucune source QEMU ou bibliothèque de pilote propriétaire n'est intégrée.

## M5Stack Cardputer ADV

Les dimensions, composants et brochages du profil matériel proviennent de la [documentation officielle M5Stack](https://docs.m5stack.com/en/core/Cardputer-Adv). M5Stack et Cardputer sont des marques de leurs propriétaires respectifs. Ce dépôt est un projet communautaire indépendant et n'est ni affilié à M5Stack ni approuvé par M5Stack.

Aucune image de produit, marque graphique ou ressource propriétaire n'est intégrée dans le code de ce dépôt à ce stade.

## Règle d'intégration future

Pour chaque composant tiers qui sera effectivement copié ou lié :
1. conserver le fichier de licence et les avis de copyright applicables ;
2. inscrire le composant, sa version, sa source et sa licence dans le registre des dépendances ;
3. respecter les obligations de redistribution et de mise à disposition du code source ;
4. ne pas intégrer d'éléments issus de l'instance privée de Velxio sans autorisation explicite ;
5. ne pas annoncer la compatibilité d'un périphérique sans test.

## Licence de ce dépôt

Le code original de ce dépôt est publié sous GNU AGPL v3.0. Cette licence ne remplace pas les licences distinctes des dépendances.

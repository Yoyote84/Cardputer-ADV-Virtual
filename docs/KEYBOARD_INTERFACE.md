# Clavier réel — M5Stack Cardputer ADV K132-Adv

## Disposition physique vérifiée

Le Cardputer ADV utilise le contrôleur TCA8418 sur I²C à l'adresse 7 bits \`0x34\`, SDA GPIO8, SCL GPIO9 et IRQ GPIO11. Il ne faut pas utiliser le pilote matriciel GPIO des Cardputer v1.x : le modèle ADV a un contrôleur clavier dédié.

La disposition ci-dessous et les codes FIFO sont ceux publiés par [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard). L'auteur indique que chaque touche a été pressée individuellement sur un Cardputer ADV physique et son événement lu dans le FIFO du TCA8418.

| Rangée | Légendes physiques, de gauche à droite | Codes bruts TCA8418 |
| --- | --- | --- |
| 1 | esc, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, -, =, del | 1, 5, 11, 15, 21, 25, 31, 35, 41, 45, 51, 55, 61, 65 |
| 2 | tab, q, w, e, r, t, y, u, i, o, p, [, ], \ | 2, 6, 12, 16, 22, 26, 32, 36, 42, 46, 52, 56, 62, 66 |
| 3 | fn, Aa, a, s, d, f, g, h, j, k, l, ↑, ', enter | 3, 7, 13, 17, 23, 27, 33, 37, 43, 47, 53, 57, 63, 67 |
| 4 | ctrl, opt, alt, z, x, c, v, b, n, m, ←, ↓, →, space | 4, 8, 14, 18, 24, 28, 34, 38, 44, 48, 54, 58, 64, 68 |

Le mapping complet et directement consommé par l'interface est versionné dans \`app/keyboard-layout.json\`. Il n'est plus reconstruit par interpolation d'une séquence de codes : les codes sont non séquentiels parce que le contrôleur scanne la matrice par colonnes.

## Couches normales et Fn

- Les touches lettres utilisent la minuscule en couche normale et la majuscule lorsque Fn est maintenu.
- La couche Fn des chiffres et symboles est : \`1→!\`, \`2→@\`, \`3→#\`, \`4→$\`, \`5→%\`, \`6→^\`, \`7→&\`, \`8→*\`, \`9→(\`, \`0→)\`, \`-→_\`, \`=→+\`, \`[→{\`, \`]→}\`, \`\\→|\`.
- Les flèches sont des touches de navigation sans Fn ; Fn transforme ↑ en \`;\`, ← en \`,\`, ↓ en \`.\` et → en \`/\`.
- Aa est un verrouillage majuscules qui bascule à chaque appui et n'affecte que les lettres.
- Fn, CTRL, OPT et ALT sont des modificateurs maintenus ; ils ne génèrent pas de caractère.

Sur écran tactile, le maintien est réalisé par \`pointerdown\` et relâché par \`pointerup\`/\`pointercancel\`. Avec un clavier physique connecté au téléphone ou à l'ordinateur, les transitions sont traitées par \`keydown\`/\`keyup\`.

## Modèle TCA8418 de l'étape 3

L'interface n'envoie pas un caractère directement au moniteur. Elle injecte le code brut dans le modèle du TCA8418 :

1. une pression ajoute un événement FIFO \`0x80 | keycode\` ;
2. un relâchement ajoute un événement FIFO \`keycode\` ;
3. le contrôleur expose le nombre d'événements dans KEY_LCK_EC (registre \`0x03\`) ;
4. la lecture de KEY_EVENT_A (registre \`0x04\`) retire un événement du FIFO ;
5. INT_STAT (registre \`0x02\`) est effacé par écriture-one-to-clear.

Le modèle prend en charge une profondeur FIFO de 10, les événements press/release, l'état de touche maintenue et le signal d'interruption logique. L'initialisation du clavier ADV suit la séquence du pilote public : KP_GPIO1=\`0xFF\`, KP_GPIO2=\`0xFF\`, KP_GPIO3=\`0x00\`, GPI_EM1=\`0x00\` et CFG=\`0x3E\`.

Chaque événement matériel traité émet également un événement DOM \`cardputer:keyboard\` pour le futur adaptateur ESP32-S3 de l'étape 4. L'objet \`event.detail\` contient le code raw TCA8418, l'octet FIFO, le caractère résolu, le statut appuyé/relâché, les modificateurs et la source d'entrée.

## Référence et licence

- [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard), licence MIT : disposition réelle, codes FIFO et comportement logiciel Fn/Aa.
- [Texas Instruments TCA8418](https://www.ti.com/lit/ds/symlink/tca8418.pdf), datasheet SCPS215G : registre, FIFO, bits d'événement et interruptions.
- [M5Stack Cardputer-Adv](https://docs.m5stack.com/en/core/Cardputer-Adv) : composants et brochage du K132-Adv.

Le projet réutilise les faits matériels et le mapping documentés, pas le code source du pilote MicroPython.

## Limites restantes

- La reproduction de la disposition et la logique press/release sont établies ; la forme, les dimensions, la police sérigraphiée et la teinte exacte du plastique devront être comparées à une photo frontale de ton Cardputer ADV.
- Le TCA8418 virtuel reproduit les registres nécessaires au clavier et son FIFO ; le scan électrique, le debounce analogique et toutes les fonctions GPIO/verrouillage du circuit ne sont pas encore intégralement émulés.
- Aucun firmware ESP32-S3 n'est encore connecté au bus I²C : cette intégration CPU est prévue à l'étape 4.

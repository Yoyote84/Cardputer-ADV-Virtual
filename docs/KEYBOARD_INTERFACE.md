# Interface clavier — étape 2

## Clavier visuel

Le rendu utilise les 56 touches physiques du Cardputer ADV, organisées en 4 lignes de 14 touches. Le profil est stocké dans `app/keyboard-layout.json` : identifiant stable, légende, valeur normale, valeur Fn connue, `KeyboardEvent.code` et valeur d'événement brut du TCA8418.

## Entrées prises en charge par l'interface

- Touches tactiles : `pointerdown`, `pointerup` et `pointercancel`.
- Clavier physique Android / ordinateur : `keydown` et `keyup` via `KeyboardEvent.code`.
- Modificateurs : FN, CTRL, OPT, ALT et bascule de majuscules Aa.
- Navigation de la démo : flèches, Entrée et Échap.
- Retours visuels : touche enfoncée, modificateur actif, dernière touche et moniteur d'événements.

Les touches FN, CTRL, OPT et ALT se comportent comme des modificateurs maintenus lorsqu'elles proviennent d'un clavier physique. Sur écran tactile, elles sont verrouillées au toucher, puis libérées au caractère suivant pour éviter d'exiger un appui simultané difficile sur téléphone. Aa bascule les majuscules.

## Contrat d'événement pour l'étape 3

Chaque transition de touche émet un événement `cardputer:keyboard` sur `window`. Exemple de `event.detail` :

```json
{
  "keyId": "q",
  "label": "Q",
  "rawCode": 6,
  "value": "q",
  "pressed": true,
  "fn": false,
  "capsLock": false,
  "ctrl": false,
  "opt": false,
  "alt": false,
  "source": "touch",
  "timestamp": 1795310000000
}
```

`rawCode` suit les valeurs d'événement capturées pour le TCA8418. La future couche TCA8418 virtuelle devra encore reproduire les registres, le FIFO, l'état d'interruption et la séquence de lecture I²C ; l'événement UI n'est pas à lui seul une émulation du composant.

## Sources et attribution

- Disposition 4 × 14, contrôleur TCA8418, adresse I²C `0x34` et valeurs raw de clavier : [kamrrillo/Cardputer-ADV-Keyboard](https://github.com/kamrrillo/Cardputer-ADV-Keyboard), dépôt publié sous licence MIT. Le dépôt est cité comme référence du mapping ; aucun code source de son pilote n'est copié ici.
- Caractéristiques et contrôleur : [documentation officielle M5Stack Cardputer-Adv](https://docs.m5stack.com/en/core/Cardputer-Adv).
- Correspondance des fonctions Fn des flèches : même référence clavier ci-dessus.

## Limites connues de l'étape 2

- Le modèle clavier émet des événements UI, pas des transactions I²C.
- Le keymap est une référence de disposition et d'événements ; les séquences firmware exactes, les touches Fn secondaires non documentées et la gestion du FIFO seront finalisées avec le modèle TCA8418 de l'étape 3.
- Le canvas affiche une interface de démonstration et n'est pas encore piloté par du code ESP32-S3.

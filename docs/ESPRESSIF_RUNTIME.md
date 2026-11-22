# Runtime ESP32-S3 — étape 4/5

## Moteur retenu

Le runtime retenu est **Espressif esp-emu 1.2.0**, publié sous Apache-2.0. Sa cible WebAssembly s'exécute dans un worker du navigateur, sans serveur d'émulation et sans téléverser le firmware. La cible est configurée sur `esp32s3` (Xtensa LX7 double cœur).

- Version : [v1.2.0](https://github.com/espressif/esp-emulator/releases/tag/v1.2.0)
- Guide WebAssembly : [Browser Emulation Guide](https://github.com/espressif/esp-emulator/blob/main/docs/guides/BROWSER.md)
- Guide de co-simulation : [Virtual Parts](https://github.com/espressif/esp-emulator/blob/main/docs/guides/PARTS.md)
- Archive WebAssembly : `esp-emu-1.2.0-wasm.tar.gz`
- SHA-256 vérifié par l'installateur : `29cd94f779a7618d2646960dfb8897849e78a5e023de1da3ca831f658534a655`

## Installer le moteur

Depuis la racine du dépôt, sur un environnement avec Python 3 et accès Internet :

```bash
python3 tools/install_esp_emu.py
python3 tools/install_esp_emu.py --check
```

Pour installer une archive déjà téléchargée, y compris sans réseau :

```bash
python3 tools/install_esp_emu.py --archive /chemin/esp-emu-1.2.0-wasm.tar.gz
```

Les fichiers sont placés sous `app/vendor/esp-emu/runtime/`. L'installateur vérifie la taille de l'archive et son SHA-256, n'extrait que les chemins runtime autorisés sous `www/`, refuse les liens et écrit un manifeste de version. Il exige le module JS, le module WASM et `cosim.js`.

Le runtime distribué n'est pas commité dans les sources par défaut. Pour publier la PWA avec le moteur embarqué, il faut inclure le dossier runtime généré dans le paquet de distribution.

## Importer et lancer

1. Construire un firmware ESP-IDF avec la cible `esp32s3`.
2. Produire une image fusionnée flash avec `idf.py merge-bin -o build/merged-flash.bin`.
3. Servir le dossier `app/` depuis HTTP(S), pas depuis `file://`.
4. Choisir le fichier `.bin`, vérifier ses métadonnées et son SHA-256, puis cliquer sur **Importer le BIN**.
5. Ajouter facultativement l'ELF Xtensa compilé avec ce firmware ; l'API `load_app_elf` permet de symboliser les rapports de faute.
6. Cliquer sur **Démarrer** et observer les sorties UART. **Pas × 1000** exécute un lot d'environ 1 000 instructions puis met le CPU en pause.
7. **Reset CPU** relance l'image chargée ; **Arrêter** arrête la boucle d'exécution.

L'importeur limite la taille à la flash physique de 8 Mio, refuse les ELF utilisés par erreur comme BIN et inspecte les en-têtes ESP alignés sur les secteurs usuels. Les layouts fusionnés non reconnus sont signalés et laissés au contrôle du moteur. Un fichier accepté par l'importeur n'est pas déclaré compatible avant le démarrage réel.

## Limites connues

- Le moteur exécute le SoC ESP32-S3 et ses périphériques intégrés documentés par Espressif. Cela ne signifie pas que tous les périphériques propres au Cardputer ADV sont déjà raccordés.
- Les modèles JS de l'étape 3 (TCA8418, ST7789V2, BMI270, ES8311, NS4150B, microSD) ne sont pas encore reliés au bus matériel du moteur. La co-simulation Espressif utilise des composants WebAssembly séparés ; les composants Cardputer correspondants doivent encore être écrits, raccordés et testés.
- La console affiche les sorties UART. L'import ELF optionnel ajoute les symboles pour les rapports de faute ; le pas manuel exécute un lot d'environ 1 000 instructions. L'injection de caractères UART et le débogueur Xtensa interactif avec registres/mémoire restent à compléter.
- Aucun test sur le Galaxy Z Flip6 n'est revendiqué. La mémoire disponible et la vitesse réelle sur le téléphone restent à mesurer.
- Le paquet PWA hors ligne ne sera complet qu'après installation du moteur et mise en cache de ses ressources WASM.
- Aucune compatibilité totale du firmware Cardputer ADV n'est garantie avant les tests de référence sur une image compilée pour cette carte.

## Worker

Le worker `app/emulator/esp-emu-worker.mjs` charge l'API Espressif `WasmEmulator` avec la cible `esp32s3`, la ROM intégrée et le BIN fusionné. Le cycle d'exécution passe par `CosimPump`. Les sorties UART et les erreurs/fautes CPU remontent vers l'interface.

Le BIN n'est jamais exécuté comme programme Android : ses octets sont fournis au moteur WebAssembly d'émulation.

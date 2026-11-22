# Espressif ESP-EMU WebAssembly

Le moteur n'est pas stocké dans Git par défaut. Pour l'installer, exécute depuis la racine du dépôt :

```bash
python3 tools/install_esp_emu.py
python3 tools/install_esp_emu.py --check
```

Version épinglée : **1.2.0**. Licence : Apache-2.0 (copie locale dans `LICENSE`).  
Le runtime extrait est placé sous `runtime/` ; seul l'installateur crée ce dossier. Pour une installation hors ligne, conserver l'archive officielle vérifiée par le SHA-256 défini dans `tools/install_esp_emu.py`.

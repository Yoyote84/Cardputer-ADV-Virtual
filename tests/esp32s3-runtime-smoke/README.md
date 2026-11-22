# Firmware de référence ESP32-S3

Ce mini-firmware ESP-IDF est compilé pour la cible ESP32-S3 dans la CI. Il
émet `CARDPUTER_RUNTIME_OK` sur UART0, puis un heartbeat chaque seconde.

Le test navigateur charge le BIN fusionné dans le worker de l'application,
démarre le CPU Xtensa via ESP-EMU WebAssembly et attend le marqueur UART.
C'est un test d'exécution réelle du firmware, pas un test visuel de l'interface.

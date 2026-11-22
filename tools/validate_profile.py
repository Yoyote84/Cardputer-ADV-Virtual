#!/usr/bin/env python3
"""Validate the committed Cardputer ADV profile with the Python standard library."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "cardputer" / "cardputer-adv.json"


def fail(message: str) -> None:
    print(f"ÉCHEC : {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    try:
        data = json.loads(PROFILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"impossible de lire {PROFILE}: {exc}")

    if data.get("schema_version") != 1:
        fail("schema_version doit être égal à 1")

    device = data.get("device", {})
    if device.get("manufacturer") != "M5Stack" or device.get("sku") != "K132-Adv":
        fail("le profil doit cibler le M5Stack Cardputer ADV K132-Adv")

    processor = data.get("processor", {})
    if (processor.get("soc"), processor.get("architecture"), processor.get("cores"), processor.get("clock_mhz")) != (
        "ESP32-S3FN8", "Xtensa LX7", 2, 240
    ):
        fail("caractéristiques du processeur incohérentes")

    display = data.get("display", {})
    if (display.get("controller"), display.get("width_pixels"), display.get("height_pixels")) != (
        "ST7789V2", 240, 135
    ):
        fail("contrôleur ou résolution de l'écran incorrect")

    keyboard = data.get("keyboard", {})
    if (keyboard.get("controller"), keyboard.get("key_count"), keyboard.get("rows"), keyboard.get("columns")) != (
        "TCA8418RTWR", 56, 4, 14
    ):
        fail("profil du clavier incohérent")

    keyboard = data.get("keyboard", {})
    if keyboard.get("i2c_address") != 0x34:
        fail("TCA8418 doit utiliser l'adresse I2C 0x34")

    imu = data.get("imu", {})
    if imu.get("controller") != "BMI270":
        fail("contrôleur IMU attendu : BMI270")
    if imu.get("i2c_address") != 0x69:
        fail("BMI270 du Cardputer ADV doit utiliser l'adresse I2C 0x69")
    if imu.get("interrupt_routed") is not False:
        fail("INT1/INT2 du BMI270 ne sont pas routées sur le schéma ADV v1.0")

    audio = data.get("audio", {})
    if audio.get("codec") != "ES8311":
        fail("codec audio attendu : ES8311")
    if audio.get("i2c_address") != 0x18:
        fail("ES8311 doit utiliser l'adresse I2C 0x18")
    if audio.get("mclk_pin") is not None or audio.get("mclk_source") != "BCLK (GPIO41) is used as MCLK; no separate MCLK pin is routed":
        fail("l'ES8311 du Cardputer ADV doit utiliser BCLK GPIO41 comme MCLK et ne pas inventer de pin MCLK")
    if data.get("battery", {}).get("capacity_mah") != 1500:
        fail("la capacité doit suivre la fiche M5Stack actuelle : 1500 mAh")

    expected_pins = {
        "display": {"backlight": 38, "reset": 33, "data_command": 34, "data": 35, "clock": 36, "chip_select": 37},
        "keyboard": {"sda": 8, "scl": 9, "interrupt": 11},
        "infrared": {"transmitter_pin": 44},
        "storage": {"chip_select": 12, "mosi": 14, "clock": 40, "miso": 39},
    }
    for section, pins in expected_pins.items():
        actual = data.get(section, {}).get("pins", {}) if section != "infrared" else data.get(section, {})
        for pin_name, expected in pins.items():
            key = pin_name
            if section == "infrared":
                key = "transmitter_pin"
            if actual.get(key) != expected:
                fail(f"brochage incorrect : {section}.{key} doit être GPIO {expected}")

    contacts = data.get("ports", {}).get("ext_2_54_14p", {}).get("pin_functions", [])
    if len(contacts) != 14:
        fail("le port EXT doit décrire exactement 14 contacts")
    if sorted(item.get("contact") for item in contacts) != list(range(1, 15)):
        fail("les contacts EXT doivent être numérotés de 1 à 14 sans doublon")

    print("OK : profil matériel Cardputer ADV K132-Adv valide.")
    print("Note : cette validation contrôle les métadonnées, pas l'émulation du matériel.")


if __name__ == "__main__":
    main()

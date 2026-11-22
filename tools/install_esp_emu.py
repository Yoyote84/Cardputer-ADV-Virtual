#!/usr/bin/env python3
"""Install the pinned Espressif ESP-EMU WebAssembly runtime into the PWA."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path, PurePosixPath

VERSION = "1.2.0"
ARCHIVE_URL = (
    "https://github.com/espressif/esp-emulator/releases/download/"
    "v1.2.0/esp-emu-1.2.0-wasm.tar.gz"
)
EXPECTED_SHA256 = "29cd94f779a7618d2646960dfb8897849e78a5e023de1da3ca831f658534a655"
REQUIRED = {"pkg/esp_emu.js", "pkg/esp_emu_bg.wasm", "cosim.js", "vendor/esp_cosim_pb.js"}
OPTIONAL = {"part-worker.js"}
MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
MAX_MEMBER_BYTES = 20 * 1024 * 1024


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_extract(archive: bytes, destination: Path) -> None:
    extracted: set[str] = set()
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        for member in bundle.getmembers():
            if not member.isfile() or member.size < 0 or member.size > MAX_MEMBER_BYTES:
                continue
            parts = PurePosixPath(member.name).parts
            if "www" not in parts:
                continue
            www_index = parts.index("www")
            relative = PurePosixPath(*parts[www_index + 1:])
            relative_name = relative.as_posix()
            if relative_name not in REQUIRED | OPTIONAL:
                continue
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError(f"Chemin d'archive interdit : {member.name}")
            source = bundle.extractfile(member)
            if source is None:
                raise ValueError(f"Impossible de lire {member.name}")
            target = destination.joinpath(*relative.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            extracted.add(relative_name)

    missing = REQUIRED - extracted
    if missing:
        raise ValueError("Fichiers du moteur manquants : " + ", ".join(sorted(missing)))


def check_install(destination: Path) -> bool:
    missing = [name for name in REQUIRED if not (destination / name).is_file()]
    manifest = destination / "ENGINE.json"
    if missing or not manifest.is_file():
        print("Moteur incomplet. Fichiers absents : " + ", ".join(sorted(missing or ["ENGINE.json"])))
        return False
    metadata = json.loads(manifest.read_text(encoding="utf-8"))
    ok = metadata.get("version") == VERSION and metadata.get("archive_sha256") == EXPECTED_SHA256
    recorded_hashes = metadata.get("files_sha256", {})
    if ok:
        for name in REQUIRED:
            expected = recorded_hashes.get(name)
            actual = digest((destination / name).read_bytes())
            if not expected or actual != expected:
                print(f"Fichier runtime absent du manifeste ou altéré : {name}")
                ok = False
                break
    print("ESP-EMU WebAssembly " + ("installé et vérifié." if ok else "présent, mais manifeste, version ou fichiers incorrects."))
    return ok


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="archive esp-emu WASM déjà téléchargée")
    parser.add_argument("--destination", type=Path, default=root / "app/vendor/esp-emu/runtime")
    parser.add_argument("--check", action="store_true", help="vérifier une installation existante sans réseau")
    args = parser.parse_args()
    destination = args.destination.resolve()

    if args.check:
        return 0 if check_install(destination) else 1

    if args.archive:
        archive = args.archive.read_bytes()
    else:
        request = urllib.request.Request(
            ARCHIVE_URL,
            headers={"User-Agent": "Cardputer-ADV-Virtual-runtime-installer/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            archive = response.read(MAX_ARCHIVE_BYTES + 1)

    if len(archive) > MAX_ARCHIVE_BYTES:
        print("Archive trop volumineuse : limite 20 Mio.", file=sys.stderr)
        return 2
    actual = digest(archive)
    if actual != EXPECTED_SHA256:
        print(f"SHA-256 incorrect : attendu {EXPECTED_SHA256}, reçu {actual}", file=sys.stderr)
        return 2

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="esp-emu-install-", dir=destination.parent) as temporary:
        staging = Path(temporary) / "runtime"
        staging.mkdir()
        safe_extract(archive, staging)
        (staging / "ENGINE.json").write_text(
            json.dumps(
                {
                    "engine": "Espressif esp-emu",
                    "version": VERSION,
                    "chip": "esp32s3",
                    "archive_sha256": EXPECTED_SHA256,
                    "license": "Apache-2.0",
                    "release": "https://github.com/espressif/esp-emulator/releases/tag/v1.2.0",
                    "files_sha256": {
                        name: digest((staging / name).read_bytes())
                        for name in sorted(REQUIRED)
                    },
                },
                indent=2,
            ) + "\n",
            encoding="utf-8",
        )
        backup = destination.with_name(destination.name + ".previous")
        if backup.exists():
            shutil.rmtree(backup)
        if destination.exists():
            destination.rename(backup)
        staging.rename(destination)
        if backup.exists():
            shutil.rmtree(backup)

    return 0 if check_install(destination) else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, tarfile.TarError, ValueError) as error:
        print(f"Installation impossible : {error}", file=sys.stderr)
        raise SystemExit(1)

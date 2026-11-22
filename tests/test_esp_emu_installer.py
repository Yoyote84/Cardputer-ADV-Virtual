import importlib.util
import io
import tempfile
import tarfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "install_esp_emu.py"
SPEC = importlib.util.spec_from_file_location("install_esp_emu", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(INSTALLER)


def make_archive(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name, payload in files.items():
            data = payload if isinstance(payload, bytes) else payload.encode("utf-8")
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


class EspEmuInstallerTests(unittest.TestCase):
    def test_extracts_only_required_runtime_files(self):
        files = {
            "release/www/pkg/esp_emu.js": "export default async function init() {}",
            "release/www/pkg/esp_emu_bg.wasm": b"wasm-placeholder",
            "release/www/cosim.js": "export class CosimPump {}",
            "release/www/vendor/esp_cosim_pb.js": "export const version = 1;",
            "release/www/index.html": "not part of runtime bundle",
        }
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary)
            INSTALLER.safe_extract(make_archive(files), destination)
            for required in INSTALLER.REQUIRED:
                self.assertTrue((destination / required).is_file(), required)
            self.assertFalse((destination / "index.html").exists())

    def test_missing_required_file_rejects_archive(self):
        files = {
            "release/www/pkg/esp_emu.js": "js",
            "release/www/pkg/esp_emu_bg.wasm": b"wasm",
            "release/www/cosim.js": "cosim",
        }
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, "Fichiers du moteur manquants"):
                INSTALLER.safe_extract(make_archive(files), Path(temporary))

    def test_untrusted_archive_paths_are_not_extracted(self):
        files = {
            "release/www/pkg/esp_emu.js": "js",
            "release/www/pkg/esp_emu_bg.wasm": b"wasm",
            "release/www/cosim.js": "cosim",
            "release/www/vendor/esp_cosim_pb.js": "pb",
            "release/www/../../outside.txt": "do not write",
        }
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary)
            INSTALLER.safe_extract(make_archive(files), destination)
            self.assertFalse((destination.parent / "outside.txt").exists())

    def test_release_archive_checksum_is_a_sha256(self):
        self.assertEqual(len(INSTALLER.EXPECTED_SHA256), 64)
        self.assertEqual(INSTALLER.VERSION, "1.2.0")


if __name__ == "__main__":
    unittest.main()

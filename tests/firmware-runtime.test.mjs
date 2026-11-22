import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { inspectFirmwareImage, inspectElfImage, MAX_FLASH_BYTES, sha256Hex, formatBytes } from "../app/emulator/firmware-image.mjs";

function makeEspImage() {
  const bytes = new Uint8Array(36);
  bytes[0] = 0xe9;
  bytes[1] = 1;
  bytes[4] = 0x00;
  bytes[5] = 0x10;
  bytes[6] = 0x00;
  bytes[7] = 0x40;
  bytes[27] = 0x3f;
  bytes[28] = 4;
  bytes[32] = 1;
  bytes[33] = 2;
  bytes[34] = 3;
  bytes[35] = 4;
  return bytes;
}

test("import BIN: en-tête ESP et segment reconnus", () => {
  const result = inspectFirmwareImage(makeEspImage(), { filename: "test.bin" });
  assert.equal(result.filename, "test.bin");
  assert.equal(result.format, "esp-image");
  assert.equal(result.headerOffset, 0);
  assert.equal(result.segmentCount, 1);
  assert.equal(result.entryAddress, "0x40001000");
  assert.deepEqual(result.segments, [{ loadAddress: 0x3f000000, length: 4 }]);
});

test("import BIN: en-tête reconnu à un offset de secteur dans un merged BIN", () => {
  const bytes = new Uint8Array(0x1000 + 36);
  bytes.set(makeEspImage(), 0x1000);
  assert.equal(inspectFirmwareImage(bytes).headerOffset, 0x1000);
});

test("import BIN: layout non reconnu signalé sans inventer la compatibilité", () => {
  const result = inspectFirmwareImage(new Uint8Array(512).fill(0xff));
  assert.equal(result.format, "merged-flash-unverified");
  assert.match(result.warning, /Aucun en-tête ESP standard/);
});

test("import BIN: ELF rejeté comme image fusionnée", () => {
  const bytes = new Uint8Array(64);
  bytes.set([0x7f, 0x45, 0x4c, 0x46]);
  assert.throws(() => inspectFirmwareImage(bytes), /ELF ne peut pas être chargé/);
});

test("import BIN: tailles trop petites et supérieures à 8 Mio refusées", () => {
  assert.throws(() => inspectFirmwareImage(new Uint8Array(12)), /trop court/);
  assert.throws(() => inspectFirmwareImage(new Uint8Array(MAX_FLASH_BYTES + 1)), /dépasse la flash/);
});

test("import BIN: SHA-256 local calculé sur les octets du fichier", async () => {
  const digest = await sha256Hex(new TextEncoder().encode("abc"), webcrypto);
  assert.equal(digest, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("format de taille lisible", () => {
  assert.equal(formatBytes(512), "512 o");
  assert.equal(formatBytes(2048), "2.0 Kio");
  assert.equal(formatBytes(2 * 1024 * 1024), "2.00 Mio");
});


test("import ELF: les symboles Xtensa 32 bits sont identifiés", () => {
  const elf = new Uint8Array(64);
  elf.set([0x7f, 0x45, 0x4c, 0x46, 1, 1]);
  elf[18] = 94;
  assert.equal(inspectElfImage(elf, { filename: "cardputer.elf" }).machine, "Xtensa");
});

test("import ELF: les architectures incompatibles sont refusées", () => {
  const elf = new Uint8Array(64);
  elf.set([0x7f, 0x45, 0x4c, 0x46, 1, 1]);
  elf[18] = 3;
  assert.throws(() => inspectElfImage(elf), /Xtensa attendu/);
});

export const MAX_FLASH_BYTES = 8 * 1024 * 1024;
const ESP_IMAGE_MAGIC = 0xe9;
const IMAGE_HEADER_SIZE = 24;
const SEGMENT_HEADER_SIZE = 8;

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("Le firmware doit être fourni sous forme binaire.");
}

function readU32LE(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function inspectImageAt(bytes, offset) {
  if (offset + IMAGE_HEADER_SIZE > bytes.length || bytes[offset] !== ESP_IMAGE_MAGIC) return null;
  const segmentCount = bytes[offset + 1];
  if (segmentCount < 1 || segmentCount > 16) return { invalid: "Nombre de segments ESP invalide.", offset };
  const entryAddress = readU32LE(bytes, offset + 4);
  let cursor = offset + IMAGE_HEADER_SIZE;
  const segments = [];
  for (let index = 0; index < segmentCount; index += 1) {
    if (cursor + SEGMENT_HEADER_SIZE > bytes.length) return { invalid: "En-tête de segment tronqué.", offset };
    const loadAddress = readU32LE(bytes, cursor);
    const length = readU32LE(bytes, cursor + 4);
    cursor += SEGMENT_HEADER_SIZE;
    if (length === 0 || cursor + length > bytes.length) return { invalid: "Segment ESP tronqué ou vide.", offset };
    segments.push({ loadAddress, length });
    cursor += length;
  }
  return { offset, segmentCount, entryAddress, segments, imageEnd: cursor };
}

/** Inspecte un BIN ESP sans exécuter son contenu ni prétendre garantir sa compatibilité. */
export function inspectFirmwareImage(input, { filename = "firmware.bin" } = {}) {
  const bytes = asBytes(input);
  if (bytes.length < IMAGE_HEADER_SIZE + SEGMENT_HEADER_SIZE + 1) {
    throw new Error("Fichier trop court pour contenir une image ESP.");
  }
  if (bytes.length > MAX_FLASH_BYTES) {
    throw new Error(`Le fichier dépasse la flash Cardputer ADV de 8 Mio (${MAX_FLASH_BYTES} octets).`);
  }
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    throw new Error("Un ELF ne peut pas être chargé comme BIN fusionné. L'import ELF pour les symboles de débogage reste à ajouter.");
  }

  const scanLimit = Math.min(bytes.length - IMAGE_HEADER_SIZE, 256 * 1024);
  let invalidCandidate = null;
  for (let offset = 0; offset <= scanLimit; offset += 0x1000) {
    const candidate = inspectImageAt(bytes, offset);
    if (candidate?.invalid) invalidCandidate ??= candidate;
    else if (candidate) {
      return {
        filename,
        sizeBytes: bytes.length,
        format: "esp-image",
        headerOffset: candidate.offset,
        segmentCount: candidate.segmentCount,
        entryAddress: `0x${candidate.entryAddress.toString(16).padStart(8, "0")}`,
        segments: candidate.segments
      };
    }
  }
  if (invalidCandidate) throw new Error(invalidCandidate.invalid);
  return {
    filename,
    sizeBytes: bytes.length,
    format: "merged-flash-unverified",
    warning: "Aucun en-tête ESP standard détecté aux offsets de secteur usuels. Le moteur vérifiera le format au chargement."
  };
}

export async function sha256Hex(input, cryptoProvider = globalThis.crypto) {
  const bytes = asBytes(input);
  if (!cryptoProvider?.subtle?.digest) throw new Error("SHA-256 WebCrypto n'est pas disponible dans ce contexte.");
  const digest = await cryptoProvider.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Kio`;
  return `${(value / (1024 * 1024)).toFixed(2)} Mio`;
}

let engine = null;
let pump = null;
let loadedName = "";
let running = false;

const send = (type, details = {}) => self.postMessage({ type, ...details });

function stopPump() {
  if (pump) {
    try { pump.stop(); } catch {}
    pump = null;
  }
  running = false;
}

function reportError(error) {
  const message = error instanceof Error ? error.message : String(error);
  let faultReport = "";
  try {
    if (engine?.faulted?.()) faultReport = engine.fault_report?.() || "";
  } catch {}
  stopPump();
  send(faultReport ? "fault" : "error", { message, report: faultReport });
}

async function createPump() {
  const { CosimPump } = await import("../vendor/esp-emu/runtime/cosim.js");
  pump = new CosimPump(engine, {});
}

async function loadFirmware(buffer, filename) {
  stopPump();
  engine = null;
  loadedName = filename || "firmware.bin";
  try {
    const { default: init, WasmEmulator } = await import("../vendor/esp-emu/runtime/pkg/esp_emu.js");
    await init();
    engine = new WasmEmulator("esp32s3");
    engine.load_default_rom();
    engine.load_firmware(new Uint8Array(buffer));
    await createPump();
    send("loaded", { filename: loadedName, target: "ESP32-S3", engine: "Espressif esp-emu 1.2.0" });
  } catch (error) {
    engine = null;
    pump = null;
    const message = String(error?.message || error);
    if (/esp_emu|cosim|Failed to fetch|Importing a module script failed|404/i.test(message)) {
      throw new Error("Moteur ESP-EMU absent ou incomplet. Installe les ressources avec : python3 tools/install_esp_emu.py");
    }
    throw error;
  }
}

function startFirmware() {
  if (!engine || !pump) throw new Error("Aucun firmware chargé.");
  if (running) return;
  pump.start(
    (text) => send("uart", { text: String(text) }),
    (error) => reportError(error)
  );
  running = true;
  send("running", { filename: loadedName });
}

async function resetFirmware() {
  if (!engine) throw new Error("Aucun firmware chargé.");
  stopPump();
  engine.restart();
  await createPump();
  startFirmware();
  send("reset");
}

self.onmessage = async (event) => {
  const message = event.data || {};
  try {
    if (message.type === "LOAD") {
      send("status", { message: "Initialisation du moteur WebAssembly ESP32-S3…" });
      await loadFirmware(message.buffer, message.filename);
    } else if (message.type === "START") {
      startFirmware();
    } else if (message.type === "STOP") {
      stopPump();
      send("stopped");
    } else if (message.type === "RESET") {
      await resetFirmware();
    }
  } catch (error) {
    reportError(error);
  }
};

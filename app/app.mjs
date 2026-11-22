import { createCardputerDeviceRack } from "./emulator/device-rack.mjs";

const SCREEN_WIDTH = 240;
const SCREEN_HEIGHT = 135;
const TCA_ADDRESS = 0x34;
const TCA_EVENT_COUNT = 0x03;
const TCA_EVENT_A = 0x04;
const TCA_INT_STAT = 0x02;
const TCA_INT_MASK = 0x1f;
const PAGES = ["ACCUEIL", "CLAVIER", "MATÉRIEL", "À PROPOS"];
const $ = (selector) => document.querySelector(selector);

const canvas = $("#device-screen");
const screenContext = canvas.getContext("2d", { alpha: false });
const rasterCanvas = document.createElement("canvas");
rasterCanvas.width = SCREEN_WIDTH;
rasterCanvas.height = SCREEN_HEIGHT;
const rasterContext = rasterCanvas.getContext("2d", { alpha: false });
const keyboardRoot = $("#keyboard");
const eventLog = $("#event-log");
const deviceShell = $("#device-shell");
const rack = createCardputerDeviceRack();
const { i2c, spi, i2s } = rack.buses;
const { keyboard: tca8418, display, imu, codec, sdCard, battery, infrared } = rack.devices;
window.CardputerDevices = rack;

const state = {
  layout: [],
  keyByCode: new Map(),
  keyByRawCode: new Map(),
  keyElements: new Map(),
  page: "ACCUEIL",
  selectedPage: 0,
  powered: true,
  fn: false,
  ctrl: false,
  opt: false,
  alt: false,
  caps: false,
  typed: "",
  lastKey: "—",
  heldPointers: new Map(),
  events: 0
};

function addEvent(kind, value) {
  const empty = eventLog.querySelector(".empty-event");
  if (empty) empty.remove();
  const item = document.createElement("li");
  const time = document.createElement("span");
  const type = document.createElement("span");
  const detail = document.createElement("span");
  time.className = "event-time";
  type.className = "event-kind";
  detail.className = "event-value";
  time.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  type.textContent = kind;
  detail.textContent = value;
  item.append(time, type, detail);
  eventLog.prepend(item);
  while (eventLog.children.length > 8) eventLog.lastElementChild.remove();
}

function updateModifierUi() {
  const labels = [
    `FN ${state.fn ? "maintenu" : "relâché"}`,
    `Aa ${state.caps ? "activé" : "désactivé"}`,
    state.ctrl ? "CTRL" : "",
    state.opt ? "OPT" : "",
    state.alt ? "ALT" : ""
  ].filter(Boolean);
  $("#modifier-summary").textContent = labels.join(" · ");
  $("#modifier-state").textContent = state.fn || state.caps || state.ctrl || state.opt || state.alt ? "ACTIF" : "PRÊT";
  for (const id of ["fn", "ctrl", "opt", "alt", "caps"]) {
    const button = state.keyElements.get(id);
    if (button) button.setAttribute("aria-pressed", String(Boolean(state[id])));
  }
}

function resolveKeyValue(key) {
  if (key.id === "fn" || key.id === "caps" || key.id === "ctrl" || key.id === "opt" || key.id === "alt") {
    return key.normal;
  }
  if (state.fn && key.fn !== null && key.fn !== undefined) return key.fn;
  if (state.caps && /^[a-z]$/.test(key.normal)) return key.normal.toUpperCase();
  return key.normal;
}

function displayKeyValue(value) {
  if (value === " ") return "ESPACE";
  if (value === "\n") return "ENTRÉE";
  if (value === "\b") return "RETOUR";
  if (value === "KEY_UP") return "FLÈCHE HAUT";
  if (value === "KEY_DOWN") return "FLÈCHE BAS";
  if (value === "KEY_LEFT") return "FLÈCHE GAUCHE";
  if (value === "KEY_RIGHT") return "FLÈCHE DROITE";
  if (value === "KEY_ESC") return "ÉCHAP";
  if (value === "KEY_TAB") return "TAB";
  if (value === "KEY_FN") return "FN";
  if (value === "KEY_CAPS") return "Aa";
  if (value === "KEY_CTRL") return "CTRL";
  if (value === "KEY_OPT") return "OPT";
  if (value === "KEY_ALT") return "ALT";
  return String(value);
}

function dispatchHardwareKeyboardEvent(key, eventByte, pressed, source) {
  const value = resolveKeyValue(key);
  const detail = {
    controller: "TCA8418",
    address: TCA_ADDRESS,
    keyId: key.id,
    label: key.legend,
    rawCode: key.rawCode,
    fifoEvent: eventByte,
    value: key.type === "modifier" ? key.normal : value,
    pressed,
    fn: state.fn,
    capsLock: state.caps,
    ctrl: state.ctrl,
    opt: state.opt,
    alt: state.alt,
    source,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent("cardputer:keyboard", { detail }));
  state.events += 1;

  if (key.id === "fn" || key.id === "ctrl" || key.id === "opt" || key.id === "alt") {
    state[key.id] = pressed;
    addEvent(pressed ? "DOWN" : "UP", `${key.legend.toUpperCase()} · ${pressed ? "maintenu" : "relâché"}`);
    updateModifierUi();
    return;
  }

  if (key.id === "caps") {
    if (pressed) state.caps = !state.caps;
    addEvent(pressed ? "DOWN" : "UP", `Aa · majuscules ${state.caps ? "activées" : "désactivées"}`);
    updateModifierUi();
    return;
  }

  if (!pressed) {
    addEvent("UP", key.legend);
    return;
  }

  state.lastKey = key.legend;
  $("#last-key").textContent = `${key.legend} · ${displayKeyValue(value)}`;
  addEvent("DOWN", `${key.legend} → ${displayKeyValue(value)}`);
  applyKeyToDemo(key, value);
  updateModifierUi();
  drawScreen();
}

function drainTca8418(source) {
  const count = i2c.readByte(TCA_ADDRESS, TCA_EVENT_COUNT) & 0x0f;
  for (let index = 0; index < count; index += 1) {
    const eventByte = i2c.readByte(TCA_ADDRESS, TCA_EVENT_A);
    if (eventByte === 0) break;
    const pressed = Boolean(eventByte & 0x80);
    const rawCode = eventByte & 0x7f;
    const key = state.keyByRawCode.get(rawCode);
    if (key) dispatchHardwareKeyboardEvent(key, eventByte, pressed, source);
  }
  // The TCA8418 latches K_INT until software clears INT_STAT (write-one-to-clear).
  i2c.writeByte(TCA_ADDRESS, TCA_INT_STAT, TCA_INT_MASK);
}

function pressKey(key, source = "touch") {
  if (!state.powered) return;
  const element = state.keyElements.get(key.id);
  element?.classList.add("is-pressed");
  state.heldPointers.set(`${source}:${key.id}`, key);
  tca8418.pressKey(key.rawCode);
  drainTca8418(source);
}

function releaseKey(key, source = "touch") {
  const element = state.keyElements.get(key.id);
  element?.classList.remove("is-pressed");
  state.heldPointers.delete(`${source}:${key.id}`);
  tca8418.releaseKey(key.rawCode);
  drainTca8418(source);
}

function applyKeyToDemo(key, value) {
  if (value === "KEY_UP") {
    if (state.page === "ACCUEIL") state.selectedPage = (state.selectedPage + PAGES.length - 1) % PAGES.length;
    else state.page = "ACCUEIL";
    return;
  }
  if (value === "KEY_DOWN") {
    if (state.page === "ACCUEIL") state.selectedPage = (state.selectedPage + 1) % PAGES.length;
    else state.page = "ACCUEIL";
    return;
  }
  if (value === "KEY_LEFT" || value === "KEY_RIGHT") {
    if (state.page === "ACCUEIL") {
      const delta = value === "KEY_LEFT" ? -1 : 1;
      state.selectedPage = (state.selectedPage + delta + PAGES.length) % PAGES.length;
    }
    return;
  }
  if (value === "\n") {
    state.page = PAGES[state.selectedPage];
    return;
  }
  if (value === "KEY_ESC") {
    state.page = "ACCUEIL";
    return;
  }
  if (value === "\b") {
    state.typed = state.typed.slice(0, -1);
    return;
  }
  if (value === " ") {
    state.typed = `${state.typed} `.slice(-24);
    return;
  }
  if (value === "\t") {
    state.typed = `${state.typed}  `.slice(-24);
    return;
  }
  if (typeof value === "string" && value.length === 1 && key.type === "character") {
    state.typed = `${state.typed}${value}`.slice(-24);
  }
}

function drawText(context, text, x, y, color = "#b9e9a4", font = "8px monospace") {
  context.font = font;
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function renderThroughSt7789() {
  const rgba = rasterContext.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT).data;
  const rgb565Bytes = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT * 2);
  for (let source = 0, target = 0; source < rgba.length; source += 4) {
    const r = rgba[source] >> 3;
    const g = rgba[source + 1] >> 2;
    const b = rgba[source + 2] >> 3;
    const color = (r << 11) | (g << 5) | b;
    rgb565Bytes[target++] = (color >> 8) & 0xff;
    rgb565Bytes[target++] = color & 0xff;
  }
  spi.select(37);
  spi.transfer(37, [0x2c], { dataCommand: false });
  spi.transfer(37, rgb565Bytes, { dataCommand: true });
  spi.deselect(37);
  screenContext.putImageData(display.toImageData(screenContext), 0, 0);
}

function drawScreen() {
  const context = rasterContext;
  context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  context.fillStyle = "#06130c";
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  if (!state.powered) {
    context.fillStyle = "#020604";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    renderThroughSt7789();
    return;
  }

  context.fillStyle = "rgba(57, 119, 76, .12)";
  for (let y = 3; y < SCREEN_HEIGHT; y += 4) context.fillRect(0, y, SCREEN_WIDTH, 1);
  drawText(context, "CARDPUTER ADV", 8, 12, "#c8f8a8", "bold 9px monospace");
  drawText(context, "UI DEMO", 174, 12, "#6dba83", "7px monospace");
  context.fillStyle = "#5f9f71";
  context.fillRect(7, 17, 226, 1);

  if (state.page === "ACCUEIL") {
    drawText(context, "INTERFACE VIRTUELLE", 9, 29, "#f0f5db", "bold 8px monospace");
    const items = ["BUREAU", "CLAVIER", "MATÉRIEL", "À PROPOS"];
    items.forEach((item, index) => {
      const y = 45 + index * 15;
      if (index === state.selectedPage) {
        context.fillStyle = "#245c38";
        context.fillRect(7, y - 9, 226, 12);
        drawText(context, ">", 12, y, "#dcffbc", "bold 8px monospace");
        drawText(context, item, 24, y, "#e4ffcf", "bold 8px monospace");
      } else {
        drawText(context, item, 24, y, "#9dbd9d", "8px monospace");
      }
    });
    context.fillStyle = "#5f9f71";
    context.fillRect(7, 108, 226, 1);
    const typed = state.typed ? `> ${state.typed}` : "> AUCUN FIRMWARE CHARGÉ";
    drawText(context, typed.slice(0, 32), 9, 120, "#f2c477", "7px monospace");
  } else if (state.page === "CLAVIER") {
    drawText(context, "TEST DU CLAVIER ADV", 9, 30, "#f0f5db", "bold 8px monospace");
    drawText(context, `DERNIÈRE TOUCHE : ${state.lastKey}`, 9, 49, "#a9e9ad", "7px monospace");
    drawText(context, `FN : ${state.fn ? "ON" : "OFF"}  CAPS : ${state.caps ? "ON" : "OFF"}`, 9, 64, "#a9e9ad", "7px monospace");
    drawText(context, "TCA8418 · FIFO 10 OCTETS", 9, 83, "#d6dcb9", "8px monospace");
    drawText(context, "I2C SDA 8 / SCL 9 / IRQ 11", 9, 102, "#eabf78", "7px monospace");
    drawText(context, "ESC POUR REVENIR", 9, 121, "#91b68e", "7px monospace");
  } else if (state.page === "MATÉRIEL") {
    const addresses = i2c.scan().map((address) => `0x${address.toString(16)}`).join(" ");
    drawText(context, "BUS I2C", 9, 30, "#f0f5db", "bold 8px monospace");
    drawText(context, addresses, 9, 48, "#a9e9ad", "8px monospace");
    drawText(context, "LCD ST7789V2 / 240x135", 9, 66, "#a9e9ad", "7px monospace");
    drawText(context, "BMI270 / ES8311", 9, 83, "#d6dcb9", "7px monospace");
    drawText(context, "SD SPI CS12 · IR GPIO44", 9, 100, "#d6dcb9", "7px monospace");
    drawText(context, "MODELES ETAPE 3 / 5", 9, 119, "#eabf78", "7px monospace");
  } else {
    drawText(context, "CARDPUTER ADV VIRTUAL", 9, 30, "#f0f5db", "bold 8px monospace");
    drawText(context, "ÉTAPE 3 SUR 5", 9, 49, "#a9e9ad", "8px monospace");
    drawText(context, "PÉRIPHÉRIQUES MODÉLISÉS", 9, 68, "#d6dcb9", "7px monospace");
    drawText(context, "PAS ENCORE DE CPU ÉMULÉ", 9, 84, "#eabf78", "7px monospace");
    drawText(context, "github.com/Yoyote84", 9, 108, "#91b68e", "7px monospace");
  }

  context.fillStyle = "#376548";
  context.fillRect(7, 127, 226, 1);
  drawText(context, "STEP 03/05", 9, 133, "#8ab995", "6px monospace");
  drawText(context, "NO CPU / DEVICE MODELS", 133, 133, "#d8a96d", "6px monospace");
  renderThroughSt7789();
}

function createKeyButton(key) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "key";
  button.dataset.keyId = key.id;
  button.dataset.rawCode = String(key.rawCode);
  button.setAttribute("aria-label", `Touche ${key.legend}, code TCA8418 ${key.rawCode}`);
  button.title = `${key.legend} · FN : ${displayKeyValue(key.fn)} · code ${key.rawCode}`;
  if (key.type === "modifier") button.setAttribute("aria-pressed", "false");
  if (key.accent) button.dataset.accent = key.accent;

  const label = document.createElement("span");
  label.className = "key-label";
  const main = document.createElement("span");
  main.className = "key-main-legend";
  main.textContent = key.legend;
  label.append(main);
  if (key.fn !== null && key.fn !== key.normal && !key.id.startsWith("key")) {
    const secondary = document.createElement("small");
    secondary.className = "key-fn-legend";
    secondary.textContent = key.fn.length === 1 ? key.fn : "";
    label.append(secondary);
  }
  button.append(label);

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    pressKey(key, "touch");
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    releaseKey(key, "touch");
  });
  button.addEventListener("pointercancel", () => releaseKey(key, "touch"));
  button.addEventListener("lostpointercapture", () => releaseKey(key, "touch"));
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  state.keyElements.set(key.id, button);
  return button;
}

function buildKeyboard(layout) {
  if (layout.keyCount !== 56 || layout.keys.length !== 56 || layout.rows !== 4 || layout.columns !== 14) {
    throw new Error("Le profil clavier ne correspond pas au clavier Cardputer ADV 4 × 14.");
  }
  state.layout = layout.keys;
  state.keyByCode = new Map(layout.keys.map((key) => [key.code, key]));
  state.keyByRawCode = new Map(layout.keys.map((key) => [key.rawCode, key]));
  keyboardRoot.replaceChildren(...layout.keys.map(createKeyButton));
  updateModifierUi();
}

function renderPeripheralPanel() {
  const result = rack.diagnostics();
  const rows = [
    { name: "Bus I²C", value: result.i2cAddresses.map((address) => `0x${address.toString(16)}`).join(" · "), state: result.i2cAddresses.length === 3 ? "Présent" : "Partiel" },
    { name: "TCA8418 · clavier", value: `FIFO ${result.tca8418.queuedEvents}/${result.tca8418.fifoDepth} · IRQ ${result.tca8418.irqAsserted ? "actif" : "repos"}`, state: "Modèle actif" },
    { name: "ST7789V2 · écran", value: `${result.st7789v2.width} × ${result.st7789v2.height} · RGB565`, state: result.st7789v2.displayOn ? "Modèle actif" : "Veille" },
    { name: "BMI270 · IMU", value: `CHIP_ID 0x${result.bmi270.chipId.toString(16)} · config Bosch absente`, state: result.bmi270.present ? "Modèle partiel" : "Erreur" },
    { name: "ES8311 · audio", value: `ID ${result.es8311.chipId.map((byte) => byte.toString(16).padStart(2,"0")).join(" ")} · I²S par blocs`, state: result.es8311.present ? "Modèle partiel" : "Erreur" },
    { name: "NS4150B · haut-parleur", value: `gain ${result.audioAmplifier.gain}× · ${result.audioAmplifier.bufferedOutputSamples} échantillons`, state: "Modèle numérique" },
    { name: "microSD · SPI", value: `${(result.microSD.capacityBytes / 1_000_000_000).toFixed(0)} Go annoncés · ${result.microSD.allocatedBlocks} blocs alloués`, state: "Modèle bloc SPI" },
    { name: "Batterie / IR / GPIO", value: `ADC GPIO10 · IR GPIO44 · ${result.extensionPorts.ext.length} contacts EXT`, state: "Modèle de signaux" }
  ];
  const root = $("#peripheral-list");
  root.replaceChildren();
  for (const row of rows) {
    const item = document.createElement("article");
    item.className = "peripheral-row";
    const meta = document.createElement("div");
    meta.className = "peripheral-meta";
    const name = document.createElement("strong");
    const value = document.createElement("small");
    name.textContent = row.name;
    value.textContent = row.value;
    meta.append(name, value);
    const badge = document.createElement("span");
    badge.className = "peripheral-state";
    badge.textContent = row.state;
    item.append(meta, badge);
    root.append(item);
  }
}

function runHardwareSelfTest() {
  const checks = [];
  try {
    const addresses = i2c.scan();
    checks.push({ name: "I²C", ok: [0x18, 0x34, 0x69].every((address) => addresses.includes(address)) });
    tca8418.pressKey(5);
    const keyDownEvent = i2c.readByte(TCA_ADDRESS, TCA_EVENT_A);
    i2c.writeByte(TCA_ADDRESS, TCA_INT_STAT, TCA_INT_MASK);
    tca8418.releaseKey(5);
    const keyUpEvent = i2c.readByte(TCA_ADDRESS, TCA_EVENT_A);
    i2c.writeByte(TCA_ADDRESS, TCA_INT_STAT, TCA_INT_MASK);
    checks.push({ name: "TCA8418 FIFO press/release", ok: keyDownEvent === 0x85 && keyUpEvent === 0x05 });
    checks.push({ name: "BMI270 CHIP_ID", ok: i2c.readByte(0x69, 0x00) === 0x24 });
    const codecId = i2c.read(0x18, 0xfd, 2);
    checks.push({ name: "ES8311 ID", ok: codecId[0] === 0x83 && codecId[1] === 0x11 });
    const ampBefore = rack.diagnostics().audioAmplifier.inputSamples;
    i2s.write("es8311", [1200, -1200], { sampleRate: 48000, bits: 16, channels: 1 });
    checks.push({ name: "NS4150B sample path", ok: rack.diagnostics().audioAmplifier.inputSamples === ampBefore + 2 });
    checks.push({ name: "ST7789 framebuffer", ok: display.width === 240 && display.height === 135 && display.framebuffer.length === 32400 });
    const sample = Uint8Array.from({ length: 512 }, (_, index) => index & 0xff);
    checks.push({ name: "microSD block R/W", ok: sdCard.writeBlock(0, sample) && sdCard.readBlock(0)[255] === 255 });
    battery.setRawADC(2048);
    checks.push({ name: "GPIO / ADC", ok: battery.readRawADC() === 2048 });
    const passed = checks.filter((check) => check.ok).length;
    const output = $("#hardware-test-result");
    output.textContent = `${passed}/${checks.length} contrôles réussis · ${checks.filter((check) => !check.ok).map((check) => check.name).join(", ") || "aucune erreur"}`;
    output.dataset.state = passed === checks.length ? "success" : "warning";
    addEvent("TEST", `${passed}/${checks.length} contrôles des périphériques réussis`);
    renderPeripheralPanel();
    return checks;
  } catch (error) {
    $("#hardware-test-result").textContent = `Échec du test : ${error.message}`;
    $("#hardware-test-result").dataset.state = "warning";
    addEvent("ERREUR", error.message);
    return checks;
  }
}

function resetUi() {
  for (const key of state.layout) {
    if (state.heldPointers.has(`touch:${key.id}`) || state.heldPointers.has(`keyboard:${key.id}`)) {
      try { tca8418.releaseKey(key.rawCode); } catch {}
    }
  }
  state.heldPointers.clear();
  drainTca8418("reset");
  for (const id of ["fn", "ctrl", "opt", "alt", "caps"]) state[id] = false;
  state.page = "ACCUEIL";
  state.selectedPage = 0;
  state.typed = "";
  state.lastKey = "—";
  for (const button of state.keyElements.values()) button.classList.remove("is-pressed");
  $("#last-key").textContent = "En attente d’une touche";
  updateModifierUi();
  drawScreen();
  addEvent("INFO", "Interface et clavier réinitialisés");
}

function togglePower() {
  state.powered = !state.powered;
  deviceShell.dataset.power = state.powered ? "on" : "off";
  $("#power-button").setAttribute("aria-pressed", String(state.powered));
  $("#power-label").textContent = state.powered ? "ÉCRAN ALLUMÉ" : "ÉCRAN ÉTEINT";
  $("#session-state").textContent = state.powered ? "Modèles matériels actifs" : "Écran éteint";
  display.writeCommand(state.powered ? 0x29 : 0x28);
  drawScreen();
  addEvent("INFO", state.powered ? "Écran allumé" : "Écran éteint");
}

function clearEvents() {
  eventLog.innerHTML = '<li class="empty-event">Touchez une touche pour voir son événement ici.</li>';
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (error) {
    addEvent("INFO", `Plein écran indisponible : ${error.message}`);
  }
}

function physicalKeyDown(event) {
  const key = state.keyByCode.get(event.code);
  if (!key || event.repeat) return;
  event.preventDefault();
  pressKey(key, "keyboard");
}

function physicalKeyUp(event) {
  const key = state.keyByCode.get(event.code);
  if (key) releaseKey(key, "keyboard");
}

async function init() {
  try {
    const response = await fetch("./keyboard-layout.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const layout = await response.json();
    buildKeyboard(layout);
    addEvent("INFO", "Mapping matériel chargé : 56 touches / 4 × 14");
  } catch (error) {
    keyboardRoot.innerHTML = '<p class="keyboard-loading">Impossible de charger le profil du clavier.</p>';
    addEvent("ERREUR", error.message);
  }

  display.initializeForCardputer();
  window.addEventListener("keydown", physicalKeyDown);
  window.addEventListener("keyup", physicalKeyUp);
  window.addEventListener("blur", () => {
    for (const [token, key] of [...state.heldPointers.entries()]) {
      const [source, id] = token.split(":");
      releaseKey(key, source);
      state.keyElements.get(id)?.classList.remove("is-pressed");
    }
  });

  $("#power-button").addEventListener("click", togglePower);
  $("#reset-button").addEventListener("click", resetUi);
  $("#clear-events").addEventListener("click", clearEvents);
  $("#fullscreen-button").addEventListener("click", toggleFullscreen);
  $("#run-hardware-test").addEventListener("click", runHardwareSelfTest);

  renderPeripheralPanel();
  runHardwareSelfTest();
  drawScreen();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch((error) => addEvent("INFO", `Cache hors ligne non activé : ${error.message}`));
  }
}

init();

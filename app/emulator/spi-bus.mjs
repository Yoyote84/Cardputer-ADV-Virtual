/**
 * Chip-select based SPI bus. A device exposes select(), deselect() and transfer(byte).
 * The DC pin for TFT data/command is carried separately for the ST7789 model.
 */
export class VirtualSPIBus {
  constructor() {
    this.devices = new Map();
    this.trace = [];
  }

  attach(chipSelectPin, device) {
    if (!Number.isInteger(chipSelectPin) || chipSelectPin < 0 || chipSelectPin > 48) {
      throw new RangeError("GPIO CS invalide.");
    }
    if (this.devices.has(chipSelectPin)) throw new Error(`Un périphérique SPI utilise déjà GPIO ${chipSelectPin}.`);
    this.devices.set(chipSelectPin, device);
    return device;
  }

  select(chipSelectPin) {
    const device = this.devices.get(chipSelectPin);
    if (!device) throw new Error(`Aucun périphérique SPI sur CS GPIO ${chipSelectPin}.`);
    device.select?.();
    this.trace.push({ kind: "select", chipSelectPin });
  }

  deselect(chipSelectPin) {
    this.devices.get(chipSelectPin)?.deselect?.();
    this.trace.push({ kind: "deselect", chipSelectPin });
  }

  transfer(chipSelectPin, bytes, options = {}) {
    const device = this.devices.get(chipSelectPin);
    if (!device) throw new Error(`Aucun périphérique SPI sur CS GPIO ${chipSelectPin}.`);
    const dc = options.dataCommand ?? true;
    const output = Uint8Array.from(bytes, (value) => device.spiWrite
      ? device.spiWrite(value, dc)
      : device.transfer(value));
    this.trace.push({ kind: "transfer", chipSelectPin, length: output.length, dataCommand: dc });
    return output;
  }

  clearTrace() {
    this.trace.length = 0;
  }
}

/**
 * I2S frame router. It models sample flow, not clock-level electrical timing.
 */
export class VirtualI2SBus {
  constructor() {
    this.endpoints = new Map();
    this.framesWritten = 0;
    this.framesRead = 0;
  }

  attach(name, endpoint) {
    if (!name || this.endpoints.has(name)) throw new Error("Nom de périphérique I2S absent ou déjà utilisé.");
    this.endpoints.set(name, endpoint);
  }

  write(name, samples, format = {}) {
    const endpoint = this.endpoints.get(name);
    if (!endpoint || typeof endpoint.receiveI2S !== "function") throw new Error(`Périphérique I2S inconnu : ${name}`);
    const frame = Int16Array.from(samples);
    endpoint.receiveI2S(frame, format);
    this.framesWritten += frame.length;
  }

  read(name, count, format = {}) {
    const endpoint = this.endpoints.get(name);
    if (!endpoint || typeof endpoint.provideI2S !== "function") throw new Error(`Périphérique I2S inconnu : ${name}`);
    const frame = Int16Array.from(endpoint.provideI2S(count, format));
    this.framesRead += frame.length;
    return frame;
  }
}

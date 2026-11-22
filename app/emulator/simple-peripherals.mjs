/**
 * Lightweight models for the Cardputer ADV's remaining board-level signals.
 * Electrical power domains and analogue tolerances are not modelled.
 */
export class VirtualGPIOBank {
  constructor(pinCount = 49) {
    this.pinCount = pinCount;
    this.modes = new Uint8Array(pinCount); // 0=input, 1=output
    this.values = new Uint8Array(pinCount);
    this.analogValues = new Uint16Array(pinCount);
    this.listeners = new Map();
  }

  assertPin(pin) {
    if (!Number.isInteger(pin) || pin < 0 || pin >= this.pinCount) throw new RangeError(`GPIO ${pin} hors plage.`);
  }

  pinMode(pin, mode) {
    this.assertPin(pin);
    if (!["input", "output"].includes(mode)) throw new TypeError("Mode GPIO attendu : input ou output.");
    this.modes[pin] = mode === "output" ? 1 : 0;
  }

  digitalWrite(pin, value) {
    this.assertPin(pin);
    if (this.modes[pin] !== 1) throw new Error(`GPIO ${pin} n'est pas configuré en sortie.`);
    const next = value ? 1 : 0;
    const previous = this.values[pin];
    this.values[pin] = next;
    if (previous !== next) this.emit(pin, next);
  }

  setInput(pin, value) {
    this.assertPin(pin);
    const next = value ? 1 : 0;
    const previous = this.values[pin];
    this.values[pin] = next;
    if (previous !== next) this.emit(pin, next);
  }

  digitalRead(pin) {
    this.assertPin(pin);
    return this.values[pin];
  }

  setAnalogInput(pin, value) {
    this.assertPin(pin);
    if (!Number.isInteger(value) || value < 0 || value > 4095) throw new RangeError("Valeur ADC attendue entre 0 et 4095.");
    this.analogValues[pin] = value;
  }

  analogRead(pin) {
    this.assertPin(pin);
    return this.analogValues[pin];
  }

  onChange(pin, callback) {
    this.assertPin(pin);
    const listeners = this.listeners.get(pin) ?? new Set();
    listeners.add(callback);
    this.listeners.set(pin, listeners);
    return () => listeners.delete(callback);
  }

  emit(pin, value) {
    for (const callback of this.listeners.get(pin) ?? []) callback({ pin, value });
  }
}

export class BatteryADCModel {
  constructor(gpio, { capacityMah = 1500, adcPin = 10 } = {}) {
    this.gpio = gpio;
    this.capacityMah = capacityMah;
    this.adcPin = adcPin;
    this.sampleConfigured = false;
  }

  setRawADC(value) {
    this.gpio.setAnalogInput(this.adcPin, value);
    this.sampleConfigured = true;
  }

  readRawADC() {
    return this.gpio.analogRead(this.adcPin);
  }

  get status() {
    return {
      adcPin: this.adcPin,
      rawAdc: this.readRawADC(),
      sampleConfigured: this.sampleConfigured,
      nominalCapacityMah: this.capacityMah,
      voltageCalibration: "not-calibrated: board divider and ADC reference must be verified"
    };
  }
}

export class InfraredTransmitter {
  constructor({ gpio, pin = 44, maxFrames = 100 } = {}) {
    this.gpio = gpio;
    this.pin = pin;
    this.maxFrames = maxFrames;
    this.frames = [];
  }

  transmit(pulses, carrierHz = 38000) {
    if (!Array.isArray(pulses) || pulses.length === 0 || pulses.some((duration) => !Number.isInteger(duration) || duration <= 0)) {
      throw new TypeError("Une trame IR doit contenir des durées de pulse positives en microsecondes.");
    }
    if (!Number.isInteger(carrierHz) || carrierHz < 1000 || carrierHz > 1000000) throw new RangeError("Fréquence porteuse IR invalide.");
    const frame = { pin: this.pin, carrierHz, pulses: [...pulses], timestamp: Date.now() };
    this.frames.push(frame);
    while (this.frames.length > this.maxFrames) this.frames.shift();
    return frame;
  }

  clear() {
    this.frames.length = 0;
  }

  get status() {
    return { pin: this.pin, capturedFrames: this.frames.length, opticalPropagation: false };
  }
}

export const CARDPUTER_ADV_PORTS = Object.freeze({
  grove: { ground: "GND", power: "5V", yellow: 2, white: 1 },
  ext: [
    { contact: 1, gpio: 3, signal: "RESET" },
    { contact: 2, gpio: null, signal: "5V_IN" },
    { contact: 3, gpio: 4, signal: "INT" },
    { contact: 4, gpio: null, signal: "GND" },
    { contact: 5, gpio: 6, signal: "BUSY" },
    { contact: 6, gpio: null, signal: "5V_OUT" },
    { contact: 7, gpio: 40, signal: "SCK" },
    { contact: 8, gpio: 8, signal: "I2C_SDA" },
    { contact: 9, gpio: 14, signal: "MOSI" },
    { contact: 10, gpio: 9, signal: "I2C_SCL" },
    { contact: 11, gpio: 39, signal: "MISO" },
    { contact: 12, gpio: 13, signal: "UART_TX" },
    { contact: 13, gpio: 5, signal: "CS" },
    { contact: 14, gpio: 15, signal: "UART_RX" }
  ]
});

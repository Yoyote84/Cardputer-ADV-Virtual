/**
 * Local I2C bus used by the Cardputer ADV device models.
 * Devices implement read(register, length) and write(register, bytes).
 */
export class VirtualI2CBus {
  constructor() {
    this.devices = new Map();
    this.transactions = [];
  }

  attach(address, device) {
    if (!Number.isInteger(address) || address < 0x03 || address > 0x77) {
      throw new RangeError("Adresse I2C 7 bits invalide.");
    }
    if (this.devices.has(address)) throw new Error(`Adresse I2C déjà utilisée : 0x${address.toString(16)}`);
    if (!device || typeof device.read !== "function" || typeof device.write !== "function") {
      throw new TypeError("Un périphérique I2C doit fournir read() et write().");
    }
    this.devices.set(address, device);
    return device;
  }

  detach(address) {
    return this.devices.delete(address);
  }

  scan() {
    return [...this.devices.keys()].sort((a, b) => a - b);
  }

  read(address, register, length = 1) {
    const device = this.devices.get(address);
    if (!device) throw new Error(`Aucun périphérique I2C à 0x${address.toString(16)}.`);
    if (!Number.isInteger(register) || register < 0 || register > 0xff) throw new RangeError("Registre I2C invalide.");
    if (!Number.isInteger(length) || length < 1 || length > 256) throw new RangeError("Longueur I2C invalide.");
    const bytes = device.read(register, length);
    const result = Uint8Array.from(bytes);
    if (result.length !== length) throw new Error("Le périphérique a renvoyé une longueur I2C inattendue.");
    this.transactions.push({ kind: "read", address, register, length });
    return result;
  }

  readByte(address, register) {
    return this.read(address, register, 1)[0];
  }

  write(address, register, values) {
    const device = this.devices.get(address);
    if (!device) throw new Error(`Aucun périphérique I2C à 0x${address.toString(16)}.`);
    if (!Number.isInteger(register) || register < 0 || register > 0xff) throw new RangeError("Registre I2C invalide.");
    const bytes = Uint8Array.from(values);
    if (bytes.length < 1 || bytes.some((value) => value < 0 || value > 0xff)) {
      throw new RangeError("Données I2C invalides.");
    }
    device.write(register, bytes);
    this.transactions.push({ kind: "write", address, register, length: bytes.length });
  }

  writeByte(address, register, value) {
    this.write(address, register, [value]);
  }

  clearTrace() {
    this.transactions.length = 0;
  }
}

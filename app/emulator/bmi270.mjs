/**
 * BMI270 register-level model, limited to identity, status, motion data,
 * power/configuration control and command registers. The proprietary Bosch
 * initialization image and advanced feature engine are not fabricated.
 */
export class BMI270Device {
  static ADDRESS = 0x69;
  static CHIP_ID = 0x24;

  constructor() {
    this.registers = new Uint8Array(256);
    this.motion = { accel: [0, 0, 16384], gyro: [0, 0, 0] };
    this.reset();
    this.initializationBytes = 0;
    this.configurationRequested = false;
  }

  reset() {
    this.registers.fill(0);
    this.registers[0x00] = BMI270Device.CHIP_ID;
    this.registers[0x02] = 0x00;
    this.registers[0x03] = 0x10; // STATUS.cmd_rdy after power-on reset
    this.registers[0x7c] = 0x00;
    this.registers[0x7d] = 0x00;
    this.registers[0x7e] = 0x00;
    this.initializationBytes = 0;
    this.configurationRequested = false;
    this.writeMotionRegisters();
  }

  read(register, length = 1) {
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) result[i] = this.registers[(register + i) & 0xff];
    const end = register + length - 1;
    if (register <= 0x11 && end >= 0x11) this.registers[0x03] &= ~0x80; // DRDY_ACC is cleared by data read
    if (register <= 0x17 && end >= 0x17) this.registers[0x03] &= ~0x40; // DRDY_GYR is cleared by data read
    return result;
  }

  write(register, values) {
    const bytes = Uint8Array.from(values);
    for (let i = 0; i < bytes.length; i += 1) {
      const address = register + i;
      const value = bytes[i];
      if (address === 0x7e && value === 0xb6) {
        this.reset();
      } else if (address === 0x5e) {
        this.initializationBytes += 1;
        this.registers[address] = value;
      } else if (address === 0x59 && value === 0x01) {
        // This flag records the host request; the model does not claim the full
        // Bosch feature configuration blob was loaded.
        this.configurationRequested = this.initializationBytes > 0;
        this.registers[address] = value;
      } else if (address < 0x80) {
        this.registers[address] = value;
      }
    }
  }

  setRawMotion({ accel = this.motion.accel, gyro = this.motion.gyro } = {}) {
    const normalize = (values, name) => {
      if (!Array.isArray(values) || values.length !== 3 || values.some((v) => !Number.isInteger(v) || v < -32768 || v > 32767)) {
        throw new TypeError(`${name} doit contenir trois entiers signés sur 16 bits.`);
      }
      return values;
    };
    this.motion = { accel: normalize(accel, "accel"), gyro: normalize(gyro, "gyro") };
    this.writeMotionRegisters();
    this.registers[0x03] |= 0xc0; // DRDY_ACC | DRDY_GYR
  }

  writeMotionRegisters() {
    const values = [...this.motion.accel, ...this.motion.gyro];
    values.forEach((value, index) => {
      const raw = value & 0xffff;
      const address = 0x0c + index * 2;
      this.registers[address] = raw & 0xff;
      this.registers[address + 1] = (raw >> 8) & 0xff;
    });
  }

  get status() {
    return {
      address: BMI270Device.ADDRESS,
      chipId: this.registers[0x00],
      statusRegister: this.registers[0x03],
      rawMotion: structuredClone(this.motion),
      initializationBytes: this.initializationBytes,
      configurationRequested: this.configurationRequested,
      fullFeatureConfiguration: false
    };
  }
}

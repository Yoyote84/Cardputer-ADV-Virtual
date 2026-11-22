/**
 * ES8311 codec model. I2C control registers and sample transport are modelled;
 * analogue amplifier, microphone capsule and clock-level electrical effects
 * are outside this software-only device model.
 */
export class ES8311Device {
  static ADDRESS = 0x18;
  static CHIP_ID = [0x83, 0x11, 0x00];

  constructor({ maxBufferedSamples = 48000 } = {}) {
    this.registers = new Uint8Array(256);
    this.maxBufferedSamples = maxBufferedSamples;
    this.playbackSamples = [];
    this.microphoneSamples = [];
    this.reset();
  }

  reset() {
    this.registers.fill(0);
    this.registers[0x00] = 0x1f;
    this.registers[0xfd] = ES8311Device.CHIP_ID[0];
    this.registers[0xfe] = ES8311Device.CHIP_ID[1];
    this.registers[0xff] = ES8311Device.CHIP_ID[2];
    this.playbackSamples.length = 0;
    this.microphoneSamples.length = 0;
  }

  read(register, length = 1) {
    return this.registers.slice(register, register + length);
  }

  write(register, values) {
    const bytes = Uint8Array.from(values);
    for (let i = 0; i < bytes.length; i += 1) {
      const address = register + i;
      if (address >= 0x00 && address <= 0x45) this.registers[address] = bytes[i];
    }
  }

  receiveI2S(samples, format = {}) {
    this.playbackFormat = { sampleRate: format.sampleRate ?? null, bits: format.bits ?? null, channels: format.channels ?? 1 };
    for (const sample of samples) {
      this.playbackSamples.push(sample);
      if (this.playbackSamples.length > this.maxBufferedSamples) this.playbackSamples.shift();
    }
  }

  injectMicrophoneSamples(samples) {
    for (const sample of samples) {
      const value = Math.max(-32768, Math.min(32767, Math.trunc(sample)));
      this.microphoneSamples.push(value);
      if (this.microphoneSamples.length > this.maxBufferedSamples) this.microphoneSamples.shift();
    }
  }

  provideI2S(count) {
    const result = new Int16Array(count);
    for (let i = 0; i < count; i += 1) result[i] = this.microphoneSamples.shift() ?? 0;
    return result;
  }

  get status() {
    return {
      address: ES8311Device.ADDRESS,
      chipId: this.read(0xfd, 3),
      resetRegister: this.registers[0x00],
      playbackBufferedSamples: this.playbackSamples.length,
      microphoneBufferedSamples: this.microphoneSamples.length,
      sampleTransport: "I2S-frame-level",
      analoguePathEmulated: false
    };
  }
}

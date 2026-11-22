/**
 * NS4150B speaker-amplifier signal model.
 * It models a controllable digital gain/mute stage for I2S samples only.
 * The physical Class-D switching output, supply rail and speaker acoustics
 * are not reproduced by this software model.
 */
export class NS4150BAmplifier {
  constructor({ gain = 1, enabled = true, maxBufferedSamples = 48000 } = {}) {
    this.maxGain = 8;
    this.maxBufferedSamples = maxBufferedSamples;
    this.enabled = Boolean(enabled);
    this.gain = 1;
    this.setGain(gain);
    this.inputSamples = 0;
    this.outputSamples = [];
    this.clippedSamples = 0;
  }

  setGain(gain) {
    if (typeof gain !== "number" || !Number.isFinite(gain) || gain < 0 || gain > this.maxGain) {
      throw new RangeError(`Le gain doit être compris entre 0 et ${this.maxGain}.`);
    }
    this.gain = gain;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  process(samples) {
    const input = Int16Array.from(samples);
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      const scaled = this.enabled ? Math.round(input[index] * this.gain) : 0;
      if (scaled > 32767 || scaled < -32768) this.clippedSamples += 1;
      output[index] = Math.max(-32768, Math.min(32767, scaled));
    }
    this.inputSamples += input.length;
    for (const sample of output) {
      this.outputSamples.push(sample);
      if (this.outputSamples.length > this.maxBufferedSamples) this.outputSamples.shift();
    }
    return output;
  }

  get status() {
    return {
      enabled: this.enabled,
      gain: this.gain,
      sampleRatePath: "I2S sample-frame",
      inputSamples: this.inputSamples,
      bufferedOutputSamples: this.outputSamples.length,
      clippedSamples: this.clippedSamples,
      classDOutputEmulated: false,
      speakerAcousticsEmulated: false
    };
  }
}

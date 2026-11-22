/**
 * TCA8418 model for the M5Stack Cardputer ADV.
 * Register behaviour follows TI SCPS215G; physical key codes come from
 * the MIT-licensed Cardputer-ADV-Keyboard empirical key map.
 */
export const TCA8418 = Object.freeze({
  ADDRESS: 0x34,
  REG_CFG: 0x01,
  REG_INT_STAT: 0x02,
  REG_KEY_LCK_EC: 0x03,
  REG_KEY_EVENT_A: 0x04,
  REG_KP_GPIO1: 0x1d,
  REG_KP_GPIO2: 0x1e,
  REG_KP_GPIO3: 0x1f,
  REG_GPI_EM1: 0x20,
  REG_GPIO_DIR1: 0x23,
  REG_GPIO_PULL1: 0x2c,
  CFG_AI: 0x80,
  CFG_INT_CFG: 0x10,
  CFG_OVR_FLOW_M: 0x20,
  CFG_OVR_FLOW_IEN: 0x08,
  CFG_KEY_LOCK_IEN: 0x04,
  CFG_GPI_IEN: 0x02,
  CFG_KEY_IEN: 0x01,
  INT_OVR_FLOW: 0x08,
  INT_KEY: 0x01,
  FIFO_DEPTH: 10
});

export class TCA8418Device {
  constructor({ fifoDepth = TCA8418.FIFO_DEPTH } = {}) {
    this.fifoDepth = fifoDepth;
    this.registers = new Uint8Array(0x30);
    this.queue = [];
    this.pressedKeys = new Set();
    this.overflowCount = 0;
    this.registers[TCA8418.REG_CFG] = 0x00;
  }

  configureForCardputer() {
    // This is the initialization sequence used by the public ADV MicroPython driver.
    this.write(TCA8418.REG_KP_GPIO1, [0xff]);
    this.write(TCA8418.REG_KP_GPIO2, [0xff]);
    this.write(TCA8418.REG_KP_GPIO3, [0x00]);
    this.write(TCA8418.REG_GPI_EM1, [0x00]);
    this.write(TCA8418.REG_CFG, [0x3e]);
  }

  read(register, length = 1) {
    const out = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      const address = register + index;
      if (address === TCA8418.REG_KEY_LCK_EC) {
        out[index] = (this.registers[address] & 0x70) | (this.queue.length & 0x0f);
      } else if (address >= TCA8418.REG_KEY_EVENT_A && address <= 0x0d) {
        out[index] = this.queue.length ? this.queue.shift() : 0x00;
        this.refreshKeyInterrupt();
      } else {
        out[index] = this.registers[address] ?? 0x00;
      }
    }
    return out;
  }

  write(register, values) {
    const bytes = Uint8Array.from(values);
    for (let index = 0; index < bytes.length; index += 1) {
      const address = register + index;
      const value = bytes[index];
      if (address === TCA8418.REG_INT_STAT) {
        // INT_STAT uses write-one-to-clear. A non-empty FIFO keeps K_INT set.
        this.registers[address] &= (~value) & 0xff;
        if (this.queue.length > 0) this.registers[address] |= TCA8418.INT_KEY;
      } else if (address === TCA8418.REG_KEY_LCK_EC) {
        // The event count is read-only; key-lock bits are writable.
        this.registers[address] = (this.registers[address] & 0x0f) | (value & 0x70);
      } else if (address >= 0 && address < this.registers.length) {
        this.registers[address] = value;
      }
    }
    this.refreshKeyInterrupt();
  }

  pressKey(keyCode) {
    this.setKeyState(keyCode, true);
  }

  releaseKey(keyCode) {
    this.setKeyState(keyCode, false);
  }

  setKeyState(keyCode, pressed) {
    if (!Number.isInteger(keyCode) || keyCode < 1 || keyCode > 80) {
      throw new RangeError("Le code TCA8418 doit être compris entre 1 et 80.");
    }
    const wasPressed = this.pressedKeys.has(keyCode);
    if (pressed === wasPressed) return false;
    if (pressed) this.pressedKeys.add(keyCode);
    else this.pressedKeys.delete(keyCode);

    const event = (pressed ? 0x80 : 0x00) | keyCode;
    if (this.queue.length >= this.fifoDepth) {
      this.overflowCount += 1;
      this.registers[TCA8418.REG_INT_STAT] |= TCA8418.INT_OVR_FLOW;
      if (this.registers[TCA8418.REG_CFG] & TCA8418.CFG_OVR_FLOW_M) {
        this.queue.shift();
      } else {
        this.refreshKeyInterrupt();
        return false;
      }
    }
    this.queue.push(event);
    this.refreshKeyInterrupt();
    return true;
  }

  refreshKeyInterrupt() {
    // K_INT is latched until software clears INT_STAT with write-one-to-clear.
    if (this.queue.length > 0) this.registers[TCA8418.REG_INT_STAT] |= TCA8418.INT_KEY;
  }

  get irqAsserted() {
    const config = this.registers[TCA8418.REG_CFG];
    const status = this.registers[TCA8418.REG_INT_STAT];
    const keyEnabled = Boolean(config & TCA8418.CFG_KEY_IEN) && Boolean(status & TCA8418.INT_KEY);
    const overflowEnabled = Boolean(config & TCA8418.CFG_OVR_FLOW_IEN) && Boolean(status & TCA8418.INT_OVR_FLOW);
    return keyEnabled || overflowEnabled;
  }

  get status() {
    return {
      address: TCA8418.ADDRESS,
      configured: this.registers[TCA8418.REG_KP_GPIO1] !== 0 || this.registers[TCA8418.REG_KP_GPIO2] !== 0,
      cfg: this.registers[TCA8418.REG_CFG],
      interruptStatus: this.registers[TCA8418.REG_INT_STAT],
      queuedEvents: this.queue.length,
      fifoDepth: this.fifoDepth,
      overflowCount: this.overflowCount,
      irqAsserted: this.irqAsserted
    };
  }
}

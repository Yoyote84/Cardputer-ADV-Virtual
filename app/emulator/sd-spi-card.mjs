/**
 * Minimal SD/SDHC card in SPI mode. Implements the common initialization and
 * single-block commands used by embedded FAT drivers. Data is volatile RAM.
 * This is a block device, not a FAT filesystem implementation.
 */
export class SDSpiCard {
  constructor({ capacityBlocks = 4096 } = {}) {
    if (!Number.isInteger(capacityBlocks) || capacityBlocks < 1) throw new RangeError("Capacité SD invalide.");
    this.capacityBlocks = capacityBlocks;
    this.storage = new Uint8Array(capacityBlocks * 512);
    this.selected = false;
    this.idle = true;
    this.appCommandPending = false;
    this.commandPacket = [];
    this.responseQueue = [];
    this.writeState = null;
    this.writeBlockIndex = -1;
    this.writeBuffer = [];
    this.commands = [];
    this.crcEnabled = false;
    this.blockLength = 512;
  }

  select() {
    this.selected = true;
  }

  deselect() {
    this.selected = false;
    this.commandPacket.length = 0;
    if (this.writeState && this.writeState !== "await-token") {
      this.writeState = null;
      this.writeBuffer.length = 0;
    }
  }

  transfer(value) {
    const byte = value & 0xff;
    if (!this.selected) return 0xff;
    if (this.responseQueue.length) return this.responseQueue.shift();

    if (this.writeState) {
      this.consumeWriteByte(byte);
      return 0xff;
    }

    if (this.commandPacket.length === 0) {
      if ((byte & 0xc0) === 0x40) this.commandPacket.push(byte);
      return 0xff;
    }

    this.commandPacket.push(byte);
    if (this.commandPacket.length === 6) {
      const packet = this.commandPacket;
      this.commandPacket = [];
      this.handleCommand(packet);
    }
    return 0xff;
  }

  consumeWriteByte(byte) {
    if (this.writeState === "await-token") {
      if (byte === 0xfe) {
        this.writeState = "data";
        this.writeBuffer.length = 0;
      }
      return;
    }
    if (this.writeState === "data") {
      this.writeBuffer.push(byte);
      if (this.writeBuffer.length === 512) this.writeState = "crc";
      return;
    }
    if (this.writeState === "crc") {
      this.writeBuffer.push(byte);
      if (this.writeBuffer.length === 514) {
        const accepted = this.writeBlock(this.writeBlockIndex, this.writeBuffer.slice(0, 512));
        this.writeState = null;
        this.writeBuffer.length = 0;
        this.responseQueue.push(accepted ? 0x05 : 0x0d, 0x00, 0xff);
      }
    }
  }

  handleCommand(packet) {
    const command = packet[0] & 0x3f;
    const argument = ((packet[1] << 24) | (packet[2] << 16) | (packet[3] << 8) | packet[4]) >>> 0;
    this.commands.push({ command, argument });
    const r1 = this.idle ? 0x01 : 0x00;

    switch (command) {
      case 0: // CMD0: GO_IDLE_STATE
        this.idle = true;
        this.appCommandPending = false;
        this.responseQueue.push(0x01);
        break;
      case 8: // CMD8: SEND_IF_COND, SD v2 voltage/check pattern
        this.responseQueue.push(r1, 0x00, 0x00, 0x01, 0xaa);
        break;
      case 55: // CMD55: APP_CMD prefix
        this.appCommandPending = true;
        this.responseQueue.push(r1);
        break;
      case 41: // ACMD41: SD_SEND_OP_COND
        if (!this.appCommandPending) {
          this.responseQueue.push(this.idle ? 0x05 : 0x04);
        } else {
          this.appCommandPending = false;
          this.idle = false;
          this.responseQueue.push(0x00);
        }
        break;
      case 58: // CMD58: READ_OCR; report high-capacity card
        this.responseQueue.push(r1, 0x40, 0xff, 0x80, 0x00);
        break;
      case 16: // CMD16: SET_BLOCKLEN
        this.blockLength = argument;
        this.responseQueue.push(this.idle ? 0x01 : (argument === 512 ? 0x00 : 0x04));
        break;
      case 17: // CMD17: READ_SINGLE_BLOCK
        if (this.idle) {
          this.responseQueue.push(0x01);
        } else if (argument >= this.capacityBlocks) {
          this.responseQueue.push(0x20);
        } else {
          const start = argument * 512;
          this.responseQueue.push(0x00, 0xfe);
          for (let i = 0; i < 512; i += 1) this.responseQueue.push(this.storage[start + i]);
          this.responseQueue.push(0xff, 0xff); // CRC placeholder; CRC checking is not enabled
        }
        break;
      case 24: // CMD24: WRITE_BLOCK
        if (this.idle) {
          this.responseQueue.push(0x01);
        } else if (argument >= this.capacityBlocks) {
          this.responseQueue.push(0x20);
        } else {
          this.writeBlockIndex = argument;
          this.writeState = "await-token";
          this.responseQueue.push(0x00);
        }
        break;
      case 13: // CMD13: SEND_STATUS
        this.responseQueue.push(r1, 0x00);
        break;
      case 59: // CMD59: CRC_ON_OFF
        this.crcEnabled = Boolean(argument & 1);
        this.responseQueue.push(r1);
        break;
      default:
        this.responseQueue.push(r1 | 0x04); // illegal command
        break;
    }
  }

  readBlock(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.capacityBlocks) throw new RangeError("Bloc SD hors capacité.");
    return this.storage.slice(index * 512, (index + 1) * 512);
  }

  writeBlock(index, bytes) {
    if (!Number.isInteger(index) || index < 0 || index >= this.capacityBlocks) return false;
    const block = Uint8Array.from(bytes);
    if (block.length !== 512) return false;
    this.storage.set(block, index * 512);
    return true;
  }

  get status() {
    return {
      chipSelectGpio: 12,
      capacityBlocks: this.capacityBlocks,
      capacityBytes: this.storage.length,
      blockSize: 512,
      mode: "SPI",
      idle: this.idle,
      writeInProgress: Boolean(this.writeState),
      commandsSeen: this.commands.length,
      crcValidation: "not-implemented"
    };
  }
}

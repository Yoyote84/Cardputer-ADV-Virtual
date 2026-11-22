/**
 * Minimal SD/SDHC card in SPI mode. Implements the common initialization and
 * single-block commands used by embedded FAT drivers. Data is volatile RAM.
 * This is a block device, not a FAT filesystem implementation.
 */
export class SDSpiCard {
  constructor({ capacityBlocks = 4096 } = {}) {
    if (!Number.isInteger(capacityBlocks) || capacityBlocks < 1) throw new RangeError("Capacité SD invalide.");
    this.capacityBlocks = capacityBlocks;
    // Sparse sectors keep a large virtual card usable on a phone without
    // reserving the full advertised capacity in RAM.
    this.blocks = new Map();
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
      case 9: // CMD9: SEND_CSD
        if (this.idle) {
          this.responseQueue.push(0x01);
        } else {
          const csd = this.createCSD();
          this.responseQueue.push(0x00, 0xfe, ...csd, 0xff, 0xff);
        }
        break;
      case 17: // CMD17: READ_SINGLE_BLOCK
        if (this.idle) {
          this.responseQueue.push(0x01);
        } else if (argument >= this.capacityBlocks) {
          this.responseQueue.push(0x20);
        } else {
          const block = this.readBlock(argument);
          this.responseQueue.push(0x00, 0xfe, ...block, 0xff, 0xff); // CRC placeholder
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
    const block = this.blocks.get(index);
    return block ? block.slice() : new Uint8Array(512);
  }

  writeBlock(index, bytes) {
    if (!Number.isInteger(index) || index < 0 || index >= this.capacityBlocks) return false;
    const block = Uint8Array.from(bytes);
    if (block.length !== 512) return false;
    this.blocks.set(index, block);
    return true;
  }

  createCSD() {
    // SDHC/SDXC CSD v2.0. Capacity field is in 512 KiB units.
    const csd = new Uint8Array(16);
    const capacityBytes = this.capacityBlocks * 512;
    const cSize = Math.max(0, Math.min(0x3fffff, Math.ceil(capacityBytes / 524288) - 1));
    csd[0] = 0x40; // CSD_STRUCTURE = 1
    csd[5] = 0x09; // READ_BL_LEN = 512 bytes
    csd[7] = (cSize >> 16) & 0x3f;
    csd[8] = (cSize >> 8) & 0xff;
    csd[9] = cSize & 0xff;
    csd[15] = 0x01; // end bit; CRC is not validated by this prototype
    return csd;
  }

  get status() {
    return {
      chipSelectGpio: 12,
      capacityBlocks: this.capacityBlocks,
      capacityBytes: this.capacityBlocks * 512,
      allocatedBlocks: this.blocks.size,
      allocatedBytes: this.blocks.size * 512,
      blockSize: 512,
      mode: "SPI",
      idle: this.idle,
      writeInProgress: Boolean(this.writeState),
      commandsSeen: this.commands.length,
      csdVersion: 2,
      crcValidation: "not-implemented"
    };
  }
}

/**
 * ST7789V2 display-controller model used by the Cardputer ADV.
 * Implements the command/data path needed for a 240x135 RGB565 panel.
 */
export class ST7789V2Device {
  constructor({ width = 240, height = 135 } = {}) {
    this.width = width;
    this.height = height;
    this.framebuffer = new Uint16Array(width * height);
    this.currentCommand = 0x00;
    this.parameters = [];
    this.columnWindow = { start: 0, end: width - 1 };
    this.rowWindow = { start: 0, end: height - 1 };
    this.cursor = { x: 0, y: 0 };
    this.pixelHighByte = null;
    this.pixelFormat = 0x55;
    this.madctl = 0x00;
    this.sleeping = true;
    this.displayOn = false;
    this.inverted = false;
    this.backlight = true;
    this.commandCount = 0;
    this.pixelWrites = 0;
  }

  spiWrite(value, dataCommand = true) {
    if (dataCommand) this.writeData([value]);
    else this.writeCommand(value);
    return 0xff;
  }

  writeCommand(command) {
    this.currentCommand = command & 0xff;
    this.parameters = [];
    this.pixelHighByte = null;
    this.commandCount += 1;
    switch (this.currentCommand) {
      case 0x01:
        this.reset();
        break;
      case 0x10:
        this.sleeping = true;
        break;
      case 0x11:
        this.sleeping = false;
        break;
      case 0x20:
        this.inverted = false;
        break;
      case 0x21:
        this.inverted = true;
        break;
      case 0x28:
        this.displayOn = false;
        break;
      case 0x29:
        this.displayOn = true;
        break;
      case 0x2c:
      case 0x3c:
        this.cursor.x = this.columnWindow.start;
        this.cursor.y = this.rowWindow.start;
        break;
      default:
        break;
    }
  }

  writeData(values) {
    for (const value of values) {
      const byte = value & 0xff;
      if (this.currentCommand === 0x2c || this.currentCommand === 0x3c) {
        this.writePixelByte(byte);
      } else {
        this.parameters.push(byte);
        this.applyParameters();
      }
    }
  }

  applyParameters() {
    const p = this.parameters;
    switch (this.currentCommand) {
      case 0x2a:
        if (p.length >= 4) {
          this.columnWindow.start = (p[0] << 8) | p[1];
          this.columnWindow.end = (p[2] << 8) | p[3];
          this.parameters = [];
          this.cursor.x = this.columnWindow.start;
          this.cursor.y = this.rowWindow.start;
        }
        break;
      case 0x2b:
        if (p.length >= 4) {
          this.rowWindow.start = (p[0] << 8) | p[1];
          this.rowWindow.end = (p[2] << 8) | p[3];
          this.parameters = [];
          this.cursor.x = this.columnWindow.start;
          this.cursor.y = this.rowWindow.start;
        }
        break;
      case 0x36:
        this.madctl = p.at(-1);
        this.parameters = [];
        break;
      case 0x3a:
        this.pixelFormat = p.at(-1);
        this.parameters = [];
        break;
      case 0x51:
        this.backlight = (p.at(-1) ?? 0) > 0;
        this.parameters = [];
        break;
      default:
        if (p.length > 16) this.parameters = p.slice(-4);
        break;
    }
  }

  writePixelByte(byte) {
    if (this.pixelHighByte === null) {
      this.pixelHighByte = byte;
      return;
    }
    const color = (this.pixelHighByte << 8) | byte;
    this.pixelHighByte = null;
    this.setPixel(this.cursor.x, this.cursor.y, color);
    this.pixelWrites += 1;
    this.advanceCursor();
  }

  advanceCursor() {
    this.cursor.x += 1;
    if (this.cursor.x > this.columnWindow.end) {
      this.cursor.x = this.columnWindow.start;
      this.cursor.y += 1;
      if (this.cursor.y > this.rowWindow.end) this.cursor.y = this.rowWindow.start;
    }
  }

  setPixel(x, y, rgb565) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    this.framebuffer[y * this.width + x] = rgb565 & 0xffff;
    return true;
  }

  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.framebuffer[y * this.width + x];
  }

  fillRect(x, y, width, height, rgb565) {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + width);
    const y1 = Math.min(this.height, y + height);
    for (let row = y0; row < y1; row += 1) {
      this.framebuffer.fill(rgb565 & 0xffff, row * this.width + x0, row * this.width + x1);
    }
  }

  clear(rgb565 = 0x0000) {
    this.framebuffer.fill(rgb565 & 0xffff);
  }

  reset() {
    this.clear(0x0000);
    this.sleeping = true;
    this.displayOn = false;
    this.inverted = false;
    this.pixelFormat = 0x55;
    this.madctl = 0;
    this.columnWindow = { start: 0, end: this.width - 1 };
    this.rowWindow = { start: 0, end: this.height - 1 };
    this.cursor = { x: 0, y: 0 };
    this.parameters = [];
    this.pixelHighByte = null;
  }

  initializeForCardputer() {
    this.writeCommand(0x11); // Sleep Out
    this.writeCommand(0x3a);
    this.writeData([0x55]); // 16-bit RGB565
    this.writeCommand(0x29); // Display On
  }

  toImageData(context) {
    const image = context.createImageData(this.width, this.height);
    for (let index = 0; index < this.framebuffer.length; index += 1) {
      const color = this.framebuffer[index];
      const r = (color >> 11) & 0x1f;
      const g = (color >> 5) & 0x3f;
      const b = color & 0x1f;
      const offset = index * 4;
      image.data[offset] = (r << 3) | (r >> 2);
      image.data[offset + 1] = (g << 2) | (g >> 4);
      image.data[offset + 2] = (b << 3) | (b >> 2);
      image.data[offset + 3] = 255;
    }
    return image;
  }

  get status() {
    return {
      width: this.width,
      height: this.height,
      pixelFormat: this.pixelFormat,
      sleeping: this.sleeping,
      displayOn: this.displayOn,
      backlight: this.backlight,
      commands: this.commandCount,
      pixelsWritten: this.pixelWrites
    };
  }
}

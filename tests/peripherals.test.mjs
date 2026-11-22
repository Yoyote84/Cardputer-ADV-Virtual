import test from "node:test";
import assert from "node:assert/strict";

import { VirtualI2CBus } from "../app/emulator/i2c-bus.mjs";
import { VirtualSPIBus, VirtualI2SBus } from "../app/emulator/spi-bus.mjs";
import { TCA8418, TCA8418Device } from "../app/emulator/tca8418.mjs";
import { ST7789V2Device } from "../app/emulator/st7789v2.mjs";
import { BMI270Device } from "../app/emulator/bmi270.mjs";
import { ES8311Device } from "../app/emulator/es8311.mjs";
import { SDSpiCard } from "../app/emulator/sd-spi-card.mjs";
import { VirtualGPIOBank, BatteryADCModel, InfraredTransmitter } from "../app/emulator/simple-peripherals.mjs";
import { createCardputerDeviceRack } from "../app/emulator/device-rack.mjs";

test("bus I2C : scan, lecture, écriture et erreur d'adresse", () => {
  const bus = new VirtualI2CBus();
  const device = new BMI270Device();
  bus.attach(BMI270Device.ADDRESS, device);
  assert.deepEqual(bus.scan(), [0x69]);
  assert.equal(bus.readByte(0x69, 0x00), 0x24);
  bus.writeByte(0x69, 0x7c, 0x02);
  assert.equal(bus.readByte(0x69, 0x7c), 0x02);
  assert.throws(() => bus.readByte(0x34, 0x00), /Aucun périphérique/);
  assert.equal(bus.transactions.length, 2);
});

test("TCA8418 : initialisation ADV, FIFO press/release et clear W1C", () => {
  const tca = new TCA8418Device();
  const bus = new VirtualI2CBus();
  bus.attach(TCA8418.ADDRESS, tca);
  tca.configureForCardputer();

  assert.equal(bus.readByte(0x34, 0x1d), 0xff);
  assert.equal(bus.readByte(0x34, 0x1e), 0xff);
  assert.equal(bus.readByte(0x34, 0x1f), 0x00);
  assert.equal(bus.readByte(0x34, 0x01), 0x3e);

  tca.pressKey(5);
  assert.equal(bus.readByte(0x34, 0x03) & 0x0f, 1);
  assert.equal(bus.readByte(0x34, 0x04), 0x85);
  assert.equal(bus.readByte(0x34, 0x03) & 0x0f, 0);
  assert.ok(bus.readByte(0x34, 0x02) & TCA8418.INT_KEY);

  bus.writeByte(0x34, 0x02, 0xff);
  assert.equal(bus.readByte(0x34, 0x02) & TCA8418.INT_KEY, 0);

  tca.releaseKey(5);
  assert.equal(bus.readByte(0x34, 0x03) & 0x0f, 1);
  assert.equal(bus.readByte(0x34, 0x04), 0x05);
  bus.writeByte(0x34, 0x02, 0xff);
  assert.equal(tca.status.queuedEvents, 0);
});

test("TCA8418 : FIFO depth is ten and overflow is observable", () => {
  const tca = new TCA8418Device();
  tca.configureForCardputer(); // ADV configuration enables overflow mode.
  for (let code = 1; code <= 11; code += 1) tca.pressKey(code);
  assert.equal(tca.status.fifoDepth, 10);
  assert.equal(tca.status.queuedEvents, 10);
  assert.equal(tca.status.overflowCount, 1);
  assert.equal(tca.read(0x04, 1)[0] & 0x7f, 2); // oldest event was dropped
});

test("TCA8418 : lecture séquentielle des registres FIFO sans sauter d'événement", () => {
  const tca = new TCA8418Device();
  tca.pressKey(1);
  tca.pressKey(2);
  tca.pressKey(3);
  assert.deepEqual([...tca.read(0x04, 3)], [0x81, 0x82, 0x83]);
  assert.equal(tca.status.queuedEvents, 0);
});

test("ST7789V2 : commandes, fenêtre de pixels et framebuffer RGB565", () => {
  const display = new ST7789V2Device();
  display.initializeForCardputer();
  assert.equal(display.status.displayOn, true);
  assert.equal(display.status.sleeping, false);

  display.writeCommand(0x2a);
  display.writeData([0x00, 0x00, 0x00, 0x00]);
  display.writeCommand(0x2b);
  display.writeData([0x00, 0x00, 0x00, 0x00]);
  display.writeCommand(0x2c);
  display.writeData([0xf8, 0x00]);
  assert.equal(display.getPixel(0, 0), 0xf800);
  assert.equal(display.status.pixelsWritten, 1);
  display.setPixel(239, 134, 0x07e0);
  assert.equal(display.getPixel(239, 134), 0x07e0);
  assert.equal(display.setPixel(240, 0, 0xffff), false);
});

test("bus SPI : le DC commande/donnée est transmis au contrôleur", () => {
  const bus = new VirtualSPIBus();
  const display = new ST7789V2Device();
  bus.attach(37, display);
  bus.select(37);
  bus.transfer(37, [0x11], { dataCommand: false });
  bus.transfer(37, [0x3a], { dataCommand: false });
  bus.transfer(37, [0x55], { dataCommand: true });
  bus.deselect(37);
  assert.equal(display.status.sleeping, false);
  assert.equal(display.status.pixelFormat, 0x55);
  assert.deepEqual(bus.trace.map((entry) => entry.kind), ["select", "transfer", "transfer", "transfer", "deselect"]);
});

test("BMI270 : identifiant, mesures brutes et réinitialisation", () => {
  const imu = new BMI270Device();
  assert.equal(imu.read(0x00, 1)[0], 0x24);
  assert.equal(imu.read(0x03, 1)[0], 0x10);
  imu.setRawMotion({ accel: [1000, -1000, 16000], gyro: [100, -100, 300] });
  const bytes = imu.read(0x0c, 6);
  const signed16 = (low, high) => {
    const value = (high << 8) | low;
    return value & 0x8000 ? value - 0x10000 : value;
  };
  assert.deepEqual([
    signed16(bytes[0], bytes[1]),
    signed16(bytes[2], bytes[3]),
    signed16(bytes[4], bytes[5])
  ], [1000, -1000, 16000]);
  assert.equal(imu.status.fullFeatureConfiguration, false);
  imu.write(0x7e, [0xb6]);
  assert.equal(imu.read(0x00, 1)[0], 0x24);
  assert.equal(imu.status.initializationBytes, 0);
});

test("ES8311 : identifiant, registres de contrôle et flux I2S numérique", () => {
  const codec = new ES8311Device();
  assert.deepEqual([...codec.read(0xfd, 3)], [0x83, 0x11, 0x00]);
  codec.write(0x00, [0x80]);
  assert.equal(codec.read(0x00, 1)[0], 0x80);

  codec.receiveI2S([100, -100, 200], { sampleRate: 48000, bits: 16, channels: 1 });
  codec.injectMicrophoneSamples([7, -7]);
  assert.equal(codec.status.playbackBufferedSamples, 3);
  assert.deepEqual([...codec.provideI2S(3)], [7, -7, 0]);
  assert.equal(codec.status.analoguePathEmulated, false);
});

test("bus I2S : transfert de blocs à un codec enregistré", () => {
  const bus = new VirtualI2SBus();
  const codec = new ES8311Device();
  bus.attach("codec", codec);
  bus.write("codec", [1, 2, 3], { sampleRate: 16000, bits: 16 });
  codec.injectMicrophoneSamples([9, 8]);
  assert.deepEqual([...bus.read("codec", 2)], [9, 8]);
  assert.equal(bus.framesWritten, 3);
  assert.equal(bus.framesRead, 2);
});

test("microSD SPI : init SDHC, write single block puis read single block", () => {
  const card = new SDSpiCard({ capacityBlocks: 8 });
  card.select();
  const transfer = (bytes) => bytes.map((byte) => card.transfer(byte));
  const command = (number, argument = 0) => {
    transfer([
      0x40 | number,
      (argument >>> 24) & 0xff,
      (argument >>> 16) & 0xff,
      (argument >>> 8) & 0xff,
      argument & 0xff,
      0x95
    ]);
    return card.transfer(0xff);
  };

  assert.equal(command(0), 0x01); // idle
  assert.equal(command(8, 0x1aa), 0x01);
  assert.equal(command(55), 0x01);
  assert.equal(command(41, 0x40000000), 0x00);
  assert.equal(command(58), 0x00);

  assert.equal(command(24, 1), 0x00);
  card.transfer(0xfe);
  const block = Uint8Array.from({ length: 512 }, (_, index) => (index * 7) & 0xff);
  transfer([...block, 0xff, 0xff]);
  assert.equal(card.transfer(0xff), 0x05);

  assert.equal(command(17, 1), 0x00);
  assert.equal(card.transfer(0xff), 0xfe);
  const readback = Uint8Array.from({ length: 512 }, () => card.transfer(0xff));
  assert.deepEqual(readback, block);
  card.deselect();
});

test("GPIO, ADC batterie et capture IR restent contrôlables", () => {
  const gpio = new VirtualGPIOBank(49);
  gpio.pinMode(2, "output");
  gpio.digitalWrite(2, 1);
  assert.equal(gpio.digitalRead(2), 1);
  gpio.setInput(4, 1);
  assert.equal(gpio.digitalRead(4), 1);

  const battery = new BatteryADCModel(gpio, { capacityMah: 1500, adcPin: 10 });
  battery.setRawADC(2048);
  assert.equal(battery.readRawADC(), 2048);
  assert.equal(battery.status.nominalCapacityMah, 1500);

  const ir = new InfraredTransmitter({ gpio, pin: 44 });
  const frame = ir.transmit([9000, 4500, 560, 560], 38000);
  assert.equal(frame.pin, 44);
  assert.equal(ir.status.capturedFrames, 1);
  assert.equal(ir.status.opticalPropagation, false);
});

test("rack Cardputer ADV : tous les composants I2C apparaissent aux adresses attendues", () => {
  const rack = createCardputerDeviceRack();
  assert.deepEqual(rack.buses.i2c.scan(), [0x18, 0x34, 0x69]);
  const result = rack.diagnostics();
  assert.equal(result.tca8418.present, true);
  assert.equal(result.st7789v2.present, true);
  assert.equal(result.bmi270.present, true);
  assert.equal(result.es8311.present, true);
  assert.equal(result.microSD.present, true);
  assert.equal(result.extensionPorts.ext.length, 14);
});

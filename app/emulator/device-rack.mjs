import { VirtualI2CBus } from "./i2c-bus.mjs";
import { VirtualSPIBus, VirtualI2SBus } from "./spi-bus.mjs";
import { TCA8418, TCA8418Device } from "./tca8418.mjs";
import { ST7789V2Device } from "./st7789v2.mjs";
import { BMI270Device } from "./bmi270.mjs";
import { ES8311Device } from "./es8311.mjs";
import { SDSpiCard } from "./sd-spi-card.mjs";
import { VirtualGPIOBank, BatteryADCModel, InfraredTransmitter, CARDPUTER_ADV_PORTS } from "./simple-peripherals.mjs";

export function createCardputerDeviceRack() {
  const i2c = new VirtualI2CBus();
  const spi = new VirtualSPIBus();
  const i2s = new VirtualI2SBus();
  const gpio = new VirtualGPIOBank(49);

  const keyboard = new TCA8418Device();
  const display = new ST7789V2Device({ width: 240, height: 135 });
  const imu = new BMI270Device();
  const codec = new ES8311Device();
  const sdCard = new SDSpiCard({ capacityBlocks: 4096 });
  const battery = new BatteryADCModel(gpio, { capacityMah: 1500, adcPin: 10 });
  const infrared = new InfraredTransmitter({ gpio, pin: 44 });

  i2c.attach(TCA8418.ADDRESS, keyboard);
  i2c.attach(BMI270Device.ADDRESS, imu);
  i2c.attach(ES8311Device.ADDRESS, codec);
  spi.attach(37, display);
  spi.attach(12, sdCard);
  i2s.attach("es8311", codec);

  // Apply only the documented/observed board startup sequence for the TCA8418.
  keyboard.configureForCardputer();

  function diagnostics() {
    const addresses = i2c.scan();
    const bmiId = i2c.readByte(BMI270Device.ADDRESS, 0x00);
    const es8311Id = [...i2c.read(ES8311Device.ADDRESS, 0xfd, 3)];
    return {
      i2cAddresses: addresses,
      tca8418: {
        present: addresses.includes(TCA8418.ADDRESS),
        ...keyboard.status
      },
      st7789v2: {
        present: display.width === 240 && display.height === 135,
        ...display.status
      },
      bmi270: {
        present: bmiId === BMI270Device.CHIP_ID,
        ...imu.status
      },
      es8311: {
        present: es8311Id[0] === 0x83 && es8311Id[1] === 0x11,
        ...codec.status
      },
      microSD: {
        present: true,
        ...sdCard.status
      },
      battery: battery.status,
      infrared: infrared.status,
      extensionPorts: CARDPUTER_ADV_PORTS
    };
  }

  return {
    profile: "M5Stack Cardputer ADV K132-Adv",
    buses: { i2c, spi, i2s },
    gpio,
    devices: { keyboard, display, imu, codec, sdCard, battery, infrared },
    diagnostics
  };
}

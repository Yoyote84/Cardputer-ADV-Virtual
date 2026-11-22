'use strict';

const CACHE_NAME = 'cardputer-adv-virtual-ui-v3-runtime';
const RUNTIME_ASSETS = [
  './vendor/esp-emu/runtime/pkg/esp_emu.js',
  './vendor/esp-emu/runtime/pkg/esp_emu_bg.wasm',
  './vendor/esp-emu/runtime/cosim.js',
  './vendor/esp-emu/runtime/vendor/esp_cosim_pb.js'
];

const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './app.mjs',
  './emulator/firmware-image.mjs',
  './emulator/esp-emu-worker.mjs',
  './keyboard-layout.json',
  './emulator/i2c-bus.mjs',
  './emulator/spi-bus.mjs',
  './emulator/tca8418.mjs',
  './emulator/st7789v2.mjs',
  './emulator/bmi270.mjs',
  './emulator/es8311.mjs',
  './emulator/ns4150b.mjs',
  './emulator/sd-spi-card.mjs',
  './emulator/simple-peripherals.mjs',
  './emulator/device-rack.mjs',
  './manifest.webmanifest',
  './icons/cardputer.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    // The WASM runtime is present in the packaged PWA build, but optional in a source checkout.
    // Cache each file independently so a missing runtime does not break installation of the UI.
    await Promise.all(RUNTIME_ASSETS.map(async (asset) => {
      try {
        const url = new URL(asset, self.location.href);
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(url, response);
      } catch {
        // Runtime is supplied by the dedicated release bundle; keep the interface installable without it.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('cardputer-adv-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

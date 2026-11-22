'use strict';

const CACHE_NAME = 'cardputer-adv-virtual-ui-v1';
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './app.mjs',
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting()));
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

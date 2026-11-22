import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const layout = JSON.parse(await read('../app/keyboard-layout.json'));

test('le clavier ADV contient exactement 56 touches en 4 × 14', () => {
  assert.equal(layout.keyCount, 56);
  assert.equal(layout.rows * layout.columns, 56);
  assert.equal(layout.keys.length, 56);
});

test('les identifiants, codes physiques et codes TCA8418 sont uniques', () => {
  assert.equal(new Set(layout.keys.map((key) => key.id)).size, 56);
  assert.equal(new Set(layout.keys.map((key) => key.code)).size, 56);
  assert.equal(new Set(layout.keys.map((key) => key.rawCode)).size, 56);
});

test('le profil clavier référence le contrôleur et adresse ADV attendus', () => {
  assert.equal(layout.controller, 'TCA8418RTWR');
  assert.equal(layout.i2cAddress, '0x34');
  assert.equal(layout.keys.find((key) => key.id === 'fn').rawCode, 3);
  assert.equal(layout.keys.find((key) => key.id === 'caps').rawCode, 7);
  assert.equal(layout.keys.find((key) => key.id === 'space').rawCode, 68);
});

test('les fonctions Fn documentées des flèches sont présentes', () => {
  assert.equal(layout.keys.find((key) => key.id === 'up').fn, ';');
  assert.equal(layout.keys.find((key) => key.id === 'left').fn, ',');
  assert.equal(layout.keys.find((key) => key.id === 'down').fn, '.');
  assert.equal(layout.keys.find((key) => key.id === 'right').fn, '/');
});

test('le manifeste PWA et le service worker sont locaux et autonomes', async () => {
  const manifest = JSON.parse(await read('../app/manifest.webmanifest'));
  const sw = await read('../app/sw.js');
  assert.equal(manifest.name, 'Cardputer ADV Virtual');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.src === './icons/cardputer.svg'));
  assert.ok(sw.includes("'./keyboard-layout.json'"));
  assert.ok(sw.includes("'./icons/cardputer.svg'"));
  assert.ok(!sw.includes('https://'));
});

test('la page contient le canvas logique et les commandes de l’interface', async () => {
  const html = await read('../app/index.html');
  assert.match(html, /canvas id="device-screen" width="240" height="135"/);
  assert.match(html, /id="keyboard"/);
  assert.match(html, /id="power-button"/);
  assert.match(html, /id="reset-button"/);
});

test('le rendu est adaptatif et garde un clavier 14 colonnes × 4 lignes', async () => {
  const css = await read('../app/styles.css');
  assert.match(css, /aspect-ratio:\s*84\s*\/\s*54/);
  assert.match(css, /grid-template-columns:\s*repeat\(14/);
  assert.match(css, /grid-template-rows:\s*repeat\(4/);
  assert.match(css, /@media \(max-width:\s*600px\)/);
  assert.match(css, /@media \(max-width:\s*380px\)/);
});

test('le script expose des événements séparés des pilotes matériels', async () => {
  const js = await read('../app/app.js');
  assert.ok(js.includes("new CustomEvent('cardputer:keyboard'"));
  assert.ok(js.includes('rawCode: key.rawCode'));
  assert.ok(js.includes("source === 'touch'"));
  assert.ok(js.includes("source === 'keyboard'"));
});

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
  assert.equal(layout.fifoDepth, 10);
  assert.equal(layout.mappingStatus, 'empirically_captured_on_physical_cardputer_adv');
  assert.equal(layout.keys.find((key) => key.id === 'fn').rawCode, 3);
  assert.equal(layout.keys.find((key) => key.id === 'caps').rawCode, 7);
  assert.equal(layout.keys.find((key) => key.id === 'space').rawCode, 68);
  assert.equal(layout.keys.find((key) => key.id === 'fn').legend, 'fn');
  assert.equal(layout.keys.find((key) => key.id === 'caps').legend, 'Aa');
});

test('les 56 légendes du clavier physique sont placées ligne par ligne dans le bon ordre', () => {
  const rows = Array.from({ length: 4 }, (_, row) => layout.keys.slice(row * 14, row * 14 + 14).map((key) => key.legend));
  assert.deepEqual(rows[0], ['esc','1','2','3','4','5','6','7','8','9','0','-','=','del']);
  assert.deepEqual(rows[1], ['tab','q','w','e','r','t','y','u','i','o','p','[',']','\\']);
  assert.deepEqual(rows[2], ['fn','Aa','a','s','d','f','g','h','j','k','l','↑',"'",'enter']);
  assert.deepEqual(rows[3], ['ctrl','opt','alt','z','x','c','v','b','n','m','←','↓','→','space']);
});

test('la couche Fn reproduit les symboles et caractères secondaires du vrai clavier', () => {
  const byId = Object.fromEntries(layout.keys.map((key) => [key.id, key]));
  assert.equal(byId['1'].fn, '!');
  assert.equal(byId.minus.fn, '_');
  assert.equal(byId['bracket-left'].fn, '{');
  assert.equal(byId.apostrophe.fn, '"');
  assert.equal(byId.up.fn, ';');
  assert.equal(byId.left.fn, ',');
  assert.equal(byId.down.fn, '.');
  assert.equal(byId.right.fn, '/');
  assert.equal(layout.fnBehavior, 'momentary_while_held');
  assert.equal(layout.capsBehavior, 'toggle_on_press');
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
  assert.ok(sw.includes("'./app.mjs'"));
  assert.ok(sw.includes("'./emulator/tca8418.mjs'"));
  assert.ok(sw.includes("'./emulator/device-rack.mjs'"));
  assert.ok(sw.includes("'./icons/cardputer.svg'"));
  assert.ok(!sw.includes('https://'));
});

test('la page contient le canvas logique et les commandes de l’interface', async () => {
  const html = await read('../app/index.html');
  assert.match(html, /canvas id="device-screen" width="240" height="135"/);
  assert.match(html, /id="keyboard"/);
  assert.match(html, /id="power-button"/);
  assert.match(html, /id="reset-button"/);
  assert.match(html, /id="peripheral-list"/);
  assert.match(html, /id="run-hardware-test"/);
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
  const js = await read('../app/app.mjs');
  assert.ok(js.includes('new CustomEvent("cardputer:keyboard"'));
  assert.ok(js.includes('rawCode: key.rawCode'));
  assert.ok(js.includes('tca8418.pressKey(key.rawCode)'));
  assert.ok(js.includes('tca8418.releaseKey(key.rawCode)'));
  assert.ok(js.includes('dispatchHardwareKeyboardEvent'));
  const wrapper = await read('../app/app.js');
  assert.ok(wrapper.includes('import("./app.mjs")'));
});


test('le panneau firmware expose import, cycle CPU et console UART', async () => {
  const html = await read('../app/index.html');
  const js = await read('../app/app.mjs');
  assert.match(html, /id="firmware-file"/);
  assert.match(html, /id="firmware-load"/);
  assert.match(html, /id="firmware-start"/);
  assert.match(html, /id="firmware-reset"/);
  assert.match(html, /id="firmware-stop"/);
  assert.match(html, /id="firmware-console"/);
  assert.ok(js.includes('new Worker("./emulator/esp-emu-worker.mjs"'));
  assert.ok(js.includes('type: "LOAD"'));
  assert.ok(js.includes('type: "START"'));
  assert.ok(js.includes('type: "RESET"'));
  assert.ok(js.includes('type: "STOP"'));
});

test('le service worker met en cache l’importeur et le worker runtime', async () => {
  const sw = await read('../app/sw.js');
  assert.ok(sw.includes("'./emulator/firmware-image.mjs'"));
  assert.ok(sw.includes("'./emulator/esp-emu-worker.mjs'"));
});


test('l’interface offre l’import des symboles ELF, le pas CPU et les métriques', async () => {
  const html = await read('../app/index.html');
  const js = await read('../app/app.mjs');
  assert.match(html, /id="firmware-elf-file"/);
  assert.match(html, /id="firmware-elf-load"/);
  assert.match(html, /id="firmware-step"/);
  assert.match(html, /id="firmware-metrics"/);
  assert.ok(js.includes('type: "LOAD_ELF"'));
  assert.ok(js.includes('type: "STEP"'));
  assert.ok(js.includes('message.type === "metrics"'));
});

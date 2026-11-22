'use strict';

(() => {
  const SCREEN_WIDTH = 240;
  const SCREEN_HEIGHT = 135;
  const PAGES = ['ACCUEIL', 'CLAVIER', 'MATÉRIEL', 'À PROPOS'];
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#device-screen');
  const context = canvas.getContext('2d', { alpha: false });
  const keyboardRoot = $('#keyboard');
  const eventLog = $('#event-log');
  const deviceShell = $('#device-shell');

  const state = {
    layout: [],
    keyByCode: new Map(),
    keyElements: new Map(),
    page: 'ACCUEIL',
    selectedPage: 0,
    powered: true,
    fn: false,
    ctrl: false,
    opt: false,
    alt: false,
    caps: false,
    shift: false,
    typed: '',
    lastKey: '—',
    eventCount: 0
  };

  function sendKeyboardEvent(key, pressed, source, value) {
    const detail = {
      keyId: key.id,
      label: key.label,
      rawCode: key.rawCode,
      value: value ?? '',
      pressed,
      fn: state.fn,
      capsLock: state.caps,
      ctrl: state.ctrl,
      opt: state.opt,
      alt: state.alt,
      source,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('cardputer:keyboard', { detail }));
  }

  function updateModifierUi() {
    const labels = [
      `FN ${state.fn ? 'activé' : 'désactivé'}`,
      `Aa ${state.caps ? 'activé' : 'désactivé'}`,
      state.ctrl ? 'CTRL' : '',
      state.opt ? 'OPT' : '',
      state.alt ? 'ALT' : ''
    ].filter(Boolean);
    $('#modifier-summary').textContent = labels.join(' · ');
    $('#modifier-state').textContent = state.fn || state.caps || state.ctrl || state.opt || state.alt ? 'ACTIF' : 'PRÊT';
    for (const id of ['fn', 'ctrl', 'opt', 'alt']) {
      const button = state.keyElements.get(id);
      if (button) button.setAttribute('aria-pressed', String(Boolean(state[id])));
    }
    const capsButton = state.keyElements.get('caps');
    if (capsButton) capsButton.setAttribute('aria-pressed', String(state.caps));
  }

  function addEvent(kind, value) {
    const empty = eventLog.querySelector('.empty-event');
    if (empty) empty.remove();
    const item = document.createElement('li');
    const time = document.createElement('span');
    const type = document.createElement('span');
    const detail = document.createElement('span');
    time.className = 'event-time';
    type.className = 'event-kind';
    detail.className = 'event-value';
    time.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    type.textContent = kind;
    detail.textContent = value;
    item.append(time, type, detail);
    eventLog.prepend(item);
    while (eventLog.children.length > 8) eventLog.lastElementChild.remove();
  }

  function resolveValue(key) {
    if (state.fn && key.fn !== null) return key.fn;
    let value = key.normal;
    if (key.type === 'character' && /^[a-z]$/.test(value) && (state.caps || state.shift)) value = value.toUpperCase();
    if (state.shift && key.type === 'character' && /^[0-9]$/.test(value)) {
      const shifted = { '1':'!', '2':'@', '3':'#', '4':'$', '5':'%', '6':'^', '7':'&', '8':'*', '9':'(', '0':')' };
      value = shifted[value] || value;
    }
    if (state.shift && key.id === 'minus') value = '_';
    if (state.shift && key.id === 'equal') value = '+';
    return value;
  }

  function keyDown(key, source = 'touch') {
    if (!state.powered) return;
    const element = state.keyElements.get(key.id);
    if (element) element.classList.add('is-pressed');

    if (key.id === 'fn' || key.id === 'ctrl' || key.id === 'opt' || key.id === 'alt') {
      state[key.id] = source === 'keyboard' ? true : !state[key.id];
      const value = key.normal;
      sendKeyboardEvent(key, true, source, value);
      addEvent('DOWN', `${key.label.toUpperCase()} · modificateur ${state[key.id] ? 'activé' : 'désactivé'}`);
      updateModifierUi();
      return;
    }

    if (key.id === 'caps') {
      state.caps = !state.caps;
      sendKeyboardEvent(key, true, source, 'CAPS');
      addEvent('DOWN', `Aa · majuscules ${state.caps ? 'activées' : 'désactivées'}`);
      updateModifierUi();
      return;
    }

    const value = resolveValue(key);
    state.lastKey = key.label;
    $('#last-key').textContent = `${key.label} · ${value}`;
    sendKeyboardEvent(key, true, source, value);
    addEvent('DOWN', `${key.label} → ${value === 'SPACE' ? 'espace' : value}`);
    applyKeyToDemo(key, value);

    if (state.fn) state.fn = false;
    if (source === 'touch' && state.ctrl) state.ctrl = false;
    if (source === 'touch' && state.opt) state.opt = false;
    if (source === 'touch' && state.alt) state.alt = false;
    updateModifierUi();
    drawScreen();
  }

  function keyUp(key, source = 'touch') {
    const element = state.keyElements.get(key.id);
    if (element) element.classList.remove('is-pressed');
    if (['fn', 'ctrl', 'opt', 'alt'].includes(key.id) && source === 'keyboard') {
      state[key.id] = false;
      updateModifierUi();
    }
    const value = key.type === 'modifier' ? key.normal : resolveValue(key);
    sendKeyboardEvent(key, false, source, value);
    addEvent('UP', key.label);
  }

  function applyKeyToDemo(key, value) {
    if (key.id === 'up') {
      if (state.page === 'ACCUEIL') state.selectedPage = (state.selectedPage + PAGES.length - 1) % PAGES.length;
      else state.page = 'ACCUEIL';
      return;
    }
    if (key.id === 'down') {
      if (state.page === 'ACCUEIL') state.selectedPage = (state.selectedPage + 1) % PAGES.length;
      else state.page = 'ACCUEIL';
      return;
    }
    if (key.id === 'left' || key.id === 'right') {
      if (state.page === 'ACCUEIL') {
        const delta = key.id === 'left' ? -1 : 1;
        state.selectedPage = (state.selectedPage + delta + PAGES.length) % PAGES.length;
      }
      return;
    }
    if (key.id === 'enter') {
      state.page = PAGES[state.selectedPage];
      return;
    }
    if (key.id === 'esc') {
      state.page = 'ACCUEIL';
      return;
    }
    if (key.id === 'del') {
      state.typed = state.typed.slice(0, -1);
      return;
    }
    if (key.id === 'space') {
      state.typed = `${state.typed} `.slice(-24);
      return;
    }
    if (key.id === 'tab') {
      state.typed = `${state.typed}  `.slice(-24);
      return;
    }
    if (key.type === 'character' && typeof value === 'string' && value.length === 1) {
      state.typed = `${state.typed}${value}`.slice(-24);
    }
  }

  function drawText(text, x, y, color = '#b9e9a4', font = '8px monospace') {
    context.font = font;
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function drawScreen() {
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = '#06130c';
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    if (!state.powered) {
      context.fillStyle = '#020604';
      context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      return;
    }

    context.fillStyle = 'rgba(57, 119, 76, .12)';
    for (let y = 3; y < SCREEN_HEIGHT; y += 4) context.fillRect(0, y, SCREEN_WIDTH, 1);
    drawText('CARDPUTER ADV', 8, 12, '#c8f8a8', 'bold 9px monospace');
    drawText('UI DEMO', 174, 12, '#6dba83', '7px monospace');
    context.fillStyle = '#5f9f71';
    context.fillRect(7, 17, 226, 1);

    if (state.page === 'ACCUEIL') {
      drawText('INTERFACE VIRTUELLE', 9, 29, '#f0f5db', 'bold 8px monospace');
      const items = ['BUREAU', 'CLAVIER', 'MATERIEL', 'A PROPOS'];
      items.forEach((item, index) => {
        const y = 45 + index * 15;
        if (index === state.selectedPage) {
          context.fillStyle = '#245c38';
          context.fillRect(7, y - 9, 226, 12);
          drawText('>', 12, y, '#dcffbc', 'bold 8px monospace');
          drawText(item, 24, y, '#e4ffcf', 'bold 8px monospace');
        } else {
          drawText(item, 24, y, '#9dbd9d', '8px monospace');
        }
      });
      context.fillStyle = '#5f9f71';
      context.fillRect(7, 108, 226, 1);
      const typed = state.typed ? `> ${state.typed}` : '> AUCUN FIRMWARE CHARGE';
      drawText(typed.slice(0, 32), 9, 120, '#f2c477', '7px monospace');
    } else if (state.page === 'CLAVIER') {
      drawText('TEST DU CLAVIER', 9, 30, '#f0f5db', 'bold 8px monospace');
      drawText(`DERNIERE TOUCHE : ${state.lastKey}`, 9, 49, '#a9e9ad', '7px monospace');
      drawText(`FN : ${state.fn ? 'ON' : 'OFF'}   CAPS : ${state.caps ? 'ON' : 'OFF'}`, 9, 64, '#a9e9ad', '7px monospace');
      drawText('56 TOUCHES / 4 x 14', 9, 83, '#d6dcb9', '8px monospace');
      drawText('EVENT -> cardputer:keyboard', 9, 102, '#eabf78', '7px monospace');
      drawText('ESC POUR REVENIR', 9, 121, '#91b68e', '7px monospace');
    } else if (state.page === 'MATÉRIEL') {
      drawText('PROFIL MATERIEL', 9, 30, '#f0f5db', 'bold 8px monospace');
      drawText('ESP32-S3FN8 / 240 MHz', 9, 48, '#a9e9ad', '7px monospace');
      drawText('LCD ST7789V2 / 240x135', 9, 63, '#a9e9ad', '7px monospace');
      drawText('TCA8418 / I2C 0x34', 9, 78, '#a9e9ad', '7px monospace');
      drawText('BMI270 / ES8311 / microSD', 9, 93, '#d6dcb9', '7px monospace');
      drawText('MODELES A VENIR - ETAPE 3', 9, 116, '#eabf78', '7px monospace');
    } else {
      drawText('CARDPUTER ADV VIRTUAL', 9, 30, '#f0f5db', 'bold 8px monospace');
      drawText('ETAPE 2 SUR 5', 9, 49, '#a9e9ad', '8px monospace');
      drawText('CET ECRAN EST UNE DEMO UI', 9, 68, '#d6dcb9', '7px monospace');
      drawText('PAS ENCORE DE CPU EMULE', 9, 84, '#eabf78', '7px monospace');
      drawText('github.com/Yoyote84', 9, 108, '#91b68e', '7px monospace');
    }

    context.fillStyle = '#376548';
    context.fillRect(7, 127, 226, 1);
    drawText('STEP 02/05', 9, 133, '#8ab995', '6px monospace');
    drawText('NO CPU / UI ONLY', 153, 133, '#d8a96d', '6px monospace');
  }

  function createKeyButton(key) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'key';
    button.dataset.keyId = key.id;
    button.setAttribute('aria-label', `Touche ${key.label}`);
    if (key.type === 'modifier') button.setAttribute('aria-pressed', 'false');
    if (key.id === 'caps') button.setAttribute('aria-pressed', 'false');
    if (key.accent) button.dataset.accent = key.accent;
    const label = document.createElement('span');
    label.className = 'key-label';
    label.textContent = key.label;
    button.append(label);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      keyDown(key, 'touch');
    });
    button.addEventListener('pointerup', (event) => {
      event.preventDefault();
      keyUp(key, 'touch');
    });
    button.addEventListener('pointercancel', () => keyUp(key, 'touch'));
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    state.keyElements.set(key.id, button);
    return button;
  }

  function buildKeyboard(layout) {
    state.layout = layout.keys;
    state.keyByCode = new Map(layout.keys.map((key) => [key.code, key]));
    keyboardRoot.replaceChildren(...layout.keys.map(createKeyButton));
    updateModifierUi();
  }

  function physicalKeyDown(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      state.shift = true;
      return;
    }
    const key = state.keyByCode.get(event.code);
    if (!key || (event.repeat && key.type === 'modifier')) return;
    event.preventDefault();
    keyDown(key, 'keyboard');
  }

  function physicalKeyUp(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      state.shift = false;
      return;
    }
    const key = state.keyByCode.get(event.code);
    if (key) keyUp(key, 'keyboard');
  }

  function resetUi() {
    state.page = 'ACCUEIL';
    state.selectedPage = 0;
    state.fn = false;
    state.ctrl = false;
    state.opt = false;
    state.alt = false;
    state.caps = false;
    state.shift = false;
    state.typed = '';
    state.lastKey = '—';
    $('#last-key').textContent = 'En attente d’une touche';
    updateModifierUi();
    drawScreen();
    addEvent('INFO', 'Interface réinitialisée');
  }

  function togglePower() {
    state.powered = !state.powered;
    deviceShell.dataset.power = state.powered ? 'on' : 'off';
    $('#power-button').setAttribute('aria-pressed', String(state.powered));
    $('#power-label').textContent = state.powered ? 'ÉCRAN ALLUMÉ' : 'ÉCRAN ÉTEINT';
    $('#session-state').textContent = state.powered ? 'Interface active' : 'Interface en veille';
    drawScreen();
    addEvent('INFO', state.powered ? 'Écran allumé' : 'Écran éteint');
  }

  function clearEvents() {
    eventLog.innerHTML = '<li class="empty-event">Touchez une touche pour voir son événement ici.</li>';
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (error) {
      addEvent('INFO', `Plein écran indisponible : ${error.message}`);
    }
  }

  async function init() {
    try {
      const response = await fetch('./keyboard-layout.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const layout = await response.json();
      if (layout.keyCount !== 56 || layout.keys.length !== 56 || layout.rows !== 4 || layout.columns !== 14) {
        throw new Error('Le profil clavier ne contient pas 56 touches en 4 × 14.');
      }
      buildKeyboard(layout);
      addEvent('INFO', 'Clavier ADV chargé : 56 touches');
    } catch (error) {
      keyboardRoot.innerHTML = '<p class="keyboard-loading">Impossible de charger le profil clavier. Rechargez l’application.</p>';
      addEvent('ERREUR', error.message);
    }

    window.addEventListener('keydown', physicalKeyDown);
    window.addEventListener('keyup', physicalKeyUp);
    window.addEventListener('blur', () => {
      state.shift = false;
      for (const key of state.layout) {
        if (['fn', 'ctrl', 'opt', 'alt'].includes(key.id)) state[key.id] = false;
        state.keyElements.get(key.id)?.classList.remove('is-pressed');
      }
      updateModifierUi();
    });
    $('#power-button').addEventListener('click', togglePower);
    $('#reset-button').addEventListener('click', resetUi);
    $('#clear-events').addEventListener('click', clearEvents);
    $('#fullscreen-button').addEventListener('click', toggleFullscreen);
    drawScreen();

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('./sw.js').catch((error) => addEvent('INFO', `Cache hors ligne non activé : ${error.message}`));
    }
  }

  init();
})();

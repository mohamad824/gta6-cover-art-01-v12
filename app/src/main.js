// NEON VICE Cover Studio — editor wiring, shot modes and PNG export.
import { drawCover, defaultState, PANEL_META, GEOMETRIES } from './cover.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || '';

const state = defaultState();
let assets = { photos: {}, title: null };
let currentPanel = 'hero';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

async function loadAssets() {
  const names = ['hero', 'portrait', 'car', 'crew', 'heli', 'bike', 'gas'];
  const loaded = await Promise.all(names.map((n) => loadImage('photos/' + n + '.jpg')));
  names.forEach((n, i) => { assets.photos[n] = loaded[i]; });
  assets.title = await loadImage('title.png');
  await Promise.all([
    document.fonts.load('600 15px Oswald'),
    document.fonts.load('700 21px Oswald'),
    document.fonts.load('400 100px Anton'),
    document.fonts.load('400 46px Pacifico'),
  ]);
  await document.fonts.ready;
}

function render() {
  const canvas = document.getElementById('cover');
  const mode = shot === 'square' ? 'square' : shot === 'portrait' ? 'portrait' : 'cover';
  drawCover(canvas, state, assets, mode);
}

function downloadPNG(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportCover(mode) {
  const c = document.createElement('canvas');
  if (mode === 'square') { c.width = 1080; c.height = 1080; }
  else if (mode === 'portrait') { c.width = 1024; c.height = 1280; }
  else { c.width = 1280; c.height = 720; }
  drawCover(c, state, assets, mode);
  downloadPNG(c, 'neon-vice-cover-' + c.width + 'x' + c.height + '.png');
}

function bindText(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[key] = el.value; render(); });
}

function refreshPanelForm() {
  const p = state.panels[currentPanel];
  document.getElementById('panelPlace').value = p.place;
  document.getElementById('panelTime').value = p.time;
  document.getElementById('panelFlavor').value = p.flavor;
  document.getElementById('panelZoom').value = p.zoom;
  document.getElementById('panelDx').value = p.dx;
  document.getElementById('panelDy').value = p.dy;
  document.getElementById('panelName').textContent = PANEL_META[currentPanel].place + ' \u2014 panel ' + currentPanel;
}

function buildEditor() {
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
  const nightBtn = document.getElementById('nightToggle');
  nightBtn.addEventListener('click', () => {
    state.night = !state.night;
    nightBtn.textContent = state.night ? 'NIGHT' : 'DAY \u00b7 DUSK';
    nightBtn.classList.toggle('active', state.night);
    render();
  });
  const wantedBtn = document.getElementById('wantedToggle');
  wantedBtn.addEventListener('click', () => {
    state.wanted = !state.wanted;
    wantedBtn.classList.toggle('active', state.wanted);
    render();
  });
  bindText('fieldTitle', 'title');
  bindText('fieldScript', 'script');
  bindText('fieldQuote', 'quote');
  bindText('fieldStation', 'station');
  bindText('fieldTagline', 'tagline');
  const sel = document.getElementById('panelSelect');
  Object.keys(PANEL_META).forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id + ' \u2014 ' + PANEL_META[id].place;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => { currentPanel = sel.value; refreshPanelForm(); });
  const bindPanel = (id, key, parse) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state.panels[currentPanel][key] = parse ? parse(e.target.value) : e.target.value;
      render();
    });
  };
  bindPanel('panelPlace', 'place');
  bindPanel('panelTime', 'time');
  bindPanel('panelFlavor', 'flavor');
  bindPanel('panelZoom', 'zoom', Number);
  bindPanel('panelDx', 'dx', Number);
  bindPanel('panelDy', 'dy', Number);
  document.getElementById('panelUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      assets.photos[PANEL_META[currentPanel].photo] = img;
      state.panels[currentPanel].zoom = 1;
      state.panels[currentPanel].dx = 0;
      state.panels[currentPanel].dy = 0;
      refreshPanelForm();
      render();
    });
  });
  document.getElementById('exportLandscape').addEventListener('click', () => exportCover('cover'));
  document.getElementById('exportSquare').addEventListener('click', () => exportCover('square'));
  document.getElementById('exportPortrait').addEventListener('click', () => exportCover('portrait'));
  refreshPanelForm();
}

async function main() {
  await loadAssets();
  if (shot === 'cover' || shot === 'square' || shot === 'portrait') {
    document.body.classList.add('shot-mode');
    const canvas = document.getElementById('cover');
    if (shot === 'square') { canvas.width = 1080; canvas.height = 1080; }
    if (shot === 'portrait') { canvas.width = 1024; canvas.height = 1280; }
    document.getElementById('editor').hidden = true;
    document.getElementById('appHeader').hidden = true;
  } else if (shot === 'editor') {
    document.body.classList.add('shot-editor');
    buildEditor();
  } else {
    buildEditor();
  }
  render();
}

main().catch((err) => {
  const el = document.getElementById('loadError');
  if (el) el.textContent = 'Could not load the studio: ' + err.message;
});

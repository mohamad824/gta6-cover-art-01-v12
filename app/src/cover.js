// NEON VICE cover renderer — draws the seven-panel GTA-style story cover
// on a canvas. Pure canvas 2D, no network, fully deterministic.
export const COVER_W = 1280;
export const COVER_H = 720;

const BORDER = 8;
const STRIP_Y = 666;
const STRIP_H = 46;

export const GEOMETRIES = {
  story: {
    hero: [8, 8, 642, 658],
    portrait: [658, 8, 304, 242],
    car: [970, 8, 302, 242],
    crew: [658, 258, 614, 200],
    heli: [658, 466, 200, 200],
    bike: [865, 466, 200, 200],
    gas: [1072, 466, 200, 200],
  },
  classic: {
    hero: [8, 8, 642, 658],
    portrait: [658, 8, 304, 242],
    car: [970, 8, 302, 242],
    crew: [658, 258, 614, 200],
    heli: [658, 466, 614, 200],
  },
  focus: {
    hero: [8, 8, 860, 658],
    portrait: [876, 8, 396, 242],
    car: [876, 258, 396, 200],
    crew: [876, 466, 396, 200],
  },
};

export const PANEL_META = {
  hero: { photo: 'hero', place: 'NEON MILE', time: '11:42 PM', flavor: 'FIRST DROP', chip: 'top-left' },
  portrait: { photo: 'portrait', place: 'ROOFTOP 9', time: '1:15 AM', flavor: 'LAST LIGHT', chip: 'bottom-right' },
  car: { photo: 'car', place: 'INTERSTATE 6', time: '2:30 AM', flavor: 'FULL THROTTLE', chip: 'bottom-left', pill: 'stars' },
  crew: { photo: 'crew', place: 'PIER 26', time: '12:10 AM', flavor: 'LOW TIDE', chip: 'bottom-left' },
  heli: { photo: 'heli', place: 'TOWER 2', time: '11:15 PM', flavor: 'SPOTLIGHT', chip: 'bottom-left', pill: 'wanted' },
  bike: { photo: 'bike', place: 'ALLEY 7', time: '1:04 AM', flavor: 'NO TURNING BACK', chip: 'bottom-left' },
  gas: { photo: 'gas', place: 'ROUTE 27', time: '3:47 AM', flavor: 'LIGHTS OUT', chip: 'bottom-left', pill: 'vol' },
};

export const STARBURST_AT = { story: [650, 380], classic: [650, 380], focus: [868, 380] };

export function defaultState() {
  const panels = {};
  for (const [id, meta] of Object.entries(PANEL_META)) {
    panels[id] = { place: meta.place, time: meta.time, flavor: meta.flavor, zoom: 1, dx: 0, dy: 0, src: 'photos/' + meta.photo + '.jpg' };
  }
  return {
    layout: 'story',
    night: true,
    wanted: true,
    title: 'NEON VICE',
    script: 'Midnight Rain',
    quote: 'THE CITY NEVER DRIES',
    station: 'VICE FM 99.9',
    tagline: 'THE CITY NEVER DRIES \u00b7 COMING SOON',
    panels,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPhotoCover(ctx, img, x, y, w, h, zoom, dx, dy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  ctx.drawImage(img, x + (w - dw) / 2 + dx, y + (h - dh) / 2 + dy, dw, dh);
}

function chipLines(ctx, text, maxW) {
  let size = 15;
  ctx.font = '600 ' + size + 'px Oswald';
  if (ctx.measureText(text).width <= maxW) return { lines: [text], size };
  size = 12;
  ctx.font = '600 ' + size + 'px Oswald';
  if (ctx.measureText(text).width <= maxW) return { lines: [text], size };
  // two lines: "PLACE \u00b7 TIME" / "FLAVOR"
  const parts = text.split(' \u2014 ');
  return { lines: parts.length === 2 ? parts : [text], size: 12 };
}

function drawChip(ctx, x, y, w, h, text, align) {
  const pad = 9;
  const inner = chipLines(ctx, text, w - pad * 2);
  const lh = inner.size + 7;
  const ch = lh * inner.lines.length + 8;
  let cx;
  if (align === 'bottom-right' || align === 'top-right') cx = x + w - 8 - Math.max(...inner.lines.map((l) => ctx.measureText(l).width)) - pad * 2;
  else cx = x + 8;
  const cy = align.startsWith('top') ? y + 8 : y + h - 8 - ch;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 18, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  const cw = Math.max(...inner.lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  roundRect(ctx, cx, cy, cw, ch, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  inner.lines.forEach((line, i) => {
    ctx.font = '600 ' + inner.size + 'px Oswald';
    ctx.fillText(line, cx + pad, cy + 6 + lh * i + lh / 2);
  });
  ctx.restore();
}

function drawPill(ctx, x, y, text, bg, fg) {
  ctx.save();
  ctx.font = '700 15px Oswald';
  const w = ctx.measureText(text).width + 20;
  const h = 26;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 13);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 10, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawStarburst(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const points = 12;
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffc93c';
  ctx.strokeStyle = '#0a0e1a';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0a0e1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 14px Oswald';
  ctx.fillText('EST.', 0, -9);
  ctx.fillText('2026', 0, 8);
  ctx.restore();
}

function drawChromeTitle(ctx, text, x, y, w, h) {
  ctx.save();
  const size = Math.floor(h * 0.62);
  ctx.font = size + 'px Anton';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  // letter spacing, centered
  const sp = Math.floor(size * 0.07);
  let total = 0;
  const widths = [...text].map((ch) => {
    const wd = ctx.measureText(ch).width;
    total += wd;
    return wd;
  });
  total += sp * (text.length - 1);
  let cx = x + (w - total) / 2;
  const grad = ctx.createLinearGradient(0, y, 0, y + size);
  grad.addColorStop(0, '#f6f9fc');
  grad.addColorStop(0.45, '#cddce8');
  grad.addColorStop(0.75, '#78d2eb');
  grad.addColorStop(1, '#2ebeff');
  ctx.shadowColor = '#ff2fb4';
  ctx.shadowBlur = 18;
  ctx.lineWidth = Math.max(4, Math.floor(size * 0.055));
  ctx.strokeStyle = '#060a1a';
  ctx.fillStyle = grad;
  [...text].forEach((ch, i) => {
    ctx.strokeText(ch, cx, y);
    ctx.fillText(ch, cx, y);
    cx += widths[i] + sp;
  });
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  const bars = [3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2];
  let bx = x;
  ctx.save();
  ctx.fillStyle = '#e8ecf4';
  for (const bw of bars) {
    ctx.fillRect(bx, y, bw, h);
    bx += bw + 2;
    if (bx > x + w) break;
  }
  ctx.restore();
}

// Draw the cover onto ctx at the canvas's own size.
// mode: 'cover' (1280x720), 'square' (1080x1080), 'portrait' (1024x1280).
export function drawCover(canvas, state, assets, mode) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const s = W / COVER_W;
  const oy = mode === 'cover' ? 0 : (H - COVER_H * s) / 2;
  ctx.save();
  ctx.fillStyle = '#04060e';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(0, oy);
  ctx.scale(s, s);
  // dark border
  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, COVER_W, COVER_H);
  const geo = GEOMETRIES[state.layout];
  // photos
  for (const [id, rect] of Object.entries(geo)) {
    const [x, y, w, h] = rect;
    const p = state.panels[id];
    const img = assets.photos[PANEL_META[id].photo];
    ctx.save();
    roundRect(ctx, x, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(x, y, w, h);
    if (img) drawPhotoCover(ctx, img, x, y, w, h, p.zoom, p.dx, p.dy);
    // bottom shade so chips read
    const shade = ctx.createLinearGradient(0, y + h - 70, 0, y + h);
    shade.addColorStop(0, 'rgba(4, 6, 16, 0)');
    shade.addColorStop(1, 'rgba(4, 6, 16, 0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y + h - 70, w, 70);
    ctx.restore();
  }
  // NEON WASH: vivid magenta / cyan light over the photos so the neon grade
  // pops at thumbnail size; applied to the panels only, before chips/title.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  let wash = ctx.createRadialGradient(300, 140, 40, 300, 140, 620);
  wash.addColorStop(0, 'rgba(255, 47, 180, 0.38)');
  wash.addColorStop(1, 'rgba(255, 47, 180, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, COVER_W, STRIP_Y);
  wash = ctx.createRadialGradient(1020, 540, 40, 1020, 540, 620);
  wash.addColorStop(0, 'rgba(46, 190, 255, 0.34)');
  wash.addColorStop(1, 'rgba(46, 190, 255, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, COVER_W, STRIP_Y);
  ctx.restore();
  // DAY = warm dusk variant over the photos
  if (!state.night) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const warm = ctx.createLinearGradient(0, 0, 0, STRIP_Y);
    warm.addColorStop(0, 'rgba(255, 150, 60, 0.28)');
    warm.addColorStop(0.6, 'rgba(255, 120, 40, 0.34)');
    warm.addColorStop(1, 'rgba(255, 90, 30, 0.40)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, COVER_W, STRIP_Y);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(255, 190, 120, 0.06)';
    ctx.fillRect(0, 0, COVER_W, STRIP_Y);
    ctx.restore();
  }
  // chips + pills
  for (const [id, rect] of Object.entries(geo)) {
    const [x, y, w, h] = rect;
    const p = state.panels[id];
    const meta = PANEL_META[id];
    const text = p.place + ' \u00b7 ' + p.time + ' \u2014 ' + p.flavor;
    drawChip(ctx, x, y, w, h, text, meta.chip);
    if (meta.pill === 'stars') {
      drawPill(ctx, x + w - 8 - 108, y + 8, '\u2605\u2605\u2605\u2605\u2605', 'rgba(4, 7, 18, 0.85)', '#ffc93c');
    }
    if (meta.pill === 'wanted' && state.wanted) {
      drawPill(ctx, x + w - 8 - 148, y + 8, 'WANTED \u2605\u2605\u2605\u2605\u2605', '#ff2fb4', '#ffffff');
    }
    if (meta.pill === 'vol') {
      drawPill(ctx, x + w - 8 - 78, y + 8, 'VOL. 12', 'rgba(4, 7, 18, 0.85)', '#ffffff');
    }
  }
  // starburst EST. 2026 at the hero / right-column seam, clear of every chip
  const [sbx, sby] = STARBURST_AT[state.layout];
  drawStarburst(ctx, sbx, sby, 36);
  // title: PIL chrome PNG by default; canvas chrome when the title text changed
  if (state.title === 'NEON VICE' && assets.title) {
    ctx.drawImage(assets.title, 12, 486, 620, 150);
  } else {
    drawChromeTitle(ctx, state.title, 12, 492, 620, 150);
    if (state.script) {
      ctx.save();
      ctx.font = '46px Pacifico';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = '#ff2fb4';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd6f0';
      ctx.fillText(state.script, 632, 640);
      ctx.restore();
    }
  }
  // bottom strip: quote bar left, tagline + barcode right
  ctx.fillStyle = '#04060e';
  ctx.fillRect(0, STRIP_Y, COVER_W, STRIP_H);
  ctx.fillStyle = '#ffc93c';
  ctx.font = '700 21px Oswald';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2605\u2605\u2605\u2605\u2605', 14, STRIP_Y + STRIP_H / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 21px Oswald';
  const quote = '\u201c' + state.quote + '\u201d \u2014 ' + state.station;
  ctx.fillText(quote, 132, STRIP_Y + STRIP_H / 2 + 1);
  ctx.fillStyle = '#9aa7bd';
  ctx.font = '600 15px Oswald';
  ctx.textAlign = 'right';
  ctx.fillText(state.tagline, 1136, STRIP_Y + STRIP_H / 2 + 1);
  drawBarcode(ctx, 1150, STRIP_Y + 7, 118, 32);
  ctx.restore();
}

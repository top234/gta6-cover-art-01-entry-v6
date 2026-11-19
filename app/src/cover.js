// Vice Neon Cover Studio — cover renderer.
// Draws a multi-panel GTA-style poster onto a canvas at its own size:
// a hero panel plus three smaller panels in a classic cover grid, a Vice
// City sunset/neon grade, procedural sun/palm/skyline silhouettes, halftone
// dots, vignette and grain, and huge outlined display lettering.
// Rendering is fully deterministic: same state, same pixels — no Date,
// no Math.random anywhere in the render path (grain uses a fixed-seed LCG).

const DISPLAY_STACK = '"Arial Black", Impact, "Helvetica Neue", system-ui, sans-serif';

// ---------------------------------------------------------------- layouts
// Each layout returns 4 panel rects in normalised coordinates (0..1),
// plus which panel is tilted like a polaroid and which one is the hero.

export function layoutHeroGrid() {
  return {
    panels: [
      { x: 0.02, y: 0.02, w: 0.96, h: 0.60, hero: true },
      { x: 0.02, y: 0.65, w: 0.30, h: 0.33 },
      { x: 0.35, y: 0.65, w: 0.30, h: 0.33, tilt: -0.05 },
      { x: 0.68, y: 0.65, w: 0.30, h: 0.33 },
    ],
    titleZone: { x: 0.05, y: 0.44, w: 0.90, align: 'left' },
  };
}

export function layoutDiagonalSlice() {
  return {
    panels: [
      { x: 0.00, y: 0.00, w: 1.00, h: 0.38, hero: true, slant: 0.05 },
      { x: 0.00, y: 0.39, w: 1.00, h: 0.20, slant: -0.05 },
      { x: 0.00, y: 0.60, w: 1.00, h: 0.19, slant: 0.05 },
      { x: 0.00, y: 0.80, w: 1.00, h: 0.20, slant: -0.05, tilt: 0 },
    ],
    titleZone: { x: 0.05, y: 0.90, w: 0.90, align: 'left' },
  };
}

export function layoutTrioStrip() {
  return {
    panels: [
      { x: 0.02, y: 0.02, w: 0.58, h: 0.96, hero: true },
      { x: 0.63, y: 0.02, w: 0.35, h: 0.30 },
      { x: 0.63, y: 0.35, w: 0.35, h: 0.30, tilt: 0.04 },
      { x: 0.63, y: 0.68, w: 0.35, h: 0.30 },
    ],
    titleZone: { x: 0.05, y: 0.80, w: 0.56, align: 'left' },
  };
}

export const LAYOUTS = { hero: layoutHeroGrid, diagonal: layoutDiagonalSlice, trio: layoutTrioStrip };

// ---------------------------------------------------------------- helpers

// Fixed-seed linear congruential generator: deterministic grain.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function coverFit(img, rect, zoom, panX, panY) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  return { dx: rect.x + (rect.w - dw) / 2 + panX * slackX, dy: rect.y + (rect.h - dh) / 2 + panY * slackY, dw, dh };
}

function panelPath(ctx, r, slant) {
  const s = (slant ?? 0) * r.w;
  ctx.beginPath();
  ctx.moveTo(r.x + s, r.y);
  ctx.lineTo(r.x + r.w + s, r.y);
  ctx.lineTo(r.x + r.w - s, r.y + r.h);
  ctx.lineTo(r.x - s, r.y + r.h);
  ctx.closePath();
}

// ---------------------------------------------------------------- panels

export function drawPhotoPanel(ctx, img, rect, view, keyline) {
  ctx.save();
  panelPath(ctx, rect, view.slant);
  ctx.clip();
  if (img) {
    const f = coverFit(img, rect, view.zoom ?? 1, view.panX ?? 0, view.panY ?? 0);
    ctx.drawImage(img, f.dx, f.dy, f.dw, f.dh);
  } else {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, '#3b1d5e');
    g.addColorStop(0.55, '#c2276b');
    g.addColorStop(1, '#ff7a2f');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  if (keyline) {
    ctx.save();
    panelPath(ctx, rect, view.slant);
    ctx.strokeStyle = '#0b0b12';
    ctx.lineWidth = Math.max(3, rect.w * 0.012);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, rect.w * 0.006);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- grade

export function applySunsetGrade(ctx, w, h, grade) {
  const sun = grade.sunset ?? 0.8;
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, `rgba(255, 0, 128, ${0.38 * sun})`);
  wash.addColorStop(0.5, `rgba(255, 90, 40, ${0.22 * sun})`);
  wash.addColorStop(1, `rgba(255, 170, 0, ${0.40 * sun})`);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const bottom = ctx.createLinearGradient(0, h * 0.45, 0, h);
  bottom.addColorStop(0, 'rgba(20, 0, 40, 0)');
  bottom.addColorStop(1, `rgba(20, 0, 40, ${0.45 * sun})`);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  if (grade.duotone) {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    const duo = ctx.createLinearGradient(0, 0, w, h);
    duo.addColorStop(0, '#ff2d78');
    duo.addColorStop(1, '#ffb300');
    ctx.fillStyle = duo;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export function drawSunDisc(ctx, cx, cy, r, glow) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  halo.addColorStop(0, `rgba(255, 120, 40, ${0.55 * glow})`);
  halo.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffe259');
  disc.addColorStop(0.55, '#ff7e3d');
  disc.addColorStop(1, '#ff2d78');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro slats cut across the lower half of the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 0, 40, 0.85)';
  for (let i = 0; i < 4; i++) {
    const y = cy + r * (0.08 + i * 0.22);
    ctx.fillRect(cx - r, y, r * 2, r * (0.05 + i * 0.02));
  }
  ctx.restore();
}

export function drawPalmSilhouette(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#12041f';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * s, -s * 0.55, lean * s * 1.6, -s);
  ctx.stroke();
  const topX = lean * s * 1.6;
  const topY = -s;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.08 + i * 0.14);
    const len = s * (0.52 + 0.1 * Math.sin(i * 2.1));
    const droop = s * (0.22 + 0.06 * Math.cos(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.55,
      topY + Math.sin(a) * len * 0.55 - droop * 0.4,
      topX + Math.cos(a) * len,
      topY + Math.sin(a) * len * 0.5 + droop,
    );
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSkylineSilhouette(ctx, x0, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#12041f';
  const rand = seededRandom(1337);
  let x = x0;
  while (x < x0 + w) {
    const bw = w * (0.04 + rand() * 0.05);
    const bh = h * (0.3 + rand() * 0.7);
    ctx.fillRect(x, y + h - bh, bw, bh);
    if (rand() > 0.6) ctx.fillRect(x + bw * 0.4, y + h - bh - h * 0.12, bw * 0.2, h * 0.12);
    x += bw + w * 0.012;
  }
  ctx.restore();
}

export function drawNeonRim(ctx, w, h, strength) {
  if (strength <= 0.02) return;
  ctx.save();
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 18 * strength;
  ctx.strokeStyle = `rgba(0, 229, 255, ${0.85 * strength})`;
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
  ctx.shadowColor = '#ff2d78';
  ctx.strokeStyle = `rgba(255, 45, 120, ${0.7 * strength})`;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.965);
  ctx.lineTo(w * 0.94, h * 0.965);
  ctx.stroke();
  ctx.restore();
}

export function drawHalftoneDots(ctx, w, h, seed) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.3;
    const r = 1 + rand() * Math.max(1.5, w * 0.002);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawVignetteAndGrain(ctx, w, h, seed) {
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(5, 0, 15, 0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  const rand = seededRandom(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const step = 3;
  for (let i = 0; i < d.length; i += 4 * step) {
    const n = (rand() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- lettering

export function fitDisplayFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${DISPLAY_STACK}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(10, size * 0.92);
    ctx.font = `900 ${size}px ${DISPLAY_STACK}`;
  }
  return size;
}

export function drawCoverTitle(ctx, zone, title, subtitle, badge, w, h, neon) {
  const text = (title || '').trim().toUpperCase();
  const zx = zone.x * w;
  const zy = zone.y * h;
  const zw = zone.w * w;
  ctx.save();
  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  const tx = zone.align === 'left' ? zx : zx + zw / 2;
  // Fit the title first: the badge sits above the title's cap top, never on it.
  const size = text ? fitDisplayFont(ctx, text, zw, h * 0.115) : 0;
  if (badge) {
    const bs = Math.max(12, h * 0.022);
    ctx.font = `900 ${bs}px ${DISPLAY_STACK}`;
    const bw = ctx.measureText(badge.toUpperCase()).width + bs * 1.6;
    const bx = zone.align === 'left' ? zx : tx - bw / 2;
    const by = zy - size - bs * 2.4;
    ctx.fillStyle = '#00e5ff';
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16 * neon;
    ctx.fillRect(bx, by, bw, bs * 1.7);
    ctx.restore();
    ctx.fillStyle = '#0b0b12';
    ctx.fillText(badge.toUpperCase(), bx + bs * 0.8, by + bs * 1.28);
  }
  if (text) {
    const ly = zy;
    ctx.font = `900 ${size}px ${DISPLAY_STACK}`;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = size * 0.35 * neon + 4;
    ctx.strokeStyle = '#0b0b12';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(text, tx, ly);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, tx, ly);
    // Thin neon underline echo of the title.
    ctx.fillStyle = `rgba(0, 229, 255, ${0.9 * neon + 0.1})`;
    const tw = ctx.measureText(text).width;
    const ux = zone.align === 'left' ? tx : tx - tw / 2;
    ctx.fillRect(ux, ly + size * 0.08, tw, Math.max(3, size * 0.045));
  }
  if (subtitle) {
    const ss = Math.max(12, h * 0.032);
    ctx.font = `700 ${ss}px ${DISPLAY_STACK}`;
    ctx.fillStyle = '#ffe259';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = ss * 0.3;
    ctx.fillText(subtitle.toUpperCase(), tx, zy + h * 0.075);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- main render

// state: { layout, photos[4] (Image|null), views[4] {zoom,panX,panY},
//          fillMode 'one'|'each', title, subtitle, badge,
//          grade {sunset, neon, contrast, saturation, duotone} }
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = (LAYOUTS[state.layout] ?? layoutHeroGrid)();
  ctx.save();
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, w, h);
  const sat = state.grade?.saturation ?? 1.15;
  const con = state.grade?.contrast ?? 1.08;
  ctx.filter = `saturate(${sat}) contrast(${con})`;
  layout.panels.forEach((p, i) => {
    const rect = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    const img = state.fillMode === 'one' ? state.photos[0] : state.photos[i];
    const view = { ...(state.views?.[i] ?? {}), slant: p.slant ?? 0 };
    if (p.tilt) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      drawPhotoPanel(ctx, img, rect, view, true);
      ctx.restore();
    } else {
      drawPhotoPanel(ctx, img, rect, view, true);
    }
  });
  ctx.filter = 'none';
  // Procedural Vice City skyline band across the hero panel's foot.
  const hero = layout.panels[0];
  const hx = hero.x * w;
  const hy = hero.y * h;
  const hw = hero.w * w;
  const hh = hero.h * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(hx, hy, hw, hh);
  ctx.clip();
  const sunR = Math.min(hw, hh) * 0.16;
  drawSunDisc(ctx, hx + hw * 0.80, hy + hh * 0.12, sunR, state.grade?.neon ?? 0.8);
  drawSkylineSilhouette(ctx, hx, hy + hh * 0.84, hw, hh * 0.16);
  ctx.restore();
  const palmSize = Math.min(hw, hh) * 0.30;
  drawPalmSilhouette(ctx, hx + hw * 0.06, hy + hh * 0.99, palmSize, 0.25);
  drawPalmSilhouette(ctx, hx + hw * 0.94, hy + hh * 0.99, palmSize * 0.85, -0.2);
  applySunsetGrade(ctx, w, h, state.grade ?? {});
  drawHalftoneDots(ctx, w, h, 4242);
  drawNeonRim(ctx, w, h, state.grade?.neon ?? 0.8);
  drawCoverTitle(ctx, layout.titleZone, state.title, state.subtitle, state.badge, w, h, state.grade?.neon ?? 0.8);
  drawVignetteAndGrain(ctx, w, h, 90210);
  ctx.restore();
}

export const EXPORT_SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  landscape: { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
};

export function exportCoverPNG(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey] ?? EXPORT_SIZES.square;
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off, state);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

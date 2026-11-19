// Vice Neon Cover Studio — editor wiring: photos, panels, caption, grade,
// layout/size pickers, drag-to-pan, and deterministic PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { renderCover, exportCoverPNG, EXPORT_SIZES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

// Library of loaded photos (Image objects) + per-panel assignment.
const library = [];
const panelPhotoIndex = [0, 0, 0, 0];
const views = [
  { zoom: 1, panX: 0, panY: 0 },
  { zoom: 1, panX: 0, panY: 0 },
  { zoom: 1, panX: 0, panY: 0 },
  { zoom: 1, panX: 0, panY: 0 },
];
let selectedPanel = 0;

function currentState() {
  const photos = panelPhotoIndex.map((i) => library[i] ?? null);
  return {
    layout: document.querySelector('.layout-btn.active')?.dataset.layout ?? 'hero',
    photos,
    views,
    fillMode: document.querySelector('input[name="fillMode"]:checked')?.value ?? 'one',
    title: $('title').value,
    subtitle: $('subtitle').value,
    badge: $('badge').value,
    grade: {
      sunset: Number($('sunset').value) / 100,
      neon: Number($('neon').value) / 100,
      contrast: Number($('contrast').value) / 100,
      saturation: Number($('saturation').value) / 100,
      duotone: $('duotone').checked,
    },
  };
}

function previewSize() {
  const key = $('exportSize').value;
  const size = EXPORT_SIZES[key] ?? EXPORT_SIZES.square;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  $('previewSize').textContent = `${size.w} × ${size.h}`;
}

function redraw() {
  previewSize();
  renderCover(canvas, currentState());
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function refreshPanelPhotoOptions() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  if (library.length === 0) {
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = 'No photo yet — add one or load the demos';
    sel.appendChild(opt);
    return;
  }
  library.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = img.dataset.name ?? `Photo ${i + 1}`;
    sel.appendChild(opt);
  });
  sel.value = String(panelPhotoIndex[selectedPanel] ?? 0);
}

async function addPhotoFiles(files) {
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      img.dataset.name = file.name;
      library.push(img);
    } catch { /* skip unreadable files */ }
  }
  if (library.length > 0 && panelPhotoIndex.every((i) => i === 0)) {
    panelPhotoIndex[1] = Math.min(1, library.length - 1);
    panelPhotoIndex[2] = Math.min(2, library.length - 1);
    panelPhotoIndex[3] = Math.min(3, library.length - 1);
  }
  refreshPanelPhotoOptions();
  redraw();
}

async function loadDemoPhotos() {
  if (library.length === 0) {
    for (const [file, name] of [['samples/pier.jpg', 'Pier sunset (demo)'], ['samples/boulevard.jpg', 'Boulevard (demo)']]) {
      try {
        const img = await loadImage(file);
        img.dataset.name = name;
        library.push(img);
      } catch { /* demo missing: keep going with what loaded */ }
    }
    panelPhotoIndex[1] = Math.min(1, library.length - 1);
    panelPhotoIndex[2] = 0;
    panelPhotoIndex[3] = Math.min(1, library.length - 1);
  }
  refreshPanelPhotoOptions();
  redraw();
}

// ---- controls -----------------------------------------------------------

$('photoFiles').addEventListener('change', (e) => addPhotoFiles([...(e.target.files ?? [])]));
$('demoPhotos').addEventListener('click', loadDemoPhotos);
$('clearPhotos').addEventListener('click', () => {
  library.length = 0;
  panelPhotoIndex.fill(0);
  refreshPanelPhotoOptions();
  redraw();
});
document.querySelectorAll('input[name="fillMode"]').forEach((r) => r.addEventListener('change', redraw));

$('panelSelect').addEventListener('change', () => {
  selectedPanel = Number($('panelSelect').value);
  $('panelPhoto').value = String(panelPhotoIndex[selectedPanel] ?? 0);
  $('zoom').value = String(Math.round((views[selectedPanel].zoom ?? 1) * 100));
  $('zoomVal').textContent = `${$('zoom').value}%`;
});
$('panelPhoto').addEventListener('change', () => {
  panelPhotoIndex[selectedPanel] = Number($('panelPhoto').value);
  redraw();
});
$('zoom').addEventListener('input', () => {
  views[selectedPanel].zoom = Number($('zoom').value) / 100;
  $('zoomVal').textContent = `${$('zoom').value}%`;
  redraw();
});
for (const id of ['title', 'subtitle', 'badge']) $(id).addEventListener('input', redraw);
for (const [id, valId, suffix] of [['sunset', 'sunsetVal', '%'], ['neon', 'neonVal', '%'], ['contrast', 'contrastVal', '%'], ['saturation', 'saturationVal', '%']]) {
  $(id).addEventListener('input', () => { $(valId).textContent = `${$(id).value}${suffix}`; redraw(); });
}
$('duotone').addEventListener('change', redraw);
$('exportSize').addEventListener('change', redraw);
document.querySelectorAll('.layout-btn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.layout-btn').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  redraw();
}));

// ---- drag to pan the selected panel ------------------------------------
let dragging = null;
function panelRectOnCanvas(i) {
  const layout = (LAYOUTS[currentState().layout] ?? LAYOUTS.hero)();
  const p = layout.panels[i];
  return { x: p.x * canvas.width, y: p.y * canvas.height, w: p.w * canvas.width, h: p.h * canvas.height };
}
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const cx = (e.clientX - r.left) * (canvas.width / r.width);
  const cy = (e.clientY - r.top) * (canvas.height / r.height);
  for (let i = 0; i < 4; i++) {
    const p = panelRectOnCanvas(i);
    if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) {
      selectedPanel = i;
      $('panelSelect').value = String(i);
      $('panelPhoto').value = String(panelPhotoIndex[i] ?? 0);
      $('zoom').value = String(Math.round((views[i].zoom ?? 1) * 100));
      $('zoomVal').textContent = `${$('zoom').value}%`;
      break;
    }
  }
  dragging = { x: e.clientX, y: e.clientY, panX: views[selectedPanel].panX, panY: views[selectedPanel].panY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const dx = (e.clientX - dragging.x) / r.width;
  const dy = (e.clientY - dragging.y) / r.height;
  views[selectedPanel].panX = Math.max(-1, Math.min(1, dragging.panX + dx * 2));
  views[selectedPanel].panY = Math.max(-1, Math.min(1, dragging.panY + dy * 2));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

// ---- export -------------------------------------------------------------
$('export').addEventListener('click', async () => {
  const key = $('exportSize').value;
  const size = EXPORT_SIZES[key] ?? EXPORT_SIZES.square;
  statusEl.textContent = 'Rendering…';
  const blob = await exportCoverPNG(currentState(), key);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-neon-cover-${size.w}x${size.h}.png`;
  a.click();
  statusEl.textContent = `Saved vice-neon-cover-${size.w}x${size.h}.png`;
});

// ---- boot / screenshot scenes -------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (scene) => {
    document.querySelector(`.layout-btn[data-layout="${scene.layout}"]`)?.click();
    $('exportSize').value = scene.size;
    $('title').value = scene.title;
    $('subtitle').value = scene.subtitle;
    $('badge').value = scene.badge;
    document.getElementById('fillEach').checked = true;
    const first = await loadImage(scene.photo);
    first.dataset.name = 'Pier sunset (demo)';
    const second = await loadImage(scene.photo2);
    second.dataset.name = 'Boulevard (demo)';
    library.push(first, second);
    panelPhotoIndex[0] = 0;
    panelPhotoIndex[1] = 1;
    panelPhotoIndex[2] = 0;
    panelPhotoIndex[3] = 1;
    // Frame each panel on the subject's face (positive pan shows the photo's top).
    views[0].panY = 0.7;
    views[1].panY = 0.85;
    views[2].panY = 0.85;
    views[3].panY = 0.85;
    refreshPanelPhotoOptions();
    redraw();
  });
} else {
  refreshPanelPhotoOptions();
  redraw();
}

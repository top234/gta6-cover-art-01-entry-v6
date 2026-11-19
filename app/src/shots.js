// Fixed scenes for screenshots, following the starter's pattern:
// ?shot=editor shows the editor with a sample photo loaded; ?shot=cover
// shows the cover alone, full viewport. `photo` picks the sample
// (samples/<photo>.jpg), `layout` the grid, `size` the export size,
// `caption`/`subtitle`/`badge` the words. window.__shotReady is set once
// the scene is painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup({
    photo: `samples/${query.get('photo') ?? 'pier'}.jpg`,
    photo2: `samples/${query.get('photo2') ?? 'boulevard'}.jpg`,
    layout: query.get('layout') ?? 'hero',
    size: query.get('size') ?? 'landscape',
    title: query.get('caption') ?? 'VICE CITY NIGHTS',
    subtitle: query.get('subtitle') ?? 'Neon Nights & Fast Getaways',
    badge: query.get('badge') ?? 'GTA 6 FAN COVER',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

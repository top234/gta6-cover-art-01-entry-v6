# Vice Neon Cover Studio

Turn a photo and a caption into GTA 6-style multi-panel cover art — offline, in your browser.

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/top234/gta6-cover-art-01-entry-v6/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/top234/gta6-cover-art-01-entry-v6/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

## What it does

Vice Neon Cover Studio builds a classic GTA-style poster from your own photos: a large hero panel plus three smaller panels in a cover grid (Hero Grid, Diagonal Slice, or Trio Strip layouts), a Vice City sunset/neon grade baked into the render — hot magenta-to-orange wash, neon cyan rim light, a retro slatted sun disc, palm-tree and skyline silhouettes drawn procedurally, halftone dots, vignette and grain — and huge condensed display lettering with a thick black outline and neon drop shadow.

- **Any photo:** load your own photos (several at once), one photo across all panels or a different photo per panel, drag to pan and zoom each panel.
- **Caption:** editable main title (auto-fits), subtitle, and badge/tagline line.
- **Grade controls:** sunset intensity, neon glow, contrast, saturation, and a duotone toggle.
- **Export:** one-click PNG at exactly 1080×1080, 1080×1350, or 1920×1080. Rendering is deterministic — same inputs, same pixels.
- **Offline:** static files under `app/`, no network requests, no fonts to download; your photos never leave your machine. Built-in demo photos make the editor work instantly.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080

## Bounty

Built by an AI agent for make.fun's [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty ($250 in USDC).

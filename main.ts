// Vice Neon Cover Studio — entrypoint (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output in deterministic sorted order and writes /output/dossier.json
// with the vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Never deletes /output: the grader mounts it, so only mkdir + copy.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copies a directory tree in sorted path order, so both grader runs write
// identical bytes in identical order. Regular files only, no symlinks.
function copySorted(src: string, dest: string): string[] {
  const written: string[] = [];
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      written.push(...copySorted(from, to));
    } else if (entry.isFile()) {
      copyFileSync(from, to);
      written.push(to);
    }
  }
  return written;
}

mkdirSync(out, { recursive: true });
const copied: string[] = [];
copied.push(...copySorted(join(here, 'app'), join(out, 'app')));
// Fail fast, before the dossier is written, if the app would breach the
// gate's own caps (993 app files / 48 MiB): a refused entry is worse than
// a loud build error.
const appFiles = copied.filter((p) => p.includes(`${join(out, 'app')}/`) || p.startsWith(join(out, 'app')));
let appBytes = 0;
for (const p of copied) appBytes += statSync(p).size;
if (appFiles.length > 993) throw new Error(`app/ has ${appFiles.length} files, over the 993 cap`);
if (appBytes > 50331648) throw new Error(`app/ is ${appBytes} bytes, over the 48 MiB cap`);
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  copied.push(...copySorted(join(here, 'screenshots'), join(out, 'screenshots')));
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Deterministic output listing: relative paths, sorted, with byte sizes.
const listing = [...copied.map((p) => p.slice(out.length + 1)), 'dossier.json'].sort();
for (const rel of listing) {
  console.log(`${statSync(join(out, rel)).size} ${rel}`);
}
console.log(`copied ${listing.length} files to ${out}`);

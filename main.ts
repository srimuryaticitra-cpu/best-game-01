// main.ts — the entrypoint of KURA OPS: Arena Tempurung (Node 22, stdlib only).
//
// The game itself is plain static files under game/ (index.html plus its ES
// modules, no library, no network request at all), and this program is the
// courier that hands it to make.fun: it copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
//
// Run it locally like this:
//   MAKEFUN_OUTPUT_DIR=/tmp/kura-arena-out node main.ts
// Inside the grader the output directory is /output, so no variable is needed
// there. Both runs must write byte-identical files; nothing here reads the
// clock, the environment (beyond the output directory), or any randomness.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps, from the bounty rules: the dossier text is capped at
// 163840 bytes; screenshots at most 4 files of 262144 bytes each; game/ at
// most 993 files and 50331648 bytes in all, with no path over 1000 bytes.
// buildDossier refuses a bundle that breaks them, so a bad bundle fails here
// instead of at the scorer.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read a JPEG or PNG header and return its pixel dimensions, or null when the
// bytes are not a picture this checker knows. No dependency, just the headers.
function imageSize(file) {
  const bytes = readFileSync(file);
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
    return null;
  }
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  return null;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// Verify the bundle this run just wrote, and print one summary line. The
// checks mirror the gate so a broken bundle is caught on this machine:
// dossier size and text size, screenshot count/size/dimensions, the dossier's
// per-image sha256 against the file on disk, game/index.html size, game/
// totals. Any failure throws and the run exits non-zero.
function verifyBundle() {
  const dossierPath = join(out, 'dossier.json');
  const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
  const dossierBytes = statSync(dossierPath).size;
  if (dossierBytes > 1572864) throw new Error(`dossier.json too big: ${dossierBytes} bytes (cap 1572864)`);
  const dossierText = dossier.text ?? '';
  if (Buffer.byteLength(dossierText, 'utf8') > 163840) {
    throw new Error(`dossier text too big: ${Buffer.byteLength(dossierText, 'utf8')} bytes (cap 163840)`);
  }
  const shotDir = join(out, 'screenshots');
  const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((name) => !name.startsWith('.')).sort() : [];
  if (shots.length < 3 || shots.length > 4) throw new Error(`screenshots: ${shots.length} files (need 3-4)`);
  let shotsBytes = 0;
  for (const name of shots) {
    const file = join(shotDir, name);
    const size = statSync(file).size;
    if (size > 262144) throw new Error(`screenshot ${name} too big: ${size} bytes (cap 262144)`);
    const dims = imageSize(file);
    if (!dims) throw new Error(`screenshot ${name}: could not read dimensions`);
    if (Math.max(dims.width, dims.height) > 1280 || Math.min(dims.width, dims.height) < 480) {
      throw new Error(`screenshot ${name}: ${dims.width}x${dims.height} (long side <= 1280, short side >= 480)`);
    }
    shotsBytes += size;
    const record = (dossier.images ?? []).find((image) => image.name === name);
    if (!record) throw new Error(`screenshot ${name}: no dossier record`);
    if (record.sha256 !== sha256(file)) throw new Error(`screenshot ${name}: dossier sha256 mismatch`);
  }
  // The dossier's image order is the cover order: the first screenshot by
  // name must be the cover the judge sees first.
  const dossierOrder = (dossier.images ?? []).map((image) => image.name);
  if (JSON.stringify(dossierOrder) !== JSON.stringify(shots)) {
    throw new Error(`dossier image order ${dossierOrder} != screenshot order ${shots}`);
  }
  if (dossier.cover !== 0) throw new Error(`dossier cover is ${dossier.cover}, expected 0 (first screenshot)`);
  const indexPath = join(out, 'game', 'index.html');
  if (statSync(indexPath).size > 1048576) throw new Error('game/index.html over 1 MiB');
  let gameFiles = 0;
  let gameBytes = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        gameFiles += 1;
        gameBytes += statSync(path).size;
      }
    }
  };
  walk(join(out, 'game'));
  if (gameFiles > 993) throw new Error(`game/ has ${gameFiles} files (cap 993)`);
  if (gameBytes > 50331648) throw new Error(`game/ is ${gameBytes} bytes (cap 50331648)`);
  console.log(
    `KURA OPS Arena Tempurung bundle OK: dossier ${dossierBytes} bytes (text ${Buffer.byteLength(dossierText, 'utf8')}), ` +
    `${shots.length} screenshot(s) ${shotsBytes} bytes, game/ ${gameFiles} files ${gameBytes} bytes`,
  );
}

verifyBundle();

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
await initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
const fontPath = process.env.SVG_ACCEPTANCE_FONT ?? [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  'C:/Windows/Fonts/arial.ttf',
].find(existsSync);
if (!fontPath) { throw new Error('Set SVG_ACCEPTANCE_FONT to a local TTF file for text rendering'); }
const directory = mkdtempSync(join(tmpdir(), 'svg-render-'));
try {
  const result = spawnSync(process.execPath, [join(root, 'dist/Main.js')], {
    cwd: directory, input: readFileSync(join(root, 'examples/final-flowchart.commands'), 'utf8'),
    encoding: 'utf8', timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const svg = readFileSync(join(directory, 'final-flowchart.svg'), 'utf8');
  const destination = join(root, 'doc/acceptance');
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'flowchart.svg'), svg);
  writeFileSync(join(destination, 'flowchart.transcript.txt'), result.stdout);
  const renderer = new Resvg(svg, { background: 'white', font: { fontBuffers: [readFileSync(fontPath)], defaultFontFamily: 'Arial', defaultFontSize: 16 } });
  const rendered = renderer.render();
  assert.equal(rendered.width, 800);
  assert.equal(rendered.height, 260);
  writeFileSync(join(destination, 'flowchart.png'), rendered.asPng());
  rendered.free();
  renderer.free();
  console.log('Offline SVG rendering complete: doc/acceptance/flowchart.png (800x260)');
} finally { rmSync(directory, { recursive: true, force: true }); }

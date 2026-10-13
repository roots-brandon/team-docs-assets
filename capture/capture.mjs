// Capture annotated screenshots for queue rows with status=todo, then commit + push and
// print id -> raw URL pinned to the commit SHA.
//   node capture/capture.mjs [--only <id>] [--headed] [--no-push]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILE_DIR, GITHUB_REPO, DOC_FOLDER, VIEWPORT, SCALE } from './config.mjs';
import { recipes } from './recipes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const PAD = 12;
const ARROW_LEN = 72;

// Things that must never appear in a public image: account, avatar, doc title, sharing.
const REDACT = [
  '.docs-title-outer', '.docs-title-input', '#docs-title-widget',
  '[aria-label^="Google Account"]', 'a[href*="accounts.google.com"]', '.gb_d', '.gb_A',
  '#docs-titlebar-share-client-button', '.docs-presence-plus-widget',
  '.docs-presence-plus-collab-widget-container', '#docs-folder', '.docs-star-container',
];

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

function union(boxes, pad) {
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
  const x1 = Math.min(VIEWPORT.width, Math.max(...boxes.map((b) => b.x + b.width)) + pad);
  const y1 = Math.min(VIEWPORT.height, Math.max(...boxes.map((b) => b.y + b.height)) + pad);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

const intersects = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function annotate(page, boxes, arrowBox) {
  await page.evaluate(({ boxes, arrowBox }) => {
    const layer = document.createElement('div');
    layer.id = '__tda_annot';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    for (const b of boxes) {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${b.x - 3}px;top:${b.y - 3}px;` +
        `width:${b.width + 6}px;height:${b.height + 6}px;` +
        'border:3px solid #e53935;border-radius:5px;box-sizing:border-box';
      layer.appendChild(d);
    }
    if (arrowBox) {
      // Arrow pointing left at the target, drawn just to its right.
      const y = arrowBox.y + arrowBox.height / 2;
      const x = arrowBox.x + arrowBox.width + 6;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '60');
      svg.setAttribute('height', '24');
      svg.style.cssText = `position:fixed;left:${x}px;top:${y - 12}px;overflow:visible`;
      // Docs enforces Trusted Types, so no innerHTML: build the paths as elements.
      const shaft = { d: 'M58 12 H14', stroke: '#e53935', 'stroke-width': '4', 'stroke-linecap': 'round' };
      const head = { d: 'M2 12 L18 3 L18 21 Z', fill: '#e53935' };
      for (const attrs of [shaft, head]) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
        svg.appendChild(p);
      }
      layer.appendChild(svg);
    }
    document.body.appendChild(layer);
  }, { boxes, arrowBox });
}

// Hide identifying chrome; report which selectors would have been inside the crop.
async function redact(page, crop) {
  const leaks = [];
  for (const sel of REDACT) {
    for (const el of await page.locator(sel).all()) {
      const b = await el.boundingBox().catch(() => null);
      if (b && b.width && b.height && intersects(b, crop)) leaks.push(sel);
    }
  }
  await page.addStyleTag({ content: `${REDACT.join(',')}{visibility:hidden!important}` });
  return [...new Set(leaks)];
}

async function captureRow(ctx, row) {
  const recipe = recipes[row.id];
  if (!recipe) throw new Error(`No recipe for "${row.id}" in capture/recipes.mjs`);
  const page = ctx.pages()[0] ?? await ctx.newPage();
  await page.goto(row.start_url, { waitUntil: 'domcontentloaded' });
  if (/accounts\.google\.com/.test(page.url())) {
    throw new Error('Not signed in (redirected to accounts.google.com). Run: npm run login');
  }
  await page.locator('#docs-menubar').waitFor({ timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.keyboard.press('Escape'); // dismiss any promo bubble

  await recipe.steps(page);
  await page.waitForTimeout(400); // let menu animation settle

  const hlBoxes = [];
  for (const l of recipe.highlight(page)) hlBoxes.push(await l.boundingBox());
  if (hlBoxes.some((b) => !b)) throw new Error(`Highlight target not visible for ${row.id}`);
  const cropBoxes = [];
  for (const l of recipe.crop(page)) cropBoxes.push(await l.boundingBox());
  const arrowBox = recipe.arrowTo != null ? hlBoxes[recipe.arrowTo] : null;
  if (arrowBox) cropBoxes.push({ ...arrowBox, width: arrowBox.width + ARROW_LEN });
  const crop = union([...cropBoxes, ...hlBoxes], PAD);

  const leaks = await redact(page, crop);
  await annotate(page, hlBoxes, arrowBox);

  const rel = `${DOC_FOLDER}/${row.id}.png`;
  await page.screenshot({ path: path.join(ROOT, rel), clip: crop, animations: 'disabled' });
  await page.evaluate(() => document.getElementById('__tda_annot')?.remove());
  await page.keyboard.press('Escape');
  const size = `${Math.round(crop.width * SCALE)}x${Math.round(crop.height * SCALE)}`;
  return { id: row.id, rel, leaks, size };
}

const queue = JSON.parse(fs.readFileSync(path.join(ROOT, 'capture/queue.json'), 'utf8'));
const rows = queue.filter((r) => (only ? r.id === only : r.status === 'todo'));
if (!rows.length) {
  console.log('Nothing to capture.');
  process.exit(0);
}

// Chrome locks the profile while it runs; a leftover `npm run login` window makes launch fail.
try {
  fs.rmSync(path.join(PROFILE_DIR, 'lockfile'));
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error('The capture profile is in use. Close the Chrome window from `npm run login` and retry.');
    process.exit(1);
  }
}

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: 'chrome',
  headless: !flag('--headed'),
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  locale: 'en-US',
  colorScheme: 'light',
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});
const results = [];
try {
  for (const row of rows) {
    const r = await captureRow(ctx, row);
    const note = r.leaks.length ? `  [hidden inside crop: ${r.leaks.join(', ')}]` : '';
    console.log(`captured ${r.rel} (${r.size})${note}`);
    results.push(r);
  }
} finally {
  await ctx.close();
}

if (flag('--no-push')) {
  console.log('--no-push: skipping commit/push');
  process.exit(0);
}

git('add', ...results.map((r) => r.rel));
if (git('diff', '--cached', '--name-only')) {
  git('commit', '-m', `${DOC_FOLDER}: capture ${results.map((r) => r.id).join(', ')}`);
}
git('push', 'origin', 'HEAD');
const sha = git('rev-parse', 'HEAD');

const table = results.map((r) => ({
  id: r.id,
  url: `https://raw.githubusercontent.com/${GITHUB_REPO}/${sha}/${r.rel}`,
  alt_text: rows.find((x) => x.id === r.id).alt_text,
}));
fs.mkdirSync(path.join(ROOT, 'capture/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'capture/out/last-run.json'), JSON.stringify({ sha, images: table }, null, 2));
console.log('\n| id | raw URL |\n|---|---|');
for (const t of table) console.log(`| ${t.id} | ${t.url} |`);

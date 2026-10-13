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
const PAD = 8;
const MASK_FALLBACK = '#f9fbfd'; // Docs' chrome background, if the menu bar's can't be read
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

// Locators become their box plus corner radius (so masks follow rounded dialogs); boxes pass through.
async function toBox(t) {
  t = await t;
  if (typeof t.boundingBox !== 'function') return { r: 0, ...t };
  const r = await t.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
  return { ...(await t.boundingBox()), r };
}

const roundedRect = ({ x, y, width: w, height: h, r }) =>
  `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} ` +
  `A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
  `V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;

// Paint everything except the focus boxes with plain background; shadow the surfaces.
async function mask(page, keep, shadowed, override) {
  const holes = keep.map(roundedRect).join(' ');
  await page.evaluate(({ holes, shadowed, fallback, override }) => {
    // Match the menu bar's actual background so kept strips have no visible seam.
    let color = override ?? fallback;
    for (let el = document.getElementById('docs-menubar'); !override && el; el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) { color = bg; break; }
    }
    const { innerWidth: w, innerHeight: h } = window;
    const layer = document.createElement('div');
    layer.id = '__tda_mask';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646';
    const cover = document.createElement('div');
    cover.style.cssText = `position:fixed;inset:0;background:${color};` +
      `clip-path:path(evenodd,"M0 0 H${w} V${h} H0 Z ${holes}")`;
    layer.appendChild(cover);
    for (const b of shadowed) {
      // Outer box-shadow only paints outside the box, so the surface itself stays untouched.
      const s = document.createElement('div');
      s.style.cssText = `position:fixed;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;` +
        `border-radius:${b.r || 4}px;box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)`;
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
  }, { holes, shadowed, fallback: MASK_FALLBACK, override });
}

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
async function redact(page, crop, allow = []) {
  const list = REDACT.filter((s) => !allow.includes(s));
  const leaks = [];
  for (const sel of list) {
    for (const el of await page.locator(sel).all()) {
      const b = await el.boundingBox().catch(() => null);
      if (b && b.width && b.height && intersects(b, crop)) leaks.push(sel);
    }
  }
  await page.addStyleTag({ content: `${list.join(',')}{visibility:hidden!important}` });
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
  await page.locator(recipe.readySelector ?? '#docs-menubar').first().waitFor({ timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.keyboard.press('Escape'); // dismiss any promo bubble

  await recipe.steps(page);
  await page.waitForTimeout(400); // let menu animation settle

  // Recipes may return locators or plain boxes, synchronously or not.
  const boxesOf = async (fn) => Promise.all((await fn(page)).map((t) => toBox(t).catch(() => null)));
  const hlBoxes = await boxesOf(recipe.highlight);
  const missing = hlBoxes.flatMap((b, i) => (b?.width ? [] : [i]));
  if (missing.length) throw new Error(`Highlight target(s) ${missing.join(', ')} not visible for ${row.id}`);
  const cropBoxes = await boxesOf(recipe.crop);
  const arrowBox = recipe.arrowTo != null ? hlBoxes[recipe.arrowTo] : null;
  if (arrowBox) cropBoxes.push({ ...arrowBox, width: arrowBox.width + ARROW_LEN });
  const crop = union([...cropBoxes, ...hlBoxes], recipe.pad ?? PAD);

  const leaks = await redact(page, crop, recipe.allowRedact);
  if (recipe.focus) {
    const keep = await Promise.all((await recipe.focus(page)).map(toBox));
    await mask(page, keep, (recipe.shadowOn ?? []).map((i) => keep[i]), recipe.maskColor);
  }
  await annotate(page, hlBoxes, arrowBox);
  if (recipe.beforeShot) await recipe.beforeShot(page);

  const rel = `${DOC_FOLDER}/${row.id}.png`;
  await page.screenshot({ path: path.join(ROOT, rel), clip: crop, animations: 'disabled' });
  await page.evaluate(() => ['__tda_annot', '__tda_mask'].forEach((id) => document.getElementById(id)?.remove()));
  // Leave the doc as found: recipes that change settings must close without saving.
  await (recipe.cleanup ? recipe.cleanup(page) : page.keyboard.press('Escape'));
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

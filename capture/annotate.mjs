// Annotate an existing screenshot (for pages we can't drive with Playwright, e.g. claude.ai
// artifacts captured through Claude in Chrome). Renders the PNG on a local page, draws
// outlines and an optional caption band, and saves a new PNG. Never loads a remote page.
//   node capture/annotate.mjs <spec.json>
// spec: { in, out, boxes: [{x,y,w,h,n?}] (image px), caption?, theme?: "roots" | "google" }
// A box with `n` also gets a numbered marker at its top-left corner, for figures that are
// explained by a numbered key in the doc text (labels would cover the content).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const THEMES = {
  // Roots & Leaves: forest ink on cream, lavender page, no shadows, Arial for UI text.
  roots: { line: '#2f4b35', width: 4, radius: 16, band: '#2f4b35', bandText: '#fbf5e9', page: '#e6d9ee' },
  google: { line: '#e53935', width: 3, radius: 6, band: '#202124', bandText: '#ffffff', page: '#ffffff' },
};

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const t = THEMES[spec.theme ?? 'roots'];
const png = fs.readFileSync(spec.in);
const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
const band = spec.caption ? 64 : 0;

// Marker position: `at` = "tl" (default, over the top-left corner), "tr", or "l" (left, centred).
const markerAt = (b) => {
  const at = b.at ?? 'tl';
  if (at === 'tr') return { x: b.x + b.w - 12, y: Math.max(0, b.y - 18) };
  if (at === 'l') return { x: Math.max(0, b.x - 40), y: b.y + b.h / 2 - 15 };
  if (at === 'r') return { x: b.x + b.w + 10, y: b.y + b.h / 2 - 15 };
  return { x: Math.max(0, b.x - 18), y: Math.max(0, b.y - 18) };
};
const outlines = (spec.boxes ?? []).map((b) =>
  `<div style="position:absolute;left:${b.x - t.width}px;top:${b.y - t.width}px;width:${b.w + 2 * t.width}px;` +
  `height:${b.h + 2 * t.width}px;border:${t.width}px solid ${t.line};border-radius:${t.radius}px;box-sizing:border-box"></div>` +
  (b.n == null ? '' : `<div style="position:absolute;left:${markerAt(b).x}px;top:${markerAt(b).y}px;width:30px;` +
    `height:30px;border-radius:50%;background:${t.line};color:${t.bandText};font:700 17px/30px Arial, sans-serif;` +
    `text-align:center">${b.n}</div>`)).join('');
const caption = spec.caption
  ? `<div style="min-height:${band}px;box-sizing:border-box;background:${t.band};color:${t.bandText};` +
    `font:600 24px/1.3 Arial, sans-serif;display:flex;align-items:center;padding:14px 24px">` +
    `${spec.caption.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</div>`
  : '';
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${t.page}">
<div id="shot" style="width:${w}px"><div style="position:relative;width:${w}px;height:${h}px">
<img src="${pathToFileURL(path.resolve(spec.in)).href}" style="display:block;width:${w}px;height:${h}px">${outlines}</div>${caption}</div>`;

const tmp = path.join(path.dirname(path.resolve(spec.out)), `.annotate-${process.pid}.html`);
fs.writeFileSync(tmp, html);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  // Extra height so a caption that wraps to two lines still fits; the element shot trims it.
  const page = await browser.newPage({ viewport: { width: w, height: h + band + 200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href);
  const shot = page.locator('#shot');
  await shot.screenshot({ path: spec.out });
  const size = await shot.boundingBox();
  console.log(`annotated ${spec.out} (${w}x${Math.round(size.height)})`);
} finally {
  await browser.close();
  fs.rmSync(tmp, { force: true });
}

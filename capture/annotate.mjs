// Annotate an existing screenshot (for pages we can't drive with Playwright, e.g. claude.ai
// artifacts captured through Claude in Chrome). Renders the PNG on a local page, draws
// outlines and an optional caption band, and saves a new PNG. Never loads a remote page.
//   node capture/annotate.mjs <spec.json>
// spec: { in, out, scale?, boxes: [{x,y,w,h}] (image px), caption?, theme?: "roots" | "google" }
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

const outlines = (spec.boxes ?? []).map((b) =>
  `<div style="position:absolute;left:${b.x - t.width}px;top:${b.y - t.width}px;width:${b.w + 2 * t.width}px;` +
  `height:${b.h + 2 * t.width}px;border:${t.width}px solid ${t.line};border-radius:${t.radius}px;box-sizing:border-box"></div>`).join('');
const caption = spec.caption
  ? `<div style="height:${band}px;background:${t.band};color:${t.bandText};font:600 24px/1 Arial, sans-serif;` +
    `display:flex;align-items:center;padding:0 24px">${spec.caption.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</div>`
  : '';
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${t.page}">
<div id="shot" style="width:${w}px"><div style="position:relative;width:${w}px;height:${h}px">
<img src="${pathToFileURL(path.resolve(spec.in)).href}" style="display:block;width:${w}px;height:${h}px">${outlines}</div>${caption}</div>`;

const tmp = path.join(path.dirname(path.resolve(spec.out)), `.annotate-${process.pid}.html`);
fs.writeFileSync(tmp, html);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: w, height: h + band }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href);
  await page.locator('#shot').screenshot({ path: spec.out });
  console.log(`annotated ${spec.out} (${w}x${h + band})`);
} finally {
  await browser.close();
  fs.rmSync(tmp, { force: true });
}

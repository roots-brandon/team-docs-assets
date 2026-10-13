// Name the current version of the doc. Usage: node capture/_name.mjs "<name>" <outdir>
import { chromium } from 'playwright';
import { PROFILE_DIR } from './config.mjs';
const [name, out] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true, viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: ['--enable-automation'], args: ['--disable-blink-features=AutomationControlled'] });
ctx.setDefaultTimeout(10000);
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://docs.google.com/document/d/1sfr1OJLvi4PDzKdEStJvWiX4uhxo1Z8B_PCkoe2dSA4/edit?tab=t.0');
await page.locator('#docs-menubar').waitFor({ timeout: 30000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.keyboard.press('Escape');
await page.locator('#docs-file-menu').click();
await page.locator('.goog-menu-vertical:visible .goog-menuitem', { hasText: 'Version history' }).first().hover();
await page.locator('.goog-menu-vertical:visible .goog-menuitem', { hasText: 'Name current version' }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: out + '/name-dialog.png' });
const dlg = page.locator('[role="dialog"]:visible, .docs-material-gm-dialog:visible').last();
await dlg.locator('input[type="text"], input:not([type]), textarea').first().fill(name);
await page.waitForTimeout(300);
await dlg.getByRole('button', { name: /^(Save|Name)$/ }).click();
await page.waitForTimeout(3000);
// Confirm in the panel.
await page.keyboard.press('Control+Alt+Shift+H');
await page.getByText('Highlight changes').waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);
console.log('NAMED?', await page.getByText(name, { exact: true }).count());
await page.screenshot({ path: out + '/after-name.png' });
await ctx.close();

// How to perform each queue row. The queue's "steps"/"highlight" columns are human text;
// each id needs a recipe here that turns them into actions.
//   steps(page)      -> leave the UI in the state to capture
//   highlight(page)  -> locators to outline in red
//   crop(page)       -> locators whose union (plus padding) is the screenshot
//   arrowTo          -> optional index into highlight() to point an arrow at
//   focus(page)      -> optional locators/boxes to keep; everything else in the crop is
//                       painted plain background (hides doc text, stray toolbar slivers)
//   shadowOn         -> indices into focus() that get a drop shadow (menus, dialogs)
//   maskColor        -> optional background for the mask (default: the menu bar's color)
//   cleanup(page)    -> optional; undo the UI state without saving (default: Escape)
//   pad              -> optional crop padding in CSS px (default 8)

const openMenu = async (page, menuId) => {
  await page.locator(`#${menuId}`).click();
  await page.locator('.goog-menu-vertical:visible').first().waitFor();
};
const openMenuPanel = (page) => page.locator('.goog-menu-vertical:visible').first();
const menuItem = (page, text) =>
  openMenuPanel(page).locator('.goog-menuitem', { hasText: text }).first();

// The menu-bar row from a given menu button to the window's right edge, so earlier menus
// don't show at the left and the row's background runs unbroken to the crop edge.
const menubarFrom = async (page, menuId) => {
  const btn = await page.locator(`#${menuId}`).boundingBox();
  const bar = await page.locator('#docs-menubar').boundingBox();
  const right = page.viewportSize().width;
  return { x: btn.x, y: bar.y, width: right - btn.x, height: bar.height };
};

const VIEWPORT_SAFE_Y = 790; // bottom-left corner: no hover targets there in Docs

const notificationsDialog = (page) => page.locator('.docs-material-gm-dialog:visible').first();
// Radio rows by group (0 = Comments, 1 = Edits) and label, e.g. ('Edits', 'None').
const GROUPS = { Comments: 0, Edits: 1 };
const notificationOption = (page, group, label) =>
  notificationsDialog(page).getByRole('radiogroup').nth(GROUPS[group])
    .getByRole('radio').filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) });

// File > Version history: the File menu and its submenu (open menus stack in DOM order).
const fileMenuPanel = (page) => page.locator('.goog-menu-vertical:visible').first();
const versionSubmenu = (page) =>
  page.locator('.goog-menu-vertical:visible', { hasText: 'See version history' }).last();

// Version history view. Panel elements have no stable ids, so steps() tags the ones we
// outline with data-tda attributes.
const tagged = (page, name) => page.locator(`[data-tda="${name}"]`);
const editsCounter = async (page) => {
  const parts = [page.getByText(/^Total: \d+ edits?$/).first(),
    page.getByRole('button', { name: /^Previous edit/ }).first(),
    page.getByRole('button', { name: /^Next edit/ }).first()];
  const b = await Promise.all(parts.map((p) => p.boundingBox()));
  const x0 = Math.min(...b.map((r) => r.x)), y0 = Math.min(...b.map((r) => r.y));
  const x1 = Math.max(...b.map((r) => r.x + r.width)), y1 = Math.max(...b.map((r) => r.y + r.height));
  return { x: x0 - 4, y: y0, width: x1 - x0 + 8, height: y1 - y0 };
};

// Replace editor names everywhere on the page (panel rows, in-doc name flags) with a
// neutral label. Names are read from the page at runtime, so none are stored in this repo.
const scrubEditorNames = (page, label = 'Team member') => page.evaluate((label) => {
  const names = new Set([...document.querySelectorAll('.appsDocsRevisionsWizSidebarAuthorInfo')]
    .map((e) => e.innerText.trim()).filter(Boolean));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (names.has(n.nodeValue.trim())) n.nodeValue = label;
  }
  return [...names].length;
}, label);

export const recipes = {
  'notifications-menu': {
    steps: (page) => openMenu(page, 'docs-tools-menu'),
    highlight: (page) => [page.locator('#docs-tools-menu'), menuItem(page, 'Notification settings')],
    crop: (page) => [page.locator('#docs-tools-menu'), openMenuPanel(page)],
    arrowTo: 1,
    focus: async (page) => [await menubarFrom(page, 'docs-tools-menu'), openMenuPanel(page)],
    shadowOn: [1],
  },

  // The dialog with the doc's recommended settings selected ("How we use it").
  // Selections are never saved: cleanup clicks Cancel.
  'notifications-dialog': {
    steps: async (page) => {
      await openMenu(page, 'docs-tools-menu');
      await menuItem(page, 'Notification settings').click();
      await notificationsDialog(page).waitFor();
      await notificationOption(page, 'Comments', 'Comments and tasks for you').click();
      await notificationOption(page, 'Edits', 'Added or removed content').click();
      // Drop hover/focus rings so the selected rows look like a normal open dialog.
      await page.mouse.move(5, VIEWPORT_SAFE_Y);
      await page.evaluate(() => document.activeElement?.blur());
    },
    highlight: (page) => [
      notificationOption(page, 'Comments', 'Comments and tasks for you'),
      notificationOption(page, 'Edits', 'Added or removed content'),
    ],
    crop: (page) => [notificationsDialog(page)],
    focus: (page) => [notificationsDialog(page)],
    shadowOn: [0],
    maskColor: '#ffffff',
    pad: 16, // room for the dialog's shadow
    cleanup: (page) => notificationsDialog(page).getByRole('button', { name: 'Cancel' }).click(),
  },

  'version-history-menu': {
    steps: async (page) => {
      await openMenu(page, 'docs-file-menu');
      await fileMenuPanel(page).locator('.goog-menuitem', { hasText: 'Version history' }).first().hover();
      await versionSubmenu(page).waitFor();
    },
    highlight: (page) => [
      page.locator('#docs-file-menu'),
      fileMenuPanel(page).locator('.goog-menuitem', { hasText: 'Version history' }).first(),
      versionSubmenu(page).locator('.goog-menuitem', { hasText: 'See version history' }).first(),
    ],
    crop: (page) => [page.locator('#docs-file-menu'), fileMenuPanel(page), versionSubmenu(page)],
    arrowTo: 2,
    focus: async (page) => [await menubarFrom(page, 'docs-file-menu'), fileMenuPanel(page), versionSubmenu(page)],
    shadowOn: [1, 2],
  },

  // This doc's own history: newest version selected, Highlight changes on, scrolled to the
  // first change. Editor names are scrubbed before the shot.
  'version-history-panel': {
    steps: async (page) => {
      await page.keyboard.press('Control+Alt+Shift+H');
      await page.getByText('Highlight changes').waitFor({ timeout: 20000 });
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /^Next edit/ }).first().click();
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        // The selected version tile: climb from its author row to the full-width card.
        let el = document.querySelector('.appsDocsRevisionsWizSidebarAuthorInfo');
        while (el && el.getBoundingClientRect().width < 280) el = el.parentElement;
        el?.setAttribute('data-tda', 'tile');
        const label = [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === 'Highlight changes');
        label?.parentElement?.setAttribute('data-tda', 'highlight-toggle');
      });
      await scrubEditorNames(page);
      await page.mouse.move(640, 790);
    },
    highlight: (page) => [tagged(page, 'tile'), tagged(page, 'highlight-toggle'), editsCounter(page)],
    crop: (page) => [{ x: 0, y: 0, ...page.viewportSize() }],
    pad: 0,
    cleanup: (page) => page.getByRole('button', { name: 'Back' }).first().click(),
  },
};

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
//   beforeShot(page) -> optional last check right before the screenshot; throw to abort
//   allowRedact      -> REDACT selectors this shot may show (e.g. the title of THIS public
//                       training doc when the lesson is about the title bar)
//   readySelector    -> what to wait for after load (default: the Docs menu bar)
//   viewport         -> optional { width, height } for this shot (default config VIEWPORT)

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

const DOC_TITLE = 'Google Docs Basics'; // the public training doc these screenshots document
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
  // Reads "Total: N edits" until you step through them, then "Edit 1 of N".
  const parts = [page.getByText(/Total: \d+ edits?|Edit \d+ of \d+/).first(),
    page.getByRole('button', { name: /^Previous edit/ }).first(),
    page.getByRole('button', { name: /^Next edit/ }).first()];
  const b = await Promise.all(parts.map((p) => p.boundingBox()));
  const x0 = Math.min(...b.map((r) => r.x)), y0 = Math.min(...b.map((r) => r.y));
  const x1 = Math.max(...b.map((r) => r.x + r.width)), y1 = Math.max(...b.map((r) => r.y + r.height));
  return { x: x0 - 4, y: y0, width: x1 - x0 + 8, height: y1 - y0 };
};

// Checkbox plus its label; the label's text overflows its own box, so pad the right side.
const highlightToggle = async (page) => {
  const box = await page.getByRole('checkbox', { name: 'Highlight changes' }).first().boundingBox();
  const label = await page.getByText('Highlight changes', { exact: true }).first().boundingBox();
  const x1 = Math.max(box.x + box.width, label.x + label.width) + 12;
  const y0 = Math.min(box.y, label.y), y1 = Math.max(box.y + box.height, label.y + label.height);
  return { x: box.x - 6, y: y0 - 4, width: x1 - box.x + 6, height: y1 - y0 + 8 };
};

// Replace editor names everywhere on the page (panel rows, in-doc name flags) with a
// neutral label. Names are read from the page at runtime, so none are stored in this repo.
// Docs renders name flags lazily while scrolling, so a MutationObserver keeps scrubbing,
// and assertNoEditorNames() refuses the shot if anything slipped through.
const scrubEditorNames = (page, label = 'Team member') => page.evaluate((label) => {
  const names = new Set([...document.querySelectorAll('.appsDocsRevisionsWizSidebarAuthorInfo')]
    .map((e) => e.innerText.trim()).filter((n) => n && n !== label));
  window.__tdaNames = [...names];
  const scrub = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (names.has(n.nodeValue.trim())) n.nodeValue = label;
    }
  };
  scrub(document.body);
  new MutationObserver((muts) => muts.forEach((m) => scrub(m.target.nodeType === 3 ? m.target.parentNode : m.target)))
    .observe(document.body, { subtree: true, childList: true, characterData: true });
}, label);

const assertNoEditorNames = async (page) => {
  const hits = await page.evaluate(() => (window.__tdaNames ?? [])
    .filter((n) => document.body.innerText.includes(n)).length);
  if (hits) throw new Error(`${hits} editor name(s) still visible; refusing to capture`);
};

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

  // The left panel with this doc's tab expanded into its heading outline.
  'outline-panel': {
    viewport: { width: 1280, height: 1150 },
    steps: async (page) => {
      const firstLesson = page.getByText('Doc outline', { exact: true }).first();
      if (!(await firstLesson.isVisible().catch(() => false))) {
        await page.getByText('Lessons', { exact: true }).first().click();
      }
      await firstLesson.waitFor();
      await page.mouse.move(640, 1100);
      await page.waitForTimeout(800);
      // Tag the whole tab "pill" (the label alone is narrower than the highlighted row).
      await page.getByText('Lessons', { exact: true }).first().evaluate((el) => {
        while (el && el.getBoundingClientRect().width < 200) el = el.parentElement;
        el?.setAttribute('data-tda', 'tab-pill');
      });
    },
    highlight: (page) => [tagged(page, 'tab-pill')],
    // Full sidebar width: from the window edge to just past the pill.
    crop: async (page) => {
      const pill = await tagged(page, 'tab-pill').boundingBox();
      const top = await page.getByText('Document tabs', { exact: true }).first().boundingBox();
      const bottom = await page.getByText('Screenshot queue', { exact: true }).first().boundingBox();
      return [{ x: 0, y: top.y, width: pill.x + pill.width + 8, height: bottom.y + bottom.height - top.y }];
    },
    pad: 14,
  },

  // The ☆ next to the title. Shows the title of this (public) training doc only; account
  // chrome on the right stays outside the crop. No hover tooltip: it fades out once the
  // mask is drawn and leaves a half-painted bubble.
  'star-button': {
    steps: (page) => page.mouse.move(5, 790),
    highlight: (page) => [page.locator('.docs-star-container').first()],
    crop: (page) => [
      page.locator('#docs-branding-container, .docs-branding-container').first(),
      page.locator('#docs-title-widget').first(),
      page.locator('#docs-save-indicator-badge').first(),
      page.locator('#docs-tools-menu'),
    ],
    pad: 14,
    // Keep the title row and the menu bar only up to Tools; mask stray menus and toolbar.
    focus: async (page) => {
      const box = (sel) => page.locator(sel).first().boundingBox();
      const [brand, save, bar, tools] = await Promise.all(['#docs-branding-container, .docs-branding-container',
        '#docs-save-indicator-badge', '#docs-menubar', '#docs-tools-menu'].map(box));
      const left = brand.x - 14;
      return [
        // Everything above the menu bar (logo, title, title icons), then the bar up to Tools.
        { x: left, y: 0, width: save.x + save.width + 14 - left, height: bar.y },
        { x: left, y: bar.y, width: tools.x + tools.width - left, height: bar.height },
      ];
    },
    allowRedact: ['.docs-title-outer', '.docs-title-input', '#docs-title-widget', '.docs-star-container', '#docs-folder'],
  },

  // Drive > Starred with only this doc showing. The test account has other (private) files
  // starred; they are hidden before the shot and beforeShot refuses if any name is visible.
  // Assumes this doc is already starred for the test account (done once, by hand/script).
  'drive-starred': {
    readySelector: '[role="gridcell"][data-id]',
    steps: async (page) => {
      await page.waitForTimeout(2500);
      const kept = await page.evaluate((keep) => {
        const cells = [...document.querySelectorAll('[role="gridcell"][data-id]')];
        window.__tdaHidden = [];
        for (const c of cells) {
          const name = (c.innerText || '').split('\n')[0].trim();
          if (name === keep) { c.setAttribute('data-tda', 'this-doc'); continue; }
          window.__tdaHidden.push(name);
          c.style.setProperty('display', 'none', 'important');
        }
        return cells.length - window.__tdaHidden.length;
      }, DOC_TITLE);
      if (kept !== 1) throw new Error(`expected this doc once in Starred, found ${kept}`);
      await page.mouse.move(640, 790);
      await page.waitForTimeout(800);
    },
    highlight: (page) => [page.getByRole('treeitem', { name: 'Starred' }).or(page.getByRole('link', { name: 'Starred' })).first(), tagged(page, 'this-doc')],
    crop: (page) => [page.getByRole('button', { name: /^New/ }).first(), page.getByRole('heading', { name: 'Starred' }).first(), tagged(page, 'this-doc')],
    pad: 12,
    beforeShot: async (page) => {
      const leaked = await page.evaluate(() => (window.__tdaHidden ?? []).filter((n) => n && document.body.innerText.includes(n)).length);
      if (leaked) throw new Error(`${leaked} other starred file name(s) still visible; refusing to capture`);
    },
    cleanup: async () => {},
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
      // Next edit lands the change near the bottom; bring the changed section into the frame.
      await page.mouse.move(620, 450);
      await page.mouse.wheel(0, 1030);
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        // The selected version tile: climb from its author row to the card that also holds
        // the version's date (the author row alone is one line tall).
        let el = document.querySelector('.appsDocsRevisionsWizSidebarAuthorInfo');
        while (el && el.getBoundingClientRect().height < 70) el = el.parentElement;
        el?.setAttribute('data-tda', 'tile');
      });
      await scrubEditorNames(page);
      await page.mouse.move(640, 790);
    },
    highlight: (page) => [tagged(page, 'tile'), highlightToggle(page), editsCounter(page)],
    crop: (page) => [{ x: 0, y: 0, ...page.viewportSize() }],
    pad: 0,
    beforeShot: async (page) => {
      await page.waitForTimeout(1500); // let lazily drawn name flags appear (and get scrubbed)
      await assertNoEditorNames(page);
    },
    cleanup: (page) => page.getByRole('button', { name: 'Back' }).first().click(),
  },
};

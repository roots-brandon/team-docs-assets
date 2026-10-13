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

const notificationsDialog =(page) => page.locator('.docs-material-gm-dialog:visible').first();
// Radio rows by group (0 = Comments, 1 = Edits) and label, e.g. ('Edits', 'None').
const GROUPS = { Comments: 0, Edits: 1 };
const notificationOption = (page, group, label) =>
  notificationsDialog(page).getByRole('radiogroup').nth(GROUPS[group])
    .getByRole('radio').filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) });

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
};

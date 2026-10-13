// How to perform each queue row. The queue's "steps"/"highlight" columns are human text;
// each id needs a recipe here that turns them into actions.
//   steps(page)      -> leave the UI in the state to capture
//   highlight(page)  -> locators to outline in red
//   crop(page)       -> locators whose union (plus padding) is the screenshot
//   arrowTo          -> optional index into highlight() to point an arrow at
//   focus(page)      -> optional locators/boxes to keep; everything else in the crop is
//                       painted plain background (hides doc text, stray toolbar slivers)
//   shadowOn         -> indices into focus() that get a drop shadow (menus, dialogs)

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

export const recipes = {
  'notifications-menu': {
    steps: (page) => openMenu(page, 'docs-tools-menu'),
    highlight: (page) => [page.locator('#docs-tools-menu'), menuItem(page, 'Notification settings')],
    crop: (page) => [page.locator('#docs-tools-menu'), openMenuPanel(page)],
    arrowTo: 1,
    focus: async (page) => [await menubarFrom(page, 'docs-tools-menu'), openMenuPanel(page)],
    shadowOn: [1],
  },
};

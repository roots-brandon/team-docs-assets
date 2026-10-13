// How to perform each queue row. The queue's "steps"/"highlight" columns are human text;
// each id needs a recipe here that turns them into actions.
//   steps(page)      -> leave the UI in the state to capture
//   highlight(page)  -> locators to outline in red
//   crop(page)       -> locators whose union (plus padding) is the screenshot
//   arrowTo          -> optional index into highlight() to point an arrow at

const openMenu = async (page, menuId) => {
  await page.locator(`#${menuId}`).click();
  await page.locator('.goog-menu-vertical:visible').first().waitFor();
};
const openMenuPanel = (page) => page.locator('.goog-menu-vertical:visible').first();
const menuItem = (page, text) =>
  openMenuPanel(page).locator('.goog-menuitem', { hasText: text }).first();

export const recipes = {
  'notifications-menu': {
    steps: (page) => openMenu(page, 'docs-tools-menu'),
    highlight: (page) => [page.locator('#docs-tools-menu'), menuItem(page, 'Notification settings')],
    crop: (page) => [page.locator('#docs-tools-menu'), openMenuPanel(page)],
    arrowTo: 1,
  },
};

import { test, expect } from '@playwright/test';
import translations from '../client/i18n/locales/english/translations.json';

test.describe('Side Panel Outline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      '/learn/full-stack-developer/review-css-libraries-and-frameworks/review-css-libraries-and-frameworks'
    );
  });
  test('should open outline panel and show headings', async ({ page }) => {
    const toggle = page.getByRole('button', {
      name: translations.aria['open-content-outline-panel']
    });
    await expect(toggle).toBeVisible();

    // Open the panel
    await toggle.click();

    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();

    const outlineLists = panel.getByRole('list');
    const listCount = await outlineLists.count();
    expect(listCount).toBeGreaterThan(0);

    const listItems = outlineLists.first().getByRole('listitem');
    const listItemCount = await listItems.count();
    expect(listItemCount).toBeGreaterThan(0);
  });

  test('should close panel on Escape and return focus to toggle', async ({
    page
  }) => {
    const toggle = page.getByRole('button', {
      name: translations.aria['open-content-outline-panel']
    });
    await toggle.click();

    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await expect(panel).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(panel).not.toBeVisible();
    await expect(toggle).toBeFocused();
  });
});

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
    await expect(toggle).toHaveAttribute('aria-controls', 'side-panel-outline');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Open the panel
    await toggle.click();

    const panel = page.getByRole('complementary');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveId('side-panel-outline');

    const outlineLists = panel.getByRole('list');
    const listCount = await outlineLists.count();
    expect(listCount).toBeGreaterThan(0);

    // Count links in the panel
    const links = panel.getByRole('link');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);

    // Count headings inside the rendered description section
    const headings = page
      .locator('section#description')
      .locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    expect(headingCount).toBe(linkCount);

    // Each link's href should match the corresponding heading id
    for (let i = 0; i < linkCount; i++) {
      const href = await links.nth(i).getAttribute('href');
      const headingId = await headings.nth(i).getAttribute('id');
      expect(href).toBeTruthy();
      expect(headingId).toBeTruthy();
      expect(href).toBe(`#${headingId}`);
    }

    // Click the last link in the panel
    await links.last().click();

    // The corresponding heading should now be focused
    const href = await links.last().getAttribute('href');
    const headingId = href!.replace('#', '');

    await expect(page.locator(`#${headingId}`)).toBeFocused();
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
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });
});

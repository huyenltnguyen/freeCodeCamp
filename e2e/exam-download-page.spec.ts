import { test, expect } from '@playwright/test';
import translations from '../client/i18n/locales/english/translations.json';

const examDownloadUrl =
  '/learn/back-end-development-and-apis/exam-back-end-development-and-apis-certification/exam-back-end-development-and-apis-certification';

test.describe('Exam Download Page E2E Test Suite', () => {
  test.describe('Authenticated User Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(examDownloadUrl);
    });

    test('should render the page with correct title', async ({ page }) => {
      await expect(page).toHaveTitle(
        /Back End Development and APIs Certification Exam.*freeCodeCamp\.org/
      );
    });

    test('should display the challenge title', async ({ page }) => {
      const header = page.getByTestId('challenge-title');
      await expect(header).toBeVisible();
      await expect(header).toContainText(
        'Back End Development and APIs Certification Exam'
      );
    });

    test('should display the download header', async ({ page }) => {
      await expect(
        page.getByRole('heading', {
          name: translations.exam['download-header']
        })
      ).toBeVisible();
    });

    test('should display the exam explanation text', async ({ page }) => {
      await expect(page.getByText(translations.exam.explanation)).toBeVisible();
    });

    test('should display the version information', async ({ page }) => {
      // The version text should be visible, though the actual version is fetched dynamically
      await expect(
        page.getByText(/The latest version of our app is:/)
      ).toBeVisible();
    });

    test('should display the "Open Exam Environment Application" button', async ({
      page
    }) => {
      const openAppButton = page.getByRole('link', {
        name: translations.exam['open-exam-application']
      });
      await expect(openAppButton).toBeVisible();
      await expect(openAppButton).toHaveAttribute(
        'href',
        'exam-environment://'
      );
    });

    test('should display the download button when OS is detected', async ({
      page
    }) => {
      // Wait for the GitHub API call to complete
      await page.waitForTimeout(1000);

      // Either the download button or the unable to detect OS message should be visible
      const downloadButton = page.getByRole('link', {
        name: translations.buttons['download-latest-version']
      });
      const unableToDetect = page.getByText(
        translations.exam['unable-to-detect-os']
      );

      const isDownloadVisible = await downloadButton.isVisible();
      const isUnableVisible = await unableToDetect.isVisible();

      expect(isDownloadVisible || isUnableVisible).toBeTruthy();
    });

    test('should display the "Manually download the app" dropdown', async ({
      page
    }) => {
      const dropdown = page.getByRole('button', {
        name: translations.exam['download-details']
      });
      await expect(dropdown).toBeVisible();
    });

    test('should show download links when dropdown is clicked', async ({
      page
    }) => {
      // Wait for the GitHub API call to complete
      await page.waitForTimeout(1000);

      const dropdown = page.getByRole('button', {
        name: translations.exam['download-details']
      });
      await dropdown.click();

      // Check if dropdown menu items are visible
      // The specific items depend on the GitHub releases, so we just check if the menu opened
      const dropdownMenu = page.locator('.dropdown-menu');
      await expect(dropdownMenu).toBeVisible();
    });

    test('should display support contact information', async ({ page }) => {
      await expect(
        page.getByText(translations.exam['download-trouble'])
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'support@freecodecamp.org' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'support@freecodecamp.org' })
      ).toHaveAttribute('href', 'mailto: support@freecodecamp.org');
    });

    test('should display "Attempts" section for signed-in users', async ({
      page
    }) => {
      await expect(
        page.getByRole('heading', { name: translations.exam.attempts })
      ).toBeVisible();
    });

    test('should display exam token controls for signed-in users', async ({
      page
    }) => {
      await expect(
        page.getByRole('heading', {
          name: translations['exam-token']['exam-token']
        })
      ).toBeVisible();
    });

    test('should display qualified or not qualified message', async ({
      page
    }) => {
      // Either qualified or not-qualified message should be visible
      const qualifiedMessage = page.getByText(
        translations.learn.exam.qualified
      );
      const notQualifiedMessage = page.getByText(
        translations.learn.exam['not-qualified']
      );

      const isQualifiedVisible = await qualifiedMessage.isVisible();
      const isNotQualifiedVisible = await notQualifiedMessage.isVisible();

      expect(isQualifiedVisible || isNotQualifiedVisible).toBeTruthy();
    });
  });

  test.describe('Unauthenticated User Tests', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }) => {
      await page.goto(examDownloadUrl);
    });

    test('should render the page for unauthenticated users', async ({
      page
    }) => {
      await expect(page).toHaveTitle(
        /Back End Development and APIs Certification Exam.*freeCodeCamp\.org/
      );
    });

    test('should not display "Attempts" section for unauthenticated users', async ({
      page
    }) => {
      await expect(
        page.getByRole('heading', { name: translations.exam.attempts })
      ).not.toBeVisible();
    });

    test('should not display exam token controls for unauthenticated users', async ({
      page
    }) => {
      await expect(
        page.getByRole('heading', {
          name: translations['exam-token']['exam-token']
        })
      ).not.toBeVisible();
    });

    test('should still display download buttons for unauthenticated users', async ({
      page
    }) => {
      const openAppButton = page.getByRole('link', {
        name: translations.exam['open-exam-application']
      });
      await expect(openAppButton).toBeVisible();
    });

    test('should still display support information for unauthenticated users', async ({
      page
    }) => {
      await expect(
        page.getByText(translations.exam['download-trouble'])
      ).toBeVisible();
    });
  });

  test.describe('GitHub API Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(examDownloadUrl);
    });

    test('should fetch and display version information from GitHub API', async ({
      page
    }) => {
      // Wait for the GitHub API response
      await page.waitForResponse(
        response =>
          response
            .url()
            .includes(
              'api.github.com/repos/freeCodeCamp/exam-env/releases/latest'
            ) && response.status() === 200
      );

      // Version should be displayed (not just "...")
      const versionText = await page
        .getByText(/The latest version of our app is:/)
        .textContent();
      expect(versionText).not.toContain('...');
    });

    test('should populate download links from GitHub releases', async ({
      page
    }) => {
      // Wait for the GitHub API call to complete
      await page.waitForTimeout(1000);

      const dropdown = page.getByRole('button', {
        name: translations.exam['download-details']
      });
      await dropdown.click();

      // Check if there are download links (excluding .sig and .json files)
      const menuItems = page.locator('.dropdown-menu a');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Layout Tests', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(examDownloadUrl);

      await expect(
        page.getByRole('heading', {
          name: translations.exam['download-header']
        })
      ).toBeVisible();

      const openAppButton = page.getByRole('link', {
        name: translations.exam['open-exam-application']
      });
      await expect(openAppButton).toBeVisible();
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(examDownloadUrl);

      await expect(
        page.getByRole('heading', {
          name: translations.exam['download-header']
        })
      ).toBeVisible();
    });
  });
});

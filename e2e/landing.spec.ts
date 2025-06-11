import { expect, Page, test } from '@playwright/test';
import intro from '../client/i18n/locales/english/intro.json';
import translations from '../client/i18n/locales/english/translations.json';
import { SuperBlocks } from '../shared/config/curriculum';
import { addGrowthbookCookie } from './utils/add-growthbook-cookie';

const landingPageElements = {
  heading: 'landing-header',
  callToAction: 'landing-big-cta',
  certifications: 'certifications',
  curriculumBtns: 'curriculum-map-button',
  testimonials: 'testimonial-card',
  landingPageImage: 'landing-page-figure',
  faq: 'landing-page-faq',
  jobs: 'More than <strong>100,000</strong> freeCodeCamp.org graduates have gotten <strong>jobs</strong> at tech companies including:'
} as const;

const superBlocks = [
  intro[SuperBlocks.FullStackDeveloper].title,
  intro[SuperBlocks.A2English].title,
  intro[SuperBlocks.B1English].title,
  intro[SuperBlocks.TheOdinProject].title,
  intro[SuperBlocks.CodingInterviewPrep].title,
  intro[SuperBlocks.ProjectEuler].title,
  intro[SuperBlocks.RosettaCode].title,
  intro[SuperBlocks.RespWebDesignNew].title,
  intro[SuperBlocks.JsAlgoDataStructNew].title,
  intro[SuperBlocks.FrontEndDevLibs].title,
  intro[SuperBlocks.DataVis].title,
  intro[SuperBlocks.RelationalDb].title,
  intro[SuperBlocks.BackEndDevApis].title,
  intro[SuperBlocks.QualityAssurance].title,
  intro[SuperBlocks.SciCompPy].title,
  intro[SuperBlocks.DataAnalysisPy].title,
  intro[SuperBlocks.InfoSec].title,
  intro[SuperBlocks.MachineLearningPy].title,
  intro[SuperBlocks.CollegeAlgebraPy].title,
  intro[SuperBlocks.RespWebDesign].title,
  intro[SuperBlocks.JsAlgoDataStruct].title,
  intro[SuperBlocks.PythonForEverybody].title,
  intro[SuperBlocks.FoundationalCSharp].title
];

async function goToLandingPage(page: Page) {
  await page.goto('/');
}

test.describe('Landing Top - Variation B', () => {
  test.beforeEach(async ({ context, page }) => {
    await addGrowthbookCookie({ context, variation: 'B' });
    await goToLandingPage(page);
  });

  test('should render all main elements correctly', async ({ page }) => {
    // Main heading
    const bigHeading = page.getByTestId('big-heading-1-b');
    await expect(bigHeading).toHaveText(
      translations.landing['big-heading-1-b']
    );

    // Supporting copy
    const advanceCareer = page.getByTestId('advance-career');
    await expect(advanceCareer).toHaveText(
      translations.landing['advance-career']
    );

    // Logo row
    const landingH2Heading = page.getByTestId('graduates-work');
    await expect(landingH2Heading).toHaveText(
      translations.landing['graduates-work'].replace(/<\/?strong>/g, '')
    );
  });
});

test.describe('Landing Top - Variation A', () => {
  test.beforeEach(async ({ context, page }) => {
    await addGrowthbookCookie({ context, variation: 'newA' });
    await goToLandingPage(page);
  });

  test('should render all main headings and logo row correctly', async ({
    page
  }) => {
    // Headings
    const landingHeading1 = page.getByTestId('landing-big-heading-1');
    await expect(landingHeading1).toHaveText(
      translations.landing['big-heading-1']
    );

    const landingHeading2 = page.getByTestId('landing-big-heading-2');
    await expect(landingHeading2).toHaveText(
      translations.landing['big-heading-2']
    );

    const landingHeading3 = page.getByTestId('landing-big-heading-3');
    await expect(landingHeading3).toHaveText(
      translations.landing['big-heading-3']
    );

    // Logo row
    const landingH2Heading = page.getByTestId('h2-heading');
    await expect(landingH2Heading).toHaveText(
      translations.landing['h2-heading'].replace(/<\/?strong>/g, '')
    );
  });
});

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await goToLandingPage(page);
  });

  test('Desktop - should render all elements correctly', async ({
    context,
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'This test only runs on desktop');

    // Why learn with freeCodeCamp
    await addGrowthbookCookie({ context, variation: 'C' });
    await goToLandingPage(page);
    const h2Element = page.locator(
      `h2:has-text("${translations.landing.benefits['heading']}")`
    );
    await expect(h2Element).toBeVisible();

    // CTA buttons
    const ctas = page.getByRole('link', {
      name: translations.buttons['logged-in-cta-btn']
    });
    await expect(ctas).toHaveCount(4);
    for (const cta of await ctas.all()) {
      await expect(cta).toBeVisible();
    }

    // Hero image and description (desktop)
    const campersImage = page.getByAltText(
      translations.landing['hero-img-alt']
    );
    const captionText = page.getByText(
      translations.landing['hero-img-description']
    );
    await expect(campersImage).toBeVisible();
    await expect(captionText).toBeVisible();

    // Brand logos
    const logos = page.getByTestId('brand-logo-container').locator('svg');
    await expect(logos).toHaveCount(5);
    for (const logo of await logos.all()) {
      await expect(logo).toBeVisible();
    }

    // Campers landing page figure
    const landingPageImage = page.getByTestId('landing-page-figure');
    await expect(landingPageImage).toBeVisible();

    // Testimonial section header
    const testimonialsHeader = page.getByTestId('testimonials-section-header');
    await expect(testimonialsHeader).toHaveText(
      translations.landing.testimonials['heading']
    );

    // Testimonial cards
    const cards = page.getByTestId('testimonial-card');
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
      await expect(
        card.getByTestId('testimonials-endorser-image-container')
      ).toBeVisible();
      await expect(
        card.getByTestId('testimonials-endorser-location')
      ).toBeVisible();
      await expect(
        card.getByTestId('testimonials-endorser-occupation')
      ).toBeVisible();
      await expect(
        card.getByTestId('testimonials-endorser-testimony')
      ).toBeVisible();
    }

    // Curriculum buttons
    const curriculumBtns = page.getByTestId(landingPageElements.curriculumBtns);
    await expect(curriculumBtns).toHaveCount(superBlocks.length);
    for (let index = 0; index < superBlocks.length; index++) {
      const btn = curriculumBtns.nth(index);
      const link = btn.getByRole('link', { name: superBlocks[index] });
      await expect(link).toBeVisible();
    }

    // FAQ section
    const faqs = page.getByTestId(landingPageElements.faq);
    await expect(faqs).toHaveCount(9);
  });

  test('Mobile - should render all elements correctly', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'This test only runs on mobile');

    // Hero image and description (mobile)
    const campersImage = page.getByAltText(
      translations.landing['hero-img-alt']
    );
    const captionText = page.getByText(
      translations.landing['hero-img-description']
    );
    await expect(campersImage).toBeHidden();
    await expect(captionText).toBeHidden();

    // Campers landing page figure
    const landingPageImage = page.getByTestId('landing-page-figure');
    await expect(landingPageImage).toBeHidden();
  });
});

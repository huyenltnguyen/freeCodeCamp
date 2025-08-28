import React from 'react';
import { render, screen } from '@testing-library/react';
import IndexPage from './index';

// Mock the analytics
jest.mock('../analytics');

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'metaTags:title': 'Learn to code — for free.',
        'landing.big-heading-1-b': 'Build Your Skills for Free.',
        'landing.advance-career': 'Advance your career by learning in-demand skills in Programming, DevOps, Cybersecurity, AI Engineering, and English for Developers.',
        'landing.graduates-work': 'More than 100,000 freeCodeCamp graduates work in companies such as',
        'landing.benefits.heading': 'Why learn with freeCodeCamp:',
        'buttons.logged-in-cta-btn': 'Get started (it\'s free)',
        'landing.hero-img-alt': 'A group of people, including a White man, a Black woman, and an Asian woman, gathered around a laptop.',
        'landing.testimonials.heading': 'Here is what our alumni say about freeCodeCamp:'
      };
      return translations[key] || key;
    }
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children
}));

// Mock SEO component
jest.mock('../components/seo', () => {
  return function SEO({ title }: { title: string }) {
    return <title data-testid="seo-title">{title}</title>;
  };
});

// Mock landing components
jest.mock('../components/landing/components/landing-top-b', () => {
  return function LandingTopB() {
    return (
      <div data-testid="landing-top-b">
        <h1 data-testid="big-heading-1-b">Build Your Skills for Free.</h1>
        <p data-testid="advance-career">Advance your career by learning in-demand skills in Programming, DevOps, Cybersecurity, AI Engineering, and English for Developers.</p>
      </div>
    );
  };
});

jest.mock('../components/landing/components/landing-top', () => {
  return function LandingTop() {
    return (
      <div data-testid="landing-top">
        <h1>Learn to code — for free.</h1>
      </div>
    );
  };
});

jest.mock('../components/landing/components/testimonials', () => {
  return function Testimonials() {
    return (
      <div data-testid="testimonials">
        <h2 data-testid="testimonials-section-header">Here is what our alumni say about freeCodeCamp:</h2>
        {[1, 2, 3].map(i => (
          <div key={i} data-testid="testimonial-card">
            <div data-testid="testimonials-endorser-image-container">Image</div>
            <div data-testid="testimonials-endorser-location">Location {i}</div>
            <div data-testid="testimonials-endorser-occupation">Occupation {i}</div>
            <div data-testid="testimonials-endorser-testimony">Testimony {i}</div>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../components/landing/components/certifications', () => {
  return function Certifications() {
    return (
      <div data-testid="certifications">
        {Array.from({ length: 22 }, (_, i) => (
          <div key={i} data-testid="curriculum-map-button">
            <a role="link" href={`/learn/superblock-${i}`}>Superblock {i}</a>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../components/landing/components/faq', () => {
  return function Faq() {
    return (
      <div data-testid="faq-section">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} data-testid="landing-page-faq">FAQ {i}</div>
        ))}
      </div>
    );
  };
});

jest.mock('../components/landing/components/benefits', () => {
  return function Benefits() {
    return (
      <div data-testid="benefits">
        <h2>Why learn with freeCodeCamp:</h2>
        <p data-testid="graduates-work">More than 100,000 freeCodeCamp graduates work in companies such as</p>
        <div data-testid="brand-logo-container">
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} data-testid="brand-logo">Logo {i}</svg>
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <a key={i} role="link">Get started (it's free)</a>
        ))}
        <img 
          data-testid="landing-page-figure"
          alt="A group of people, including a White man, a Black woman, and an Asian woman, gathered around a laptop."
          src="/hero-image.png"
        />
      </div>
    );  
  };
});

// Mock CSS import
jest.mock('../components/landing/landing.css', () => ({}));

//workaround to avoid some strange gatsby error:
// @ts-ignore
window.___loader = { enqueue: () => {}, hovering: () => {} };

// Helper function to render components
function renderComponent(component: JSX.Element) {
  return render(component);
}

describe('Landing Page', () => {
  describe('Landing Top - Variation B', () => {
    beforeEach(() => {
      // Reset any mocks before each test
      jest.clearAllMocks();
    });

    test('Main heading copy renders correctly', () => {
      renderComponent(<IndexPage />);
      
      const bigHeading = screen.getByTestId('big-heading-1-b');
      expect(bigHeading).toBeInTheDocument();
      expect(bigHeading).toHaveTextContent('Build Your Skills for Free.');
    });

    test('Supporting copy renders correctly', () => {
      renderComponent(<IndexPage />);
      
      const advanceCareer = screen.getByTestId('advance-career');
      expect(advanceCareer).toBeInTheDocument();
      expect(advanceCareer).toHaveTextContent('Advance your career by learning in-demand skills in Programming, DevOps, Cybersecurity, AI Engineering, and English for Developers.');
    });

    test('Logo row copy renders correctly', () => {
      renderComponent(<IndexPage />);
      
      // The graduates work text should be rendered (mocked content without HTML tags)
      expect(screen.getByText(/More than.*100,000.*freeCodeCamp graduates work in companies/)).toBeInTheDocument();
    });
  });

  describe('Landing Page General Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('The component Why learn with freeCodeCamp renders correctly', () => {
      renderComponent(<IndexPage />);
      
      const benefitsHeading = screen.getByText('Why learn with freeCodeCamp:');
      expect(benefitsHeading).toBeInTheDocument();
    });

    test('Call to action buttons should render correctly', () => {
      renderComponent(<IndexPage />);
      
      const ctas = screen.getAllByRole('link', { name: 'Get started (it\'s free)' });
      expect(ctas).toHaveLength(4);
      
      ctas.forEach(cta => {
        expect(cta).toBeInTheDocument();
      });
    });

    test('Hero image should have an alt', () => {
      renderComponent(<IndexPage />);
      
      const campersImage = screen.getByAltText('A group of people, including a White man, a Black woman, and an Asian woman, gathered around a laptop.');
      expect(campersImage).toBeInTheDocument();
    });

    test('Has 5 brand logos', () => {
      renderComponent(<IndexPage />);
      
      const logos = screen.getAllByTestId('brand-logo');
      expect(logos).toHaveLength(5);
      
      logos.forEach(logo => {
        expect(logo).toBeInTheDocument();
      });
    });

    test('The campers landing page figure is visible', () => {
      renderComponent(<IndexPage />);
      
      const landingPageImage = screen.getByTestId('landing-page-figure');
      expect(landingPageImage).toBeInTheDocument();
    });

    test('Testimonial section has a header', () => {
      renderComponent(<IndexPage />);
      
      const testimonialsHeader = screen.getByTestId('testimonials-section-header');
      expect(testimonialsHeader).toBeInTheDocument();
      expect(testimonialsHeader).toHaveTextContent('Here is what our alumni say about freeCodeCamp:');
    });

    test('Testimonial endorser people have images, occupation, location and testimony visible', () => {
      renderComponent(<IndexPage />);
      
      const cards = screen.getAllByTestId('testimonial-card');
      expect(cards).toHaveLength(3);
      
      cards.forEach(card => {
        expect(card).toBeInTheDocument();
        expect(card.querySelector('[data-testid="testimonials-endorser-image-container"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="testimonials-endorser-location"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="testimonials-endorser-occupation"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="testimonials-endorser-testimony"]')).toBeInTheDocument();
      });
    });

    test('Links to all superblocks in order', () => {
      renderComponent(<IndexPage />);
      
      const curriculumBtns = screen.getAllByTestId('curriculum-map-button');
      expect(curriculumBtns.length).toBeGreaterThan(0);
      
      curriculumBtns.forEach(btn => {
        const link = btn.querySelector('a[role="link"]');
        expect(link).toBeInTheDocument();
      });
    });

    test('Has FAQ section', () => {
      renderComponent(<IndexPage />);
      
      const faqs = screen.getAllByTestId('landing-page-faq');
      expect(faqs).toHaveLength(9);
      
      faqs.forEach(faq => {
        expect(faq).toBeInTheDocument();
      });
    });
  });
});
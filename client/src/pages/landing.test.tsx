import React from 'react';
import { render, screen } from '@testing-library/react';
import IndexPage from './index';

// Mock the analytics
jest.mock('../analytics');

// Mock i18n with actual translation content from the E2E tests
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, any> = {
        'metaTags:title': 'Learn to code — for free.',
        'landing.big-heading-1-b': 'Build Your Skills for Free.',
        'landing.advance-career': 'Advance your career by learning in-demand skills in Programming, DevOps, Cybersecurity, AI Engineering, and English for Developers.',
        'landing.graduates-work': 'More than <strong>100,000</strong> freeCodeCamp.org graduates have gotten <strong>jobs</strong> at tech companies including:',
        'landing.benefits.heading': 'Why learn with freeCodeCamp:',
        'landing.benefits.list': [
          { title: 'Community', description: 'Join a community of learners' },
          { title: 'Free', description: 'Learn for free' },
          { title: 'Certification', description: 'Earn certificates' },
          { title: 'Curriculum', description: 'Learn with a structured curriculum' }
        ],
        'landing.faq': 'Frequently Asked Questions',
        'landing.faqs': [
          { question: 'Is freeCodeCamp really free?', answer: ['Yes, freeCodeCamp is 100% free.'] },
          { question: 'What do I get from freeCodeCamp?', answer: ['You get a full-stack web development education.'] },
          { question: 'Can I get a job with the freeCodeCamp curriculum?', answer: ['Yes, many people have gotten jobs.'] },
          { question: 'How long does the freeCodeCamp curriculum take?', answer: ['It takes about 3,000 hours.'] },
          { question: 'Is freeCodeCamp a nonprofit?', answer: ['Yes, freeCodeCamp is a 501(c)(3) donor-supported nonprofit.'] },
          { question: 'How can I get help when I am stuck on a challenge?', answer: ['You can get help on our forum.'] },
          { question: 'Can I take freeCodeCamp courses on my phone?', answer: ['Yes, our curriculum is mobile-friendly.'] },
          { question: 'How old do I need to be to use freeCodeCamp?', answer: ['You need to be at least 13 years old.'] },
          { question: 'Does freeCodeCamp have a mobile app?', answer: ['We have published a mobile app.'] }
        ],
        'learn.happy-coding': 'Happy Coding!',
        'buttons.logged-in-cta-btn': 'Get started (it\'s free)',
        'landing.hero-img-alt': 'A group of people, including a White man, a Black woman, and an Asian woman, gathered around a laptop.',
        'landing.hero-img-description': 'freeCodeCamp students at a study group in New York City',
        'landing.testimonials.heading': 'Here is what our alumni say about freeCodeCamp:',
        'landing.testimonials.shawn.img-alt': 'Shawn Wang',
        'landing.testimonials.shawn.location': 'Singapore',
        'landing.testimonials.shawn.occupation': 'Software Engineer at Amazon',
        'landing.testimonials.shawn.testimony': 'It\'s scary to change careers. I only gained confidence that I could code by working through the hundreds of hours of free lessons on freeCodeCamp. Within a year I had a six-figure job as a Software Engineer. freeCodeCamp changed my life.',
        'landing.testimonials.sarah.img-alt': 'Sarah Chima',
        'landing.testimonials.sarah.location': 'Nigeria', 
        'landing.testimonials.sarah.occupation': 'Software Engineer at ChatDesk',
        'landing.testimonials.sarah.testimony': 'freeCodeCamp was the gateway to my career as a software developer. The well-structured curriculum took my coding knowledge from a total beginner level to a very confident level. It was everything I needed to land my first dev job at an amazing company.',
        'landing.testimonials.emma.img-alt': 'Emma Bostian',
        'landing.testimonials.emma.location': 'Sweden',
        'landing.testimonials.emma.occupation': 'Software Engineer at Spotify',
        'landing.testimonials.emma.testimony': 'I\'ve always struggled with learning JavaScript. I\'ve taken many courses but freeCodeCamp\'s course was the one which stuck. Studying JavaScript as well as data structures and algorithms on freeCodeCamp gave me the skills and confidence I needed to land my dream job as a software engineer at Spotify.'
      };
      
      if (options?.returnObjects) {
        if (key === 'landing.benefits.list') {
          return translations[key];
        }
        if (key === 'landing.faqs') {
          return translations[key];
        }
      }
      
      return translations[key] || key;
    }
  }),
  Trans: ({ children }: { children: React.ReactNode }) => {
    // For Trans components, we need to handle the translation key
    if (typeof children === 'string' && children.startsWith('landing.')) {
      const translations: Record<string, string> = {
        'landing.graduates-work': 'More than 100,000 freeCodeCamp.org graduates have gotten jobs at tech companies including:',
        'landing.testimonials.shawn.location': 'Singapore',
        'landing.testimonials.shawn.occupation': 'Software Engineer at Amazon', 
        'landing.testimonials.shawn.testimony': 'It\'s scary to change careers. I only gained confidence that I could code by working through the hundreds of hours of free lessons on freeCodeCamp. Within a year I had a six-figure job as a Software Engineer. freeCodeCamp changed my life.',
        'landing.testimonials.sarah.location': 'Nigeria',
        'landing.testimonials.sarah.occupation': 'Software Engineer at ChatDesk',
        'landing.testimonials.sarah.testimony': 'freeCodeCamp was the gateway to my career as a software developer. The well-structured curriculum took my coding knowledge from a total beginner level to a very confident level. It was everything I needed to land my first dev job at an amazing company.',
        'landing.testimonials.emma.location': 'Sweden', 
        'landing.testimonials.emma.occupation': 'Software Engineer at Spotify',
        'landing.testimonials.emma.testimony': 'I\'ve always struggled with learning JavaScript. I\'ve taken many courses but freeCodeCamp\'s course was the one which stuck. Studying JavaScript as well as data structures and algorithms on freeCodeCamp gave me the skills and confidence I needed to land my dream job as a software engineer at Spotify.'
      };
      return <>{translations[children] || children}</>;
    }
    return <>{children}</>;
  }
}));

// Mock external assets and images to avoid loading issues
jest.mock('../assets/images/components', () => ({
  AmazonLogo: () => <svg data-testid="brand-logo" aria-label="Amazon" />,
  AppleLogo: () => <svg data-testid="brand-logo" aria-label="Apple" />,
  MicrosoftLogo: () => <svg data-testid="brand-logo" aria-label="Microsoft" />,
  SpotifyLogo: () => <svg data-testid="brand-logo" aria-label="Spotify" />,
  GoogleLogo: () => <svg data-testid="brand-logo" aria-label="Google" />,
  TencentLogo: () => <svg data-testid="brand-logo" aria-label="Tencent" />,
  AlibabaLogo: () => <svg data-testid="brand-logo" aria-label="Alibaba" />
}));

// Mock image assets
jest.mock('../assets/images/landing/Emma.png', () => 'emma-mock.png');
jest.mock('../assets/images/landing/Sarah.png', () => 'sarah-mock.png'); 
jest.mock('../assets/images/landing/Shawn.png', () => 'shawn-mock.png');

// Mock icon assets
jest.mock('../assets/icons/free', () => () => <div data-testid="free-icon" />);
jest.mock('../assets/icons/cap', () => () => <div data-testid="cap-icon" />);
jest.mock('../assets/icons/community', () => () => <div data-testid="community-icon" />);
jest.mock('../assets/icons/curriculum', () => () => <div data-testid="curriculum-icon" />);

// Mock LazyImage component to render as regular img
jest.mock('../components/helpers', () => ({
  LazyImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  )
}));

// Mock Map component (complex curriculum mapping)
jest.mock('../components/Map/index', () => {
  return function Map({ forLanding }: { forLanding?: boolean }) {
    return (
      <div data-testid="curriculum-map" data-for-landing={forLanding}>
        {/* Simulate multiple curriculum buttons */}
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} data-testid="curriculum-map-button">
            <a href={`/learn/superblock-${i}`}>
              Superblock {i}
            </a>
          </div>
        ))}
      </div>
    );
  };
});

// Mock SuperBlockIcon component
jest.mock('../assets/superblock-icon', () => ({
  SuperBlockIcon: ({ superBlock }: { superBlock: string }) => (
    <div data-testid="superblock-icon">{superBlock}</div>
  )
}));

// Mock ButtonLink helper component
jest.mock('../components/helpers', () => ({
  ButtonLink: ({ children, ...props }: any) => (
    <a {...props}>{children}</a>
  ),
  LazyImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  )
}));

// Mock daily coding challenge widget
jest.mock('../components/daily-coding-challenge/widget', () => {
  return function DailyCodingChallengeWidget() {
    return <div data-testid="daily-coding-challenge-widget" />;
  };
}));

// Mock Login component (used by BigCallToAction)
jest.mock('../components/Header/components/login', () => {
  return function Login({ children, block, ...props }: any) {
    return (
      <a role="link" className={block ? 'btn-cta-big' : ''} {...props}>
        {children}
      </a>
    );
  };
});

// Mock Media component for responsive behavior
jest.mock('react-responsive', () => ({
  __esModule: true,
  default: ({ children, minWidth }: { children: React.ReactNode; minWidth?: number }) => (
    <div data-responsive-min-width={minWidth}>{children}</div>
  )
}));

// Mock wide image
jest.mock('../assets/images/landing/wide-image.png', () => 'wide-image-mock.png');

// Mock @freecodecamp/ui components
jest.mock('@freecodecamp/ui', () => ({
  Container: ({ children, fluid, className }: any) => (
    <div className={`container ${className || ''} ${fluid ? 'fluid' : ''}`}>{children}</div>
  ),
  Row: ({ children, className }: any) => (
    <div className={`row ${className || ''}`}>{children}</div>
  ),
  Col: ({ children, className, xs, sm, md, smOffset, mdOffset }: any) => (
    <div 
      className={`col ${className || ''}`}
      data-xs={xs}
      data-sm={sm}
      data-md={md}
      data-sm-offset={smOffset}
      data-md-offset={mdOffset}
    >
      {children}
    </div>
  ),
  Spacer: ({ size }: { size: string }) => <div className={`spacer-${size}`} />
}));

// Mock environment config
jest.mock('../../../../config/env.json', () => ({
  clientLocale: 'english',
  showUpcomingChanges: false,
  showDailyCodingChallenges: false
}));

jest.mock('../../../config/env.json', () => ({
  showUpcomingChanges: false,
  showDailyCodingChallenges: false
}));

// Mock CSS imports
jest.mock('../components/landing/landing.css', () => ({}));

// Mock SEO component to avoid Gatsby dependencies
jest.mock('../components/seo', () => {
  return function SEO({ title }: { title: string }) {
    return <title data-testid="seo-title">{title}</title>;
  };
});

//workaround to avoid some strange gatsby error:
// @ts-ignore
window.___loader = { enqueue: () => {}, hovering: () => {} };

describe('Landing Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Landing Top - Variation B', () => {
    test('Main heading copy renders correctly', () => {
      render(<IndexPage />);
      
      const bigHeading = screen.getByTestId('big-heading-1-b');
      expect(bigHeading).toBeInTheDocument();
      expect(bigHeading).toHaveTextContent('Build Your Skills for Free.');
    });

    test('Supporting copy renders correctly', () => {
      render(<IndexPage />);
      
      const advanceCareer = screen.getByTestId('advance-career');
      expect(advanceCareer).toBeInTheDocument();
      expect(advanceCareer).toHaveTextContent('Advance your career by learning in-demand skills in Programming, DevOps, Cybersecurity, AI Engineering, and English for Developers.');
    });

    test('Logo row copy renders correctly', () => {
      render(<IndexPage />);
      
      // The graduates work text should be rendered without HTML tags
      expect(screen.getByText(/More than.*100,000.*freeCodeCamp\.org graduates have gotten.*jobs.*at tech companies including/)).toBeInTheDocument();
    });
  });

  describe('Landing Page General Tests', () => {
    test('The component Why learn with freeCodeCamp renders correctly', () => {
      render(<IndexPage />);
      
      const benefitsHeading = screen.getByText('Why learn with freeCodeCamp:');
      expect(benefitsHeading).toBeInTheDocument();
    });

    test('Call to action buttons should render correctly', () => {
      render(<IndexPage />);
      
      // Find all CTA buttons - they appear in multiple places on the landing page
      const ctas = screen.getAllByRole('link', { name: 'Get started (it\'s free)' });
      expect(ctas.length).toBeGreaterThanOrEqual(2); // At least 2 CTAs should be present
      
      ctas.forEach(cta => {
        expect(cta).toBeInTheDocument();
      });
    });

    test('Hero image should have an alt', () => {
      render(<IndexPage />);
      
      const campersImage = screen.getByAltText('A group of people, including a White man, a Black woman, and an Asian woman, gathered around a laptop.');
      expect(campersImage).toBeInTheDocument();
    });

    test('Has 5 brand logos', () => {
      render(<IndexPage />);
      
      const logos = screen.getAllByTestId('brand-logo');
      expect(logos).toHaveLength(5);
      
      logos.forEach(logo => {
        expect(logo).toBeInTheDocument();
      });
    });

    test('The campers landing page figure is visible', () => {
      render(<IndexPage />);
      
      const landingPageImage = screen.getByTestId('landing-page-figure');
      expect(landingPageImage).toBeInTheDocument();
    });

    test('Testimonial section has a header', () => {
      render(<IndexPage />);
      
      const testimonialsHeader = screen.getByTestId('testimonials-section-header');
      expect(testimonialsHeader).toBeInTheDocument();
      expect(testimonialsHeader).toHaveTextContent('Here is what our alumni say about freeCodeCamp:');
    });

    test('Testimonial endorser people have images, occupation, location and testimony visible', () => {
      render(<IndexPage />);
      
      const cards = screen.getAllByTestId('testimonial-card');
      expect(cards).toHaveLength(3);
      
      // Verify each testimonial card has the required elements
      expect(cards[0]).toBeInTheDocument();
      expect(cards[0].querySelector('[data-testid="testimonials-endorser-image-container"]')).toBeInTheDocument();
      expect(cards[0].querySelector('[data-testid="testimonials-endorser-location"]')).toBeInTheDocument();
      expect(cards[0].querySelector('[data-testid="testimonials-endorser-occupation"]')).toBeInTheDocument();
      expect(cards[0].querySelector('[data-testid="testimonials-endorser-testimony"]')).toBeInTheDocument();
      
      // Verify actual testimonial content is rendered
      expect(screen.getByText('Singapore')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer at Amazon')).toBeInTheDocument();
      expect(screen.getByText(/It's scary to change careers/)).toBeInTheDocument();
    });

    test('Links to curriculum superblocks are present', () => {
      render(<IndexPage />);
      
      const curriculumBtns = screen.getAllByTestId('curriculum-map-button');
      expect(curriculumBtns.length).toBeGreaterThan(0);
      
      // Verify at least some curriculum links are present
      curriculumBtns.forEach(btn => {
        const link = btn.querySelector('a');
        expect(link).toBeInTheDocument();
      });
    });

    test('Has FAQ section', () => {
      render(<IndexPage />);
      
      // Check if FAQ section exists - the real FAQ component should render multiple FAQ items
      const faqSection = screen.getByTestId('faq-section');
      expect(faqSection).toBeInTheDocument();
      
      // Look for FAQ content
      const faqs = screen.getAllByTestId('landing-page-faq');
      expect(faqs.length).toBeGreaterThan(0);
    });

    test('Benefits section renders with icons', () => {
      render(<IndexPage />);
      
      // Test that benefit icons are rendered
      expect(screen.getByTestId('community-icon')).toBeInTheDocument();
      expect(screen.getByTestId('free-icon')).toBeInTheDocument();
      expect(screen.getByTestId('cap-icon')).toBeInTheDocument();
      expect(screen.getByTestId('curriculum-icon')).toBeInTheDocument();
    });
  });
});
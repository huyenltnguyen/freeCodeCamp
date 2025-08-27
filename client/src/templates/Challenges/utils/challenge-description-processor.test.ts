import {
  processHeadingsForNavigation,
  buildOutline,
  type ProcessedHeading
} from './challenge-description-processor';

describe('processHeadingsForNavigation', () => {
  it('should return empty headings for empty html', () => {
    const result = processHeadingsForNavigation('');
    expect(result.processedHtml).toBe('');
    expect(result.headings).toEqual([]);
  });

  it('should process single heading', () => {
    const html = '<h2>Heading 2</h2>';
    const result = processHeadingsForNavigation(html);
    expect(result.headings).toEqual([
      {
        id: 'heading-2',
        text: 'Heading 2',
        level: 2
      }
    ]);
    expect(result.processedHtml).toContain('id="heading-2"');
  });

  it('should process multiple headings with correct levels and ids', () => {
    const html = '<h1>Heading 1</h1><h3>Heading 3</h3><h2>Heading 2</h2>';
    const result = processHeadingsForNavigation(html);
    expect(result.headings).toEqual([
      { id: 'heading-1', text: 'Heading 1', level: 1 },
      { id: 'heading-3', text: 'Heading 3', level: 3 },
      { id: 'heading-2', text: 'Heading 2', level: 2 }
    ]);
    expect(result.processedHtml).toContain('id="heading-1"');
    expect(result.processedHtml).toContain('id="heading-3"');
    expect(result.processedHtml).toContain('id="heading-2"');
  });

  it('should preserve innerHTML for headings', () => {
    const html = '<h2><code>Fancy</code> Heading</h2>';
    const result = processHeadingsForNavigation(html);
    expect(result.headings).toEqual([
      {
        id: 'fancy-heading',
        text: '<code>Fancy</code> Heading',
        level: 2
      }
    ]);
  });

  it('should handle headings with special characters', () => {
    const html = '<h2>Title! @#%$^&*</h2>';
    const result = processHeadingsForNavigation(html);
    expect(result.headings).toEqual([
      { id: 'title', text: 'Title! @#%$^&amp;*', level: 2 }
    ]);
  });

  it('should add tabindex="-1" to heading elements only', () => {
    const html = '<div><h2>Heading 2</h2><h3>Heading 3</h3></div>';
    const result = processHeadingsForNavigation(html);

    // The wrapper div should not receive tabindex
    expect(result.processedHtml).toContain('<div>');
    expect(result.processedHtml).not.toContain('<div tabindex="-1"');

    // Headings should receive tabindex
    expect(result.processedHtml).toContain('<h2 id="heading-2" tabindex="-1"');
    expect(result.processedHtml).toContain('<h3 id="heading-3" tabindex="-1"');

    expect(result.headings).toEqual([
      { id: 'heading-2', text: 'Heading 2', level: 2 },
      { id: 'heading-3', text: 'Heading 3', level: 3 }
    ]);
  });
});

describe('buildOutline', () => {
  it('should create a flat outline for same-level headings', () => {
    const input: ProcessedHeading[] = [
      { id: 'heading-2-a', text: 'Heading 2 - A', level: 2 },
      { id: 'heading-2-b', text: 'Heading 2 - B', level: 2 },
      { id: 'heading-2-c', text: 'Heading 2 - C', level: 2 }
    ];

    const out = buildOutline(input);
    expect(out).toHaveLength(3);
    expect(out.map(n => n.id)).toEqual([
      'heading-2-a',
      'heading-2-b',
      'heading-2-c'
    ]);
  });

  it('should nest headings correctly when levels increase', () => {
    const input: ProcessedHeading[] = [
      { id: 'heading-2', text: 'Heading 2', level: 2 },
      { id: 'heading-3', text: 'Heading 3', level: 3 },
      { id: 'heading-4', text: 'Heading 4', level: 4 }
    ];

    const out = buildOutline(input);
    expect(out).toHaveLength(1);
    expect(out).toMatchObject([
      {
        id: 'heading-2',
        children: [
          {
            id: 'heading-3',
            children: [
              {
                id: 'heading-4',
                children: []
              }
            ]
          }
        ]
      }
    ]);
  });

  it('should handle decreasing heading levels correctly', () => {
    const input: ProcessedHeading[] = [
      { id: 'heading-2-a', text: 'Heading 2 - A', level: 2 },
      { id: 'heading-3', text: 'Heading 3', level: 3 },
      { id: 'heading-2-b', text: 'Heading 2 - B', level: 2 }
    ];

    const out = buildOutline(input);
    expect(out).toHaveLength(2);
    expect(out).toMatchObject([
      {
        id: 'heading-2-a',
        children: [
          {
            id: 'heading-3',
            children: []
          }
        ]
      },
      {
        id: 'heading-2-b',
        children: []
      }
    ]);
  });
});

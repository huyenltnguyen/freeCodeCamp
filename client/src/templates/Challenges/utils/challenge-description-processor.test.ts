import {
  assignIdToHeadings,
  buildOutline,
  type ProcessedHeading
} from './challenge-description-processor';

describe('assignIdToHeadings', () => {
  it('should return empty headings for empty html', () => {
    const result = assignIdToHeadings('');
    expect(result.processedHtml).toBe('');
    expect(result.headings).toEqual([]);
  });

  it('should process single heading', () => {
    const html = '<h2>Section Title</h2>';
    const result = assignIdToHeadings(html);
    expect(result.headings).toEqual([
      {
        id: 'section-title',
        text: 'Section Title',
        level: 2
      }
    ]);
    expect(result.processedHtml).toContain('id="section-title"');
  });

  it('should process multiple headings with correct levels and ids', () => {
    const html = '<h1>Main</h1><h3>Sub</h3><h2>Another</h2>';
    const result = assignIdToHeadings(html);
    expect(result.headings).toEqual([
      { id: 'main', text: 'Main', level: 1 },
      { id: 'sub', text: 'Sub', level: 3 },
      { id: 'another', text: 'Another', level: 2 }
    ]);
    expect(result.processedHtml).toContain('id="main"');
    expect(result.processedHtml).toContain('id="sub"');
    expect(result.processedHtml).toContain('id="another"');
  });

  it('should preserve innerHTML for headings', () => {
    const html = '<h2><code>Fancy</code> Heading</h2>';
    const result = assignIdToHeadings(html);
    expect(result.headings[0].text).toBe('<code>Fancy</code> Heading');
  });

  it('should handle headings with special characters', () => {
    const html = '<h2>Title! @#%$^&*</h2>';
    const result = assignIdToHeadings(html);
    expect(result.headings[0].id).toBe('title');
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

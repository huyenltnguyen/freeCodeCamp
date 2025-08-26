import { assignIdToHeadings } from './challenge-description-processor';

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

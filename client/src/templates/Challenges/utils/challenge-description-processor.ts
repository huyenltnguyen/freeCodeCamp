// Shared utility for processing headings in challenge content
export type ProcessedHeading = {
  id: string;
  text: string;
  level: number;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-]+|[-]+$/g, '');

export const assignIdToHeadings = (
  html: string
): {
  processedHtml: string;
  headings: ProcessedHeading[];
} => {
  if (!html || typeof window === 'undefined') {
    return { processedHtml: html, headings: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  const headings: ProcessedHeading[] = [];

  headingElements.forEach(el => {
    // Use textContent to generate a stable id
    // but preserve innerHTML so any inline elements are retained.
    const textContent = el.textContent || '';
    const inner = el.innerHTML || '';
    const level = Number(el.tagName[1]);
    const id = slugify(textContent);

    if (!el.id) {
      el.id = id;
    }

    headings.push({ id, text: inner, level });
  });

  return {
    processedHtml: doc.body.innerHTML,
    headings
  };
};

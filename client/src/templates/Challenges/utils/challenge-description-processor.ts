export interface ProcessedHeading {
  id: string;
  text: string;
  level: number;
}

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
  children: OutlineHeading[];
}

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

/**
 * Build a nested outline tree from a flat list of headings with levels.
 *
 * Algorithm:
 * - Iterate headings in document order.
 * - Maintain a stack of ancestor nodes keyed by heading level.
 * - When the current heading's level is less than or equal to the stack
 *   top's level, pop until a parent with a lower level is found.
 * - If the stack is empty the node is a root entry, otherwise it is added
 *   as a child of the stack top.
 *
 * This preserves document order and creates the expected nested outline.
 */
export const buildOutline = (
  headings: ProcessedHeading[]
): OutlineHeading[] => {
  const root: OutlineHeading[] = [];
  const stack: OutlineHeading[] = [];

  headings.forEach(({ text, level, id }) => {
    const node: OutlineHeading = { id, text, level, children: [] };

    while (stack.length > 0 && level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
};

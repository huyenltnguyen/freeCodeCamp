const mdastToHTML = require('./mdast-to-html');

/**
 * Parses Chinese text in format: hanzi (pinyin)
 * @param {string} text - Text in format: hanzi (pinyin)
 * @returns {{ hanzi: string, pinyin: string } | null} Parsed hanzi and pinyin, or null if not matching
 */
function parseChinesePattern(text) {
  const match = text.match(/^(.+?)\s*\((.+?)\)$/);

  if (!match) {
    return null;
  }

  return {
    hanzi: match[1].trim(),
    pinyin: match[2].trim()
  };
}

/**
 * Custom handler for Chinese inline code to render as ruby elements
 * @param {object} state - The state object from mdast-util-to-hast
 * @param {object} node - The inlineCode node
 * @returns {object} Hast element node
 */
function chineseInlineCodeHandler(state, node) {
  // Handle Chinese fill-in-the-blank
  if (node.value.includes('BLANK')) {
    const html = chineseFillInTheBlankToHtml(node.value);

    return {
      type: 'raw',
      value: html
    };
  }

  const parsed = parseChinesePattern(node.value);

  if (parsed) {
    return {
      type: 'element',
      tagName: 'ruby',
      properties: {},
      children: [
        { type: 'text', value: parsed.hanzi },
        {
          type: 'element',
          tagName: 'rp',
          properties: {},
          children: [{ type: 'text', value: '(' }]
        },
        {
          type: 'element',
          tagName: 'rt',
          properties: {},
          children: [{ type: 'text', value: parsed.pinyin }]
        },
        {
          type: 'element',
          tagName: 'rp',
          properties: {},
          children: [{ type: 'text', value: ')' }]
        }
      ]
    };
  }

  return {
    type: 'element',
    // TODO: change this to span
    // https://github.com/freeCodeCamp/language-curricula/issues/22
    tagName: 'code',
    properties: {},
    children: [{ type: 'text', value: node.value }]
  };
}

/**
 * Splits Chinese text by BLANK and converts each segment to ruby HTML,
 * with BLANK tokens preserved between segments.
 *
 * Example:
 *   Input: "你BLANK我 (nǐ BLANK wǒ)"
 *   Output: "<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>BLANK<ruby>我<rp>(</rp><rt>wǒ</rt><rp>)</rp></ruby>"
 *
 * @param {string} text - Text in format: hanzi (pinyin) with BLANKs
 * @returns {string} HTML with ruby elements separated by BLANK tokens
 */
function chineseFillInTheBlankToHtml(text) {
  const hanziPinyin = parseChinesePattern(text);

  // If text doesn't match hanzi (pinyin) pattern, return as-is.
  // This handles cases like plain text with BLANK: "你BLANK" or "nǐ BLANK".
  if (!hanziPinyin) {
    return text;
  }

  const { hanzi, pinyin } = hanziPinyin;

  if (!hanzi.includes('BLANK')) {
    throw new Error(
      'No BLANK found in hanzi portion of fill-in-the-blank text'
    );
  }

  const hanziParts = hanzi.split('BLANK');
  const pinyinParts = pinyin.split('BLANK');

  // Build output by iterating through segments and preserving BLANK positions
  const result = [];

  for (let i = 0; i < hanziParts.length; i++) {
    const hanziPart = hanziParts[i].trim();

    // Only create ruby element for non-empty hanzi segments
    if (hanziPart) {
      const pinyinPart = (pinyinParts[i] || '').trim();
      result.push(
        `<ruby>${hanziPart}<rp>(</rp><rt>${pinyinPart}</rt><rp>)</rp></ruby>`
      );
    }

    // Add BLANK after each segment except the last one
    // This preserves the original number of BLANKs in the input
    if (i < hanziParts.length - 1) {
      result.push('BLANK');
    }
  }

  return result.join('');
}

const rubyOptions = {
  handlers: {
    inlineCode: chineseInlineCodeHandler
  }
};

const createMdastToHtml = lang =>
  lang == 'zh-CN' ? x => mdastToHTML(x, rubyOptions) : mdastToHTML;

module.exports = {
  parseChinesePattern,
  chineseFillInTheBlankToHtml,
  createMdastToHtml
};

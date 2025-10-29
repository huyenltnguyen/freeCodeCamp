/**
 * Regex pattern to match Chinese hanzi-pinyin pairs
 * Pattern: hanzi (pinyin)
 * Example: 你好 (nǐ hǎo) or BLANK (BLANK)
 * Group 1: hanzi or BLANK
 * Group 2: pinyin or BLANK
 */
const CHINESE_HANZI_PINYIN_PATTERN = /(.+?)\s+\((.+?)\)/;

/**
 * Parse a Chinese hanzi-pinyin pair string
 * @param {string} text - Text to parse, e.g. "你好 (nǐ hǎo)"
 * @returns {Object|null} Object with hanzi and pinyin properties, or null if no match
 */
function parseChineseHanziPinyin(text) {
  const pattern = new RegExp(`^${CHINESE_HANZI_PINYIN_PATTERN.source}$`);
  const match = text.match(pattern);

  if (!match) return null;

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
  const parsed = parseChineseHanziPinyin(node.value);

  if (parsed) {
    // Create ruby element structure
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

  // Fallback to default code rendering if pattern doesn't match
  return {
    type: 'element',
    tagName: 'code',
    properties: {},
    children: [{ type: 'text', value: node.value }]
  };
}

/**
 * Process Chinese fill-in-the-blank sentence
 *
 * Splits sentence by BLANK delimiters and creates ruby elements for text segments.
 * Pinyin can have BLANKs or not - if missing, empty rt tags are created.
 *
 * Example: `你好，BLANK 王华。(nǐ hǎo, BLANK wáng huá)`
 * Output: `<ruby>你好，<rp>(</rp><rt>nǐ hǎo,</rt><rp>)</rp></ruby>BLANK<ruby> 王华。<rp>(</rp><rt> wáng huá</rt><rp>)</rp></ruby>`
 *
 * @param {string} sentence - HTML sentence string with hanzi (pinyin) format
 * @param {Array} blanks - Array of blank objects with answers
 * @returns {Object} Processed sentence and blanks with ruby-formatted answers
 * @throws {Error} If no hanzi BLANKs found
 */
function processChineseFillInBlank(sentence, blanks) {
  const paragraphs = sentence.split(/<\/?p>/g).filter(p => p.trim());

  const processedParagraphs = paragraphs.map(para => {
    const parsed = parseChineseHanziPinyin(para);
    if (!parsed) return para;

    const { hanzi, pinyin } = parsed;

    const hanziBlankCount = (hanzi.match(/BLANK/g) || []).length;
    if (hanziBlankCount === 0) {
      throw new Error(
        'Chinese fill-in-the-blank must have at least one BLANK in hanzi part'
      );
    }

    const hanziParts = hanzi.split('BLANK');
    const pinyinParts = pinyin.split('BLANK');

    let result = '';
    for (let i = 0; i < hanziParts.length; i++) {
      const hanziPart = hanziParts[i];
      const pinyinPart = pinyinParts[i];

      if (hanziPart) {
        result += `<ruby>${hanziPart}<rp>(</rp><rt>${pinyinPart || ''}</rt><rp>)</rp></ruby>`;
      }

      if (i < hanziParts.length - 1) {
        result += 'BLANK';
      }
    }

    return result;
  });

  const processedSentence =
    '<p>' + processedParagraphs.join('</p>\n<p>') + '</p>';

  return { sentence: processedSentence, blanks };
}

module.exports = {
  parseChineseHanziPinyin,
  chineseInlineCodeHandler,
  processChineseFillInBlank
};

const { root } = require('mdast-builder');
const find = require('unist-util-find');
const visit = require('unist-util-visit');
const { getSection } = require('./utils/get-section');
const mdastToHtml = require('./utils/mdast-to-html');
const { splitOnThematicBreak } = require('./utils/split-on-thematic-break');
const { parseChinesePattern } = require('./utils/i18n-stringify');

const NOT_IN_PARAGRAPHS = `Each inline code block in the fillInTheBlank sentence section must in its own paragraph
If you have more than one code block, check that they're separated by a blank line
Example of bad formatting:
\`too close\`
\`to each other\`

Example of good formatting:
\`separated\`

\`by a blank line\`

`;

const NOT_IN_CODE_BLOCK = `Each paragraph in the fillInTheBlank sentence section must be inside an inline code block
Example of bad formatting:
## --sentence--

This is a sentence

Example of good formatting:
## --sentence--

\`This is a sentence\`

`;

function plugin() {
  return transformer;
  function transformer(tree, file) {
    const fillInTheBlankNodes = getSection(tree, '--fillInTheBlank--');
    if (fillInTheBlankNodes.length > 0) {
      const fillInTheBlankTree = root(fillInTheBlankNodes);

      validateBlanksCount(fillInTheBlankTree);

      const sentenceNodes = getSection(fillInTheBlankTree, '--sentence--');
      const blanksNodes = getSection(fillInTheBlankTree, '--blanks--');

      const lang = file.data.lang;
      const inputType = file.data.inputType;

      const fillInTheBlank = getfillInTheBlank(sentenceNodes, blanksNodes, {
        lang,
        inputType
      });

      file.data.fillInTheBlank = fillInTheBlank;
    }
  }
}

function validateBlanksCount(fillInTheBlankTree) {
  let blanksCount = 0;
  visit(fillInTheBlankTree, { value: '--blanks--' }, () => {
    blanksCount++;
  });

  if (blanksCount !== 1)
    throw Error(
      `There should only be one --blanks-- section in the fillInTheBlank challenge`
    );
}
function getfillInTheBlank(sentenceNodes, blanksNodes, { lang, inputType }) {
  const sentenceWithoutCodeBlocks = sentenceNodes.map(node => {
    node.children.forEach(child => {
      if (child.type === 'text' && child.value.trim() === '')
        throw Error(NOT_IN_PARAGRAPHS);
      if (child.type !== 'inlineCode') throw Error(NOT_IN_CODE_BLOCK);
    });

    const children = node.children.map(child => ({ ...child, type: 'text' }));
    return { ...node, children };
  });

  // Extract text for BLANK counting (no need to convert to HTML)
  let sentenceForCounting;

  if (lang === 'zh-CN') {
    // For Chinese, extract only hanzi portions
    sentenceForCounting = extractHanziForCounting(sentenceNodes);
  } else {
    // For non-Chinese, just concatenate all text values
    sentenceForCounting = sentenceNodes
      .map(node => node.children.map(child => child.value || '').join(''))
      .join('');
  }

  const sentence = mdastToHtml(sentenceWithoutCodeBlocks, { lang });
  const blanks = getBlanks(blanksNodes, lang);

  if (!sentence) throw Error('sentence is missing from fill in the blank');
  if (!blanks) throw Error('blanks are missing from fill in the blank');

  // Count BLANKs - for Chinese, this only counts hanzi BLANKs
  const blankCount = (sentenceForCounting.match(/BLANK/g) || []).length;

  if (blankCount !== blanks.length) {
    throw Error(
      `Number of underscores in sentence doesn't match the number of blanks.`
    );
  }

  const result = { sentence, blanks };
  if (inputType) {
    result.inputType = inputType;
  }

  return result;
}

/**
 * Extracts hanzi text from sentence nodes for BLANK counting
 * For Chinese challenges, we only want to count BLANKs in hanzi, not pinyin
 * Note: This returns plain text, not HTML, since we only need it for counting
 */
function extractHanziForCounting(sentenceNodes) {
  return sentenceNodes
    .map(node => {
      return node.children
        .map(child => {
          if (child.type === 'inlineCode') {
            const parsed = parseChinesePattern(child.value);
            // If it matches the pattern, return only hanzi
            // Otherwise return the full value (might be non-Chinese text)
            return parsed ? parsed.hanzi : child.value;
          }
          return child.value || '';
        })
        .join('');
    })
    .join('');
}

function getBlanks(blanksNodes, lang) {
  const blanksGroups = splitOnThematicBreak(blanksNodes);

  return blanksGroups.map(blanksGroup => {
    const blanksTree = root(blanksGroup);
    const feedback = find(blanksTree, { value: '--feedback--' });

    const answerText = blanksGroup[0].children[0].value;
    const answer = parseAnswer(answerText, lang);

    if (feedback) {
      const feedbackNodes = getSection(blanksTree, '--feedback--');

      return {
        answer,
        feedback: mdastToHtml(feedbackNodes)
      };
    }

    return { answer, feedback: null };
  });
}

/**
 * Parse answer text with discriminated union format
 * @param {string} answerText - The answer text
 * @param {string} lang - The language code
 * @returns {object} Answer object with type and value: { type: 'text' | 'hanzi-pinyin', value: string | { hanzi, pinyin } }
 */
function parseAnswer(answerText, lang) {
  // For non-Chinese challenges, return as text type
  if (lang !== 'zh-CN') {
    return {
      type: 'text',
      value: answerText
    };
  }

  const parsed = parseChinesePattern(answerText);

  // If it matches hanzi (pinyin) pattern, return as hanzi-pinyin type
  if (parsed) {
    return {
      type: 'hanzi-pinyin',
      value: {
        hanzi: parsed.hanzi,
        pinyin: parsed.pinyin
      }
    };
  }

  // Otherwise (hanzi only or pinyin only), return as text type
  return {
    type: 'text',
    value: answerText
  };
}

module.exports = plugin;

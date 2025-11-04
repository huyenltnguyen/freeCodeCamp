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

  if (lang === 'zh-CN') {
    return getChineseFillInTheBlank(
      sentenceNodes,
      sentenceWithoutCodeBlocks,
      blanksNodes,
      { inputType }
    );
  }

  // Original logic for non-Chinese challenges
  const sentence = mdastToHtml(sentenceWithoutCodeBlocks);
  const blanks = getBlanks(blanksNodes);

  if (!sentence) throw Error('sentence is missing from fill in the blank');
  if (!blanks) throw Error('blanks are missing from fill in the blank');
  if (sentence.match(/BLANK/g).length !== blanks.length)
    throw Error(
      `Number of underscores in sentence doesn't match the number of blanks`
    );

  return { sentence, blanks };
}

/**
 * Handle Chinese fill-in-the-blank challenges with hanzi/pinyin support
 *
 * In Chinese challenges, the sentence may contain patterns like `BLANK 好 (BLANK hǎo)`.
 * We only count BLANKs in the hanzi portion for validation,
 * as the BLANK in pinyin serves as a token, allowing us to omit the pinyin for the corresponding blank.
 * Each blank answer may contain both hanzi and pinyin information.
 */
function getChineseFillInTheBlank(
  sentenceNodes,
  sentenceWithoutCodeBlocks,
  blanksNodes,
  { inputType }
) {
  const hanziSentenceForCounting = extractHanziForCounting(sentenceNodes);

  const sentence = mdastToHtml(sentenceWithoutCodeBlocks, { lang: 'zh-CN' });

  // Parse answers from --blanks-- section
  // Each answer corresponds to one hanzi BLANK and may include both hanzi and pinyin
  // e.g., answer: { type: 'hanzi-pinyin', value: { hanzi: '你好', pinyin: 'nǐ hǎo' } }
  const blanks = getBlanks(blanksNodes, 'zh-CN');

  if (!sentence) throw Error('sentence is missing from fill in the blank');
  if (!blanks) throw Error('blanks are missing from fill in the blank');

  const hanziBlankCount = (hanziSentenceForCounting.match(/BLANK/g) || [])
    .length;

  // Validate that number of answers matches number of hanzi BLANKs
  if (hanziBlankCount !== blanks.length) {
    throw Error(
      `Number of underscores in sentence doesn't match the number of blanks.`
    );
  }

  // For 'pinyin-to-hanzi' inputType, all answers must be of type 'hanzi-pinyin'.
  // This validation ensures compatibility with the UI's pinyin input feature,
  // where users type pinyin and the system automatically converts it to hanzi
  // if it matches the expected pinyin from the answer.
  if (inputType === 'pinyin-to-hanzi') {
    const allAnswersAreHanziPinyin = blanks.every(
      blank => blank.answer.type === 'hanzi-pinyin'
    );
    if (!allAnswersAreHanziPinyin) {
      throw Error(
        `When inputType is 'pinyin-to-hanzi', all answers must be of type 'hanzi-pinyin'.`
      );
    }
  }

  return { sentence, blanks };
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
    const answer = lang ? parseAnswer(answerText, lang) : answerText;

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
 * Parses the answer text into a structured format based on the language.
 * For non-Chinese languages, returns a simple text answer.
 * For Chinese (zh-CN), attempts to parse hanzi and pinyin from the format "hanzi (pinyin)".
 * @param {string} answerText - The raw answer text to parse.
 * @param {string} lang - The language code (e.g., 'zh-CN').
 * @returns {object} A discriminated union object:
 *   - For 'text' type: { type: 'text', value: string }
 *   - For 'hanzi-pinyin' type: { type: 'hanzi-pinyin', value: { hanzi: string, pinyin: string } }
 */
function parseAnswer(answerText, lang) {
  if (lang !== 'zh-CN') {
    return {
      type: 'text',
      value: answerText
    };
  }

  const parsed = parseChinesePattern(answerText);

  if (parsed) {
    return {
      type: 'hanzi-pinyin',
      value: {
        hanzi: parsed.hanzi,
        pinyin: parsed.pinyin
      }
    };
  }

  return {
    type: 'text',
    value: answerText
  };
}

module.exports = plugin;

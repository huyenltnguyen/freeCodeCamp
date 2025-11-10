const { root } = require('mdast-builder');
const find = require('unist-util-find');
const visit = require('unist-util-visit');
const { getSection } = require('./utils/get-section');
const getAllBefore = require('./utils/before-heading');
const {
  createMdastToHtml,
  parseChinesePattern
} = require('./utils/i18n-stringify');
const { splitOnThematicBreak } = require('./utils/split-on-thematic-break');

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

function plugin() {
  return transformer;
  function transformer(tree, file) {
    const toHtml = createMdastToHtml(file.data.lang);
    const fillInTheBlankNodes = getSection(tree, '--fillInTheBlank--');

    if (fillInTheBlankNodes.length === 0) return;

    const fillInTheBlankTree = root(fillInTheBlankNodes);
    validateBlanksCount(fillInTheBlankTree);

    const sentenceNodes = getSection(fillInTheBlankTree, '--sentence--');
    const blanksNodes = getSection(fillInTheBlankTree, '--blanks--');

    const lang = file.data.lang;
    const inputType = file.data.inputType;

    // Branch based on language for cleaner separation
    if (lang === 'zh-CN') {
      file.data.fillInTheBlank = getChineseFillInTheBlank(
        sentenceNodes,
        blanksNodes,
        inputType
      );
    } else {
      file.data.fillInTheBlank = getfillInTheBlank(sentenceNodes, blanksNodes);
    }

    /**
     * Process non-Chinese fill-in-the-blank challenges
     */
    function getfillInTheBlank(sentenceNodes, blanksNodes) {
      const sentenceWithoutCodeBlocks = sentenceNodes.map(node => {
        node.children.forEach(child => {
          if (child.type === 'text' && child.value.trim() === '')
            throw Error(NOT_IN_PARAGRAPHS);
          if (child.type !== 'inlineCode') throw Error(NOT_IN_CODE_BLOCK);
        });

        const children = node.children.map(child => ({
          ...child,
          type: 'text'
        }));
        return { ...node, children };
      });

      const sentence = toHtml(sentenceWithoutCodeBlocks);
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
     * In Chinese challenges, the sentence can have the following variants:
     * - Hanzi-pinyin: `BLANK 好 (BLANK hǎo)`
     * - Hanzi only: `BLANK 好`
     * - Pinyin only: `BLANK hǎo`
     * In the hanzi-pinyin scenario, we only count BLANKs in the hanzi portion.
     * The BLANKs in pinyin only serve as tokens, allowing us
     * to hide the pinyin for the corresponding blanks from the UI.
     */
    function getChineseFillInTheBlank(sentenceNodes, blanksNodes, inputType) {
      const sentenceWithoutCodeBlocks = sentenceNodes.map(node => {
        node.children.forEach(child => {
          if (child.type === 'text' && child.value.trim() === '')
            throw Error(NOT_IN_PARAGRAPHS);
          if (child.type !== 'inlineCode') throw Error(NOT_IN_CODE_BLOCK);
        });

        const children = node.children.map(child => ({
          ...child,
          type: 'text'
        }));
        return { ...node, children };
      });

      const hanziSentenceForCounting = extractHanziForCounting(sentenceNodes);
      const sentence = toHtml(sentenceWithoutCodeBlocks);
      const blanks = getBlanks(blanksNodes);

      if (!sentence) throw Error('sentence is missing from fill in the blank');
      if (!blanks) throw Error('blanks are missing from fill in the blank');

      const hanziBlankCount = (hanziSentenceForCounting.match(/BLANK/g) || [])
        .length;

      // Validate that number of answers matches number of hanzi BLANKs
      if (hanziBlankCount !== blanks.length) {
        throw Error(
          `Number of BLANK in hanzi does not match the number of answers.`
        );
      }

      // For 'pinyin-to-hanzi' inputType, all answers must be of type 'hanzi-pinyin'.
      // This validation ensures compatibility with the pinyin input in the UI,
      // where users type pinyin and the system automatically converts it to hanzi
      // if the input matches the expected pinyin from the answer.
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

    function getBlanks(blanksNodes) {
      const blanksGroups = splitOnThematicBreak(blanksNodes);

      return blanksGroups.map(blanksGroup => {
        const blanksTree = root(blanksGroup);
        const feedback = find(blanksTree, { value: '--feedback--' });

        if (feedback) {
          const blanksNodes = getAllBefore(blanksTree, '--feedback--');
          const feedbackNodes = getSection(blanksTree, '--feedback--');

          return {
            answer: parseAnswer(blanksNodes[0].children[0].value),
            feedback: toHtml(feedbackNodes)
          };
        }

        return {
          answer: parseAnswer(blanksGroup[0].children[0].value),
          feedback: null
        };
      });
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
function parseAnswer(answerText) {
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

const hastToHTML = require('hast-util-to-html');
const { root } = require('mdast-builder');
const mdastToHast = require('mdast-util-to-hast');

/**
 * Custom handler for Chinese inline code to render as ruby elements
 * @param {object} state - The state object from mdast-util-to-hast
 * @param {object} node - The inlineCode node
 * @returns {object} Hast element node
 */
function chineseInlineCodeHandler(state, node) {
  // Pattern to match: hanzi (pinyin)
  // Example: 你好 (nǐ hǎo)
  const pattern = /^(.+?)\s+\((.+?)\)$/;
  const match = node.value.match(pattern);

  if (match) {
    const hanzi = match[1].trim();
    const pinyin = match[2].trim();

    // Create ruby element structure
    return {
      type: 'element',
      tagName: 'ruby',
      properties: {},
      children: [
        { type: 'text', value: hanzi },
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
          children: [{ type: 'text', value: pinyin }]
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

function mdastToHTML(nodes, options = {}) {
  if (!Array.isArray(nodes))
    throw Error('mdastToHTML expects an array argument');
  // - the 'nodes' are children, so first need embedding in a parent

  const { lang } = options;
  const hastOptions = { allowDangerousHtml: true };

  if (lang === 'zh-CN') {
    hastOptions.handlers = {
      inlineCode: chineseInlineCodeHandler
    };
  }

  return hastToHTML(mdastToHast(root(nodes), hastOptions), {
    allowDangerousHtml: true
  });
}

module.exports = mdastToHTML;

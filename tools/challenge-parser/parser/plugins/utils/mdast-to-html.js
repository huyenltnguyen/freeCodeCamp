const hastToHTML = require('hast-util-to-html');
const { root } = require('mdast-builder');
const mdastToHast = require('mdast-util-to-hast');
const { chineseInlineCodeHandler } = require('./get-chinese-text');

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

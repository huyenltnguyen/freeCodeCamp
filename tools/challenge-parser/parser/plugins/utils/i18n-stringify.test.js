import { describe, it, expect } from 'vitest';
import {
  createMdastToHtml,
  parseChinesePattern,
  chineseFillInTheBlankToHtml
} from './i18n-stringify';

describe('parseChinesePattern', () => {
  it('should parse Chinese text with hanzi and pinyin', () => {
    const result = parseChinesePattern('你好 (nǐ hǎo)');
    expect(result).toEqual({
      hanzi: '你好',
      pinyin: 'nǐ hǎo'
    });
  });

  it('should handle text without spaces before parentheses', () => {
    const result = parseChinesePattern('你好(nǐ hǎo)');
    expect(result).toEqual({
      hanzi: '你好',
      pinyin: 'nǐ hǎo'
    });
  });

  it('should handle text with multiple spaces', () => {
    const result = parseChinesePattern('你好   (nǐ hǎo)');
    expect(result).toEqual({
      hanzi: '你好',
      pinyin: 'nǐ hǎo'
    });
  });

  it('should return null for text without parentheses', () => {
    const result = parseChinesePattern('你好');
    expect(result).toBeNull();
  });

  it('should return null for text with only opening parenthesis', () => {
    const result = parseChinesePattern('你好 (nǐ hǎo');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseChinesePattern('');
    expect(result).toBeNull();
  });
});

describe('createMdastToHtml', () => {
  it('should render Chinese inline code as ruby when lang is zh-CN', () => {
    const toHtml = createMdastToHtml('zh-CN');
    const nodes = [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is ' },
          { type: 'inlineCode', value: '请问 (qǐng wèn)' },
          { type: 'text', value: '.' }
        ]
      }
    ];
    const actual = toHtml(nodes);
    expect(actual).toBe(
      '<p>This is <ruby>请问<rp>(</rp><rt>qǐng wèn</rt><rp>)</rp></ruby>.</p>'
    );
  });

  it('should render Chinese inline code as ruby with or without space before parenthesis', () => {
    const toHtml = createMdastToHtml('zh-CN');
    const nodesWithSpace = [
      {
        type: 'paragraph',
        children: [{ type: 'inlineCode', value: '你好 (nǐ hǎo)' }]
      }
    ];
    const nodesWithoutSpace = [
      {
        type: 'paragraph',
        children: [{ type: 'inlineCode', value: '你好(nǐ hǎo)' }]
      }
    ];
    const expected =
      '<p><ruby>你好<rp>(</rp><rt>nǐ hǎo</rt><rp>)</rp></ruby></p>';
    expect(toHtml(nodesWithSpace)).toBe(expected);
    expect(toHtml(nodesWithoutSpace)).toBe(expected);
  });

  it('should handle multiple Chinese inline codes in one paragraph', () => {
    const toHtml = createMdastToHtml('zh-CN');
    const nodes = [
      {
        type: 'paragraph',
        children: [
          { type: 'inlineCode', value: '你好 (nǐ hǎo)' },
          { type: 'text', value: ' and ' },
          { type: 'inlineCode', value: '再见 (zài jiàn)' }
        ]
      }
    ];
    const actual = toHtml(nodes);
    expect(actual).toBe(
      '<p><ruby>你好<rp>(</rp><rt>nǐ hǎo</rt><rp>)</rp></ruby> and <ruby>再见<rp>(</rp><rt>zài jiàn</rt><rp>)</rp></ruby></p>'
    );
  });

  it('should fallback to code element if pattern does not match', () => {
    const toHtml = createMdastToHtml('zh-CN');
    const nodes = [
      {
        type: 'paragraph',
        children: [
          { type: 'inlineCode', value: '你好' },
          { type: 'text', value: ' and ' },
          { type: 'inlineCode', value: 'nǐ hǎo' }
        ]
      }
    ];
    const actual = toHtml(nodes, { lang: 'zh-CN' });
    expect(actual).toBe('<p><code>你好</code> and <code>nǐ hǎo</code></p>');
  });

  it('should render as regular code when lang is not zh-CN', () => {
    const toHtml = createMdastToHtml('zh');
    const nodes = [
      {
        type: 'paragraph',
        children: [{ type: 'inlineCode', value: '请问 (qǐng wèn)' }]
      }
    ];
    const actual = toHtml(nodes);
    expect(actual).toBe('<p><code>请问 (qǐng wèn)</code></p>');
  });
});

describe('chineseFillInTheBlankToRubyHtml', () => {
  it('should throw if no BLANK is found in hanzi', () => {
    expect(() => chineseFillInTheBlankToHtml('你好 (nǐ hǎo)')).toThrow(
      'No BLANK found in hanzi portion of fill-in-the-blank text'
    );
  });

  it('should return text as-is if pattern does not match', () => {
    expect(chineseFillInTheBlankToHtml('你BLANK')).toBe('你BLANK');
    expect(chineseFillInTheBlankToHtml('nǐ BLANK')).toBe('nǐ BLANK');
  });

  it('should return as ruby if the text has hanzi (pinyin) pattern', () => {
    const result = chineseFillInTheBlankToHtml(
      'BLANK是王华 (BLANK shì Wang Hua)'
    );
    expect(result).toBe(
      'BLANK<ruby>是王华<rp>(</rp><rt>shì Wang Hua</rt><rp>)</rp></ruby>'
    );
  });

  it('should handle multiple BLANKs', () => {
    const result = chineseFillInTheBlankToHtml(
      'BLANK BLANK王华 (BLANK BLANK Wang Hua)'
    );
    expect(result).toBe(
      'BLANKBLANK<ruby>王华<rp>(</rp><rt>Wang Hua</rt><rp>)</rp></ruby>'
    );
  });

  it('should handle spaces around BLANK tokens', () => {
    const result = chineseFillInTheBlankToHtml(
      '你 BLANK 我 BLANK (nǐ BLANK wǒ BLANK)'
    );
    expect(result).toBe(
      '<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>BLANK<ruby>我<rp>(</rp><rt>wǒ</rt><rp>)</rp></ruby>BLANK'
    );
  });

  it('should not wrap BLANK tokens in ruby', () => {
    const result = chineseFillInTheBlankToHtml(
      'BLANK是王华 (BLANK shì Wang Hua)'
    );
    expect(result).not.toContain('<ruby>BLANK');
  });

  it('should not create empty ruby elements', () => {
    const result = chineseFillInTheBlankToHtml(
      'BLANK是王华 (BLANK shì Wang Hua)'
    );
    expect(result).not.toContain('<ruby><rp>(</rp><rt></rt><rp>)</rp></ruby>');
  });
});

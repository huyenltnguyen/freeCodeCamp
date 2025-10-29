import { describe, it, expect } from 'vitest';
import {
  parseChineseHanziPinyin,
  chineseInlineCodeHandler,
  processChineseFillInBlank
} from './get-chinese-text';

describe('parseChineseHanziPinyin', () => {
  it('should parse hanzi-pinyin pairs', () => {
    expect(parseChineseHanziPinyin('请问 (qǐng wèn)')).toEqual({
      hanzi: '请问',
      pinyin: 'qǐng wèn'
    });
    expect(parseChineseHanziPinyin('你好 (nǐ hǎo)')).toEqual({
      hanzi: '你好',
      pinyin: 'nǐ hǎo'
    });
    expect(parseChineseHanziPinyin('BLANK (BLANK)')).toEqual({
      hanzi: 'BLANK',
      pinyin: 'BLANK'
    });
  });

  it('should return null for patterns without parentheses', () => {
    expect(parseChineseHanziPinyin('你好')).toBeNull();
    expect(parseChineseHanziPinyin('nǐ hǎo')).toBeNull();
  });

  it('should handle extra whitespace', () => {
    expect(parseChineseHanziPinyin('你好  (nǐ hǎo)')).toEqual({
      hanzi: '你好',
      pinyin: 'nǐ hǎo'
    });
  });
});

describe('chineseInlineCodeHandler', () => {
  it('should render Chinese inline code as ruby element', () => {
    const node = { value: '请问 (qǐng wèn)' };
    const result = chineseInlineCodeHandler(null, node);

    expect(result.type).toBe('element');
    expect(result.tagName).toBe('ruby');
    expect(result.children).toHaveLength(4);
    expect(result.children[0]).toEqual({ type: 'text', value: '请问' });
    expect(result.children[1].tagName).toBe('rp');
    expect(result.children[2].tagName).toBe('rt');
    expect(result.children[2].children[0].value).toBe('qǐng wèn');
    expect(result.children[3].tagName).toBe('rp');
  });

  it('should handle multiple Chinese words', () => {
    const node = { value: '你好 (nǐ hǎo)' };
    const result = chineseInlineCodeHandler(null, node);

    expect(result.tagName).toBe('ruby');
    expect(result.children[0]).toEqual({ type: 'text', value: '你好' });
    expect(result.children[2].children[0].value).toBe('nǐ hǎo');
  });

  it('should fallback to code element if pattern does not match', () => {
    const node1 = { value: '你好' };
    const result1 = chineseInlineCodeHandler(null, node1);
    expect(result1.tagName).toBe('code');
    expect(result1.children[0].value).toBe('你好');

    const node2 = { value: 'nǐ hǎo' };
    const result2 = chineseInlineCodeHandler(null, node2);
    expect(result2.tagName).toBe('code');
    expect(result2.children[0].value).toBe('nǐ hǎo');
  });
});

describe('processChineseFillInBlank', () => {
  it('should throw error for sentence without BLANK', () => {
    const sentence = '<p>你好 (nǐ hǎo)</p>';
    const blanks = [];
    expect(() => processChineseFillInBlank(sentence, blanks)).toThrow(
      /must have at least one BLANK/
    );
  });

  it('should handle single BLANK and create ruby for surrounding text', () => {
    const sentence = '<p>你好，BLANK 王华。 (nǐ hǎo, BLANK wáng huá)</p>';
    const blanks = [{ answer: '我是 (wǒ shì)' }];
    const result = processChineseFillInBlank(sentence, blanks);

    // Should have ruby before BLANK and ruby after BLANK
    expect(result.sentence).toBe(
      '<p><ruby>你好，<rp>(</rp><rt>nǐ hǎo, </rt><rp>)</rp></ruby>BLANK<ruby> 王华。<rp>(</rp><rt> wáng huá</rt><rp>)</rp></ruby></p>'
    );

    expect(result.blanks).toEqual([{ answer: '我是 (wǒ shì)' }]);
  });

  it('should handle BLANK at start of sentence', () => {
    const sentence = '<p>BLANK 王华。 (BLANK wáng huá)</p>';
    const blanks = [{ answer: '你好 (nǐ hǎo)' }];
    const result = processChineseFillInBlank(sentence, blanks);

    expect(result.sentence).toBe(
      '<p>BLANK<ruby> 王华。<rp>(</rp><rt> wáng huá</rt><rp>)</rp></ruby></p>'
    );
    expect(result.blanks).toEqual([{ answer: '你好 (nǐ hǎo)' }]);
  });

  it('should handle BLANK at end of sentence', () => {
    const sentence = '<p>你好，BLANK (nǐ hǎo, BLANK)</p>';
    const blanks = [{ answer: '王华 (wáng huá)' }];
    const result = processChineseFillInBlank(sentence, blanks);

    expect(result.sentence).toBe(
      '<p><ruby>你好，<rp>(</rp><rt>nǐ hǎo, </rt><rp>)</rp></ruby>BLANK</p>'
    );
    expect(result.blanks).toEqual([{ answer: '王华 (wáng huá)' }]);
  });

  it('should handle multiple BLANKs', () => {
    const sentence =
      '<p>我的 BLANK BLANK 是刘明。 (wǒ de BLANK BLANK shì Liu Ming)</p>';
    const blanks = [{ answer: '名 (míng)' }, { answer: '字 (zi)' }];
    const result = processChineseFillInBlank(sentence, blanks);

    expect(result.sentence).toBe(
      '<p><ruby>我的 <rp>(</rp><rt>wǒ de </rt><rp>)</rp></ruby>BLANK<ruby> <rp>(</rp><rt> </rt><rp>)</rp></ruby>BLANK<ruby> 是刘明。<rp>(</rp><rt> shì Liu Ming</rt><rp>)</rp></ruby></p>'
    );
    expect(result.blanks).toEqual([
      { answer: '名 (míng)' },
      { answer: '字 (zi)' }
    ]);
  });

  it('should handle multiple paragraphs with BLANKs', () => {
    const sentence = '<p>BLANK (BLANK)</p>\n<p>BLANK (BLANK)</p>';
    const blanks = [{ answer: '你好 (nǐ hǎo)' }, { answer: '再见 (zài jiàn)' }];
    const result = processChineseFillInBlank(sentence, blanks);

    expect(result.sentence).toBe('<p>BLANK</p>\n<p>BLANK</p>');
    expect(result.blanks).toEqual([
      { answer: '你好 (nǐ hǎo)' },
      { answer: '再见 (zài jiàn)' }
    ]);
  });
});

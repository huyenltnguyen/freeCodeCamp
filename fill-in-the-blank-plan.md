# Chinese Fill-in-the-Blank Support Plan

## Current State Analysis

### Challenge Structure

Chinese fill-in-the-blank challenges use the pattern: `hanzi (pinyin)` in inline code blocks.

**Example from markdown:**

```markdown
## --sentence--

`你好，我是王华，请问你BLANK什么名字？(nǐ hǎo wǒ shì Wang Hua qǐng wèn nǐ BLANK shén me míng zi)`

## --blanks--

`叫 (jiào)`
```

### Key Issues

1. **BLANK Counting Problem**

   - Current implementation counts ALL occurrences of `BLANK` in the HTML
   - In Chinese challenges, `BLANK` appears in both hanzi and pinyin: `你BLANK (nǐ BLANK)`
   - Should only count the hanzi `BLANK`, not the pinyin one
   - Current validation: `sentence.match(/BLANK/g).length !== blanks.length` fails

2. **Answer Format Variations**

   - Answers can be: `叫 (jiào)` (both hanzi and pinyin)
   - Or just: `你` (hanzi only)
   - Or just: `nǐ` (pinyin only)
   - Currently stored as plain string, but should support structured data for proper rendering

3. **Missing inputType**

   - Some challenges have `inputType: 'pinyin-to-hanzi'` in frontmatter
   - This is not currently passed to the client
   - Needed for UI to determine input method

4. **Answer Rendering**
   - When answer is `叫 (jiào)`, it should render as ruby HTML: `<ruby>叫<rp>(</rp><rt>jiào</rt><rp>)</rp></ruby>`
   - Currently rendered as plain text in a span

### Current Data Flow

**Parser (add-fill-in-the-blank.js):**

```javascript
// Strips code blocks and converts to HTML
const sentence = mdastToHtml(sentenceWithoutCodeBlocks);
// Returns answer as plain string
const blanks = [{ answer: '叫 (jiào)', feedback: '...' }];
```

**TypeScript Types (prop-types.ts):**

```typescript
export type FillInTheBlank = {
  sentence: string; // HTML string
  blanks: MultipleChoiceAnswer[];
};

type MultipleChoiceAnswer = {
  answer: string;
  feedback: string | null;
};
```

**React Component (fill-in-the-blanks.tsx):**

```typescript
// Renders answer as plain text
<span className='correct-blank-answer'>
  {blankAnswers[value]}
</span>
```

**Client Parser (parse-blanks.ts):**

```typescript
// Splits HTML by 'BLANK' string literal
const splitByBlank = p.split('BLANK');
```

## Proposed Solution

### Approach

We need to handle Chinese challenges differently while maintaining backward compatibility with existing English challenges.

**Key Principle:** Only count BLANKs in the hanzi portion of Chinese text, ignore BLANKs in pinyin.

### Critical Consideration: HTML Structure and Rendering

**Problem:** The `parseBlanks` function splits the HTML by `BLANK` string to create text and blank nodes. Each text node is rendered as HTML, and each blank node becomes an input element.

For Chinese text like `你BLANK什么 (nǐ BLANK shén me)`, if we naively convert to ruby:

```html
<ruby>你BLANK什么<rp>(</rp><rt>nǐ BLANK shén me</rt><rp>)</rp></ruby>
```

When `parseBlanks` splits by `BLANK`, it creates:

- Part 1: `<ruby>你` (broken HTML!)
- Part 2: input
- Part 3: `什么<rp>(</rp><rt>nǐ ` (broken HTML!)
- Part 4: input
- Part 5: ` shén me</rt><rp>)</rp></ruby>` (broken HTML!)

This completely breaks the HTML structure.

**Solution:** Split Chinese text by `BLANK` FIRST, then create separate ruby elements for each segment.

For input `你BLANK什么BLANK (nǐ BLANK shén me BLANK)`:

1. Split by BLANK: `["你 (nǐ)", "什么 (shén me)", ""]`
2. Convert each segment to ruby:
   - `你 (nǐ)` → `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>`
   - `什么 (shén me)` → `<ruby>什么<rp>(</rp><rt>shén me</rt><rp>)</rp></ruby>`
3. Join with `BLANK`: `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>BLANK<ruby>什么<rp>(</rp><rt>shén me</rt><rp>)</rp></ruby>BLANK`

When `parseBlanks` splits this:

- Part 1: `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>` (complete, valid HTML)
- Part 2: input
- Part 3: `<ruby>什么<rp>(</rp><rt>shén me</rt><rp>)</rp></ruby>` (complete, valid HTML)
- Part 4: input

Perfect! Each text segment is valid HTML, and inputs are inserted between ruby elements.

**For pinyin BLANK:** Simply remove it or hide it completely since each ruby element is self-contained.

**Implementation approach:**

- Create a custom handler for Chinese fill-in-the-blank that processes inline code differently
- Split the Chinese text by `BLANK` FIRST
- Convert each non-blank segment to a ruby element
- Join segments with `BLANK` as the delimiter

### Implementation Strategy

#### 1. Extract Chinese Pattern Parser

Create a utility function to parse Chinese `hanzi (pinyin)` patterns.

**New file:** `tools/challenge-parser/parser/plugins/utils/parse-chinese.js`

```javascript
/**
 * Parses Chinese text in format: hanzi (pinyin)
 * @param {string} text - Text to parse
 * @returns {object|null} { hanzi, pinyin } or null if not a match
 */
function parseChinesePattern(text) {
  const pattern = /^(.+?)\s*\((.+?)\)$/;
  const match = text.match(pattern);

  if (match) {
    return {
      hanzi: match[1].trim(),
      pinyin: match[2].trim()
    };
  }

  return null;
}

/**
 * Splits Chinese text by BLANK and converts each segment to ruby HTML
 * @param {string} text - Text in format: hanzi (pinyin) with BLANKs
 * @returns {string} HTML with ruby elements separated by BLANK tokens
 */
function chineseTextToRubySegments(text) {
  const parsed = parseChinesePattern(text);

  if (!parsed) {
    return text; // Not Chinese pattern, return as-is
  }

  const { hanzi, pinyin } = parsed;

  // Split both hanzi and pinyin by BLANK
  const hanziParts = hanzi.split('BLANK');
  const pinyinParts = pinyin.split('BLANK');

  // Convert each part to ruby element
  const rubySegments = hanziParts.map((hanziPart, index) => {
    if (!hanziPart.trim()) return ''; // Skip empty segments

    const pinyinPart = pinyinParts[index] || '';

    // Create ruby element for this segment
    return `<ruby>${hanziPart.trim()}<rp>(</rp><rt>${pinyinPart.trim()}</rt><rp>)</rp></ruby>`;
  });

  // Join segments with BLANK as delimiter
  return rubySegments.filter(s => s).join('BLANK');
}

module.exports = { parseChinesePattern, chineseTextToRubySegments };
```

#### 2. Update mdast-to-html.js Chinese Handler

For **fill-in-the-blank challenges**, we need special handling because `BLANK` tokens must not break HTML structure. We'll detect if the text contains `BLANK` and handle it differently.

```javascript
const {
  parseChinesePattern,
  chineseTextToRubySegments
} = require('./parse-chinese');

function chineseInlineCodeHandler(state, node) {
  // Special handling for fill-in-the-blank with BLANK tokens
  if (node.value.includes('BLANK')) {
    const rubySegments = chineseTextToRubySegments(node.value);

    // Return as raw HTML to preserve structure
    return {
      type: 'raw',
      value: rubySegments
    };
  }

  // Normal Chinese text without BLANK
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
    tagName: 'code',
    properties: {},
    children: [{ type: 'text', value: node.value }]
  };
}
```

#### 3. Update Parser to Handle Chinese

Modify `add-fill-in-the-blank.js` to:

- Access `lang` and `inputType` from `file.data`
- For Chinese challenges, extract hanzi before converting to HTML for counting
- Validate that BLANKs exist in hanzi (reusing existing validation)
- Parse answers to separate hanzi and pinyin
- Include inputType in returned data

**Key changes:**

```javascript
function getfillInTheBlank(sentenceNodes, blanksNodes, lang, inputType) {
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
      `Number of underscores in sentence doesn't match the number of blanks. ` +
        `Found ${blankCount} BLANK(s) in ${lang === 'zh-CN' ? 'hanzi' : 'sentence'}, ` +
        `but ${blanks.length} blank(s) provided.`
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
```

#### 4. Update Answer Structure

Parse answers with a discriminated union using `type` and `value` fields.

**Answer format:**

```javascript
{
  type: "text" | "hanzi-pinyin",
  value: string | { hanzi: string, pinyin: string }
}
```

**Implementation:**

```javascript
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
```

#### 5. Update TypeScript Types

**File:** `client/src/redux/prop-types.ts`

Create a dedicated type for fill-in-the-blank answers using a discriminated union:

```typescript
// Keep MultipleChoiceAnswer as-is for multiple choice questions
type MultipleChoiceAnswer = {
  answer: string;
  feedback: string | null;
};

// Discriminated union for fill-in-the-blank answers
type FillInTheBlankAnswerText = {
  type: 'text';
  value: string;
};

type FillInTheBlankAnswerHanziPinyin = {
  type: 'hanzi-pinyin';
  value: {
    hanzi: string;
    pinyin: string;
  };
};

type FillInTheBlankAnswerData =
  | FillInTheBlankAnswerText
  | FillInTheBlankAnswerHanziPinyin;

type FillInTheBlankAnswer = {
  answer: FillInTheBlankAnswerData;
  feedback: string | null;
};

export type FillInTheBlank = {
  sentence: string;
  blanks: FillInTheBlankAnswer[];
  inputType?: string;
};
```

**Rationale:**

- Uses discriminated union with `type` property for type-safe switching
- `type: 'text'` with `value: string` for English or single hanzi/pinyin
- `type: 'hanzi-pinyin'` with `value: { hanzi, pinyin }` for Chinese with both
- Enables safe rendering without `typeof` checks
- Future-proof for additional answer types

#### 6. Update GraphQL Schema

**File:** `client/gatsby-node.js`

Update the GraphQL type definition to use `JSON` for answer (following the same pattern as `Nodule.data`):

```typescript
type Blank {
  answer: JSON  // Changed from String to JSON to support both string and object
  feedback: String
}
```

This allows the parser to return either:

- A string: `"hello"` (English challenges)
- An object: `{ hanzi: "叫", pinyin: "jiào" }` (Chinese challenges)

The GraphQL query remains unchanged - no need to specify subfields.

#### 7. Update Schema Validation

**File:** `curriculum/schema/challenge-schema.js`

```javascript
fillInTheBlank: Joi.object().keys({
  sentence: Joi.string().required(),
  blanks: Joi.array()
    .items(
      Joi.object().keys({
        answer: Joi.object()
          .keys({
            type: Joi.string().valid('text', 'hanzi-pinyin').required(),
            value: Joi.alternatives().conditional('type', {
              is: 'text',
              then: Joi.string().required(),
              otherwise: Joi.object()
                .keys({
                  hanzi: Joi.string().required(),
                  pinyin: Joi.string().required()
                })
                .required()
            })
          })
          .required(),
        feedback: Joi.string().allow(null)
      })
    )
    .required(),
  inputType: Joi.string().optional()
});
```

#### 8. Update React Component

**File:** `client/src/templates/Challenges/components/fill-in-the-blanks.tsx`

Add helper to render answer using type discrimination:

```typescript
const renderAnswer = (answer: FillInTheBlankAnswerData): React.ReactNode => {
  if (answer.type === 'text') {
    return answer.value;
  }

  // Render Chinese with both hanzi and pinyin as ruby
  return (
    <ruby>
      {answer.value.hanzi}
      <rp>(</rp>
      <rt>{answer.value.pinyin}</rt>
      <rp>)</rp>
    </ruby>
  );
};

// Calculate answer length for input sizing:
const getAnswerLength = (answer: FillInTheBlankAnswerData): number => {
  if (answer.type === 'text') {
    return answer.value.length;
  }
  return answer.value.hanzi.length;
};

// In render:
{answersCorrect[value] === true && (
  <span className='correct-blank-answer'>
    {renderAnswer(blanks[value].answer)}
  </span>
)}

// For input sizing:
const answerLength = getAnswerLength(blankAnswers[value]);
```

## Implementation Steps

```markdown
- [x] Create `parse-chinese.js` utility with:
  - [x] `parseChinesePattern` function
  - [x] `chineseTextToRubySegments` function that splits by BLANK and creates separate ruby elements
- [x] Update `mdast-to-html.js`:
  - [x] Import parse-chinese utilities
  - [x] Modify `chineseInlineCodeHandler` to detect BLANK in text
  - [x] For text with BLANK, use `chineseTextToRubySegments` and return as 'raw' HTML
  - [x] For text without BLANK, use existing ruby element logic
- [x] Update `add-fill-in-the-blank.js`:
  - [x] Import `parseChinesePattern`
  - [x] Access `lang` and `inputType` from `file.data`
  - [x] Add `extractHanziForCounting` function
  - [x] Use hanzi-only counting for Chinese challenges
  - [x] Parse answers with discriminated union format in `parseAnswer`
  - [x] Include inputType in returned data
  - [x] Update error messages to be more descriptive
- [x] Update TypeScript types in `prop-types.ts`:
  - [x] Create discriminated union types with `type` and `value` fields
  - [x] Export `FillInTheBlankAnswerData` for component use
  - [x] Update `FillInTheBlank` type to use new answer type and include `inputType`
- [x] Update GraphQL schema in `client/gatsby-node.js`:
  - [x] Change `Blank.answer` type from `String` to `JSON` (same pattern as `Nodule.data`)
  - [x] Add `inputType` field to `FillInTheBlank` type
- [x] Update schema validation in `challenge-schema.js`:
  - [x] Use conditional validation with `type` discriminator
  - [x] Validate `text` type has string value
  - [x] Validate `hanzi-pinyin` type has object with hanzi and pinyin
  - [x] Add optional inputType field
- [x] Update React component `fill-in-the-blanks.tsx`:
  - [x] Import `FillInTheBlankAnswerData` type
  - [x] Add `renderAnswer` helper function using type discrimination
  - [x] Add `getAnswerLength` helper function
  - [x] Handle both answer types for rendering and input sizing
- [x] Update `show.tsx`:

  - [x] Update handleSubmit to use discriminated union pattern
  - [x] Check answer.type instead of typeof
  - [x] Access answer.value for text and answer.value.hanzi for hanzi-pinyin

- [ ] Test with existing English challenges (backward compatibility)
- [ ] Test with Chinese challenges:
  - [ ] Single blank
  - [ ] Multiple blanks
  - [ ] Spaces around BLANK
  - [ ] Answer with hanzi + pinyin
  - [ ] Answer with hanzi only
  - [ ] Answer with pinyin only
- [ ] Update tests if needed
```

## Final Answer Structure

The answer field uses a **discriminated union** with `type` and `value` fields:

### English or single hanzi/pinyin:

```json
{
  "answer": {
    "type": "text",
    "value": "hello"
  },
  "feedback": "Some feedback text"
}
```

### Chinese with both hanzi and pinyin:

```json
{
  "answer": {
    "type": "hanzi-pinyin",
    "value": {
      "hanzi": "叫",
      "pinyin": "jiào"
    }
  },
  "feedback": "Some feedback text"
}
```

This structure:

- Uses GraphQL `JSON` type (like `Nodule.data`)
- Enables type-safe discrimination with `answer.type`
- Supports future answer types without breaking changes
- Requires no GraphQL query changes (just `answer` field)

## Data Flow Summary

**Input (Markdown):**

```markdown
`你BLANK什么名字？(nǐ BLANK shén me míng zi)`
```

**Parser Processing:**

1. `extractHanziForCounting` extracts: `你BLANK什么名字？` → Finds 1 BLANK
2. `chineseTextToRubySegments` splits by BLANK and converts each segment:
   - Splits hanzi: `["你", "什么名字？"]`
   - Splits pinyin: `["nǐ", "shén me míng zi"]`
   - Creates ruby elements:
     - `你 (nǐ)` → `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>`
     - `什么名字？ (shén me míng zi)` → `<ruby>什么名字？<rp>(</rp><rt>shén me míng zi</rt><rp>)</rp></ruby>`
   - Joins with BLANK: `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>BLANK<ruby>什么名字？<rp>(</rp><rt>shén me míng zi</rt><rp>)</rp></ruby>`

**Client Rendering:**

1. `parseBlanks` splits by `BLANK` → Finds exactly 1 BLANK
2. Component renders:
   - Text: `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>` (complete, valid ruby element)
   - Input: `<input />` (replaces BLANK)
   - Text: `<ruby>什么名字？<rp>(</rp><rt>shén me míng zi</rt><rp>)</rp></ruby>` (complete, valid ruby element)
3. When answered correctly, renders answer (string or ruby)

**Example with multiple blanks:**

Input: `你BLANK我BLANK (nǐ BLANK wǒ BLANK)`

Output: `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>BLANK<ruby>我<rp>(</rp><rt>wǒ</rt><rp>)</rp></ruby>BLANK`

Renders as:

- `<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>`
- `<input />`
- `<ruby>我<rp>(</rp><rt>wǒ</rt><rp>)</rp></ruby>`
- `<input />`

## Edge Cases to Consider

1. **Multiple blanks in one sentence**
   - `你BLANK我BLANK (nǐ BLANK wǒ BLANK)` → Should count as 2 blanks
2. **Spaces around BLANK**
   - `你 BLANK 我BLANK (nǐ BLANK wǒ BLANK)` → Should count as 2 blanks
   - Spaces are part of the text nodes, not the BLANK token itself
3. **Blank in pinyin only (INVALID - must throw error)**

   - `你好 (nǐ hǎo BLANK)` → Should throw error: "BLANK must appear in hanzi portion"
   - The existing validation logic will catch this: if hanzi has 0 BLANKs but blanks array has entries, the counts won't match

4. **Mixed content**

   - Some parts in code blocks, some not → Current validation handles this

5. **Answer with both hanzi and pinyin**

   - `叫 (jiào)` → Store as `{ hanzi: "叫", pinyin: "jiào" }`

6. **Answer with only hanzi**

   - `你` → Store as string `"你"`

7. **Answer with only pinyin**
   - `nǐ` → Store as string `"nǐ"`

## Testing Strategy

1. **Unit tests** for parse-chinese utility
2. **Parser tests** for add-fill-in-the-blank with Chinese content
3. **Component tests** for rendering different answer formats
4. **Integration tests** for full challenge flow
5. **Regression tests** to ensure English challenges still work

## Backward Compatibility

- English challenges continue to work without changes (answer remains a string)
- Parser checks `lang === 'zh-CN'` before applying Chinese-specific logic
- Answer can be:
  - `string` for English challenges or single hanzi/pinyin
  - `{ hanzi: string, pinyin: string }` for Chinese with both
- Component handles both formats with simple type check
- Schema validation accepts both formats

## Alternative Approaches Considered

### Option A: Always use HTML for answers

**Pros:** Simple, no type changes needed
**Cons:** Requires dangerouslySetInnerHTML, harder to style, security concerns

### Option B: Count all BLANKs including pinyin

**Pros:** Simpler implementation
**Cons:** Content creators need to add extra answers for pinyin BLANKs, confusing UX

### Option C: Remove pinyin from sentence HTML entirely

**Pros:** Simplest counting logic
**Cons:** Loses valuable pronunciation guide for learners

**Selected: Current approach** provides the best balance of correctness, maintainability, and user experience.

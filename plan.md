# Plan: Simplify Fill-in-the-Blank Answer Format

# Plan: Simplify Fill-in-the-Blank Answer Format

## Context

Currently, the parser converts answers to discriminated union objects (`{ type: 'text', value: string }` or `{ type: 'hanzi-pinyin', value: { hanzi, pinyin } }`), and the sentence to HTML with ruby markup for Chinese.

**Problem**: The client's `parseBlanks()` expects plain text that can be split by 'BLANK', but then needs to render Chinese text as ruby elements. The current approach generates ruby HTML in the parser, but that HTML can't be properly parsed by `parseBlanks()` which splits by 'BLANK'.

**Solution**:

1. Parser returns sentence as plain text (e.g., `<p>BLANK好 (BLANK hǎo)</p>`)
2. Parser returns answers as plain strings (e.g., `"你 (nǐ)"` or `"are"`)
3. Client's `parseBlanks()` is enhanced to:
   - Split by 'BLANK'
   - Parse each text segment for Chinese patterns
   - Return structured data: `[{ type: 'text', hanzi: '好', pinyin: 'hǎo' }, { type: 'blank' }, ...]`

## Data Flow

```
Markdown → Parser (plain text) → GraphQL → Client parseBlanks() (structured) → Rendering
```

## New Understanding

The sentence parsing flow should be:

1. **Parser output**: `<p>BLANK好 (BLANK hǎo)</p>` (plain text)
2. **parseBlanks() splits by BLANK**: `['', '好 (', ' hǎo)']`
3. **Wait, that's wrong!** The pinyin has BLANKs too: `你BLANK我 (nǐ BLANK wǒ)`
4. **Need to parse the pattern first**, then split by BLANK in hanzi only
5. **parseBlanks() output**:
   ```typescript
   [
     { type: 'blank', index: 0 },
     { type: 'text', value: '好' } or { type: 'text', value: {hanzi: '好', pinyin: 'hǎo' }},
     { type: 'blank', index: 1 }
   ]
   ```

## Revised Approach

### For Sentence Parsing

The `parseBlanks()` function needs to be smart about Chinese patterns:

```typescript
function parseBlanks(sentence: string) {
  // 1. Check if sentence contains Chinese pattern: "hanzi (pinyin)"
  const chineseMatch = sentence.match(/^<p>(.+?)\s*\((.+?)\)<\/p>$/);

  if (chineseMatch) {
    // Chinese sentence with pinyin
    const hanzi = chineseMatch[1];
    const pinyin = chineseMatch[2];

    // Split by BLANK in hanzi (which determines the actual blanks)
    const hanziParts = hanzi.split('BLANK');
    const pinyinParts = pinyin.split('BLANK');

    // Build structured output
    const result = [];
    for (let i = 0; i < hanziParts.length; i++) {
      const hanziPart = hanziParts[i].trim();
      if (hanziPart) {
        const pinyinPart = (pinyinParts[i] || '').trim();
        result.push({
          type: 'text',
          value: {
            hanzi: hanziPart,
            pinyin: pinyinPart
          }
        });
      }
      if (i < hanziParts.length - 1) {
        result.push({ type: 'blank', index: i });
      }
    }
    return result;
  } else {
    // Non-Chinese sentence (existing logic)
    // Split by BLANK and create text/blank nodes
  }
}
```

**OR** we can reuse the parser's logic! The `chineseFillInTheBlankToHtml()` function already does the splitting correctly. We can:

1. Keep `chineseFillInTheBlankToHtml()` but move it to the client as a utility
2. Or create a similar function that returns structured data instead of HTML

### For Answer Format

Keep answers as plain strings:

- Chinese: `"你 (nǐ)"`
- Non-Chinese: `"are"`

Client parses these when needed for rendering or validation.

## Data Flow

```
Markdown → Parser → GraphQL Schema → Client Components
```

## Files to Update

### 1. Parser Layer

#### a. `tools/challenge-parser/parser/plugins/add-fill-in-the-blank.js`

- [x] Remove language-specific HTML conversion
- [x] Simplify `parseAnswer()` to return plain strings
- [x] Update `inputType` validation to check string pattern
- [x] Remove import of `createMdastToHtml`

#### b. `tools/challenge-parser/parser/plugins/utils/i18n-stringify.js`

- [ ] **KEEP** `chineseFillInTheBlankToHtml()` - we'll copy/adapt this logic to client
- [ ] Remove BLANK handling from `chineseInlineCodeHandler()` (only handles description/instructions, not fill-in-blank sentences)
- [ ] Keep `parseChinesePattern()` - still useful utility
- [ ] Keep exports as-is

#### c. `tools/challenge-parser/parser/plugins/utils/i18n-stringify.test.js`

- [ ] **KEEP** all tests - they serve as reference for client implementation

#### d. `tools/challenge-parser/parser/plugins/add-fill-in-the-blank.test.js`

- [x] Update all answer expectations to plain strings
- [x] Update test descriptions to reflect new behavior

### 2. GraphQL Schema Layer

#### e. `client/gatsby-node.js`

- [x] Update `Blank` type definition
  - Change `answer: JSON` to `answer: String`
  - This is the GraphQL schema that defines the data structure

### 3. Client Type Definitions

#### f. `client/src/redux/prop-types.ts`

- [x] Remove `FillInTheBlankAnswerText` type
- [x] Remove `FillInTheBlankAnswerHanziPinyin` type
- [x] Remove `FillInTheBlankAnswerData` discriminated union
- [x] Update `FillInTheBlankAnswer` type:
  ```typescript
  type FillInTheBlankAnswer = {
    answer: string; // Changed from FillInTheBlankAnswerData
    feedback: string | null;
  };
  ```

### 4. Client Parsing Utilities

#### g. `client/src/templates/Challenges/fill-in-the-blank/parse-blanks.ts`

- [x] Add `parseChinesePattern(text: string)` utility (similar to parser's version)
- [x] Update `parseBlanks()` to handle Chinese patterns:
  - Detect if sentence matches `hanzi (pinyin)` pattern
  - Split by BLANK in hanzi portion only (use logic similar to `chineseFillInTheBlankToHtml`)
  - Return structured data with `{ type: 'text', hanzi, pinyin }` for Chinese
  - Return structured data with `{ type: 'text', value }` for non-Chinese
  - Return `{ type: 'blank', index }` for blanks
- [x] Update return types:
  ```typescript
  type TextNode = {
    type: 'text';
    value: string | { hanzi: string; pinyin: string };
  };
  type BlankNode = { type: 'blank'; index: number };
  type ParagraphElement = TextNode | BlankNode;
  ```

### 5. Client Components

#### h. `client/src/templates/Challenges/components/fill-in-the-blanks.tsx`

- [x] Create utility function `parseAnswer(answer: string)` that:
  - Checks if answer matches `hanzi (pinyin)` pattern
  - Returns `{ hanzi, pinyin }` or `null`
- [x] Update `renderAnswer()` to:
  - Parse the string answer (now just a string, not discriminated union)
  - Render as ruby if Chinese pattern matched
  - Otherwise render as plain text
- [x] Update `getAnswerLength()` to:
  - Parse the string answer
  - Calculate length based on hanzi if Chinese pattern matched
  - Otherwise use string length
- [x] Update rendering of text nodes from `parseBlanks()`:
  - Check if `node.value` is an object (has `hanzi` property)
  - If yes, render as ruby: `<ruby>{value.hanzi}<rp>(</rp><rt>{value.pinyin}</rt><rp>)</rp></ruby>`
  - Otherwise render `value` as plain text

#### i. `client/src/templates/Challenges/fill-in-the-blank/show.tsx`

- [x] Update `handleSubmit()` validation logic:
  - Remove `answer.type === 'text'` check (answer is now always a string)
  - Parse answer string to check if it's Chinese pattern
  - Implement Chinese validation logic (compare hanzi or pinyin)
  - For plain text, use existing comparison logic

### 6. Tests

#### j. `client/src/templates/Challenges/fill-in-the-blank/parse-blanks.test.ts`

- [x] Add tests for Chinese pattern detection and parsing
- [x] Test that BLANK splitting works correctly with `hanzi (pinyin)` format
- [x] Verify structured output has correct `hanzi`/`pinyin` properties
- [x] Test mixed paragraphs (Chinese and non-Chinese)
- [x] Test edge cases (BLANK at end, spaces around BLANK, etc.)

#### k. Client component tests

- [ ] Search for and update any tests that reference `FillInTheBlankAnswerData` type
- [ ] Update tests that check `answer.type` or `answer.value`

## Implementation Order

1. ✅ Parser updates (already done - returns plain strings for answers)
2. ✅ GraphQL schema update (answer: JSON → String)
3. ✅ TypeScript type definitions (remove discriminated union)
4. ✅ Client parsing utilities (enhance parseBlanks for Chinese)
5. ✅ Client component updates (handle string answers, render parsed text nodes)
6. ✅ Client validation logic (parse and compare strings)
7. ⬜ Run all tests and fix any issues

## Key Implementation Details

### parseBlanks() Enhancement

The key challenge is parsing sentences like:

```
<p>BLANK好，BLANK是王华 (BLANK hǎo BLANK shì Wang Hua)</p>
```

Algorithm:

1. Extract content from `<p>` tags
2. Check if it matches pattern: `text (text)`
3. If yes:
   - Extract hanzi and pinyin portions
   - Split hanzi by BLANK → this determines the actual number of blanks
   - Split pinyin by BLANK (for ruby rendering)
   - Build array alternating text nodes (with hanzi/pinyin) and blank nodes
4. If no:
   - Use existing logic (split by BLANK, create text/blank nodes)

This logic can be adapted from `chineseFillInTheBlankToHtml()` in the parser.

## Testing Strategy

After each layer:

1. Run parser tests: `cd tools/challenge-parser && pnpm test add-fill-in-the-blank`
2. Run i18n-stringify tests: `cd tools/challenge-parser && pnpm test i18n-stringify`
3. Build client to check TypeScript errors: `cd client && pnpm build`
4. Run any client tests related to fill-in-the-blank
5. Manual testing with actual Chinese fill-in-the-blank challenge

## Key Decisions

1. **Answer format**: Plain strings (e.g., `"你 (nǐ)"` or `"are"`)
2. **Sentence format**: Plain HTML with `<p>` tags, no ruby markup (e.g., `<p>BLANK好 (BLANK hǎo)</p>`)
3. **Parsing responsibility**: Client handles all Chinese pattern parsing
4. **Validation**: Parser validates `inputType` by checking string pattern, client validates user input

## Benefits

- Simpler parser (language-agnostic)
- Single source of truth for Chinese pattern parsing (in client)
- Consistent data format (always strings)
- Client has full control over rendering
- No data duplication or transformation

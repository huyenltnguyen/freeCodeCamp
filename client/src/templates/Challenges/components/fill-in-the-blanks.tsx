import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spacer } from '@freecodecamp/ui';

import { parseBlanks } from '../fill-in-the-blank/parse-blanks';
import PrismFormatted from '../components/prism-formatted';
import { FillInTheBlank } from '../../../redux/prop-types';
import ChallengeHeading from './challenge-heading';

type FillInTheBlankProps = {
  fillInTheBlank: FillInTheBlank;
  answersCorrect: (boolean | null)[];
  showFeedback: boolean;
  feedback: string | null;
  showWrong: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Parses an answer string to check if it matches Chinese hanzi (pinyin) pattern
 * @param answer - The answer string
 * @returns Parsed hanzi and pinyin, or null if not matching
 */
function parseAnswer(answer: string): { hanzi: string; pinyin: string } | null {
  const match = answer.match(/^(.+?)\s*\((.+?)\)$/);

  if (!match) {
    return null;
  }

  return {
    hanzi: match[1].trim(),
    pinyin: match[2].trim()
  };
}

function FillInTheBlanks({
  fillInTheBlank: { sentence, blanks },
  answersCorrect,
  showFeedback,
  feedback,
  showWrong,
  handleInputChange
}: FillInTheBlankProps): JSX.Element {
  const { t } = useTranslation();

  const getInputClass = (index: number): string => {
    let cls = 'fill-in-the-blank-input';

    if (answersCorrect[index] === false) {
      cls += ' incorrect-blank-answer';
    }

    return cls;
  };

  const renderAnswer = (answer: string): React.ReactNode => {
    const parsed = parseAnswer(answer);

    if (parsed) {
      // Render Chinese with both hanzi and pinyin as ruby
      return (
        <ruby>
          {parsed.hanzi}
          <rp>(</rp>
          <rt>{parsed.pinyin}</rt>
          <rp>)</rp>
        </ruby>
      );
    }

    // Plain text answer
    return answer;
  };

  const getAnswerLength = (answer: string): number => {
    const parsed = parseAnswer(answer);

    if (parsed) {
      // TODO: Calculate the answer length with pinyin + tone
      // https://github.com/freeCodeCamp/language-curricula/issues/18
      return parsed.hanzi.length;
    }

    return answer.length;
  };

  const paragraphs = parseBlanks(sentence);
  const blankAnswers = blanks.map(b => b.answer);

  return (
    <>
      <ChallengeHeading heading={t('learn.fill-in-the-blank.heading')} />
      <Spacer size='xs' />
      <div className='fill-in-the-blank-wrap'>
        {paragraphs.map((p, i) => {
          return (
            // both keys, i and j, are stable between renders, since
            // the paragraphs are static.
            <p key={i}>
              {p.map((node, j) => {
                if (node.type === 'text') {
                  return <span key={j}>{node.value}</span>;
                }

                if (node.type === 'hanzi-pinyin') {
                  return (
                    <ruby key={j}>
                      {node.value.hanzi}
                      <rp>(</rp>
                      <rt>{node.value.pinyin}</rt>
                      <rp>)</rp>
                    </ruby>
                  );
                }

                const blankIndex = node.value;

                // If a blank is answered correctly, render the answer as part of the sentence.
                if (answersCorrect[blankIndex] === true) {
                  return (
                    <span key={j} className='correct-blank-answer'>
                      {renderAnswer(blankAnswers[blankIndex])}
                    </span>
                  );
                }

                const answerLength = getAnswerLength(blankAnswers[blankIndex]);

                return (
                  <input
                    key={j}
                    type='text'
                    maxLength={answerLength + 3}
                    className={getInputClass(blankIndex)}
                    onChange={handleInputChange}
                    data-index={blankIndex}
                    size={answerLength}
                    autoComplete='off'
                    aria-label={t('learn.fill-in-the-blank.blank')}
                    {...(answersCorrect[blankIndex] === false
                      ? { 'aria-invalid': 'true' }
                      : {})}
                  />
                );
              })}
            </p>
          );
        })}
      </div>
      <Spacer size='m' />
      <div aria-live='polite'>
        {showWrong && (
          <div className='text-center'>
            <span>{t('learn.wrong-answer')}</span>
            <Spacer size='m' />
          </div>
        )}
        {showFeedback && feedback && <PrismFormatted text={feedback} />}
      </div>
    </>
  );
}

FillInTheBlanks.displayName = 'FillInTheBlanks';

export default FillInTheBlanks;

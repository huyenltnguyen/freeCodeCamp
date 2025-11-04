import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spacer } from '@freecodecamp/ui';

import { parseBlanks } from '../fill-in-the-blank/parse-blanks';
import PrismFormatted from '../components/prism-formatted';
import {
  FillInTheBlank,
  FillInTheBlankAnswerData
} from '../../../redux/prop-types';
import ChallengeHeading from './challenge-heading';

type FillInTheBlankProps = {
  fillInTheBlank: FillInTheBlank;
  answersCorrect: (boolean | null)[];
  showFeedback: boolean;
  feedback: string | null;
  showWrong: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

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

  const getAnswerLength = (answer: FillInTheBlankAnswerData): number => {
    if (answer.type === 'text') {
      return answer.value.length;
    }

    // TODO: Calculate the answer length with pinyin + tone
    // https://github.com/freeCodeCamp/language-curricula/issues/18
    return answer.value.hanzi.length;
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
                const { type, value } = node;
                if (type === 'text') {
                  return value;
                }

                // If a blank is answered correctly, render the answer as part of the sentence.
                if (type === 'blank' && answersCorrect[value] === true) {
                  return (
                    <span key={j} className='correct-blank-answer'>
                      {renderAnswer(blankAnswers[value])}
                    </span>
                  );
                }

                const answerLength = getAnswerLength(blankAnswers[value]);

                return (
                  <input
                    key={j}
                    type='text'
                    maxLength={answerLength + 3}
                    className={getInputClass(value)}
                    onChange={handleInputChange}
                    data-index={node.value}
                    size={answerLength}
                    autoComplete='off'
                    aria-label={t('learn.fill-in-the-blank.blank')}
                    {...(answersCorrect[value] === false
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

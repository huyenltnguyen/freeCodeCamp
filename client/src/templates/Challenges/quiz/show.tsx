import { graphql, navigate } from 'gatsby';
import React, { useEffect, useRef, useState } from 'react';
import Helmet from 'react-helmet';
import { ObserveKeys } from 'react-hotkeys';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';
import { useLocation } from '@reach/router';
import { Container, Col, Row, Button, Quiz, useQuiz } from '@freecodecamp/ui';

// Local Utilities
import { shuffleArray } from '../../../../../shared/utils/shuffle-array';
import Spacer from '../../../components/helpers/spacer';
import LearnLayout from '../../../components/layouts/learn';
import { ChallengeNode, ChallengeMeta, Test } from '../../../redux/prop-types';
import ChallengeDescription from '../components/challenge-description';
import Hotkeys from '../components/hotkeys';
import ChallengeTitle from '../components/challenge-title';
import {
  challengeMounted,
  updateChallengeMeta,
  openModal,
  closeModal,
  updateSolutionFormValues,
  initTests,
  submitChallenge
} from '../redux/actions';
import { isChallengeCompletedSelector } from '../redux/selectors';
import PrismFormatted from '../components/prism-formatted';
import { usePageLeave } from '../hooks';
import ExitQuizModal from './exit-quiz-modal';
import FinishQuizModal from './finish-quiz-modal';

import './show.css';

// Redux Setup
const mapStateToProps = createSelector(
  isChallengeCompletedSelector,
  (isChallengeCompleted: boolean) => ({
    isChallengeCompleted
  })
);
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      initTests,
      updateChallengeMeta,
      challengeMounted,
      updateSolutionFormValues,
      submitChallenge,
      openExitQuizModal: () => openModal('exitQuiz'),
      closeExitQuizModal: () => closeModal('exitQuiz'),
      openFinishQuizModal: () => openModal('finishQuiz'),
      closeFinishQuizModal: () => closeModal('finishQuiz')
    },
    dispatch
  );

// Types
interface ShowQuizProps {
  challengeMounted: (arg0: string) => void;
  data: { challengeNode: ChallengeNode };
  description: string;
  initTests: (xs: Test[]) => void;
  isChallengeCompleted: boolean;
  pageContext: {
    challengeMeta: ChallengeMeta;
  };
  submitChallenge: () => void;
  updateChallengeMeta: (arg0: ChallengeMeta) => void;
  updateSolutionFormValues: () => void;
  openExitQuizModal: () => void;
  closeExitQuizModal: () => void;
  openFinishQuizModal: () => void;
  closeFinishQuizModal: () => void;
}

const ShowQuiz = ({
  challengeMounted,
  data: {
    challengeNode: {
      challenge: {
        fields: { tests, blockHashSlug },
        title,
        description,
        challengeType,
        helpCategory,
        superBlock,
        block,
        translationPending,
        quizzes
      }
    }
  },
  pageContext: { challengeMeta },
  initTests,
  updateChallengeMeta,
  submitChallenge,
  isChallengeCompleted,
  openExitQuizModal,
  closeExitQuizModal,
  openFinishQuizModal,
  closeFinishQuizModal
}: ShowQuizProps) => {
  const { t } = useTranslation();
  const curLocation = useLocation();

  const { nextChallengePath, prevChallengePath } = challengeMeta;
  const container = useRef<HTMLElement | null>(null);

  // Campers are not allowed to change their answers once the quiz is submitted.
  // `hasSubmitted` is used as a flag to disable the quiz.
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // `isPassed` is used as a flag to conditionally render the test or submit button.
  const [isPassed, setIsPassed] = useState(false);

  const [unansweredList, setUnansweredList] = useState<number[]>([]);

  const blockNameTitle = `${t(
    `intro:${superBlock}.blocks.${block}.title`
  )} - ${title}`;

  const [quizId] = useState(Math.floor(Math.random() * quizzes.length));
  const quiz = quizzes[quizId].questions;

  // Initialize the data passed to `useQuiz`
  const [initialQuizData] = useState(
    quiz.map(question => {
      const distractors = question.distractors.map((distractor, index) => {
        return {
          label: (
            <PrismFormatted className='quiz-answer-label' text={distractor} />
          ),
          value: index + 1
        };
      });

      const answer = {
        label: (
          <PrismFormatted
            className='quiz-answer-label'
            text={question.answer}
          />
        ),
        value: 4
      };

      return {
        question: <PrismFormatted text={question.text} />,
        answers: shuffleArray([...distractors, answer]),
        correctAnswer: answer.value
      };
    })
  );

  const {
    questions: quizData,
    validateAnswers,
    validated,
    correctAnswerCount
  } = useQuiz({
    initialQuestions: initialQuizData,
    validationMessages: {
      correct: t('learn.quiz.correct-answer'),
      incorrect: t('learn.quiz.incorrect-answer')
    },
    passingGrade: 80,
    onSuccess: () => setIsPassed(true),
    onFailure: () => setIsPassed(false)
  });

  useEffect(() => {
    initTests(tests);
    updateChallengeMeta({
      ...challengeMeta,
      title,
      challengeType,
      helpCategory
    });
    challengeMounted(challengeMeta.id);
    container.current?.focus();
    // This effect should be run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateChallengeMeta({
      ...challengeMeta,
      title,
      challengeType,
      helpCategory
    });
    challengeMounted(challengeMeta.id);
  }, [
    title,
    challengeMeta,
    challengeType,
    helpCategory,
    challengeMounted,
    updateChallengeMeta
  ]);

  const handleFinishQuiz = () => {
    const unanswered = quizData.reduce<number[]>(
      (acc, curr, id) => (curr.selectedAnswer == null ? [...acc, id + 1] : acc),
      []
    );

    setUnansweredList(unanswered);

    if (unanswered.length === 0) {
      openFinishQuizModal();
    }
  };

  const handleFinishQuizModalBtnClick = () => {
    validateAnswers();
    setHasSubmitted(true);
    closeFinishQuizModal();
  };

  const handleSubmitAndGo = () => {
    submitChallenge();
  };

  const handleExitQuiz = () => {
    openExitQuizModal();
  };

  const handleExitQuizModalBtnClick = () => {
    void navigate(blockHashSlug);
    closeExitQuizModal();
  };

  usePageLeave({
    depArr: [hasSubmitted, isPassed],
    onWindowClose: event => {
      event.preventDefault();
      window.confirm(t('misc.navigation-warning'));
    },
    onHistoryChange: () => {
      // When campers have submitted the quiz:
      // - If they don't pass, the Finish Quiz button is disabled, there isn't anything for them to do other than leaving the page
      // - If they pass, the Submit-and-go button shows up, and campers should be allowed to leave the page
      // We don't block navigation in both cases.
      if (hasSubmitted) {
        return;
      }

      if (!window.confirm(t('misc.navigation-warning'))) {
        void navigate(`${curLocation.pathname}`);
      }
    }
  });

  function getErrorMessage() {
    if (unansweredList.length > 0) {
      return t('learn.quiz.unanswered-questions', {
        unansweredQuestions: unansweredList.join(', ')
      });
    }

    if (validated) {
      // TODO: Update the message to include link(s) to the review materials
      // if campers didn't pass the quiz.
      return t('learn.quiz.have-n-correct-questions', {
        correctAnswerCount,
        total: quiz.length
      });
    }

    return '';
  }

  const errorMessage = getErrorMessage();

  return (
    <Hotkeys
      executeChallenge={!isPassed ? handleFinishQuiz : handleSubmitAndGo}
      containerRef={container}
      nextChallengePath={nextChallengePath}
      prevChallengePath={prevChallengePath}
    >
      <LearnLayout>
        <Helmet
          title={`${blockNameTitle} | ${t('learn.learn')} | freeCodeCamp.org`}
        />
        <Container className='quiz-challenge-container'>
          <Row>
            <Spacer size='medium' />
            <ChallengeTitle
              isCompleted={isChallengeCompleted}
              translationPending={translationPending}
            >
              {title}
            </ChallengeTitle>

            <Col md={8} mdOffset={2} sm={10} smOffset={1} xs={12}>
              <ChallengeDescription description={description} />
              <ObserveKeys>
                <Quiz questions={quizData} disabled={hasSubmitted} />
              </ObserveKeys>
              <Spacer size='medium' />
              <div aria-live='polite' aria-atomic='true'>
                {errorMessage}
              </div>
              <Spacer size='medium' />
              {!isPassed ? (
                <>
                  <Button
                    block={true}
                    variant='primary'
                    onClick={handleFinishQuiz}
                    disabled={hasSubmitted}
                  >
                    {t('buttons.finish-quiz')}
                  </Button>
                </>
              ) : (
                <Button
                  block={true}
                  variant='primary'
                  onClick={handleSubmitAndGo}
                >
                  {t('buttons.submit-and-go')}
                </Button>
              )}
              <Spacer size='xxSmall' />
              <Button block={true} variant='primary' onClick={handleExitQuiz}>
                {t('buttons.exit-quiz')}
              </Button>
              <Spacer size='large' />
            </Col>
          </Row>
        </Container>
        <ExitQuizModal onExit={handleExitQuizModalBtnClick} />
        <FinishQuizModal onFinish={handleFinishQuizModalBtnClick} />
      </LearnLayout>
    </Hotkeys>
  );
};

ShowQuiz.displayName = 'ShowQuiz';

export default connect(mapStateToProps, mapDispatchToProps)(ShowQuiz);

export const query = graphql`
  query QuizChallenge($id: String!) {
    challengeNode(id: { eq: $id }) {
      challenge {
        title
        description
        challengeType
        helpCategory
        superBlock
        block
        fields {
          blockHashSlug
          blockName
          slug
          tests {
            text
            testString
          }
        }
        quizzes {
          questions {
            distractors
            text
            answer
          }
        }
        translationPending
      }
    }
  }
`;

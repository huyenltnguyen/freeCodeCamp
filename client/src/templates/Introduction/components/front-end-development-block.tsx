import React from 'react';
import ScrollableAnchor from 'react-scrollable-anchor';
import { useTranslation } from 'react-i18next';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import envData from '../../../../config/env.json';
import { Link } from '../../../components/helpers';
import { ChallengeNode, CompletedChallenge } from '../../../redux/prop-types';
import { BlockTypes } from '../../../../../shared/config/blocks';
import { SuperBlocks } from '../../../../../shared/config/curriculum';
import { makeExpandedBlockSelector, toggleBlock } from '../redux';
import { completedChallengesSelector } from '../../../redux/selectors';
import { isAuditedSuperBlock } from '../../../../../shared/utils/is-audited';
import { playTone } from '../../../utils/tone';
import GreenNotCompleted from '../../../assets/icons/green-not-completed';
import GreenPass from '../../../assets/icons/green-pass';
import DropDownIcon from '../../../assets/icons/dropdown';
import { ProgressBar } from '../../../components/Progress/progress-bar';
import Challenges from './challenges';

import './front-end-development-block.css';

const { curriculumLocale, showUpcomingChanges, showNewCurriculum } = envData;

const mapStateToProps = (
  state: unknown,
  ownProps: { blockDashedName: string }
) => {
  const expandedSelector = makeExpandedBlockSelector(ownProps.blockDashedName);

  return createSelector(
    expandedSelector,
    completedChallengesSelector,
    (isExpanded: boolean, completedChallenges: CompletedChallenge[]) => ({
      isExpanded,
      completedChallengeIds: completedChallenges.map(({ id }) => id)
    })
  )(state as Record<string, unknown>);
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ toggleBlock }, dispatch);

interface BlockProps {
  blockDashedName: string;
  challenges: ChallengeNode[];
  completedChallengeIds: string[];
  isExpanded: boolean;
  toggleBlock: typeof toggleBlock;
  // blockTitle: string;
  // isAudited?: boolean;
  // challengesWithCompleted: Array<any>;
  // blockIntroArr: Array<string>
  // isBlockCompleted: boolean
}

type ChallengeWithCompleted = ChallengeNode['challenge'] & {
  isCompleted: boolean;
};

const CheckMark = ({ isCompleted }: { isCompleted: boolean }) => {
  // Since svg elements don't have pseudo elements,
  // we need to wrap the icons in a div and create a pseudo element from it to draw the path.
  return isCompleted ? (
    <div className='fed-block-checkmark-container'>
      <GreenPass hushScreenReaderText className='fed-block-checkmark' />
    </div>
  ) : (
    <div className='fed-block-checkmark-container'>
      <GreenNotCompleted hushScreenReaderText className='fed-block-checkmark' />
    </div>
  );
};

const BlockIntros = ({ intros }: { intros: string[] }): JSX.Element => {
  return (
    <div className='block-description'>
      {intros.map((title, i) => (
        <p dangerouslySetInnerHTML={{ __html: title }} key={i} />
      ))}
    </div>
  );
};

const FrontEndDevelopmentListBlock = ({
  blockDashedName,
  challenges,
  completedChallengeIds,
  toggleBlock
  // blockTitle,
  // isAudited,
  // challengesWithCompleted,
  // blockIntroArr,
  // isBlockCompleted
}: BlockProps) => {
  const { t } = useTranslation();
  const superBlock = SuperBlocks.FrontEndDevelopment;

  let completedCount = 0;

  const challengesWithCompleted: ChallengeWithCompleted[] = challenges.map(
    ({ challenge }) => {
      const { id } = challenge;
      const isCompleted = completedChallengeIds.some(
        (completedChallengeId: string) => completedChallengeId === id
      );
      if (isCompleted) {
        completedCount++;
      }
      return { ...challenge, isCompleted };
    }
  );

  const isAudited = isAuditedSuperBlock(curriculumLocale, superBlock, {
    showNewCurriculum,
    showUpcomingChanges
  });

  const blockTitle = t(`intro:${superBlock}.blocks.${blockDashedName}.title`);

  const blockIntroArr = t(
    `intro:${superBlock}.blocks.${blockDashedName}.intro`
  ) as unknown as Array<string>;

  const isBlockCompleted = completedCount === challengesWithCompleted.length;

  const handleBlockClick = () => {
    void playTone('block-toggle');
    toggleBlock(blockDashedName);
  };

  return (
    <ScrollableAnchor id={blockDashedName}>
      <div className='fed-block-container'>
        <CheckMark isCompleted={isBlockCompleted} />
        <div className='block block-grid grid-project-block'>
          <div className='tags-wrapper'>
            {!isAudited && (
              <Link
                className='cert-tag'
                to={t('links:help-translate-link-url')}
              >
                {t('misc.translation-pending')}{' '}
                <span className='sr-only'>{blockTitle}</span>
              </Link>
            )}
          </div>
          <div className='title-wrapper map-title'>
            <h3 className='block-grid-title'>
              <Link
                className='block-header'
                onClick={handleBlockClick}
                to={challengesWithCompleted[0].fields.slug}
              >
                {blockTitle}
              </Link>
            </h3>
          </div>
          <BlockIntros intros={blockIntroArr} />
        </div>
      </div>
    </ScrollableAnchor>
  );
};

const FrontEndDevelopmentGridBlock = ({
  blockDashedName,
  challenges,
  completedChallengeIds,
  isExpanded,
  toggleBlock
  // blockTitle,
  // isAudited,
  // challengesWithCompleted,
  // blockIntroArr,
  // isBlockCompleted
}: BlockProps) => {
  const { t } = useTranslation();
  const superBlock = SuperBlocks.FrontEndDevelopment;

  let completedCount = 0;

  const challengesWithCompleted: ChallengeWithCompleted[] = challenges.map(
    ({ challenge }) => {
      const { id } = challenge;
      const isCompleted = completedChallengeIds.some(
        (completedChallengeId: string) => completedChallengeId === id
      );
      if (isCompleted) {
        completedCount++;
      }
      return { ...challenge, isCompleted };
    }
  );

  const isAudited = isAuditedSuperBlock(curriculumLocale, superBlock, {
    showNewCurriculum,
    showUpcomingChanges
  });

  const blockTitle = t(`intro:${superBlock}.blocks.${blockDashedName}.title`);

  const blockIntroArr = t(
    `intro:${superBlock}.blocks.${blockDashedName}.intro`
  ) as unknown as Array<string>;

  const isBlockCompleted = completedCount === challengesWithCompleted.length;

  const percentageCompleted = Math.floor(
    (completedCount / challengesWithCompleted.length) * 100
  );

  const courseCompletionStatus = () => {
    if (completedCount === 0) {
      return t('learn.not-started');
    }
    if (completedCount === challengesWithCompleted.length) {
      return t('learn.completed');
    }
    return `${percentageCompleted}% ${t('learn.completed')}`;
  };

  const progressBarRender = (
    <div aria-hidden='true' className='progress-wrapper'>
      <div>
        <ProgressBar now={percentageCompleted} />
      </div>
      <span>{`${percentageCompleted}%`}</span>
    </div>
  );

  const handleBlockClick = () => {
    void playTone('block-toggle');
    toggleBlock(blockDashedName);
  };

  return (
    <ScrollableAnchor id={blockDashedName}>
      <div className='fed-block-container'>
        <CheckMark isCompleted={isBlockCompleted} />
        <div className={`block block-grid ${isExpanded ? 'open' : ''}`}>
          <h3 className='block-grid-title'>
            <button
              aria-expanded={isExpanded ? 'true' : 'false'}
              aria-controls={`${blockDashedName}-panel`}
              className='block-header'
              onClick={handleBlockClick}
            >
              <span className='block-header-button-text map-title'>
                <span>
                  {blockTitle}
                  <span className='sr-only'>, {courseCompletionStatus()}</span>
                </span>
                <DropDownIcon />
              </span>
              {!isExpanded &&
                !isBlockCompleted &&
                completedCount > 0 &&
                progressBarRender}
              <BlockIntros intros={blockIntroArr} />
            </button>
          </h3>
          {!isAudited && (
            <div className='tags-wrapper'>
              <Link
                className='cert-tag'
                to={t('links:help-translate-link-url')}
              >
                {t('misc.translation-pending')}
              </Link>
            </div>
          )}
          {isExpanded && (
            <div id={`${blockDashedName}-panel`}>
              <Challenges
                challengesWithCompleted={challengesWithCompleted}
                isProjectBlock={false}
                isGridMap
                blockTitle={blockTitle}
              />
            </div>
          )}
        </div>
      </div>
    </ScrollableAnchor>
  );
};

const FrontEndDevelopmentBlock = (props: BlockProps) => {
  const challenges = props.challenges;

  const isGridBased = challenges.some(
    ({ challenge }) => challenge.blockType === BlockTypes.workshop
  );

  return isGridBased ? (
    <FrontEndDevelopmentGridBlock {...props} />
  ) : (
    <FrontEndDevelopmentListBlock {...props} />
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FrontEndDevelopmentBlock);

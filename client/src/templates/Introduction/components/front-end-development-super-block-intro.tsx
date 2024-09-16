import React from 'react';

import type { ChallengeNode } from '../../../redux/prop-types';
import FrontEndDevelopmentBlock from './front-end-development-block';
import './front-end-development-super-block-intro.css';

interface SuperBlockProps {
  nodesForSuperBlock: ChallengeNode[];
}

enum FedChapters {
  Html = 'html'
  // Css = 'css'
}

enum FedModules {
  BasicHtml = 'basic-html',
  SemanticHtml = 'semantic-html',
  HtmlFormsAndTables = 'html-forms-and-tables'
  // BasicCss = 'basic-css',
  // DesignForDevelopers = 'design-for-developers'
}

enum FedBlocks {
  // Basic HTML
  WorkshopCatPhotoApp = 'workshop-cat-photo-app',
  LabRecipePage = 'lab-recipe-page',
  LabTravelAgencyPage = 'lab-travel-agency-page',
  // Semantic HTML
  WorkshopBlogPage = 'workshop-blog-page',
  // HTML Forms and Tables
  WorkshopHotelFeedbackForm = 'workshop-hotel-feedback-form',
  LabSurveyForm = 'lab-survey-form'
}

type FedModule = FedBlocks[];
type FedChapter = Record<FedModules, FedModule>;
type FedSuperBlock = Record<FedChapters, FedChapter>;

const frontEndDevelopmentSuperBlock: FedSuperBlock = {
  [FedChapters.Html]: {
    [FedModules.BasicHtml]: [
      FedBlocks.WorkshopCatPhotoApp,
      FedBlocks.LabRecipePage,
      FedBlocks.LabTravelAgencyPage
    ],
    [FedModules.SemanticHtml]: [FedBlocks.WorkshopBlogPage],
    [FedModules.HtmlFormsAndTables]: [
      FedBlocks.WorkshopHotelFeedbackForm,
      FedBlocks.LabSurveyForm
    ]
  }

  // [FedChapters.Css]: {
  //   [FedModules.BasicCss]: []
  // }
};

const Module = ({
  title,
  blocks,
  nodesForSuperBlock
}: {
  title: string;
  blocks: FedBlocks[];
  nodesForSuperBlock: ChallengeNode[];
}) => {
  return (
    <div className='fed-super-block-intro-module'>
      <h4>{title}</h4>
      {blocks.map(block => (
        <FrontEndDevelopmentBlock
          key={block}
          blockDashedName={block}
          challenges={nodesForSuperBlock.filter(
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison */
            node => node.challenge.block === block
          )}
        />
      ))}
    </div>
  );
};

const Chapter = ({
  title,
  dashedName,
  nodesForSuperBlock
}: {
  title: string;
  dashedName: FedChapters;
  nodesForSuperBlock: ChallengeNode[];
}) => {
  const modules = Object.values(FedModules);

  return (
    <div>
      <h3>{title}</h3>
      {modules.map(mod => {
        const blocks = Object.values(
          frontEndDevelopmentSuperBlock[dashedName][mod]
        );

        return (
          <Module
            key={mod}
            nodesForSuperBlock={nodesForSuperBlock}
            title={mod}
            blocks={blocks}
          />
        );
      })}
    </div>
  );
};

export const FrontEndDevelopmentSuperBlockIntro = ({
  nodesForSuperBlock
}: SuperBlockProps) => {
  const chapters = Object.values(FedChapters);

  return (
    <>
      {chapters.map(chapter => (
        <Chapter
          key={chapter}
          title={chapter}
          dashedName={chapter}
          nodesForSuperBlock={nodesForSuperBlock}
        />
      ))}
    </>
  );
};

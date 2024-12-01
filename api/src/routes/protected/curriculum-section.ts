import { type FastifyPluginCallbackTypebox } from '@fastify/type-provider-typebox';
import {
  CompletedBlock,
  CompletedChallenge,
  CompletedChapter,
  CompletedModule
} from '@prisma/client';
import { groupBy, isArray, isEmpty, max, uniq } from 'lodash';

import * as schemas from '../../schemas';
import { getBlocks } from '../../utils/get-blocks';
import { getChallenges } from '../../utils/get-challenges';

const getInformationForUpdate = ({
  id: sectionId,
  completedSections,
  completedDate
}: {
  id: undefined | string;
  completedSections: CompletedBlock[] | CompletedModule[] | CompletedChapter[];
  completedDate: number;
}) => {
  const alreadyCompletedSection = sectionId
    ? completedSections.find(({ id }) => sectionId === id)
    : undefined;

  const newCompletedSections =
    !sectionId || alreadyCompletedSection
      ? completedSections
      : [
          ...completedSections,
          {
            id: sectionId,
            completedDate
          }
        ];

  return { alreadyCompletedSection, newCompletedSections };
};

const getReturnValue = ({
  id,
  alreadyCompletedSection,
  completedDate
}: {
  id: undefined | string;
  alreadyCompletedSection:
    | undefined
    | CompletedBlock
    | CompletedModule
    | CompletedChapter;
  completedDate: number;
}) => {
  if (!id) return null;

  return {
    id,
    alreadyCompleted: !!alreadyCompletedSection,
    completedDate: alreadyCompletedSection?.completedDate || completedDate
  };
};

const syncBlocksCompletionState = ({
  completedChallenges
}: {
  completedChallenges: CompletedChallenge[];
}) => {
  // Get all challenges, except certification ones
  const allChallenges = getChallenges().filter(({ block }) => !!block);
  const allBlocks = getBlocks();
  const challengesByBlock = groupBy(allChallenges, 'block');

  const completedBlocks = allBlocks.reduce((acc, curr) => {
    const challengeIds = challengesByBlock[curr]?.map(({ id }) => id);
    const completeChallengesInBlock = completedChallenges.filter(({ id }) =>
      challengeIds?.includes(id)
    );

    if (challengeIds?.length !== completeChallengesInBlock?.length) {
      return acc;
    }

    const date = completeChallengesInBlock.reduce(
      (acc, curr) => (curr.completedDate > acc ? curr.completedDate : acc),
      0
    );

    return [
      ...acc,
      {
        id: curr,
        completedDate: date
      }
    ];
  }, [] as CompletedBlock[]);

  return completedBlocks;
};

/**
 * Plugin for the module submission endpoints.
 *
 * @param fastify The Fastify instance.
 * @param _options Options passed to the plugin via `fastify.register(plugin, options)`.
 * @param done The callback to signal that the plugin is ready.
 */
export const curriculumSectionRoutes: FastifyPluginCallbackTypebox = (
  fastify,
  _options,
  done
) => {
  fastify.post(
    '/curriculum-section-completed',
    {
      schema: schemas.curriculumSectionCompleted,
      errorHandler(error, request, reply) {
        if (error.validation) {
          void reply.code(400);
          return {
            type: 'error',
            message:
              'That does not appear to be a valid curriculum section submission.'
          };
        } else {
          fastify.errorHandler(error, request, reply);
        }
      }
    },
    async req => {
      const { blockId, moduleId, chapterId } = req.body;
      const userId = req.user?.id;

      const user = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          completedChallenges: true,
          completedBlocks: true,
          completedModules: true,
          completedChapters: true
        }
      });

      let unsyncedCompletedBlocks: CompletedBlock[] = [];
      if (isEmpty(user.completedBlocks)) {
        unsyncedCompletedBlocks = syncBlocksCompletionState({
          completedChallenges: user.completedChallenges
        });
      }
      console.log('🚀 ~ unsyncedCompletedBlocks:', unsyncedCompletedBlocks);

      const completedDate = Date.now();

      const {
        alreadyCompletedSection: alreadyCompletedBlock,
        newCompletedSections: newCompletedBlocks
      } = getInformationForUpdate({
        id: blockId,
        completedSections: user.completedBlocks,
        completedDate
      });

      const {
        alreadyCompletedSection: alreadyCompletedModule,
        newCompletedSections: newCompletedModules
      } = getInformationForUpdate({
        id: moduleId,
        completedSections: user.completedModules,
        completedDate
      });

      const {
        alreadyCompletedSection: alreadyCompletedChapter,
        newCompletedSections: newCompletedChapters
      } = getInformationForUpdate({
        id: chapterId,
        completedSections: user.completedChapters,
        completedDate
      });

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          completedBlocks: [...newCompletedBlocks, ...unsyncedCompletedBlocks],
          completedModules: newCompletedModules,
          completedChapters: newCompletedChapters
        }
      });

      return {
        block: getReturnValue({
          id: blockId,
          alreadyCompletedSection: alreadyCompletedBlock,
          completedDate
        }),
        module: getReturnValue({
          id: moduleId,
          alreadyCompletedSection: alreadyCompletedModule,
          completedDate
        }),
        chapter: getReturnValue({
          id: chapterId,
          alreadyCompletedSection: alreadyCompletedChapter,
          completedDate
        })
      };
    }
  );

  done();
};

import { uniq } from 'lodash';
import { getChallenges } from './get-challenges';

/**
 * Get all blocks from the whole curricula.
 * @returns An array of blocks.
 */
export const getBlocks = () => {
  const allChallenges = getChallenges();

  // Need a null check because certifications are presented in the challenge list,
  // but those items don't have a `block` property.
  const allBlocks = uniq(
    allChallenges.map(({ block }) => block).filter(block => !!block)
  ) as string[];

  return allBlocks;
};

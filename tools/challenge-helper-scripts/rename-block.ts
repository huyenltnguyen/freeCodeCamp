import { readdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { prompt } from 'inquirer';
import { format } from 'prettier';

import { SuperBlocks } from '../../shared/config/curriculum';
import {
  getSuperblockStructure,
  getSuperblockStructurePath,
  getBlockStructurePath
} from '../../curriculum/src/file-handler';
import { superBlockToFilename } from '../../curriculum/src/build-curriculum';
import { getAllBlocks, validateBlockName } from './utils';

const CHALLENGES_PATH = path.resolve(
  __dirname,
  '../../curriculum/challenges/english/blocks'
);

const INTRO_PATH = path.resolve(
  __dirname,
  '../../client/i18n/locales/english/intro.json'
);

type SuperblockStructure =
  | { blocks: string[] }
  | {
      blocks: {
        [key: string]: {
          title: string;
          order: number;
        };
      };
    };

type Intro = {
  [key: string]: {
    title: string;
    intro: string[];
  };
};

async function formatJson(data: unknown): Promise<string> {
  return format(JSON.stringify(data), { parser: 'json' });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

async function writeJsonFile(
  filePath: string,
  data: unknown,
  addNewline = false
): Promise<void> {
  const formatted = await formatJson(data);
  await writeFile(filePath, addNewline ? formatted : formatted);
}

function findSuperblock(block: string): SuperBlocks | null {
  for (const [superBlock, filename] of Object.entries(
    superBlockToFilename as Record<SuperBlocks, string>
  )) {
    const structure = getSuperblockStructure(filename);

    // Handle blocks as an array of strings
    if (Array.isArray(structure.blocks) && structure.blocks.includes(block)) {
      return superBlock as SuperBlocks;
    }

    // Handle blocks as an object with block names as keys
    if (
      structure.blocks &&
      !Array.isArray(structure.blocks) &&
      Object.keys(structure.blocks).includes(block)
    ) {
      return superBlock as SuperBlocks;
    }
  }
  return null;
}

async function updateSuperblockStructure(
  superblockName: SuperBlocks,
  oldName: string,
  newName: string
): Promise<void> {
  const filename = (superBlockToFilename as Record<SuperBlocks, string>)[
    superblockName
  ];
  const filePath = getSuperblockStructurePath(filename);
  const structure = await readJsonFile<SuperblockStructure>(filePath);

  // Handle blocks as an array of strings
  if (Array.isArray(structure.blocks)) {
    const index = structure.blocks.indexOf(oldName);
    if (index !== -1) {
      structure.blocks[index] = newName;
    }
  }
  // Handle blocks as an object with block names as keys
  else if (structure.blocks && typeof structure.blocks === 'object') {
    const blockData = structure.blocks[oldName];
    delete structure.blocks[oldName];
    structure.blocks[newName] = blockData;
  }

  const formatted = await formatJson(structure);
  await writeFile(filePath, formatted + '\n');
}

async function updateIntroJson(
  superblockName: SuperBlocks,
  oldName: string,
  newName: string
): Promise<void> {
  const intro = await readJsonFile<{ [key: string]: { blocks: Intro } }>(
    INTRO_PATH
  );
  const blockData = intro[superblockName].blocks[oldName];
  delete intro[superblockName].blocks[oldName];
  intro[superblockName].blocks[newName] = blockData;

  await writeJsonFile(INTRO_PATH, intro);
}

async function updateBlockJson(
  oldName: string,
  newName: string
): Promise<void> {
  const oldJsonPath = getBlockStructurePath(oldName);
  const newJsonPath = getBlockStructurePath(newName);

  const blockData = await readJsonFile<{ dashedName: string }>(oldJsonPath);
  blockData.dashedName = newName;

  await writeJsonFile(newJsonPath, blockData);
  await unlink(oldJsonPath);
}

async function updateMarkdownFiles(
  oldName: string,
  newName: string
): Promise<void> {
  const blockPath = path.join(CHALLENGES_PATH, newName);
  const files = await readdir(blockPath);

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(blockPath, file);
      const content = await readFile(filePath, 'utf-8');
      const updatedContent = content.replace(
        /^dashedName: .+$/m,
        `dashedName: ${newName}`
      );
      await writeFile(filePath, updatedContent);
    }
  }
}

async function renameChallengeDir(
  oldName: string,
  newName: string
): Promise<void> {
  const oldPath = path.join(CHALLENGES_PATH, oldName);
  const newPath = path.join(CHALLENGES_PATH, newName);
  await rename(oldPath, newPath);
}

async function main(): Promise<void> {
  const existingBlocks = await getAllBlocks();

  const { block } = await prompt<{ block: string }>([
    {
      type: 'input',
      name: 'block',
      message: 'Which block would you like to rename (dashed-name)?',
      validate: (input: string): true | string => {
        const trimmed = input.trim();
        if (!trimmed.length) {
          return 'Please provide a block name';
        }
        if (!existingBlocks.includes(trimmed)) {
          return `Block "${trimmed}" not found`;
        }
        return true;
      },
      filter: (input: string) => input.trim()
    }
  ]);

  // Remove the old block name from the list so validateBlockName doesn't
  // complain about the block we're renaming, but we still check that
  // newName !== oldName separately below
  const remainingBlocks = existingBlocks.filter(b => b !== block);

  const { newName } = await prompt<{ newName: string }>([
    {
      type: 'input',
      name: 'newName',
      message: `Enter new dashed-name`,
      validate: (input: string): true | string => {
        const trimmed = input.trim();
        if (!trimmed.length) {
          return 'Please provide a new name';
        }
        if (trimmed === block) {
          return 'New name must be different from the current name';
        }
        return validateBlockName(trimmed, remainingBlocks);
      },
      filter: (input: string) => input.trim()
    }
  ]);

  const superblockName = findSuperblock(block);
  if (!superblockName) {
    throw new Error(`Could not find superblock for block "${block}"`);
  }

  await updateSuperblockStructure(superblockName, block, newName);
  await updateIntroJson(superblockName, block, newName);
  await updateBlockJson(block, newName);
  await renameChallengeDir(block, newName);
  await updateMarkdownFiles(block, newName);

  console.log(`Successfully renamed "${block}" to "${newName}".`);
}

void main().catch(err => {
  // keep the error visible for debugging during manual runs
  console.error(err);
  process.exitCode = 1;
});

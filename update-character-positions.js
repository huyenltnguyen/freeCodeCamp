#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readdir, readFile, writeFile } = require('fs/promises');

// Character classifications
const TALL_CHARACTERS = ['Camila', 'Julieta', 'Mateo'];
const SHORT_CHARACTERS = [
  'Ángela',
  'Angela',
  'Elena',
  'Luna',
  'Esteban',
  'Sebastián',
  'Sebastian'
];

// Position configurations
const POSITIONS = {
  tall: { y: 18, z: 1.5 },
  short: { y: 25, z: 1.5 },
  dialogue: { y: 17, z: 1.5 }
};

// Command-line argument parsing
const args = process.argv.slice(2);
const flags = {
  characterType: null, // 'tall' or 'short'
  sceneType: null, // 'task' or 'dialogue'
  dryRun: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();

  if (arg === '--help' || arg === '-h') {
    flags.help = true;
  } else if (arg === '--dry-run' || arg === '-d') {
    flags.dryRun = true;
  } else if (arg === '--tall' || arg === '-t') {
    flags.characterType = 'tall';
  } else if (arg === '--short' || arg === '-s') {
    flags.characterType = 'short';
  } else if (arg === '--task') {
    flags.sceneType = 'task';
  } else if (arg === '--dialogue') {
    flags.sceneType = 'dialogue';
  } else if (arg === '--all') {
    flags.characterType = 'all';
    flags.sceneType = 'all';
  }
}

// Help message
if (flags.help) {
  console.log(`
Usage: node update-character-positions.js [options]

Options:
  --tall, -t           Update tall characters (Camila, Julieta, Mateo)
  --short, -s          Update short characters (Ángela, Elena, Luna, Esteban, Sebastián)
  --task               Update task scenes (scenes with x: 50)
  --dialogue           Update dialogue scenes (scenes with x: -25)
  --all                Update all characters in all scene types
  --dry-run, -d        Preview changes without writing to files
  --help, -h           Show this help message

Examples:
  node update-character-positions.js --tall --task
  node update-character-positions.js --short --dialogue
  node update-character-positions.js --all
  node update-character-positions.js --tall --task --dry-run

Position Changes:
  - Tall characters in task scenes: y: 18, z: 1.5
  - Short characters in task scenes: y: 25, z: 1.5
  - All characters in dialogue scenes: y: 17, z: 1.5
`);
  process.exit(0);
}

// Validation
if (!flags.characterType && !flags.sceneType) {
  console.error(
    'Error: Please specify at least one flag (--tall, --short, --task, --dialogue, or --all)'
  );
  console.error('Run with --help for usage information');
  process.exit(1);
}

// Get all Spanish A1 block directories
async function getBlockDirectories(baseDir) {
  const blocksPath = path.join(
    baseDir,
    'curriculum',
    'challenges',
    'english',
    'blocks'
  );
  const entries = await readdir(blocksPath, { withFileTypes: true });

  return entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('es-a1-'))
    .map(entry => path.join(blocksPath, entry.name));
}

// Get all markdown files in a directory
async function getMarkdownFiles(directory) {
  const files = await readdir(directory);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(directory, file));
}

// Check if a character is tall
function isTallCharacter(name) {
  return TALL_CHARACTERS.includes(name);
}

// Check if a character is short
function isShortCharacter(name) {
  return SHORT_CHARACTERS.some(
    shortName =>
      name === shortName ||
      name === shortName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}

// Determine if this is a dialogue scene (x: -25)
function isDialogueScene(scene) {
  if (scene.setup && scene.setup.characters) {
    return scene.setup.characters.some(
      char => char.position && char.position.x === -25
    );
  }
  return false;
}

// Update character positions in JSON scene
function updateScenePositions(content, filePath) {
  const sceneMatch = content.match(
    /# --scene--\s*\n\s*```json\s*\n([\s\S]*?)\n```/
  );

  if (!sceneMatch) {
    return { content, changed: false, details: [] };
  }

  const sceneData = sceneMatch[1];
  let scene;

  try {
    scene = JSON.parse(sceneData);
  } catch (e) {
    console.error(`Error parsing JSON in ${filePath}: ${e.message}`);
    return { content, changed: false, details: [] };
  }

  if (!scene.setup || !scene.setup.characters) {
    return { content, changed: false, details: [] };
  }

  const isDialogue = isDialogueScene(scene);
  const changes = [];
  let modified = false;

  // Process each character
  scene.setup.characters.forEach((char, index) => {
    const characterName = char.character;
    const position = char.position;

    if (!position) {
      return;
    }

    let shouldUpdate = false;
    let newPosition = { ...position };
    let reason = '';

    // Determine if we should update based on flags
    if (
      isDialogue &&
      position.x === -25 &&
      (flags.sceneType === 'dialogue' || flags.sceneType === 'all')
    ) {
      // Dialogue scene (x: -25) - update all characters
      shouldUpdate = true;
      newPosition.y = POSITIONS.dialogue.y;
      newPosition.z = POSITIONS.dialogue.z;
      reason = 'dialogue scene';
    } else if (
      position.x === 50 &&
      (flags.sceneType === 'task' || flags.sceneType === 'all')
    ) {
      // Task scene (x: 50) - check character type
      if (
        (flags.characterType === 'tall' || flags.characterType === 'all') &&
        isTallCharacter(characterName)
      ) {
        shouldUpdate = true;
        newPosition.y = POSITIONS.tall.y;
        newPosition.z = POSITIONS.tall.z;
        reason = 'tall character in task scene';
      } else if (
        (flags.characterType === 'short' || flags.characterType === 'all') &&
        isShortCharacter(characterName)
      ) {
        shouldUpdate = true;
        newPosition.y = POSITIONS.short.y;
        newPosition.z = POSITIONS.short.z;
        reason = 'short character in task scene';
      }
    }

    if (
      shouldUpdate &&
      (position.y !== newPosition.y || position.z !== newPosition.z)
    ) {
      changes.push({
        character: characterName,
        reason: reason,
        old: { y: position.y, z: position.z },
        new: { y: newPosition.y, z: newPosition.z }
      });

      char.position = newPosition;
      modified = true;
    }
  });

  if (!modified) {
    return { content, changed: false, details: [] };
  }

  // Rebuild the content with updated scene
  const updatedSceneJson = JSON.stringify(scene, null, 2);
  const updatedContent = content.replace(
    /# --scene--\s*\n\s*```json\s*\n[\s\S]*?\n```/,
    `# --scene--\n\n\`\`\`json\n${updatedSceneJson}\n\`\`\``
  );

  return {
    content: updatedContent,
    changed: true,
    details: changes
  };
}

// Process a single file
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const result = updateScenePositions(content, filePath);

  if (result.changed) {
    if (!flags.dryRun) {
      await writeFile(filePath, result.content, 'utf8');
    }
    return {
      file: path.relative(process.cwd(), filePath),
      changes: result.details
    };
  }

  return null;
}

// Main execution
async function main() {
  console.log('\n🚀 Starting character position update...\n');

  if (flags.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  console.log('Configuration:');
  console.log(`  Character Type: ${flags.characterType || 'not specified'}`);
  console.log(`  Scene Type: ${flags.sceneType || 'not specified'}`);
  console.log('');

  const baseDir = process.cwd();
  const blockDirs = await getBlockDirectories(baseDir);

  console.log(`Found ${blockDirs.length} Spanish A1 block directories\n`);

  let totalFiles = 0;
  let modifiedFiles = 0;
  let totalChanges = 0;
  const allChanges = [];

  for (const blockDir of blockDirs) {
    const files = await getMarkdownFiles(blockDir);
    totalFiles += files.length;

    for (const file of files) {
      const result = await processFile(file);
      if (result) {
        modifiedFiles++;
        totalChanges += result.changes.length;
        allChanges.push(result);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70) + '\n');
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Total position changes: ${totalChanges}\n`);

  // Print detailed changes
  if (allChanges.length > 0) {
    console.log('Detailed Changes:\n');
    allChanges.forEach(({ file, changes }) => {
      console.log(`📄 ${file}`);
      changes.forEach(change => {
        console.log(`   ${change.character} (${change.reason}):`);
        console.log(
          `     y: ${change.old.y} → ${change.new.y}, z: ${change.old.z} → ${change.new.z}`
        );
      });
      console.log('');
    });
  }

  if (flags.dryRun) {
    console.log(
      '✅ Dry run completed. Run without --dry-run to apply changes.\n'
    );
  } else {
    console.log('✅ All changes applied successfully!\n');
  }
}

// Run the script
main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

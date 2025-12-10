# Character Position Update Script

This script updates character positions in the Spanish A1 curriculum markdown files based on character height and scene type.

## Character Classifications

### Tall Characters

- Camila
- Julieta
- Mateo

### Short Characters

- Ángela
- Elena
- Luna
- Esteban
- Sebastián

## Position Rules

### Task Scenes (scenes with x: 50)

- **Tall characters**: `y: 18, z: 1.5`
- **Short characters**: `y: 25, z: 1.5`

### Dialogue Scenes (scenes with x: -25)

- **All characters**: `y: 17, z: 1.5`

## Usage

### Basic Syntax

```bash
node update-character-positions.js [options]
```

### Options

| Flag              | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `--tall`, `-t`    | Update tall characters (Camila, Julieta, Mateo)                   |
| `--short`, `-s`   | Update short characters (Ángela, Elena, Luna, Esteban, Sebastián) |
| `--task`          | Update task scenes (scenes with x: 50)                            |
| `--dialogue`      | Update dialogue scenes (scenes with x: -25)                       |
| `--all`           | Update all characters in all scene types                          |
| `--dry-run`, `-d` | Preview changes without writing to files                          |
| `--help`, `-h`    | Show help message                                                 |

### Examples

#### Update tall characters in task scenes only

```bash
node update-character-positions.js --tall --task
```

#### Update short characters in dialogue scenes only

```bash
node update-character-positions.js --short --dialogue
```

#### Update all tall characters (both task and dialogue scenes)

```bash
node update-character-positions.js --tall --task --dialogue
```

#### Update everything

```bash
node update-character-positions.js --all
```

#### Preview changes without modifying files (dry run)

```bash
node update-character-positions.js --tall --task --dry-run
```

#### Update only dialogue scenes for all characters

```bash
node update-character-positions.js --dialogue
```

## How It Works

1. The script scans all `es-a1-*` block directories in `curriculum/challenges/english/blocks/`
2. For each markdown file, it looks for the `# --scene--` section with JSON content
3. It identifies whether a scene is a task scene (1 character) or dialogue scene (2+ characters)
4. Based on the flags provided, it updates the `y` and `z` coordinates of character positions
5. It only updates positions where `x: 50` (leaving other x values unchanged)
6. The script preserves all other JSON structure and formatting

## Output

The script provides:

- A summary of files scanned and modified
- Detailed list of all changes made
- Character name, scene type, and old/new position values

### Example Output

```
🚀 Starting character position update...

Configuration:
  Character Type: tall
  Scene Type: task

Found 42 Spanish A1 block directories

======================================================================
📊 SUMMARY
======================================================================

Total files scanned: 234
Files modified: 15
Total position changes: 15

Detailed Changes:

📄 curriculum/challenges/english/blocks/es-a1-learn-meet-mateo/6903d068b5495af23a7df214.md
   Mateo (tall character in task scene):
     y: 15 → 18, z: 1.2 → 1.5

📄 curriculum/challenges/english/blocks/es-a1-learn-meet-julieta/...
   Julieta (tall character in task scene):
     y: 0 → 18, z: 1.5 → 1.5

✅ All changes applied successfully!
```

## Testing

Always run with `--dry-run` first to preview changes:

```bash
# Preview tall character updates in task scenes
node update-character-positions.js --tall --task --dry-run

# Preview everything
node update-character-positions.js --all --dry-run
```

## Notes

- The script only modifies positions where `x: 50` (standard character positions)
- Special positions with different x values are left unchanged
- The script handles both accented and non-accented character names (Ángela/Angela, Sebastián/Sebastian)
- All JSON formatting is preserved
- Original file structure and markdown content outside `--scene--` sections remain unchanged

## Troubleshooting

If the script doesn't find files:

- Make sure you're running it from the freeCodeCamp root directory
- Check that the `curriculum/challenges/english/blocks/` directory exists

If position updates aren't applied:

- Verify the character name matches exactly (case-sensitive)
- Check that `x: 50` in the position object
- Ensure the JSON in the `--scene--` section is valid

## Requirements

- Node.js v12 or higher
- Read/write access to the curriculum directory

import { mkdir, writeFile, access, symlink, readlink, unlink, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const DIRECTORIES = [
  '.claude/status',
  '.claude/learnings',
  '.claude/learnings/config',
  'plan',
  'archive',
  'brainstorms',
];

const PROJECT_STATUS_TEMPLATE = `# Project Status

## Identity
Project: [project name]
Description: [one-line description]

## Active Plans
[none yet — run \`scc plan init <name>\` to create one]
`;

const LEARNINGS_CONFIG_TEMPLATE = `# Learning File Template

Use this format when writing learnings to \`.claude/learnings/\`.
Always write both the learning file AND an entry in \`index.yaml\` atomically.

## File format

\`\`\`yaml
---
title: [Short descriptive title]
tags: []
severity: low
date: YYYY-MM-DD
---

## Problem

[What went wrong or what was discovered]

## Solution

[What fixed it or what the correct approach is]

## Prevention

[How to avoid this in the future]
\`\`\`

## index.yaml entry format

\`\`\`yaml
- file: [filename].md
  triggers: "keyword1 keyword2 keyword3"
\`\`\`

Triggers should be words that would appear in a user's prompt when this learning is relevant.
The UserPromptSubmit hook matches prompts against these keywords (minimum 2 word matches to surface).
`;

const CLAUDE_MD_TEMPLATE = `# Project Instructions

@.claude/status/project.md
`;

const INDEX_YAML_TEMPLATE = `# Learning trigger index — searched by UserPromptSubmit hook
# Each entry maps a learning file to its trigger keywords
# Format:
#   - file: <filename>.md
#     triggers: "keyword1 keyword2 keyword3"
`;

export async function initCommand() {
  const cwd = process.cwd();

  console.log('Scaffolding project directories...\n');

  for (const dir of DIRECTORIES) {
    const fullPath = join(cwd, dir);
    try {
      await mkdir(fullPath, { recursive: true });
      console.log(`  ✓ ${dir}/`);
    } catch (err) {
      console.error(`  ✗ ${dir}/ — ${err.message}`);
    }
  }

  // Write project.md if it doesn't exist
  const projectPath = join(cwd, '.claude/status/project.md');
  if (!(await fileExists(projectPath))) {
    await writeFile(projectPath, PROJECT_STATUS_TEMPLATE);
    console.log('  ✓ .claude/status/project.md (template)');
  } else {
    console.log('  · .claude/status/project.md (already exists)');
  }

  // Write index.yaml if it doesn't exist
  const indexPath = join(cwd, '.claude/learnings/index.yaml');
  if (!(await fileExists(indexPath))) {
    await writeFile(indexPath, INDEX_YAML_TEMPLATE);
    console.log('  ✓ .claude/learnings/index.yaml (template)');
  } else {
    console.log('  · .claude/learnings/index.yaml (already exists)');
  }

  // Write learnings-config.md if it doesn't exist
  const configPath = join(cwd, '.claude/learnings/config/learnings-config.md');
  if (!(await fileExists(configPath))) {
    await writeFile(configPath, LEARNINGS_CONFIG_TEMPLATE);
    console.log('  ✓ .claude/learnings/config/learnings-config.md (template)');
  } else {
    console.log('  · .claude/learnings/config/learnings-config.md (already exists)');
  }

  // Write CLAUDE.md with @ import for project status if it doesn't exist
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    await writeFile(claudeMdPath, CLAUDE_MD_TEMPLATE);
    console.log('  ✓ CLAUDE.md (with @import for project status)');
  } else {
    console.log('  · CLAUDE.md (already exists)');
  }

  // Install skills to ~/.claude/skills/ (user-wide, symlinks)
  await installSkills();

  console.log('\nDone. Edit .claude/status/project.md to set your project identity.');
}

async function installSkills() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const skillsSource = resolve(__dirname, '../../skills');
  const commandsDir = join(homedir(), '.claude', 'skills');

  await mkdir(commandsDir, { recursive: true });

  let entries;
  try {
    entries = await readdir(skillsSource, { withFileTypes: true });
  } catch {
    console.log('  · Skills source not found (skipping)');
    return;
  }

  const skillDirs = entries.filter(e => e.isDirectory());
  let installed = 0;

  for (const dir of skillDirs) {
    const source = join(skillsSource, dir.name);
    const target = join(commandsDir, dir.name);

    try {
      // Check if symlink already exists and points to the right place
      const existing = await readlink(target).catch(() => null);
      if (existing === source) continue;

      // Remove stale symlink or file
      if (existing !== null) await unlink(target);

      await symlink(source, target, 'dir');
      installed++;
    } catch {
      // Target exists as a real directory — don't overwrite user's files
    }
  }

  if (installed > 0) {
    console.log(`  ✓ ~/.claude/skills/ (${installed} skills linked)`);
  } else {
    console.log('  · ~/.claude/skills/ (skills already installed)');
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

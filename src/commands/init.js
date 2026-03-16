import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

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
[none yet — run \`durin plan init <name>\` to create one]
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

  console.log('\nDone. Edit .claude/status/project.md to set your project identity.');
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

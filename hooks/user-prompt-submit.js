#!/usr/bin/env node

// UserPromptSubmit hook — learning retrieval via trigger matching.
// Greps index.yaml for trigger keywords that match the user's prompt,
// reads matched learning files, injects as additionalContext.
//
// Performance target: sub-millisecond for index scan, ~1-2ms for file reads.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_LEARNINGS_INJECTED = 3;

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();
  const prompt = (input.prompt || '').toLowerCase();

  if (!prompt) return;

  const indexPath = join(cwd, '.claude/learnings/index.yaml');

  // Parse index.yaml
  let entries;
  try {
    const indexContent = await readFile(indexPath, 'utf-8');
    entries = parseIndex(indexContent);
  } catch {
    return; // No index file — no learnings to match
  }

  if (entries.length === 0) return;

  // Match prompt against trigger keywords
  const matches = matchTriggers(prompt, entries);

  if (matches.length === 0) return;

  // Read matched learning files (top N)
  const learnings = [];
  for (const match of matches.slice(0, MAX_LEARNINGS_INJECTED)) {
    try {
      const content = await readFile(
        join(cwd, '.claude/learnings', match.file),
        'utf-8'
      );
      learnings.push(content.trim());
    } catch {
      // Learning file missing — skip
    }
  }

  if (learnings.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `## Relevant Learnings\n\n${learnings.join('\n\n---\n\n')}`
    }) + '\n');
  }
}

/**
 * Parse the index.yaml file into entries.
 * Format:
 *   - file: auth-middleware-gotcha.md
 *     triggers: "auth middleware token validation 401"
 *
 * Returns: Array<{ file: string, triggers: string[] }>
 */
function parseIndex(content) {
  const entries = [];
  const lines = content.split('\n');

  let current = null;
  for (const line of lines) {
    const fileMatch = line.match(/^\s*-\s*file:\s*(.+)$/);
    if (fileMatch) {
      current = { file: fileMatch[1].trim(), triggers: [] };
      entries.push(current);
      continue;
    }

    const triggerMatch = line.match(/^\s*triggers:\s*"(.+)"$/);
    if (triggerMatch && current) {
      current.triggers = triggerMatch[1].toLowerCase().split(/\s+/);
    }
  }

  return entries;
}

/**
 * Match the user's prompt against learning trigger keywords.
 * Scores by number of trigger words found in prompt.
 * Minimum 2 matching words required to avoid noise.
 */
function matchTriggers(prompt, entries) {
  const promptWords = new Set(prompt.split(/\s+/));

  return entries
    .map(entry => {
      const hits = entry.triggers.filter(t => promptWords.has(t)).length;
      return { ...entry, hits };
    })
    .filter(entry => entry.hits >= 2)
    .sort((a, b) => b.hits - a.hits);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data || '{}'));
  });
}

main().catch(() => process.exit(0));

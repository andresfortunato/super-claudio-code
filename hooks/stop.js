#!/usr/bin/env node

// Stop hook — detects plan completion marker and triggers archival.
//
// When a .completed file exists in a plan directory, blocks and instructs
// Claude to launch archivist + cleanup agents before stopping.
//
// Can block: yes (exit code 2 + reason tells Claude to continue).

import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();

  const planDir = join(cwd, 'plan');
  let planDirs;
  try {
    const entries = await readdir(planDir, { withFileTypes: true });
    planDirs = entries.filter(e => e.isDirectory() && e.name.startsWith('plan-'));
  } catch {
    return; // No plan directory — nothing to check
  }

  for (const dir of planDirs) {
    const completedMarker = join(planDir, dir.name, '.completed');
    if (await fileExists(completedMarker)) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `Plan "${dir.name}" is marked complete (.completed marker found). ` +
          'Before stopping, launch two parallel subagents:\n' +
          `1. "archivist" subagent — archives plan "${dir.name}", cleans up plan directory, updates status\n` +
          `2. "cleanup" subagent — scans files from plan "${dir.name}" for dead code, removes it, commits\n` +
          'Both are defined in ~/.claude/agents/. After they complete, you can stop.'
      }) + '\n');
      process.exit(2);
    }
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

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data || '{}'));
  });
}

main().catch(() => process.exit(0));

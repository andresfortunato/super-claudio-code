#!/usr/bin/env node

// Stop hook — detects plan completion marker and triggers archival.
//
// When a .completed file exists in a plan directory, blocks once and instructs
// Claude to launch archivist + cleanup agents before stopping.
// Creates .archival-triggered sentinel to avoid re-blocking on subsequent turns.
// Both markers are cleaned up when the archivist deletes the plan directory.
//
// Can block: yes (exit code 2 + reason tells Claude to continue).

import { readdir, access, writeFile } from 'node:fs/promises';
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
    const triggeredMarker = join(planDir, dir.name, '.archival-triggered');
    if (await fileExists(triggeredMarker)) continue; // Already blocked once — don't loop
    if (await fileExists(completedMarker)) {
      await writeFile(triggeredMarker, new Date().toISOString());
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

if ((process.env.SCC_DISABLED_HOOKS || '').split(',').map(s => s.trim()).includes('stop')) {
  process.exit(0);
}

main().catch(() => process.exit(0));

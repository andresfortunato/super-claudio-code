#!/usr/bin/env node

// Stop hook — three responsibilities:
// 1. Detect .completed marker → signal for archivist launch (highest priority)
// 2. Enforce handoff writing before session ends
// 3. Prompt for learning capture if session was significant
//
// Can block: yes (exit code 2 + reason tells Claude to continue).

import { readFile, readdir, access, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();

  // Find active plans
  const planDir = join(cwd, 'plan');
  let planDirs;
  try {
    const entries = await readdir(planDir, { withFileTypes: true });
    planDirs = entries.filter(e => e.isDirectory() && e.name.startsWith('plan-'));
  } catch {
    return; // No plan directory — nothing to enforce
  }

  for (const dir of planDirs) {
    const planPath = join(planDir, dir.name);

    // Check for .completed marker → archivist trigger
    const completedMarker = join(planPath, '.completed');
    if (await fileExists(completedMarker)) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `Plan "${dir.name}" is marked complete (.completed marker found). ` +
          'Before stopping, launch two parallel agents:\n' +
          '1. Archivist agent (read hooks/agents/archivist.md for instructions) — ' +
          `archives plan "${dir.name}", cleans up plan directory, updates status\n` +
          '2. Cleanup agent (read hooks/agents/cleanup.md for instructions) — ' +
          `scans files from plan "${dir.name}" for dead code, removes it, commits\n` +
          'Launch both as subagents. After they complete, you can stop.'
      }) + '\n');
      process.exit(2);
    }

    // Check handoff freshness — was handoff.md updated this session?
    const handoffPath = join(planPath, 'handoff.md');
    try {
      const handoffStat = await stat(handoffPath);
      const handoffAge = Date.now() - handoffStat.mtimeMs;
      const oneHour = 60 * 60 * 1000;

      if (handoffAge > oneHour) {
        process.stdout.write(JSON.stringify({
          decision: 'block',
          reason: `Handoff for "${dir.name}" appears stale (last modified ${formatAge(handoffAge)} ago). ` +
            'Before stopping: update the handoff.md with current status, decisions made this session, ' +
            'and what to start with next session. Also update the implementation log.md.'
        }) + '\n');
        process.exit(2);
      }
    } catch {
      // No handoff file — might be a new plan, don't block
    }
  }

  // 3. Learning capture — prompt if session was significant (once per session)
  const learningMarker = join(cwd, '.claude/.learning-prompted');
  if (await fileExists(learningMarker)) return; // Already prompted this session

  const transcriptPath = input.transcript_path;
  if (transcriptPath) {
    try {
      const transcriptStat = await stat(transcriptPath);
      const sizeKB = transcriptStat.size / 1024;

      // Heuristic: >50KB transcript suggests a substantial session
      if (sizeKB > 50) {
        const learningsDir = join(cwd, '.claude/learnings');
        if (await fileExists(learningsDir)) {
          await writeFile(learningMarker, new Date().toISOString());
          process.stdout.write(JSON.stringify({
            decision: 'block',
            reason: 'This was a substantial session. Before stopping, consider: ' +
              'were there any surprises, gotchas, or insights worth preserving as learnings? ' +
              'If so, see .claude/learnings/config/learnings-config.md for the format, ' +
              'write the learning file to .claude/learnings/, and append an entry to .claude/learnings/index.yaml. ' +
              'If nothing notable, you can stop.'
          }) + '\n');
          process.exit(2);
        }
      }
    } catch {
      // Can't read transcript — skip
    }
  }
}

function formatAge(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

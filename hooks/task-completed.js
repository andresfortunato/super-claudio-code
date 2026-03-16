#!/usr/bin/env node

// TaskCompleted hook — auto-commit with template message when agent team tasks complete.
// Template: "Complete: [task description]"
// For PR-quality messages, user invokes /commit manually.
//
// Also updates the plan status file if an active plan exists.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();

  // Extract task description from the last assistant message
  const description = extractDescription(input.last_assistant_message || '');

  // Check if there are staged or unstaged changes to commit
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' }).trim();
    if (!status) return; // Nothing to commit

    // Stage all changes and commit with template message
    execFileSync('git', ['add', '-A'], { cwd });
    const message = `Complete: ${description || 'task'}`;
    execFileSync('git', ['commit', '-m', message], { cwd });

    // Update plan status
    await updatePlanStatus(cwd);
  } catch {
    // Git operations failed — don't block the session
  }
}

function extractDescription(message) {
  // Take the first meaningful line from the assistant's completion message
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  // Cap at 72 chars for git commit message convention
  return first.length > 72 ? first.slice(0, 69) + '...' : first;
}

async function updatePlanStatus(cwd) {
  const statusDir = join(cwd, '.claude/status');
  try {
    const files = await readdir(statusDir);
    const planFiles = files.filter(f => f.startsWith('plan-') && f.endsWith('.md'));

    for (const file of planFiles) {
      const filePath = join(statusDir, file);
      let content = await readFile(filePath, 'utf-8');
      // Update the "Last updated" field
      content = content.replace(
        /^Last updated: .+$/m,
        `Last updated: ${new Date().toISOString().split('T')[0]}`
      );
      await writeFile(filePath, content);
    }
  } catch {
    // Status dir doesn't exist — skip
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

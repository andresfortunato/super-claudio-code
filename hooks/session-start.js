#!/usr/bin/env node

// SessionStart hook — inject project status and active plan status into session context.
// Output: plain text to stdout (SessionStart adds stdout as context).

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();
  const statusDir = join(cwd, '.scc/status');

  const parts = [];

  // Inject project identity
  try {
    const project = await readFile(join(statusDir, 'project.md'), 'utf-8');
    parts.push(project.trim());
  } catch {
    // No project status — framework not initialized, skip silently
    return;
  }

  // Inject all active plan statuses
  try {
    const files = await readdir(statusDir);
    const planFiles = files.filter(f => f.startsWith('plan-') && f.endsWith('.md'));

    for (const file of planFiles) {
      const content = await readFile(join(statusDir, file), 'utf-8');
      parts.push(content.trim());
    }
  } catch {
    // No status dir readable — skip
  }

  if (parts.length > 0) {
    process.stdout.write(parts.join('\n\n') + '\n');
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

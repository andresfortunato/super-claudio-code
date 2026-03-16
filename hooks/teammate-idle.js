#!/usr/bin/env node

// TeammateIdle hook — quality gate enforcement for agent teams.
// When a teammate finishes and goes idle, verify its work meets quality gates
// before allowing the team orchestrator to proceed.
//
// Can block: yes (exit code 2 tells the teammate to continue fixing).

import { execFileSync } from 'node:child_process';

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();

  const failures = [];

  // Gate 1: No uncommitted merge conflicts
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' });
    const conflicts = status.split('\n').filter(l => l.startsWith('UU') || l.startsWith('AA'));
    if (conflicts.length > 0) {
      failures.push(`Unresolved merge conflicts in: ${conflicts.map(l => l.slice(3)).join(', ')}`);
    }
  } catch {
    // git not available — skip gate
  }

  // Gate 2: No syntax errors in recently modified JS files
  try {
    const modified = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd, encoding: 'utf-8' })
      .trim().split('\n').filter(f => f.endsWith('.js'));

    for (const file of modified) {
      try {
        execFileSync('node', ['--check', file], { cwd, encoding: 'utf-8' });
      } catch {
        failures.push(`Syntax error in ${file}`);
      }
    }
  } catch {
    // No git diff available — skip gate
  }

  if (failures.length > 0) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `Quality gate failed:\n${failures.map(f => `  - ${f}`).join('\n')}\nFix these issues before marking the task complete.`
    }) + '\n');
    process.exit(2);
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

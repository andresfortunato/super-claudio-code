import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export async function planInitCommand(name) {
  const cwd = process.cwd();
  const planDir = join(cwd, 'plan', `plan-${name}`);

  // Check if plan already exists
  if (await fileExists(planDir)) {
    console.error(`Plan "plan-${name}" already exists at ${planDir}`);
    process.exit(1);
  }

  console.log(`Scaffolding plan: plan-${name}\n`);

  // Create directories
  const dirs = [
    planDir,
    join(planDir, 'phases'),
    join(planDir, 'context'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  // Write plan.md
  await writeFile(join(planDir, 'plan.md'), planTemplate(name));
  console.log(`  ✓ plan/plan-${name}/plan.md`);

  // Write handoff.md
  await writeFile(join(planDir, 'handoff.md'), handoffTemplate(name));
  console.log(`  ✓ plan/plan-${name}/handoff.md`);

  // Write log.md
  await writeFile(join(planDir, 'log.md'), logTemplate(name));
  console.log(`  ✓ plan/plan-${name}/log.md`);

  console.log(`  ✓ plan/plan-${name}/phases/`);
  console.log(`  ✓ plan/plan-${name}/context/`);

  // Create status file for this plan
  const statusDir = join(cwd, '.claude/status');
  await mkdir(statusDir, { recursive: true });
  await writeFile(join(statusDir, `plan-${name}.md`), statusTemplate(name));
  console.log(`  ✓ .claude/status/plan-${name}.md`);

  console.log(`\nDone. Open plan/plan-${name}/plan.md to start planning.`);
}

function planTemplate(name) {
  return `# ${formatName(name)} — Implementation Plan

## Goal

[What this plan achieves — one paragraph]

## Constraints

- [constraint 1]
- [constraint 2]

## Decisions Made

[numbered list of architectural decisions with rationale]

## File Manifest

[list of files this plan will create or modify]

## Repo Context

[what already exists that's relevant — existing code, patterns, dependencies]

## Phases

### Phase 1: [name]
- **Intent**: [what this phase achieves and why it's sequenced here]
- **Files**: [files created or modified]
- **Verification**: [how to confirm this phase is complete]
- **Estimated context**: [percentage of context window]
`;
}

function handoffTemplate(name) {
  return `# Handoff — ${formatName(name)}

## Status

[current state — what's done, what's next]

## Read Order

1. This file
2. \`plan.md\` — full implementation plan

## Start At

[specific phase/task to begin with]

## Key Constraints

[critical constraints the next session must remember]
`;
}

function logTemplate(name) {
  return `# Implementation Log — ${formatName(name)}

<!-- Append-only. Record decisions, direction changes, dead code rationale. -->
`;
}

function statusTemplate(name) {
  return `# Plan: ${formatName(name)}

Phase: not started
Current task: —
Blocked: no
Last updated: ${new Date().toISOString().split('T')[0]}
`;
}

function formatName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

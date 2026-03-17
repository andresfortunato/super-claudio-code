#!/usr/bin/env node

// PreCompact hook — remind to write handoff and capture learnings before
// context is compacted. Fires on both auto and manual compaction.
// Informational only (cannot block).

async function main() {
  const input = JSON.parse(await readStdin());

  const reminders = [];

  reminders.push(
    'Context is about to be compacted. Before losing detail:'
  );
  reminders.push(
    '• Update the plan handoff.md with current status, decisions made, and next steps.'
  );
  reminders.push(
    '• Were there any surprises, gotchas, or insights worth preserving as learnings? ' +
    'If so, write to .claude/learnings/ (see config/learnings-config.md for format) ' +
    'and append to index.yaml.'
  );

  process.stdout.write(reminders.join('\n') + '\n');
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data || '{}'));
  });
}

main().catch(() => process.exit(0));

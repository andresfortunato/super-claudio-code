#!/usr/bin/env node

// PreCompact hook — remind to write handoff before context is compacted.
// PreCompact is informational only (can't block), so we inject a reminder.

async function main() {
  const input = JSON.parse(await readStdin());

  // Only remind on auto-compaction (manual compaction is intentional)
  if (input.trigger === 'auto') {
    process.stdout.write(
      'IMPORTANT: Context is about to be compacted. If you have not written ' +
      'the handoff yet, the compacted context will lose implementation details. ' +
      'After compaction, update the plan handoff.md with current status, ' +
      'decisions made, and next steps.\n'
    );
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

#!/usr/bin/env node

// PostToolUse hook — warn when context usage reaches 65% and 75%.
// Uses transcript file size as a rough proxy for token count.
// Heuristic: ~7 bytes per token in JSONL (content + JSON overhead).

import { stat } from 'node:fs/promises';

const CONTEXT_WINDOW = 200_000; // tokens (Opus/Sonnet/Haiku)
const BYTES_PER_TOKEN = 7;
const WARN_THRESHOLD = 0.65;
const CRITICAL_THRESHOLD = 0.75;

async function main() {
  const input = JSON.parse(await readStdin());
  const transcriptPath = input.transcript_path;

  if (!transcriptPath) return;

  let fileSize;
  try {
    const stats = await stat(transcriptPath);
    fileSize = stats.size;
  } catch {
    return; // Can't read transcript — skip
  }

  const estimatedTokens = Math.round(fileSize / BYTES_PER_TOKEN);
  const usage = estimatedTokens / CONTEXT_WINDOW;

  if (usage >= CRITICAL_THRESHOLD) {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `⚠️ CONTEXT WARNING (${Math.round(usage * 100)}%): Approaching context limit. Write handoff NOW and wrap up. Estimated ~${Math.round(estimatedTokens / 1000)}K of ${CONTEXT_WINDOW / 1000}K tokens used.`
      }
    };
    process.stdout.write(JSON.stringify(output) + '\n');
  } else if (usage >= WARN_THRESHOLD) {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `⚡ Context at ~${Math.round(usage * 100)}%. Start planning your stopping point. Estimated ~${Math.round(estimatedTokens / 1000)}K of ${CONTEXT_WINDOW / 1000}K tokens used.`
      }
    };
    process.stdout.write(JSON.stringify(output) + '\n');
  }
  // Below 65%: no output, zero overhead
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data || '{}'));
  });
}

main().catch(() => process.exit(0));

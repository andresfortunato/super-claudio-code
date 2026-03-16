#!/usr/bin/env node

// Post-install script for Durin.
// Merges hook configuration into .claude/settings.json and scaffolds project directories.

import { accessSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const projectRoot = findProjectRoot();
  const hooksDir = resolve(__dirname, 'hooks');

  console.log('Durin — installing framework...\n');

  // 1. Ensure .claude/ directory exists
  const claudeDir = join(projectRoot, '.claude');
  await mkdir(claudeDir, { recursive: true });

  // 2. Merge hooks into .claude/settings.json
  const settingsPath = join(claudeDir, 'settings.json');
  const settings = await readJsonSafe(settingsPath);

  const hooksConfig = buildHooksConfig(hooksDir);
  settings.hooks = mergeHooks(settings.hooks || {}, hooksConfig);

  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('  ✓ Hooks merged into .claude/settings.json');

  // 3. Run durin init to scaffold project directories
  const { initCommand } = await import('./src/commands/init.js');
  const origCwd = process.cwd();
  process.chdir(projectRoot);
  await initCommand();
  process.chdir(origCwd);

  console.log('\nDurin installed. Hooks are active, skills are registered.');
  console.log('Run `durin status` to verify.');
}

/**
 * Build hooks configuration with absolute paths to hook scripts.
 */
function buildHooksConfig(hooksDir) {
  const hooks = [
    { event: 'SessionStart', script: 'session-start.js', timeout: 5 },
    { event: 'UserPromptSubmit', script: 'user-prompt-submit.js', timeout: 5 },
    { event: 'PostToolUse', script: 'context-monitor.js', timeout: 5 },
    { event: 'TaskCompleted', script: 'task-completed.js', timeout: 30 },
    { event: 'Stop', script: 'stop.js', timeout: 10 },
    { event: 'PreCompact', script: 'pre-compact.js', timeout: 5 },
    { event: 'TeammateIdle', script: 'teammate-idle.js', timeout: 10 },
  ];

  const config = {};
  for (const { event, script, timeout } of hooks) {
    config[event] = [
      {
        matcher: null,
        hooks: [
          {
            type: 'command',
            command: `node ${resolve(hooksDir, script)}`,
            timeout,
          },
        ],
      },
    ];
  }
  return config;
}

/**
 * Merge new hooks into existing hooks config without clobbering user's hooks.
 * Appends Durin hooks to each event's array.
 */
function mergeHooks(existing, incoming) {
  const merged = { ...existing };

  for (const [event, entries] of Object.entries(incoming)) {
    if (!merged[event]) {
      merged[event] = entries;
    } else {
      // Check if Durin hooks are already installed for this event
      const durinAlready = merged[event].some(e =>
        e.hooks?.some(h => h.command?.includes('durin/hooks/'))
      );
      if (!durinAlready) {
        merged[event] = [...merged[event], ...entries];
      }
    }
  }

  return merged;
}

/**
 * Find the project root by walking up from cwd looking for package.json or .git.
 * Falls back to cwd.
 */
function findProjectRoot() {
  // If running as postinstall, npm sets the project root
  if (process.env.INIT_CWD) return process.env.INIT_CWD;

  // Otherwise walk up from cwd
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    try {
      accessSync(join(dir, 'package.json'));
      return dir;
    } catch {
      dir = dirname(dir);
    }
  }
  return process.cwd();
}

async function readJsonSafe(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return {};
  }
}

main().catch(err => {
  console.error('Durin install failed:', err.message);
  process.exit(1);
});

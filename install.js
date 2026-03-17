#!/usr/bin/env node

// Post-install script for Super Claudio Code.
// Delegates to `scc init` which handles both directory scaffolding and hook merging.
// This script exists for npm postinstall — it resolves the project root and runs init.

import { accessSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const projectRoot = findProjectRoot();

  console.log('Super Claudio Code — setting up project...\n');

  const { initCommand } = await import('./src/commands/init.js');
  const origCwd = process.cwd();
  process.chdir(projectRoot);
  await initCommand();
  process.chdir(origCwd);

  console.log('\nSuper Claudio Code ready. Run `scc status` to verify.');
}

function findProjectRoot() {
  if (process.env.INIT_CWD) return process.env.INIT_CWD;

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

main().catch(err => {
  console.error('SCC install failed:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { planInitCommand } from './commands/plan-init.js';
import { statusCommand } from './commands/status.js';
import { learningListCommand } from './commands/learning-list.js';

const program = new Command();

program
  .name('scc')
  .description('Super Claudio Code — Claude Code efficiency framework')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold project directories for the framework')
  .action(initCommand);

const plan = program
  .command('plan')
  .description('Plan management commands');

plan
  .command('init <name>')
  .description('Scaffold a new plan directory')
  .action(planInitCommand);

program
  .command('status')
  .description('Show aggregate plan status')
  .action(statusCommand);

const learning = program
  .command('learning')
  .description('Learning management commands');

learning
  .command('list')
  .description('List all stored learnings')
  .action(learningListCommand);

program.parse();

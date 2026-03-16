import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function statusCommand() {
  const cwd = process.cwd();
  const statusDir = join(cwd, '.claude/status');

  // Read project identity
  let projectContent;
  try {
    projectContent = await readFile(join(statusDir, 'project.md'), 'utf-8');
  } catch {
    console.error('No project status found. Run `durin init` first.');
    process.exit(1);
  }

  // Collect all plan status files
  let files;
  try {
    files = await readdir(statusDir);
  } catch {
    console.error('Cannot read .claude/status/. Run `durin init` first.');
    process.exit(1);
  }

  const planFiles = files.filter(f => f.startsWith('plan-') && f.endsWith('.md'));

  const plans = [];
  for (const file of planFiles) {
    const content = await readFile(join(statusDir, file), 'utf-8');
    plans.push({ file, content, fields: parseStatusFields(content) });
  }

  // Display
  console.log(projectContent.trim());
  console.log('');

  if (plans.length === 0) {
    console.log('No active plans.');
    return;
  }

  // TODO: Implement this function — see comment below
  console.log(formatStatus(plans));
}

/**
 * Parse simple "Key: value" lines from a status file.
 * Returns a Map of lowercase key → value string.
 */
function parseStatusFields(content) {
  const fields = new Map();
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (match) {
      fields.set(match[1].toLowerCase().trim(), match[2].trim());
    }
  }
  return fields;
}

/**
 * Format the aggregate status display for all plans.
 *
 * Each plan object has:
 *   - file: string (e.g. "plan-framework.md")
 *   - content: string (raw file content)
 *   - fields: Map with keys like "phase", "current task", "blocked", "last updated"
 *
 * Return a string to print to console.
 *
 * Design choice: minimal (print each block) vs tabular (compact table)
 * vs something else entirely. Up to you — this shapes what every
 * session start looks like.
 */
function formatStatus(plans) {
  // YOUR IMPLEMENTATION HERE
  // Consider: this output gets injected by the SessionStart hook into every session.
  // It should be scannable, low-token, and immediately tell you what's active and what's blocked.
  return plans.map(p => p.content.trim()).join('\n\n');
}

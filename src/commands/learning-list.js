import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function learningListCommand() {
  const cwd = process.cwd();
  const learningsDir = join(cwd, '.claude/learnings');

  let files;
  try {
    files = await readdir(learningsDir);
  } catch {
    console.error('No learnings directory found. Run `scc init` first.');
    process.exit(1);
  }

  const mdFiles = files.filter(f => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    console.log('No learnings stored yet.');
    return;
  }

  console.log(`${mdFiles.length} learning(s):\n`);

  for (const file of mdFiles) {
    const content = await readFile(join(learningsDir, file), 'utf-8');
    const meta = parseFrontmatter(content);
    const title = meta.title || file.replace('.md', '');
    const severity = meta.severity || '—';
    const date = meta.date || '—';
    const tags = meta.tags || '—';

    console.log(`  ${title}`);
    console.log(`    ${file}  |  severity: ${severity}  |  date: ${date}  |  tags: ${tags}`);
    console.log('');
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const meta = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      meta[kv[1]] = kv[2].trim();
    }
  }
  return meta;
}

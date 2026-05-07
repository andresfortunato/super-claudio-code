# Hook Registration

Completed: 2026-05-07

## What was built

Restored automatic hook registration for `super-claudio-code` via the official Claude Code plugin path: `hooks/hooks.json` declares three hooks (`UserPromptSubmit`, `Stop`, `PreCompact`) using `${CLAUDE_PLUGIN_ROOT}` paths, and a self-marketplace at `.claude-plugin/marketplace.json` makes the plugin installable from this repo. `scc init` no longer mutates `~/.claude/settings.json`; per-hook opt-out is now an env-var gate (`SCC_DISABLED_HOOKS`) inside each script.

## Key decisions

1. **Dual distribution**: plugin owns hooks/skills/agents auto-wiring (`/plugin marketplace add` + `/plugin install`); npm owns the `scc` CLI binary. The two paths overlap on skills/agents but Claude Code dedupes by name.
2. **Hooks live in `hooks/hooks.json`, not inline in `plugin.json`** — matches every hook-using plugin observed on disk (hookify, ralph-loop, etc.). Claude Code auto-discovers the file at the plugin root.
3. **`${CLAUDE_PLUGIN_ROOT}` exclusively for path resolution** — set by Claude Code at hook execution time. No absolute paths in committed files; no name-pinned matchers; no merge logic in `scc init`.
4. **Env-var opt-out (`SCC_DISABLED_HOOKS`) instead of settings.json edits** — borrowed from everything-claude-code's `ECC_DISABLED_HOOKS`. Disabling a hook requires zero file mutation: set the env var, restart, done.
5. **Self-marketplace, not submission to `claude-plugins-official`** — keeps iteration fast, no maintainer-review dependency.
6. **Three hooks only**: `user-prompt-submit.js`, `stop.js`, `pre-compact.js`. `session-start.js` was deleted in `fa0fd30` and is not re-registered.

## Files created or modified

- `.claude-plugin/plugin.json` — modified: bumped to `0.2.0`; dropped `displayName`, `postInstall`, `skills` (all silently ignored by Claude Code; `claude plugin validate` rejected the first two).
- `.claude-plugin/marketplace.json` — created: single-plugin marketplace declaration.
- `hooks/hooks.json` — modified: three entries with `${CLAUDE_PLUGIN_ROOT}` commands and empty matchers.
- `hooks/user-prompt-submit.js`, `hooks/stop.js`, `hooks/pre-compact.js` — modified: prepended `SCC_DISABLED_HOOKS` opt-out gate.
- `README.md` — modified: rewrote Hooks + Installation sections; plugin path now primary, npm secondary, manual settings.json kept as fallback. Documented `SCC_DISABLED_HOOKS`.

## Learnings

- **`claude plugin validate` is the canary for manifest hygiene.** It rejected `displayName` and `postInstall` as unrecognized — both keys had been silently ignored by Claude Code since the framework was created. `postInstall: "node install.js"` was never executed by the plugin loader, and `install.js` was not wired to npm's `postinstall` either, making it dead code from day one. Flagged for cleanup-agent removal.
- **Canonical plugin manifest is four keys**: `name`, `description`, `version`, `author`. Real plugins (claude-code-setup, mcp-server-dev, claude-md-management, playground, example-plugin) all use exactly this set. No `skills:` array — Claude Code auto-discovers skills by directory.
- **Three install forms exercise different cache paths and all resolve `${CLAUDE_PLUGIN_ROOT}` correctly**: `claude --plugin-dir <checkout>`, local-path marketplace install, and (untested but high-confidence) github-URL marketplace install.
- **Verification trick**: stop-hook firing visible in debug output as `Hook Stop (node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js) returned permissionDecision: deny ...` — confirms variable resolution.

## Metrics

- Phases: 2
- Sessions: 1 (single-day completion, 2026-05-07)

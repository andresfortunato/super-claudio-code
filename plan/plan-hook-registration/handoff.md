# Handoff — Hook Registration

## Status

Phase 1 complete and verified end-to-end via `claude --plugin-dir` debug logs. Phase 2 next: marketplace.json + README.

| # | Task | Status |
|---|------|--------|
| 1 | Plugin manifest version bump (0.2.0, drop `skills:`/`displayName`/`postInstall`) | ✅ done |
| 2 | Wire `hooks/hooks.json` with 3 entries via `${CLAUDE_PLUGIN_ROOT}` | ✅ done |
| 3 | Add `SCC_DISABLED_HOOKS` opt-out gate to all 3 scripts | ✅ done |
| 4 | Verify hooks fire via `claude --plugin-dir` | ✅ verified |
| 5 | Create `.claude-plugin/marketplace.json` | pending |
| 6 | Rewrite README install + hooks sections | pending |
| 7 | Verify fresh-install path | pending |

## Phase 1 verification evidence (from `--debug-file` logs)

- `[DEBUG] Loaded hooks from standard location for plugin super-claudio-code: .../hooks/hooks.json`
- `[DEBUG] Loaded inline plugin from path: super-claudio-code`
- `[DEBUG] Registered 3 hooks from 7 plugins`
- `[DEBUG] Loaded 6 skills from plugin super-claudio-code default directory` (confirms dropping `skills:` array works — auto-discovery)
- `[DEBUG] Loaded 2 agents from plugin super-claudio-code default directory`
- UserPromptSubmit: `Hook UserPromptSubmit success: {"additionalContext":"## Relevant Learnings..."}` for prompt matching ≥2 trigger words
- Stop: `Hook Stop returned permissionDecision: deny` with archivist+cleanup instruction; `.archival-triggered` sentinel created
- Opt-out: `SCC_DISABLED_HOOKS=stop` → no Stop block, no sentinel

PreCompact not directly verified (cannot trigger `/compact` in `-p` mode), but wiring is identical to the two passing hooks and the script's gate logic was tested programmatically.

## Surprises / corrections during Phase 1

- `displayName` and `postInstall` are NOT recognized by Claude Code's plugin schema — `claude plugin validate` failed until removed. The plan assumed `postInstall` was honored; it never was. `install.js` is dead code (not wired to npm postinstall script either) — flag for cleanup agent.
- `skills:` array confirmed redundant — every official plugin (`claude-code-setup`, `mcp-server-dev`, `claude-md-management`, `playground`, `example-plugin`) ships without it and Claude Code auto-discovers from `skills/` directory.

## Read Order

1. This file
2. `plan.md` — full plan
3. Phase 2 modifies: create `.claude-plugin/marketplace.json`, modify `README.md`

## Start At

Phase 2, task #5 — create `.claude-plugin/marketplace.json`. Reference shape: `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`.

## Open question for Phase 2

- Marketplace plugin reference name: `scc@super-claudio-code` (short, awkward) vs `super-claudio-code@super-claudio-code` (verbose, clear). Settle when writing marketplace.json.

## Key Constraints (from plan)

- No `mergeHooksIntoSettings` resurrection
- No absolute paths in committed files — `${CLAUDE_PLUGIN_ROOT}` only
- No settings.json mutation on install OR uninstall
- npm path stays the source of `scc` CLI; plugin path stays the source of hooks/skills/agents auto-wiring

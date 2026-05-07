# Handoff — Hook Registration

## Status

Both phases code-complete. Local marketplace install verified end-to-end. Github-URL install path requires `git push` before it can be tested.

| # | Task | Status |
|---|------|--------|
| 1 | Plugin manifest version bump (drop `skills:`/`displayName`/`postInstall`) | ✅ done |
| 2 | Wire `hooks/hooks.json` with 3 entries via `${CLAUDE_PLUGIN_ROOT}` | ✅ done |
| 3 | Add `SCC_DISABLED_HOOKS` opt-out gate to all 3 scripts | ✅ done |
| 4 | Verify hooks fire via `claude --plugin-dir` | ✅ verified |
| 5 | Create `.claude-plugin/marketplace.json` | ✅ done |
| 6 | Rewrite README install + hooks sections | ✅ done |
| 7 | Verify fresh-install path | ✅ verified locally; ⏳ pending push for github-URL form |

## Phase 2 verification evidence

Local-path marketplace install:
- `claude plugin marketplace add /Users/anf191/github/super-claudio-code` → "✔ Successfully added marketplace: super-claudio-code"
- `claude plugin install super-claudio-code@super-claudio-code` → "✔ Successfully installed plugin"
- `claude plugin list` → enabled, version 0.2.0
- New session in `/tmp/scc-install-test`: hooks fire correctly without `--plugin-dir` flag — UserPromptSubmit injects "Relevant Learnings", Stop blocks with archivist instruction, `.archival-triggered` sentinel created.
- `${CLAUDE_PLUGIN_ROOT}` resolves correctly (debug shows "Hook Stop (node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js) returned permissionDecision: deny ...")

What's untested: the `github:andresfortunato/super-claudio-code` marketplace source. Requires push to GitHub. Local-path test exercises the same install/wire codepath, just with a different fetch source — high confidence it works.

## Read Order

1. This file
2. `plan.md` — full plan
3. `log.md` — direction-change record (postInstall/displayName/skills drop)

## Start At

If continuing in a fresh session: nothing left to implement. Ask user whether to push the branch to enable github-URL verification, then mark the plan complete (archive + cleanup).

## Outstanding

- **Push to GitHub**: needs explicit user authorization (changes shared state).
- **`install.js` is dead code**: never invoked — flagged in `log.md` for the cleanup agent at plan completion.
- **Plugin currently installed via local-path marketplace**: switching to github source after push requires `claude plugin marketplace remove super-claudio-code && claude plugin marketplace add github:andresfortunato/super-claudio-code`.

## Key Constraints (preserved)

- No `mergeHooksIntoSettings` resurrection ✅
- No absolute paths in committed files ✅ (all `${CLAUDE_PLUGIN_ROOT}`)
- No settings.json mutation on install OR uninstall ✅ (env-var opt-out)
- npm path stays the source of `scc` CLI; plugin path owns hooks/skills/agents ✅
- Three hooks only (`session-start.js` deletion respected) ✅

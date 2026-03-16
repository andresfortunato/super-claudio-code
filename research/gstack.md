# Research: gstack

*Source: github repo analysis via MCP (github.com/garrytan/gstack)*

---

## Overview

gstack is a Claude Code plugin focused on web QA, code review, and release management. 8 skills, a custom headless browser CLI, and a 3-tier eval system. Built by Garry Tan. Key distinction: deliberately rejects MCP in favor of CLI tools for token efficiency.

---

## Web Search / Browsing

**No web search.** gstack has no search API integration (no Brave, Perplexity, Google, Tavily).

**Custom headless browser**: A compiled Bun binary (`browse/dist/browse`, ~58MB) that talks to a persistent local Chromium daemon over localhost HTTP. CLI is a thin client; server manages Playwright-driven Chromium.

**How it works:**
- First call: CLI spawns server, launches headless Chromium via Playwright, picks random port (10000-60000), generates bearer token, writes state to `.gstack/browse.json`. ~3 seconds.
- Subsequent calls: CLI reads state file, sends HTTP POST with bearer token, prints plain text. ~100-200ms.
- Auto-shuts down after 30 minutes idle.

**Why CLI over MCP (explicit decision):**
"MCP adds JSON schema overhead per request and requires a persistent connection. Plain HTTP + plain text output is lighter on tokens." In a 20-command browser session, MCP burns 30-40K tokens on protocol framing; gstack burns zero.

**Element selection innovation:** Uses Playwright's accessibility tree API to assign `@e1`, `@e2` refs to elements, then maps to Playwright Locators. No DOM mutation, no CSP issues, no framework conflicts. Extended with `-C` flag for cursor-interactive elements the ARIA tree misses.

**50+ browser commands** including: goto, text, html, links, forms, snapshot, click, fill, screenshot, responsive, diff, js, console, network, cookies, storage, perf, chain.

---

## Skills

8 skills, each as a Claude Code slash command:

| Skill | Role | Notes |
|-------|------|-------|
| `/plan-ceo-review` | Founder/CEO mode | 3 scope modes. 10-section review with interactive AskUserQuestion per issue. 34KB prompt. |
| `/plan-eng-review` | Eng manager mode | 3 modes (SCOPE REDUCTION, BIG CHANGE, SMALL CHANGE). Forces ASCII diagrams. |
| `/review` | Paranoid staff engineer | 2-pass checklist (CRITICAL vs INFORMATIONAL). Greptile integration with 2-tier escalation. |
| `/ship` | Release engineer | Fully automated: merge main, run tests, review, bump version, changelog, TODOS.md, commit, push, PR. |
| `/browse` | QA engineer | Custom headless browser with 50+ commands. |
| `/qa` | QA lead | 4-mode testing: diff-aware, full, quick, regression. Health score rubric. |
| `/setup-browser-cookies` | Session manager | Cookie import from real browsers (decrypts via macOS Keychain). |
| `/retro` | Engineering manager | Team-aware retrospective with metrics, trends, per-person praise/growth. |

**SKILL.md.tmpl codegen system**: Templates contain human-written prose + `{{PLACEHOLDER}}` tokens. `scripts/gen-skill-docs.ts` resolves placeholders from source code metadata (command registry, snapshot flags). Committed generated files let Claude read them at skill load time, CI validates freshness with `--dry-run`, git blame works.

---

## Hooks and Lifecycle

- **Update check hook**: Every SKILL.md starts with bash that calls `bin/gstack-update-check`. Auto-upgrade or 4-option prompt.
- **Version auto-restart for browser daemon**: Build writes git hash to `.version`. Each CLI invocation checks if binary matches running server; kills and restarts if mismatched.
- **Conductor hooks**: `conductor.json` runs `bin/dev-setup` on workspace creation, `bin/dev-teardown` on archive. Automates multi-workspace setup.

---

## Testing Infrastructure (3-Tier Eval)

| Tier | What | Cost | Speed |
|------|------|------|-------|
| 1 — Static | Parse every command in SKILL.md, validate against command registry | Free | <5s |
| 2 — E2E | Spawn real `claude -p`, run each skill, stream NDJSON progress | ~$3.85 | ~20min |
| 3 — LLM-as-judge | Sonnet scores docs on clarity/completeness/actionability (1-5, threshold ≥4) | ~$0.15 | ~30s |

E2E has: heartbeat JSON, partial results that survive kills, NDJSON transcripts, failure diagnostics, live dashboard via `eval:watch`.

---

## Cross-Skill Shared State

**TODOS.md**: Multiple skills read/write it — `/ship` auto-detects completed items, `/review` cross-references against diffs, `/plan-*` reads for context, `/retro` tracks backlog health. Lightweight shared memory.

**Greptile history learning**: Every triage outcome saved to `~/.gstack/greptile-history.md`. Future runs auto-skip known false positive patterns.

**Retro trend tracking**: `/retro` saves JSON snapshots, loads prior retros to show trends.

---

## Key Takeaways for Our Framework

1. **CLI over MCP for token-sensitive operations** — validates our `durin` CLI choice
2. **SKILL.md.tmpl codegen** — auto-generates skill docs from source metadata, prevents drift between skills and implementation
3. **3-tier eval system** — static validation → E2E → LLM-as-judge, reusable testing architecture
4. **TODOS.md as cross-skill shared state** — all skills read/write the same status files consistently
5. **Cognitive mode framing** — skills as different "thinking hats" (CEO, eng manager, QA lead) rather than agent teams

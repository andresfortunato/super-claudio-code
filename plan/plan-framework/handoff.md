# Handoff — Session 3 (2026-03-15)

## Status

Design and planning phase complete. All architectural decisions finalized. Implementation plan written. Ready to execute Phase 1.

## Read order for implementation

1. **This file** — you're reading it
2. **`plan/plan-framework/plan.md`** — the full implementation plan (goal, constraints, 15 decisions, file manifest, 6 phases + 1 deferred)
3. **`handoff.md`** (repo root) — Sessions 1 & 2 context: file system layout, learning component design, archivist design, research insights from 6 repos

## Skill drafts (read before Phase 3, not before)

- `skills/brainstorming/SKILL.md` — mayeutic model, temporal phases, research on-demand, dual output
- `skills/planning/SKILL.md` + `skills/planning/references/multi-session.md` — plan writing principles, context files, multi-session protocols
- `skills/implementation/SKILL.md` + `skills/implementation/references/escalation-reference.md` — phase-level execution, escalation triggers, parallelization delegation, plan completion
- `skills/agent-teams/SKILL.md` — orchestration step, tmux mode, output collection, quality gates

## Research (reference only, don't read unless stuck)

- `research/synthesis.md` — cross-repo comparative analysis
- `research/gstack.md` — CLI-over-MCP pattern, codegen system, 3-tier evals
- `research/everything-claude-code.md` — ECC hooks, tmux-worktree-orchestrator, session persistence
- `research/compound-engineering.md` — learning system design, grep-as-index

## Start at

**Phase 1: CLI Tool** — Build the Node.js CLI (`durin`) with three commands:
- `durin init` — scaffold project directories (`.claude/status/`, `.claude/learnings/`, `plan/`, `archive/`, `brainstorms/`)
- `durin plan init [name]` — scaffold plan directory (`plan/plan-[name]/` with `plan.md`, `phases/`, `context/`)
- `durin status` — read `.claude/status/` and print aggregate progress

Node.js, npm package, `bin` entry in package.json. See plan.md file manifest for full file list.

## Key constraints to remember

- **CLI handles scaffolding, skills handle judgment, hooks handle automation** — don't blur the layers
- **Skills reference CLI commands by name** (`durin plan init [name]`) — the CLI is the interface, skills are consumers
- **Auto-commit uses template messages** from task subject: `"Complete: [task subject]"`. Not LLM-generated.
- **All skills must read/write status files identically** — same paths, same format (cross-skill shared state)
- **Plan directory scaffolding is triggered by the planning skill** running `durin plan init [name]` as its first step — not by a hook, not by the user manually

## What's NOT built yet

Everything. The repo currently contains only:
- Research documents (`research/*.md`)
- Planning notes (`planning.md`, `notes.txt`)
- Draft skills (`skills/`)
- This implementation plan (`plan/plan-framework/`)
- No CLI, no hooks, no package.json, no install script

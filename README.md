# Super Claudio Code

This is my Claude Code workflow. It's a work in progress where I test different tools and ideas and document them. The workflow is focused on:

- Optimizing planning so that we increase plan quality and reduce the ratio of .md lines to code at the same time
- Context management so that we avoid context rot and codebase re-exploration every time
- Multi-session orchestration so that we don't worry about referencing files or summaries any more
- Automated learning to take notes of relevant challenges or solutions.

Super Claudio Code (SCC) is based on my experience working with Claude Code. I've also tested and reviewed (with Claude) existing popular workflows (see 'Reference Workflows' section). 

SCC has two layers: a **CLI** for scaffolding and **skills** for orchestration.

## Principles

- We shouldn't assign too much weight to plans, assuming almost automatic execution. Iteration makes planning better. Plans are the map, not the territory. 
- Many plans tend to micromanage implementation, which is counterproductive because in reality plans change all the time. Micromanaged plans constrain the implementation agent's problem-solving capacity. 
- Baking code snippets in plans is a waste of tokens. The implementation agent or session will re-read the codebase.
- We want to minimize the ratio of .md lines to code execution that is required to achieve high quality results

## Installation

Install the framework globally (once):

```bash
npm install -g github:andresfortunato/super-claudio-code
```

This gives you the `scc` CLI globally. Then, in each project:

```bash
scc init
```

This scaffolds project directories (`.claude/status/`, `.claude/learnings/`, `plan/`, `archive/`, `brainstorms/`) and installs skills to `~/.claude/commands/`. Idempotent — safe to run again.

Verify:

```bash
scc status
```

> **Note:** Once published to npm, install simplifies to `npm install -g super-claudio-code`.

## Architecture

```
CLI (automation)  →  Skills (orchestration)
━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━━━
scc init              brainstorming
scc plan init         planning
scc status            implementation
scc learning list     agent-teams
                      tdd
```

**CLI** handles all scaffolding and file operations — zero tokens spent on directory creation.

**Skills** contain judgment and orchestration — when to plan, how to implement, when to escalate.

## CLI Commands

### `scc init`

Scaffolds project directories for the framework:
```
.claude/status/           — project and plan status (shared state)
.claude/learnings/        — institutional knowledge across sessions
plan/                     — active plan directories
archive/                  — completed plan archives
brainstorms/              — brainstorming session outputs
```
All directories are automatically cleaned up once implementation completes.

### `scc plan init <name>`

This command is automatically executed by Claude Code when starting a planning process. It creates a new plan directory structure:

```
plan/plan-<name>/
├── plan.md               — goal, constraints, decisions, file manifest
├── handoff.md             — session handoff (overwritten each session)
├── log.md                 — implementation journal (append-only)
├── phases/                — per-phase plan files
└── context/               — decision-enabling codebase summaries
```

Also creates `.claude/status/plan-<name>.md` for cross-skill status tracking.

### `scc status`

Shows project identity and all active plan statuses.

### `scc learning list`

Lists all stored learnings with their metadata (title, severity, date, tags).

## Skills

Skills are `.md` files that guide Claude's behavior for specific workflows. They load on demand — only when triggered by the conversation context.

### Brainstorming

Collaborative exploration before planning. Claude listens early, challenges mid-conversation, and proposes alternatives late. Outputs structured decision summaries that feed into the planning skill.

### Planning

Writes implementation plans at the right level of detail — intent and constraints, not code snippets. Plans use a multi-file structure (plan.md + phases/ + context/) designed for selective loading across sessions.

### Implementation

Executes plans across sessions. Phase-level execution with verification at each checkpoint. Manages context budget (60% rule), handoff writing, escalation when reality diverges from the plan.

### Agent Teams

Orchestrates parallel work with independent Claude instances. Handles file ownership, worktree isolation for experiments, quality gates, and output consolidation.

### TDD

[Canon test-driven development](https://tidyfirst.substack.com/p/canon-tdd). Behavioral test lists during planning, RED-GREEN-REFACTOR cycles during execution. Separate skill — used alongside implementation when the plan calls for it.

### Learning Capture

Captures institutional knowledge as individual files in `.claude/learnings/`. Supports two learning types: **gotchas** (Problem/Solution/Prevention) for mistakes and counterintuitive behavior, and **insights** (Discovery/Why it matters/When to apply) for useful patterns and observations. Triggered by the pre-compact hook, user request, or when Claude notices something worth preserving.

## Hooks

Four hooks are enabled in user-level settings (`~/.claude/settings.json`) and fire across all projects:

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start.js` | SessionStart | Injects active plan statuses into session context (dynamic — discovers plans automatically) |
| `user-prompt-submit.js` | UserPromptSubmit | Matches prompt against learning triggers, injects relevant learnings |
| `stop.js` | Stop | Detects plan completion (.completed marker), triggers archival agents |
| `pre-compact.js` | PreCompact | Reminds to write handoff and capture learnings before compaction |

Static project context is loaded via `@` import in CLAUDE.md (see [Claude Code memory docs](https://code.claude.com/docs/en/memory#import-additional-files)). Dynamic plan discovery is handled by the session-start hook.

To enable hooks, add them to `~/.claude/settings.json` (user-level, all projects) or a project's `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "node /path/to/super-claudio-code/hooks/stop.js",
          "timeout": 10
        }]
      }
    ]
  }
}
```

## Learning System

Institutional knowledge that persists across sessions and plans.

**Storage**: Individual markdown files in `.claude/learnings/` with YAML frontmatter. A lightweight `index.yaml` maps each learning to trigger keywords.

**Capture**: The pre-compact hook reminds you to capture learnings before context compaction. Otherwise voluntary — ask Claude or capture manually via triggering learning skill. Format template at `.claude/learnings/config/learnings-config.md`.

**Browse**: `scc learning list` shows all learnings with metadata.

## Plan Lifecycle

```
brainstorm  →  plan  →  implement  →  complete  →  archive
                ↑                         |
                └── handoff (per session) ─┘
```

1. **Brainstorm**: Explore approaches, make decisions
2. **Plan**: Planning skill runs `scc plan init <name>`, then writes plan.md with decisions, constraints, file manifest
3. **Implement**: Execute phase by phase, verify at each checkpoint, write handoffs between sessions
4. **Complete**: Mark plan as done
5. **Archive**: Synthesize archive entry, update CLAUDE.md if architecture changed, update project.md focus, clean up plan directory

## File Layout

```
.claude/
  status/
    project.md                  — project identity + current focus (created by planning skill, not scc init)
    plan-<name>.md              — per-plan status (phase, task, blocked)
  learnings/
    index.yaml                  — trigger keyword index
    config/learnings-config.md  — learning file format template
    <topic>.md                  — individual learnings

plan/
  plan-<name>/
    plan.md                     — implementation plan
    handoff.md                  — latest session handoff
    log.md                      — implementation journal
    phases/                     — per-phase plan files
    context/                    — codebase summaries

archive/
  index.md                      — summary of all archived plans
  plan-<name>.md                — archived plan entry

brainstorms/
  <topic>.md                    — brainstorming session outputs
```

## Reference Workflows (last update 03/13/2026)
 
Here is a review of several popular Claude Code workflow repos done by Claudio and I. Each one contributed ideas — and cautionary lessons. Claudio's full research notes live in `research/`.

### Superpowers (`obra/superpowers`)

A pure-.md workflow with minimal automation. Single-file plans, checkbox progress tracking, and subagent-driven execution. The only hook is a SessionStart that injects the skill loader.

**Pros:**
- Elegant simplicity — single-file plans with no scaffolding overhead
- Subagent isolation prevents context bleed between tasks
- Plan review loop (spec reviewer + plan reviewer) before execution
- Minimal token cost (~5-10KB per skill invocation)

**Cons:**
- Single-file plans don't scale — no selective context loading for large features
- No session handoff mechanism — relies entirely on plan checkboxes + git state
- Skills have good structure but lack explanations of WHY, leading to generic results
- Bakes exact code snippets and file paths into plans, which produces token waste
- I really like the Socratic method in the brainstorming skill, but it assigns Claude the role of Socrates. The one asking questions should be the user since questions shape conversations. We too the mayeutic idea and reframed it with different roles. 

### Get Shit Done / GSD (`coleam00/get-shit-done`)

The heaviest framework. A full Node.js CLI (`gsd-tools.cjs`, 174KB), 120+ .md files (~808KB total), and a hierarchical `.planning/` directory with STATE.md, ROADMAP.md, REQUIREMENTS.md, per-phase plans, and verification reports.

**Pros:**
- Programmatic state manipulation — STATE.md updates, progress bars, and plan advancement handled by CLI, not LLM
- `.continue-here.md` is a clean session handoff artifact (created on pause, deleted on resume)
- Rich YAML frontmatter on plans enables dependency tracking and execution wave ordering
- Context monitor hook warns at usage thresholds

**Cons:**
- Massive token footprint — a single workflow invocation pulls 50-80KB of system context
- Over-engineered: XML task structures, requirement traceability (REQ-IDs), milestone archival — overkill for most projects
- High .md-to-code ratio wastes tokens on ceremony
- Assumes near-automatic execution — plans are treated as step-by-step instructions rather than intent + constraints that adapt to reality
- Context monitor was hardcoded to 200K window (wrong for 1M models)

### Compound Engineering (`EveryInc/compound-engineering-plugin`)

A learning-focused plugin with 47 skills, 28 agents, and zero hooks. All orchestration through skills and the `/lfg` automation pipeline. The standout feature is its document-based institutional knowledge system with YAML-schema-validated learnings.

**Pros:**
- Best learning system of any workflow — structured YAML schema, grep-based retrieval, "Required Reading" promotion path
- Pull-based learning injection (only during `/ce:plan` and `/ce:review`) avoids context pollution
- Context budget awareness — compact-safe mode for low-context situations
- Multi-agent capture: 5 parallel subagents analyze a solution from different angles

**Cons:**
- No hooks means learnings only surface when user explicitly runs a workflow command
- Search over learnings includes full learnings docs, no index.
- Auto-invoke trigger phrases ("that worked", "it's fixed") are prompt-engineering only
- No pruning mechanism — learning set grows forever with no staleness detection
- 47 skills is overwhelming — many users won't discover most of them
- The `/lfg` pipeline is opinionated and rigid (plan → deepen → work → review → resolve → test → video)

### Everything Claude Code / ECC (`affaan-m/everything-claude-code`)

A comprehensive plugin and curated guide. 20+ hooks across 6 lifecycle events, a tmux-worktree orchestrator for parallel workers, and a session persistence system. More infrastructure than workflow.

**Pros:**
- Best session management: "What Did NOT Work" section prevents retrying failed approaches
- tmux-worktree orchestrator takes a JSON plan and scaffolds parallel Claude workers automatically
- Hook profile system (minimal/standard/strict) lets users dial automation up or down
- Dynamic system prompt injection via shell aliases for different work modes

**Cons:**
- Too much happening under the hood — 20+ hooks firing across 6 events

### Spec Kit (`spec-kit/spec-kit`)

A Python CLI-first workflow built around Spec-Driven Development. Shell scripts scaffold directories and copy templates; AI fills in the content. The cleanest separation of "scripts do mechanical work, AI does thinking."

**Pros:**
- Cleanest scaffolding pattern: scripts create structure + output JSON paths, SKILL.md orchestrates AI to populate
- Technology-agnostic spec format with Given/When/Then acceptance scenarios
- Templates are separate files — AI reads them on demand instead of reproducing from memory
- Constitution pattern: immutable principles that constrain what AI can generate (gates before proceeding)

**Cons:**
- Rigid three-phase pipeline (spec → plan → tasks) assumes waterfall-like progression
- Heavy on ceremony — specs, plans, tasks, research, data models, contracts, checklists per feature
- No session handoff beyond task checkboxes — no handoff notes, no "what didn't work"

### OpenSpec (`Fission-AI/OpenSpec`)

A TypeScript CLI with a schema-driven artifact graph. The CLI scaffolds directories, computes build order via topological sort, and delivers templates + instructions as JSON. The AI follows a DAG of artifacts (proposal → specs → design → tasks).

**Pros:**
- Most sophisticated CLI: topological sorting of artifact dependencies, filesystem-based state detection
- Schema-driven: add a new artifact type to `schema.yaml` and the CLI handles build order, templates, and instructions
- Minimal templates (50-200 bytes each) — AI fills in content, not structure
- Clean `openspec status --json` gives any session a complete picture of progress

**Cons:**
- Might be over-abstracted for some projects — the artifact graph, DAG computation, and schema system add complexity without proportional benefit
- No learning system or institutional knowledge
- No session handoff beyond file existence checks
- Delta specs for brownfield work (ADDED/MODIFIED/REMOVED sections) are clever but might rarely exercised in practice

### Cross-cutting patterns we adopted

| Pattern | Source | How SCC uses it |
|---------|--------|----------------|
| CLI scaffolds, skills orchestrate | Spec Kit, OpenSpec | `scc init` and `scc plan init` handle directories; skills handle judgment |
| Multi-file plans with selective loading | Original (contrast with Superpowers' single-file) | `plan.md` + `phases/` + `context/` + `handoff.md` |
| Handoff over one more task | ECC's session management | `handoff.md` overwritten each session with status + next steps |
| Keyword-triggered learning retrieval | Compound Engineering's grep-based approach | `index.yaml` + `UserPromptSubmit` hook matches keywords |
| Phase-level execution loops | GSD insight, simplified | Read files once at phase start, lightweight checkpoints per task |
| Intent over implementation in plans | Lesson from Superpowers' code-snippet plans | Plans describe what and why, not how |

## License

MIT

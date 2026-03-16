# Durin

A Claude Code efficiency framework — structured planning, context management, session orchestration, and automated learning.

Durin makes Claude Code sessions more efficient by providing three automation layers that work together: a **CLI** for scaffolding, **skills** for orchestration, and **hooks** for lifecycle management.

## Quick Start

```bash
npm install durin
```

The post-install script automatically:
- Merges hooks into your `.claude/settings.json`
- Scaffolds project directories (`.claude/status/`, `.claude/learnings/`, `plan/`, `archive/`, `brainstorms/`)

Verify the installation:

```bash
durin status
```

## Architecture

```
CLI (automation)  →  Skills (orchestration)  →  Hooks (lifecycle)
━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━
durin init            brainstorming              SessionStart
durin plan init       planning                   UserPromptSubmit
durin status          implementation             Stop
durin learning list   agent-teams                PostToolUse
                      tdd                        PreCompact
                                                 TaskCompleted
                                                 TeammateIdle
```

**CLI** handles all scaffolding and file operations — zero tokens spent on directory creation.

**Skills** contain judgment and orchestration — when to plan, how to implement, when to escalate.

**Hooks** handle lifecycle automation — context injection, handoff enforcement, auto-commits, learning retrieval.

## CLI Commands

### `durin init`

Scaffolds project directories for the framework:

```
.claude/status/           — project and plan status (shared state)
.claude/learnings/        — institutional knowledge across sessions
plan/                     — active plan directories
archive/                  — completed plan archives
brainstorms/              — brainstorming session outputs
```

### `durin plan init <name>`

Creates a new plan directory structure:

```
plan/plan-<name>/
├── plan.md               — goal, constraints, decisions, file manifest
├── handoff.md             — session handoff (overwritten each session)
├── log.md                 — implementation journal (append-only)
├── phases/                — per-phase plan files
└── context/               — decision-enabling codebase summaries
```

Also creates `.claude/status/plan-<name>.md` for cross-skill status tracking.

### `durin status`

Shows project identity and all active plan statuses. This output is also injected into every session by the SessionStart hook.

### `durin learning list`

Lists all stored learnings with their metadata (title, severity, date, tags).

## Skills

Skills are `.md` files that guide Claude's behavior for specific workflows. They load on demand — only when triggered by the conversation context.

### Brainstorming

Collaborative exploration before planning. Claude listens early, challenges mid-conversation, and proposes alternatives late. Outputs structured decision summaries that feed into the planning skill.

**Triggers**: "how should we", "what's the best way to", "brainstorm", thinking out loud about approaches.

### Planning

Writes implementation plans at the right level of detail — intent and constraints, not code snippets. Plans use a multi-file structure (plan.md + phases/ + context/) designed for selective loading across sessions.

**Triggers**: trade-offs to weigh, architectural choices, ambiguous scope, multi-session work.

### Implementation

Executes plans across sessions. Phase-level execution with verification at each checkpoint. Manages context budget (60% rule), handoff writing, escalation when reality diverges from the plan.

**Triggers**: "implement", "start building", "continue", resuming a plan with `handoff.md`.

### Agent Teams

Orchestrates parallel work with independent Claude instances. Handles file ownership, worktree isolation for experiments, quality gates, and output consolidation.

**Triggers**: "run in parallel", independent work units, experimental branches.

### TDD

Canon test-driven development (Kent Beck). Behavioral test lists during planning, RED-GREEN-REFACTOR cycles during execution. Separate skill — used alongside implementation when the plan calls for it.

**Triggers**: "use TDD", "test-driven", testable behavior implementation.

## Hooks

Hooks run automatically on Claude Code lifecycle events. They operate outside the session context at zero token cost (until they inject context).

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start.js` | SessionStart | Injects project status + active plan statuses into session context |
| `user-prompt-submit.js` | UserPromptSubmit | Matches prompt against learning triggers, injects relevant learnings |
| `context-monitor.js` | PostToolUse | Warns at 65% and 75% context usage |
| `stop.js` | Stop | Enforces handoff writing, detects plan completion, prompts for learning capture |
| `pre-compact.js` | PreCompact | Reminds to write handoff before auto-compaction |
| `task-completed.js` | TaskCompleted | Auto-commits with `Complete: [description]`, updates status timestamps |
| `teammate-idle.js` | TeammateIdle | Blocks on merge conflicts or syntax errors in modified files |

## Learning System

Institutional knowledge that persists across sessions and plans.

**Storage**: Individual markdown files in `.claude/learnings/` with YAML frontmatter. A lightweight `index.yaml` maps each learning to trigger keywords.

**Capture**: The Stop hook prompts for learning capture after substantial sessions. Format template at `.claude/learnings/config/learnings-config.md`.

**Retrieval**: The UserPromptSubmit hook fires on every user message, matches prompt words against trigger keywords (minimum 2 matches), and injects relevant learnings as context. Sub-millisecond — it greps a small index file, not the full learning content.

**Browse**: `durin learning list` shows all learnings with metadata.

## Plan Lifecycle

```
brainstorm  →  plan  →  implement  →  complete  →  archive
                ↑                         |
                └── handoff (per session) ─┘
```

1. **Brainstorm**: Explore approaches, make decisions
2. **Plan**: `durin plan init <name>`, write plan.md with decisions, constraints, file manifest
3. **Implement**: Execute phase by phase, verify at each checkpoint, write handoffs between sessions
4. **Complete**: Write `.completed` marker when all phases verified
5. **Archive**: Stop hook detects marker, launches archivist (synthesize archive) + cleanup agent (remove dead code) in parallel

## File Layout

```
.claude/
  status/
    project.md                  — project identity + active plans
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

## Design Principles

- **CLI handles scaffolding, skills handle judgment, hooks handle automation** — each layer does what it's best at
- **Intent over implementation** — plans describe what and why, not how
- **Constraints over instructions** — what NOT to do prevents more mistakes than what to do
- **Context is the scarcest resource** — every design decision optimizes for the 200K token budget
- **Exception-based escalation** — only surface issues that affect plan direction, handle details inline
- **Handoff over one more task** — a good handoff saves the next session 15-30% of its context

## License

MIT

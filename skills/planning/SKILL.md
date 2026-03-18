---
name: planning
description: Guide for writing implementation plans that give Claude the right level of detail — intent and constraints, not code snippets and step-by-step instructions. Use when brainstorming features, designing implementations, writing plans for multi-step tasks, or when asked to plan, architect, or think through an approach. The key trigger is whether there are decisions that benefit from deliberation before execution — trade-offs to weigh, architectural choices, multiple integration points, or ambiguous scope. Don't trigger for tasks with a single obvious implementation path (rename a variable, fix a typo, change a font) where reading the code makes the implementation obvious.
---

## Project identity
!`cat .claude/status/project.md 2>/dev/null || echo "⚠ NO PROJECT IDENTITY — you MUST create .claude/status/project.md before proceeding. Ask the user about their project first."`

**IMPORTANT: If the line above says "NO PROJECT IDENTITY", stop and handle this before doing anything else.** Ask the user: "There's no project identity file yet. Want me to create one? What does this project do and what's the current focus?" Then explore the codebase (package.json/pyproject.toml, README, directory structure) and recent git history (`git log --oneline -20`), and write `.claude/status/project.md` — 3-5 lines max: project name, what it does, current focus, what's next. No stack info (that belongs in CLAUDE.md).

# Planning

## When to Plan

Not every task needs a plan. The dividing line isn't task size — it's whether there are decisions that benefit from deliberation before execution.

**Plan when:**
- There are trade-offs with multiple valid approaches
- New code connects to existing systems at multiple integration seams
- The request is ambiguous and could mean very different things
- Going down the wrong path would waste significant context
- Implementation will span multiple sessions

**Skip planning when:**
- There's a single obvious implementation path
- The change follows an existing pattern mechanically
- The task is a clear, scoped fix with an identified cause

A task can touch 10 files and not need a plan (mechanical transformation following a pattern). A task can touch 2 files and need a plan (if those files involve an architectural decision).

## Core Principles

### Intent over Implementation

Don't include code snippets in plans — they're written against a snapshot that's stale by execution time, and the Edit tool requires reading the actual file anyway. A snippet creates two conflicting sources of truth that need reconciling, which is harder than working from intent alone.

Instead of pasting 30 lines of JSX, write: "Add WebsiteLayout wrapper to App.tsx routing. Keep all existing routes unchanged. Marketing routes use separate i18n provider." Claude reads App.tsx and figures out the implementation. The snippet is at best redundant, at worst misleading.

### Constraints over Instructions

What NOT to do is as valuable as what to do. Claude is good at figuring out implementation from intent, but it can't know about project-specific constraints without being told. "Don't break existing auth routes" prevents a class of mistakes that "add the new routes" doesn't.

Constraints are also more durable — they stay correct even as the codebase changes, while implementation instructions go stale.

### Decisions as Records

Things decided during brainstorming shouldn't be re-debated during execution. When a choice between approaches has been made, record it with enough context that the executing session understands why: "Two i18n providers, not one — marketing content has different translation workflow than app UI." This prevents re-derivation and keeps execution focused.

### Tasks as Checkpoints

Tasks should be independently verifiable milestones, not sequential instructions. Each should have a clear done state confirmed by a build, test, or visual check.

**Bad** (micromanaging):
- Task 1.1: Open frontend/src/App.tsx
- Task 1.2: Add import for Navbar at line 5
- Task 1.3: Create WebsiteLayout component after line 20

**Good** (checkpoints with intent):
- Task 1.1: Copy marketing files from shell repo (13 files + 2 assets)
- Task 1.2: Add routing — WebsiteLayout wrapper with Navbar/Footer, marketing i18n provider
- Task 1.3: Verify — build passes, marketing pages render, old app routes unchanged

If a task can't be independently verified, it's too granular — merge it up. Good tasks create natural commit points and enable progress tracking across sessions.

## What Goes in a Plan

### Must Have
- **Constraints** — what NOT to do, project-specific boundaries
- **Decisions made** — choices from brainstorming with reasoning, not to be re-debated
- **File manifest** — paths + intent (what to create/modify/delete and why, not how)
- **Repo context summary** -- how this plan fits in the codebase
- **Integration seams** — where new code connects to existing systems
- **Verification criteria** — how to know each phase is done (build, test, visual check)
- **Behavioral test lists** — when a phase uses TDD, include plain-English test lists per the `tdd` skill (behavioral descriptions, not test code)
- **Phase order + dependencies** — what depends on what

### Actively Harmful
- **Code snippets** — stale snapshot, Claude reads the file anyway, creates conflicting sources of truth
- **Sub-step instructions** ("open file, add import, add component") — duplicates Claude's built-in capabilities
- **Predicted line numbers or file contents** — stale the moment anything changes
- **Standard operation instructions** ("run npm install") — obvious, wastes context

### The Pointer Principle

A plan should be a pointer to the code, not a copy of it. "Modify App.tsx to add WebsiteLayout wrapper" lets Claude read App.tsx with full context. Pasting 30 lines of JSX means Claude reads both the plan AND the file, spending tokens reconciling them.

The test for every line: does this help the executing session do something it couldn't figure out from reading the code? If not, cut it.

## Context Budget

Context is the scarcest resource in a session. A plan that's too detailed wastes the implementer's context on redundant information (code snippets duplicating source files). A plan that's too vague wastes the implementer's context on exploration (reading files to figure out what the plan meant).

The sweet spot: decisions and constraints stated once clearly, file manifest pointing where to look, and clear verification criteria. No duplicated information — the plan says "read X," not "here's what X contains."

For large plans, split into per-phase plan files rather than one giant document. Each phase file is independently readable. The master plan is just the phase list with dependencies and handoff points.

## Recommended Plan Structure

A well-structured plan covers these elements, adapted to the project's needs:

```
# [Title]

## Goal (1-2 sentences)
## Constraints (what NOT to do)
## Decisions Made (from brainstorming, don't re-debate)
## File Manifest (paths + intent, no code) -> saves exploration context
## Repo context summary (how this plan fits in the codebase) -> saves exploration context

## Phases
### Phase N: [Name]
- Intent: What this accomplishes
- Modifies/Adds: [files]
- Verification: [pass/fail gate]
- Tasks: [checkpoints with intent]
```

This isn't a rigid template — scale it to the task. A two-file change doesn't need phases. A complex migration might need per-phase plan files. The structure serves the plan, not the other way around.

## Plan Setup

Before writing, scaffold the plan directory by running `scc plan init [name]`. This creates:
- `plan/plan-[name]/` — plan directory with `plan.md`, `handoff.md`, `log.md`, `phases/`, `context/`
- `.claude/status/plan-[name].md` — status file (shared state read by all skills and the SessionStart hook)

Then write to:

- `plan.md` — the core plan document (goal, constraints, decisions, file manifest, repo context)
- `phases/phase-N.md` — per-phase files when the plan has multiple phases. Each is independently readable by its executing session.
- `context/*.md` — decision-enabling codebase summaries (see below)

### Consuming brainstorming output

If a brainstorming session preceded planning, read `brainstorms/[topic].md` for decisions already made. Incorporate these into plan.md's "Decisions Made" section — don't re-debate them. The brainstorming summary contains the reasoning; the plan records the conclusions.

## Context Files

When a phase touches complex systems that the implementer would otherwise spend significant context exploring, write decision-enabling context summaries in `context/`. These save 15-30% of execution context by replacing codebase exploration with a 20-line summary.

The test: would an implementer need to read 5+ files to understand this system well enough to make implementation decisions? If yes, write a context summary during planning.

Not every plan needs context files — only when the repo context summary in plan.md isn't enough for a specific system.

## Multi-Session Plans

If the implementation will span multiple sessions — large file manifest, multiple integration seams, or any single phase estimated at >50% context usage — the plan needs session-aware design.

Signs a plan needs multi-session design:
- More than ~15 files to create or modify
- Multiple phases with dependencies between them
- Estimated context usage exceeding 50% for any phase
- Integration work touching more than 2-3 system boundaries

Read `references/multi-session.md` for session scoping, handoff protocols, and session boundary design before finalizing the plan structure. These concerns shape how phases are sized and ordered — they're planning decisions, not just execution details.

---
name: implement
description: Implement an active plan across one or more sessions. Use when a plan exists in plan/plan-[name]/ and the user wants to start or continue implementing a plan. Triggers on "execute," "implement," "start building," "continue implementation," "pick up where we left off," or any indication the user wants to move from planning to coding. Also triggers when resuming a partially-completed plan — check for handoff.md to determine where to pick up.
---

## Active plans
!`ls -1d plan/plan-*/ 2>/dev/null | sed 's|plan/||;s|/$||' || echo "No plans found"`

## Latest handoff
!`for f in plan/plan-*/handoff.md; do [ -f "$f" ] && echo "=== $f ===" && cat "$f" && echo; done 2>/dev/null || echo "No handoffs found"`

# Implementation

## When to Implement

A plan exists in `plan/plan-[name]/` with `plan.md` and at least one phase file. The user wants to build, not plan.

**Implement when:**
- A plan with unfinished phases exists and the user wants to make progress
- Resuming a partially-completed plan (handoff.md exists)

**Don't implement when:**
- No plan exists — suggest planning first
- The user wants to refine the plan — that's the planning skill
- The task never needed a plan — just do it

## Core Principles

### Code is ground truth

The plan captures assumptions made during brainstorming. The code is reality. When they diverge, code wins for implementation details, the plan wins for intent and constraints. The plan tells you *which* files and *why* — the code tells you *how things currently are*.

### Verify with evidence

Every task has a done state — a passing build, a passing test, a visual confirmation. Don't mark a task complete without running its verification. Unchecked tasks compound: if task 2 is subtly wrong and task 3 builds on it, you've wasted two tasks of context instead of catching it early.

Default verification when the plan doesn't specify: does it build? Do existing tests still pass? When the plan specifies TDD or you encounter testable logic, follow the `tdd` skill for RED-GREEN-REFACTOR cycles.

### Escalate what matters, work around what doesn't

When you discover something that affects the plan's **direction** — a contradicted assumption, an invalid future phase, a needed architectural decision — stop and surface it to the user. Their judgment is mandatory.

When the issue is about **details** — adding a dependency, modifying a config file, adjusting a support file — handle it, note it, keep moving. The test: would the user want to make this decision themselves, or would they say "just handle it"?

Read `references/escalation-reference.md` for the full trigger list with severity guidance and examples.

### Context management

Budget implementation to use up to 60% of context. **Stop once you reach 60%.** LLMs produce measurably worse output in the last ~20% of context. The last 40% is your reserve for debugging or unexpected work.

The framework's context-monitor hook provides automatic warnings at 65% and 75% context usage via PostToolUse. These are safety nets — the skill's 60% rule is the primary discipline.

### Handoff over one more task

A good handoff saves the next session 15-30% of its context by preventing re-exploration. Squeezing in one more task at the cost of a rushed handoff is always net negative. The handoff is the bridge between sessions — a bad bridge costs more than a skipped task.

### Record what didn't work

When an approach fails, record it so the next session or parallel agent doesn't retry it. Failed approaches are invisible in the code — the code only shows what was kept.

**Where it goes:**
- `plan/plan-[name]/handoff.md` — tactical notes for the next session ("tried X, failed because Y")
- `plan/plan-[name]/log.md` — permanent record of direction changes and dead ends within this plan
- `.scc/learnings/` — only when the learning is reusable across plans ("this library silently swallows errors")

## Session Start

Read the minimum needed to begin. The plan captured decisions during brainstorming — don't re-derive them. The handoff captured what the previous session learned — don't re-discover it.

### Read order (in sequence):
1. `plan/plan-[name]/plan.md` — goal, constraints, decisions, file manifest
2. `plan/plan-[name]/handoff.md` — latest session state (skip if first session)
3. Current phase file (`phases/phase-N.md`) — tasks and verification criteria
4. Verify state: `git log --oneline -3` matches the commit from handoff

### Then, only as needed:
5. Context files (`context/*.md`) — only if the current phase references them
6. Source files the current phase will modify — read once at phase start

### Do not:
- Re-read files the handoff says were already understood
- Read source files for future phases
- Read context files irrelevant to the current phase
- Re-derive architectural decisions the plan already recorded

Target: ~20-40 lines of plan context, plus the source files you'll actually modify.

## Execution Flow

Execution operates at the **phase level**. A phase groups related tasks that often touch overlapping files — read source files once, work through the tasks, then verify.

### Phase-level flow:
1. Read the phase file and the source files it touches
2. Work through tasks — implement naturally without per-task ceremony
3. After each task: run verification, mark done with a one-line status note
4. At natural breakpoints: check escalation triggers and assess context usage
5. Phase complete:  verify all phase-level criteria, commit, push, and write handoff

### Parallelization

Before starting a phase, assess whether work can run in parallel. When you detect independent work, launch agent teams — it multiplies throughput without multiplying risk.

**Detect and recommend when:**
- Independent phases touch different files with no dependencies between them
- Independent tasks within a phase modify non-overlapping file sets
- The plan calls for comparing 2+ experimental approaches

**When detected**: Follow the agent-teams skill protocol. Each teammate receives `plan.md` + their specific phase or task scope. Teammates write outputs to `plan/plan-[name]/output/[task-name]/`. The lead consolidates results into handoff.md and updates task status. Output files are temporary — cleaned up when the plan is archived.

**The propagation problem**: Parallel agents can't share mid-execution realizations. When a teammate discovers something that affects the plan, they finish their current task, then the lead surfaces the issue to the user before launching more work. Keep shared integration work sequential.

## Mid-Execution Plan Updates

When an escalation fires and the user makes a decision in-session:

1. Update `plan.md` and/or the relevant phase file to reflect the decision
2. Log the change in `log.md` — what changed, why, what the user decided
3. Continue implementation with the updated plan

The plan is a living document. Implementation updates it when reality demands, but only with the user's explicit decision.

## When to Stop

- Past 60% context: finish current task, write handoff, stop
- Task requires >3 debugging cycles: document the blocker in handoff, stop
- Escalation trigger fires: stop, surface to user
- Phase complete: write handoff, stop — even if context remains (clean session boundary)
- **All phases complete**: ask user to confirm completion, write `.completed` marker (see Plan Completion below), then stop
- Never start a new phase unless the current phase is verified

After each task, briefly assess context usage. Don't start new work if you can't finish it.

## Session End

### Always:
1. Write/overwrite `plan/plan-[name]/handoff.md`:
   - **Status**: task table with status notes (what's done, what's next)
   - **State**: commit hash, build/test status
   - **Next**: where the next session starts (phase, task)
2. Commit and push
3. Update `.scc/status/plan-[name].md` with current phase, task, blocked status, and date

The Stop hook enforces handoff writing — it blocks if `handoff.md` appears stale. The PreCompact hook reminds you before auto-compaction. Write the handoff while context is fresh, not at the last moment.

### When applicable:
3. **Surprises** in handoff.md: anything learned that the plan didn't anticipate
4. **What didn't work** in handoff.md: approaches tried and abandoned
5. **Direction changes** in `log.md`: decisions made that modified the plan
6. **Learnings** in `.scc/learnings/`: only if something is reusable beyond this plan

Write the handoff while your context is still fresh — not at the last moment when context is degraded.

## Plan Completion

**IMPORTANT: When all phases are verified, you MUST ask the user before stopping:**

> "All phases are verified. Should I mark this plan as complete and trigger archival?"

If the user confirms, immediately run:

```bash
touch plan/plan-[name]/.completed
```

Do NOT skip this step. Do NOT stop the session before writing the marker. The `.completed` file is what triggers the archival process — without it, the plan sits in `plan/` forever.

After writing the marker, the Stop hook will detect it and instruct you to launch a two-agent team:
- **Archivist** (read `hooks/agents/archivist.md`): synthesizes `archive/plan-[name].md`, updates `archive/index.md`, cleans up `plan/plan-[name]/`, updates `.scc/status/`
- **Cleanup agent** (read `hooks/agents/cleanup.md`): scans source files from the plan's file manifest for dead code, removes it, commits

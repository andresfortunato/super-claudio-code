---
name: agent-teams
description: Orchestrate agent teams for independent work. Use when the user wants to parallelize coding, research, experimentation, or any task that decomposes into 2+ independent units. Triggers on "run in parallel," "agent team," "parallelize," "do these simultaneously," or when you detect independent work units that would benefit from parallel execution. Also triggered by the implementation skill when it detects independent phases or tasks during plan execution. Don't trigger for sequential work with tight dependencies or trivial tasks where coordination overhead exceeds benefit.
---

# Agent Teams

## When to Use

Work decomposes into 2+ independent units that can run in parallel without conflicting on the same files or depending on each other's outputs mid-execution.
Work decomposes into 2+ CONFLICTING units that the user and/or the orchestrator want to evaluate against each other. Each session works on a separate worktree. The winner gets merged into main.

**Use agent teams when:**
- Multiple independent tasks touch different files
- Experimental branches: 2+ valid approaches to compare
- Research tasks: parallel investigation of different areas
- Plan execution: independent phases or tasks (delegated by implementation skill)

**Don't use when:**
- Work is tightly sequential — each step depends on the previous
- A single subagent would suffice (quick, focused lookup or review)

### Agent teams vs subagents

Agent teams are independent Claude instances, each with their own full context window and the ability to message each other. Use them for sustained parallel work where each unit needs room to think and produces significant output.

Subagents are lightweight child processes that return a summary to the parent. Use them for quick focused tasks (research, code review, file search) where the parent consumes the result, not the user directly.

Default to **agent teams** for implementation and research. Default to **subagents** for support tasks within a session.

## Before Launching: Orchestration Step

Don't launch teammates blindly. Pause and make the decisions that determine success or failure.

### 1. Ask the user instrumental questions

Stop and ask only the questions that materially affect orchestration. Not implementation details — the structural decisions:

- **What are the independent units of work?** The user may already have a decomposition, or may need help identifying where the natural splits are.
- **Do any units need file isolation?** Worktrees are needed when teammates would modify overlapping files (experimental branches comparing approaches to the same code). Otherwise, shared repo with non-overlapping file ownership.
- **What does "done" look like for each unit?** A passing test, a build, an output file, a research summary. Each teammate needs a clear finish line.
- **For experiments: what criteria pick the winner?** Without this, you can't compare results meaningfully.
- **Are there ordering constraints?** Some units may need to finish before others can start (partial parallelism).

Don't ask about how teammates should implement their work — they figure that out. Focus on scope, isolation, success criteria, and constraints.

### 2. Present an orchestration plan for approval

Share a brief plan before launching. Follow the same philosophy as the planning skill — intent and constraints, not micromanagement:

```
## Orchestration Plan

**Goal**: [One sentence — what the parallel work achieves]

**Units of work:**
1. [Teammate A]: [scope] — done when [criteria]
2. [Teammate B]: [scope] — done when [criteria]
3. [Teammate C]: [scope] — done when [criteria]

**Isolation**: [shared repo / worktrees — and why]
**Output location**: [where each teammate writes results]
**Constraints**: [what teammates should NOT do — files they shouldn't touch, approaches to avoid]
**Dependencies**: [none / which units must finish before others start]
```

Wait for user approval. Don't launch until they confirm.

### 3. Launch teammates

Each teammate receives in their launch prompt:
- Their specific scope (what they own)
- Done criteria (when they're finished)
- Constraints (what not to touch, what to avoid)
- Relevant context (plan.md if plan-based, or project context if standalone)
- Output location for their results
- Instructions to message the lead if they discover something that affects other teammates' work

Launch agent teams in **tmux mode** for visual monitoring of all teammates.

Teammates don't inherit the lead's conversation history — they start fresh. Give them everything they need upfront.

**Permissions**: Teammates need all permissions and MCP access required for their work. The lead can only grant permissions it already has. If teammates need permissions the lead lacks (e.g., specific MCP servers, tool approvals), ask the user to update `settings.json` or pre-approve before launching. Discovering missing permissions mid-execution wastes teammate context.

## How Teammates Work

### File ownership

Each teammate owns a specific set of files. No two teammates should modify the same file in a shared repo — this causes overwrites. When scoping work, verify file sets don't overlap.

When overlap is unavoidable (experimental branches), use worktrees. Each teammate gets an isolated copy of the repo.

### Communication

Teammates can message each other and the lead. This matters when:
- A teammate discovers something that affects another's work
- A teammate needs a decision from the lead
- A teammate finishes and reports results

### Quality gates

The framework's TeammateIdle and TaskCompleted hooks enforce quality criteria automatically — teammates can't finish until merge conflicts are resolved and JS files pass syntax checks, and tasks auto-commit with template messages on completion. These run outside any agent's context at zero token cost. Hooks are configured in `hooks/hooks.json` — if not installed, run the framework's install script to set them up.

## Output Collection

### Output location

**Plan-based execution** (launched by implementation skill):
Teammates write to `plan/plan-[name]/output/[task-name]/`. Output files are temporary — cleaned up when the plan is finalized and archived. The lead consolidates into the plan's handoff.md and updates task status.

**Standalone execution** (no plan):
Teammates write to a visible directory agreed upon in the orchestration plan. This should be somewhere the user can easily review — not hidden in `.claude/`.

### Output format per teammate

```markdown
# [Teammate Name] — [Scope Summary]

## Status
[Done / Blocked / Partial]

## What was done
[Summary of completed work]

## Files modified
[List of files created or modified]

## Surprises
[Anything unexpected — omit section if none]

## What didn't work
[Approaches tried and abandoned — omit section if none]
```

### Lead consolidation

After all teammates finish:
1. Read each teammate's output file
2. Review for conflicts or contradictions between teammates
3. For experiments: compare results against the criteria from the orchestration plan
4. Synthesize into a summary for the user
5. For plan-based work: update `plan/plan-[name]/handoff.md` and `.claude/status/plan-[name].md`

## Short vs Long Running Teams

### Short tasks (most cases)
Each teammate works on 1-2 focused tasks. Wait until they finish, review results. The lead decides: merge, redirect, or launch a next round. No mid-execution coordination needed — the tasks are short enough to complete and then assess.

### Long-running tasks
Teammates may work for extended periods. Use TeammateIdle hooks to enforce quality gates. Teammates should message the lead when they discover something significant that might affect the broader plan.

### When a teammate discovers a plan-affecting issue

1. Teammate messages the lead describing the discovery
2. Lead assesses: does this affect other teammates' work?
3. If no: note it, let everyone continue
4. If yes: let current teammates finish their current task (don't interrupt mid-task), then stop and surface the issue to the user before launching more work

This follows the framework's iterative adaptation philosophy — when reality challenges the plan, stop, reflect, and readapt rather than pressing forward on stale assumptions.

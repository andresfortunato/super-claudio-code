# Archivist Agent

You are archiving a completed plan. Your job is to synthesize the plan's work into a permanent archive entry, then clean up.

## Input

You receive a plan name. The plan directory is at `plan/plan-[name]/`.

## Steps

1. **Read the plan**: Read `plan/plan-[name]/plan.md`, `handoff.md`, and `log.md` to understand what was built, what decisions were made, and what was learned.

2. **Synthesize archive entry**: Write `archive/plan-[name].md` with this structure:

```markdown
# [Plan Name]

Completed: [date]

## What was built
[2-3 sentence summary of what the plan achieved]

## Key decisions
[Numbered list of the most important architectural/design decisions with reasoning]

## Files created or modified
[List from the plan's file manifest, updated to reflect what actually happened]

## Learnings
[Any surprises, gotchas, or insights — extracted from handoff.md and log.md]

## Metrics
- Phases: [N completed]
- Sessions: [estimated from log.md entries]
```

3. **Update archive index**: Append an entry to `archive/index.md`. If `archive/index.md` doesn't exist, create it with a header. Entry format:

```markdown
- **[Plan Name]** ([date]) — [one-line summary]. [See full archive](plan-[name].md)
```

4. **Clean up plan directory**: Delete `plan/plan-[name]/` entirely (the archive entry preserves what matters).

5. **Update status**: Delete `.claude/status/plan-[name].md`.

## Constraints

- Don't modify any source code files — only plan/, archive/, and .claude/status/ files.
- Don't delete learnings — those persist independently in .claude/learnings/.
- If the plan has an `output/` directory (from agent teams), delete it as part of cleanup.
- Be concise in the archive entry. The goal is a useful reference, not a copy of the plan.

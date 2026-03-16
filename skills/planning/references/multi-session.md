# Multi-Session Execution

When a plan spans multiple sessions, the plan itself must account for session boundaries. Without this, productivity is lost to three failure modes that compound each other.

## Why Session-Aware Planning Matters

**Sessions degrade.** LLMs produce measurably worse output in the last ~20% of context. There's no built-in signal to stop — the session keeps going, makes a mistake, tries to fix it, and burns remaining context debugging its own errors.

**New sessions re-explore.** A fresh session reads the plan, sees "Phase 2: wire classification" and spends 30% of its context reading files the previous session already understood. That knowledge was lost when the session ended.

**Checkboxes lack context.** The plan says "Done: Wire expert chat." The new session doesn't know: was there a gotcha? Did the API behave differently than expected? Is there a workaround in place? The checkbox captures *what* was done but not *what was learned*.

## Session Scoping

Scope each phase to use ~50-60% of context. This leaves room for unexpected debugging without hitting the quality cliff. If a phase is too big, split it — it's always cheaper to start a clean session than to push through degraded context.

Starting a new task at 70% context is the worst pattern — no room to debug if anything goes wrong.

Include context estimates in phase files:

```
### Phase 1: Add Marketing Pages
Session scope: one session
Estimated context: ~40% (13 file copies, 2 file edits, build + test)
```

## Session Boundaries

The plan should explicitly define where sessions end — not "do as much as you can," which guarantees context exhaustion.

### When to Stop a Session
- After completing each task, assess remaining context
- Past 60%: finish current task, write handoff, stop
- The framework's context-monitor hook warns at 65% and 75% via PostToolUse — these are automatic safety nets
- If a task requires more than 3 debugging cycles: commit what works, document the blocker in handoff, stop
- Never start a new phase if current phase isn't committed and verified

## Handoff Protocol

When a session ends, write/overwrite `plan/plan-[name]/handoff.md`. The framework's Stop hook enforces this — it blocks if the handoff appears stale. The PreCompact hook also reminds you to write the handoff before auto-compaction. This is typically 5-15 lines that save the next session from re-discovering what was learned.

```
### Handoff (2026-03-07)

**Status**: Phase 1 complete. Tasks 1.1-1.3 done.
**State**: Committed as abc123. Build passes, 12/12 tests pass.
**Next**: Phase 2, Task 2.1

**Surprises:**
- Shell repo's Navbar uses `useLocation()` — works fine since BrowserRouter is in main.tsx
- Had to add `@types/node` for path resolution in tailwind config
- Blog post HTML needs DOMPurify — added as dep (wasn't in plan)

**What didn't work:**
- Tried importing Navbar as default export — it's a named export
```

The "Surprises" section is the most valuable part — it captures knowledge that the plan didn't anticipate and the code doesn't make obvious. Without it, the next session re-discovers each surprise independently.

Significant learnings that apply beyond this plan go to `.claude/learnings/`. The framework's UserPromptSubmit hook automatically injects relevant learnings when future prompts match their trigger keywords.

## Start-of-Session Protocol

The implementation skill handles this, but the plan should be structured to support it:

1. `plan.md` is readable in one pass (~20-40 lines of decisions and constraints)
2. `handoff.md` contains only the latest session state (overwritten, not appended)
3. Each `phases/phase-N.md` is independently readable — a session only loads its current phase
4. `context/*.md` files are loaded selectively — only what the current phase references

This prevents the exploration spiral. Context usage per session stays roughly constant regardless of how many sessions have passed.

## Task Persistence with Context

Progress tracking in handoff.md should carry one-line annotations, not just checkmarks:

```
| Task | Status | Note |
|------|--------|------|
| 1.1 Copy files | Done | Added DOMPurify dep (blog HTML) |
| 1.2 Add routing | Done | WebsiteLayout wraps /*, auth routes stay above |
| 1.3 Verify | Done | Build passes, 12/12 tests, marketing pages render |
| 2.1 Auth flow | Pending | |
```

The notes answer "what do I need to know that isn't in the plan?" — they're for the next session.

## The Plan File as Source of Truth

The plan directory — not memory, not conversation, not commit messages — is the living source of truth for multi-session work:

- **Memory** is for stable patterns and user preferences, not session state
- **Conversation** is lost between sessions
- **Commit messages** are too terse for handoff context

The plan accumulates handoff entries (overwritten) and log entries (appended) as sessions complete, while the plan.md itself stays stable unless the user approves changes.

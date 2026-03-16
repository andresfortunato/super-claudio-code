# Escalation Reference

When to stop and surface an issue to the user during plan implementation.

## The Severity Test

Before escalating, ask: **does this affect the plan's direction or just its details?**

- **Direction**: which approach to take, what architecture to use, whether a phase is still valid, what the user-facing behavior should be → escalate
- **Details**: which dependency version, how to configure a tool, what helper function to extract, which import path to use → handle inline, note it

## Triggers

### 1. Contradicted Assumption

Something you discover directly contradicts a decision in plan.md.

**Example**: The plan says "use the existing UserContext provider" but UserContext was renamed to AuthContext in a recent refactor.

**Why**: Building on a false premise compounds errors. The user may want to adapt the plan or may have context you don't.

**Severity filter**: Trivial contradictions (wrong import path, renamed variable) — adapt and note. Architectural contradictions (wrong approach, missing system) — escalate.

### 2. Debugging Spiral

A single task has consumed 3+ debugging cycles without resolution.

**Example**: Integration test fails, you fix it, a different test breaks, you fix that, the original breaks again.

**Why**: Diminishing returns. You're burning context on a blocker that might need a fundamentally different approach, or the user might know something that unblocks it immediately.

**Include**: What you tried, what failed each time, your best guess at root cause.

### 3. Invalidated Future Phase

Something learned during the current phase means a future phase's approach won't work.

**Example**: Phase 3 plans to "extend the auth middleware" but you discovered in Phase 2 that the middleware is being deprecated.

**Why**: The user needs to decide whether to replan future phases now or adapt later. Silently continuing means the user doesn't learn about the issue until that phase fails.

### 4. Unresolvable Ambiguity

The plan allows two or more valid interpretations and the choice materially affects the result.

**Example**: "Add user settings page" — modal or full page? Both are viable, but the choice affects routing, navigation, and UX.

**Why**: Guessing wrong wastes a task's worth of context. The user can resolve this in one sentence.

**Severity filter**: Implementation details (which CSS class, which utility function) — use your judgment. User-facing behavior or architecture — escalate.

### 5. Missing External Dependency

The plan assumes something exists outside the codebase that doesn't — an API, a service, a database table.

**Example**: The plan says "call the classification API at /api/classify" but that endpoint doesn't exist and isn't in this plan's scope.

**Why**: Can't proceed without something outside your control. The user decides: build it, mock it, or reorder.

### 6. Scope Expansion

Implementation requires significantly more files or components than the plan anticipated.

**Example**: Adding the settings page requires a new database migration, a new API endpoint, and auth flow changes — none in the file manifest.

**Why**: The plan underestimated scope. The user decides: expand, cut scope, or split into new phases.

**Severity filter**: One or two extra support files (config, types, test fixtures) is normal. A new subsystem or multiple new integration seams is an escalation.

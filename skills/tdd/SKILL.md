---
name: tdd
description: Canon Test-Driven Development (Kent Beck). Use when implementing code where behavior is testable — when you can write `expect(fn(input)).toBe(output)` before writing `fn`. Works in two modes — during planning it creates behavioral test lists, during execution it drives the RED-GREEN-REFACTOR cycle one test at a time. Triggers on "use TDD," "test-driven," "write tests first," or when the plan specifies TDD for a phase/task. Don't trigger for UI layout, configuration, glue code, one-off scripts, or exploratory prototyping.
---

# Canon TDD

TDD is a development methodology, not a testing methodology. The tests aren't the point — the feedback loop is. Tests are instruments you use to navigate toward working code, one behavior at a time. The side effect is a permanent regression suite.

## When to Use TDD

The heuristic is simple: **can you write `expect(fn(input)).toBe(output)` before writing `fn`?**

**Yes — use TDD:**
- Business logic with defined inputs/outputs
- Data transformations, parsing, formatting
- Validation rules and constraints
- API endpoints with request/response contracts
- Algorithms with testable behavior
- State machines and workflows

**No — skip TDD:**
- UI layout and styling
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic
- Exploratory prototyping (add tests once the prototype solidifies)

When the plan doesn't specify TDD but you encounter testable logic during execution, suggest it. When TDD is specified but the code turns out to be untestable-first (e.g., pure wiring), note it and proceed without.

## The Five Steps

### Step 1: Test List

The test list is behavioral analysis — thinking through the cases a behavior change should handle, plus impacts on existing functionality. It is the most important step.

A test list is NOT test code. It's plain English descriptions of observable behaviors:

```
- accepts standard email (user@domain.com)
- rejects missing @ symbol
- rejects empty string
- accepts subdomain (user@mail.domain.com)
- rejects double @ (user@@domain.com)
- [will discover more during implementation]
```

That last item is deliberate. You never know all the tests upfront. The list grows during implementation as you discover edge cases.

**What to think about:**
- What are the expected behavior variants?
- What are the boundary conditions?
- What existing behavior might break?
- What would make you confident this works?

**What NOT to do:** Mix in implementation design decisions. Beck: "Chill. There will be plenty of time to decide how the internals will look later." The test list is about WHAT, not HOW.

### Step 2: Write One Test (RED)

Pick one item from the list. Convert it into a runnable test with setup, invocation, and assertion. Run it. Confirm it fails.

Technique: work backwards from the assertion. What do you want to be true? Then what setup makes that meaningful?

If the test passes immediately, either:
- The behavior already exists — cross it off the list, pick next
- The test doesn't assert what you think — fix the test

**Test ordering matters.** The first test you write shapes the code structure. Start with the simplest case that forces you to create the basic structure. Then pick the test that teaches you the most about the design. Save edge cases for later — they test boundaries of a design that should already exist.

Beck: picking the next test is "an important skill, one that only comes with experience." The sequence affects the final code. Ask yourself: "is code sensitive to initial conditions?"

### Step 3: Make It Pass (GREEN)

Write the simplest code that makes this test and all previous tests pass. "Simplest" means you can hardcode temporarily — the next test will force generalization.

**During implementation you WILL discover new test needs.** Add them to the test list. Don't implement them now — finish the current GREEN phase first.

**Do NOT refactor during GREEN.** The urge to clean up while implementing is strong. Resist. GREEN is about correctness only.

**Do NOT mix in other changes.** If you notice a bug elsewhere, add a test for it to the list. Stay focused on the current failing test.

If making this test pass breaks a previous test, you have a design tension. Options: fix the implementation (most common), rethink the test order, or back up and try a different approach. If a test invalidates prior work, decide whether to continue or restart with a different test order.

### Step 4: Refactor (DESIGN)

All tests are green. Now make design decisions — extract methods, rename variables, reduce duplication, improve structure. The tests protect you: if a refactor breaks something, you know immediately.

Refactoring applies to both production code AND test code. Extract shared fixtures, improve test names, consolidate redundant assertions.

"Duplication is a hint, not a command" (Beck). Two similar things don't always need a shared abstraction. Don't over-engineer during refactor.

Run tests after every refactoring change. Small steps, continuous verification.

### Step 5: Repeat

Pick the next test from the list. Continue until "fear for the behavior of the code has been transmuted into boredom" (Beck).

Practical completion signals:
- The test list is empty
- You haven't discovered a new test need in the last 2-3 cycles
- Adding more tests feels pointless — you're confident the code works

If you're still nervous, there are more tests to write. Find them.

## During Planning

When a plan uses TDD, add a **behavioral test list** to each TDD phase. This is behavioral analysis — thinking about what cases the phase should handle, written in plain English. It helps the implementer know what to consider.

This is NOT test code (that would be micromanaging — the implementer writes test code during RED). It IS a starting point that the implementer will expand during execution.

In a phase file:
```
### Test List (behavioral, will expand during implementation)
- Standard valid email is accepted
- Missing @ is rejected with clear error message
- Empty input shows "required" error, not "invalid format"
- Existing validation (name, password) still works unchanged
```

The test list in the plan is a starting compass, not a fixed map. The implementer will discover cases the planner didn't anticipate.

## During Execution

### Startup
1. Read the phase's test list (if one exists from planning)
2. Expand it with your own behavioral analysis after reading the source code
3. Pick the first test — simplest case that forces the basic structure

### The cycle
1. **RED:** Write one failing test. Run it. Confirm failure.
2. **GREEN:** Minimal code to pass. Run all tests. Confirm all green.
3. **REFACTOR:** Clean up both production and test code. Run tests after each change.
4. **Update the test list:** Cross off completed items. Add discovered items.
5. Pick next test. Repeat.

### Commit rhythm
Commit after each GREEN phase (or after GREEN + REFACTOR). Each commit should have a passing test suite. This creates natural rollback points and makes the development history readable.

### Context budget
TDD is context-heavier than linear implementation because of the RED-GREEN-REFACTOR back-and-forth. Budget ~40% of context for TDD phases (vs ~50% for standard phases). If context is running low, finish the current cycle, commit, and hand off.

## Test Code

Tests written during TDD are **permanent production code** — they form the regression suite. They live in the project's test directory (typically `tests/`), use the project's test framework (pytest recommended for Python), and are committed alongside the code they verify.

Tests are not sacred, but they are serious:
- **Keep** tests that provide confidence and communicate behavior
- **Prune** redundant micro-tests that are fully covered by broader behavioral tests
- **Refactor** tests for clarity during the REFACTOR step — they're code too
- **Never delete** a test if doing so decreases your confidence in the code

### Behavioral over structural

Write tests that describe observable behavior through public interfaces. These survive refactoring. Tests coupled to implementation details (internal method calls, private state, execution order) break when you refactor and become maintenance burden.

The test: if you refactor the internals without changing any observable behavior, do your tests still pass? If not, they're testing structure, not behavior.

## Protecting Earned Progress

As TDD cycles accumulate, passing tests form a safety net. The key rule:

**Don't modify an existing passing test to make new code work.**

If new code breaks an old test:
1. The new code is wrong — fix the implementation (most common)
2. The old test was testing implementation details, not behavior — refactor the test
3. The behavior genuinely changed — this is an escalation, needs the user's decision

Option 2 is the dangerous one with AI agents. The temptation to "fix" a test by changing its assertion is the fastest path to shipping bugs. When in doubt, fix the implementation.

## What This Skill Is NOT

- **Not horizontal slicing.** Never write "all the tests" then "all the code." Always vertical: one test, make it pass, refactor, next test. Writing all tests first produces tests of imagined behavior.
- **Not test code in plans.** Plans contain behavioral test LISTS (plain English), not test CODE. Test code is implementation, written during execution.
- **Not a testing strategy.** TDD doesn't prescribe test pyramids, coverage targets, or CI/CD. It prescribes how to develop code using tests as navigation.
- **Not rigid.** The test list grows, test order changes, redundant tests get pruned. The process adapts as you learn. If a test turns out to be pointless, delete it.
- **Not always applicable.** Some code genuinely can't be test-driven (UI layout, config, glue). Use the heuristic. Skip TDD when it doesn't fit, but always verify your work.

# TDD Cross-Repo Synthesis

*Comparative analysis of TDD approaches across 4 Claude Code workflow repos + broader AI-assisted TDD research*
*Date: 2026-03-13*

---

## The Landscape at a Glance

| Dimension | superpowers | GSD | spec-kit | OpenSpec |
|-----------|-------------|-----|----------|---------|
| **Has TDD?** | Yes — mandatory Iron Law | Yes — dedicated plan type | Aspirational — in docs only | No |
| **Enforcement** | Skill instructions + rationalization tables | Plan checker + Nyquist Rule | Purely instructional text | N/A |
| **Mechanical backstop** | None (relies on agent compliance) | Plan checker blocks plans missing `<verify>` | None | None |
| **Test-first?** | Strict: delete code written before tests | Strict for `type: tdd` plans; optional for standard | Strict *when opted in*, optional by default | Tests during implementation |
| **Test types** | Unit (default), integration (framework), pressure (novel) | 7 verification layers | Contract > integration > unit (inverted pyramid) | None prescribed |
| **Plan integration** | Tests baked into every plan task | TDD detection heuristic at planning time | Test tasks precede implementation tasks | Scenarios could be tests but aren't |
| **Context budget** | Not specified | ~40% for TDD plans (lower than standard ~50%) | Not specified | N/A |
| **Hook enforcement** | SessionStart only | Context monitor (PostToolUse) | Extension hooks (customizable) | N/A |
| **Novel contribution** | Rationalization tables, pressure testing docs, "delete and start over" | Nyquist Rule, structural verification, 7-layer pipeline, VALIDATION.md | "Unit tests for requirements," contract-first ordering | Structured scenarios as test precursors, 3D verification model |

---

## What Each Repo Does Best

### superpowers: Discipline Through Exhaustive Rationalization Defense

Superpowers is the most *philosophically rigorous* about TDD. Its ~600-line TDD skill anticipates 11+ rationalizations for skipping tests and counters each one. The "delete and start over" rule — if code exists without tests, delete it entirely, no exceptions — is the strongest commitment to test-first development across all repos.

**Unique insight:** Applying TDD to documentation itself. The skill-writing process uses RED (watch agent fail without skill) → GREEN (write skill that addresses failures) → REFACTOR (find new rationalizations, close loopholes). This is genuinely novel.

**Limitation:** All enforcement is through language/instructions. No hooks verify test files exist. An agent that ignores the instructions faces no mechanical consequence.

### GSD: Operational Sophistication Through Layered Verification

GSD is the most *operationally sophisticated*. It doesn't just do TDD — it builds a 7-layer verification pipeline where each layer catches different failure modes:

1. Per-task automated verification (Nyquist Rule)
2. Unit tests via TDD plans
3. Post-phase test generation (`/gsd:add-tests`)
4. Structural verification (stub detection, wiring checks)
5. Human acceptance testing (`/gsd:verify-work`)
6. Nyquist validation auditing
7. Cross-phase integration checking

**Unique insight:** The Nyquist Rule — every task must have an automated verification command, enforced structurally before execution begins. Also, structural verification (checking code is *wired*, not just *present*) catches AI's common failure mode of generating plausible but disconnected code.

**Limitation:** TDD is optional, decided by a heuristic. The default path is standard plans with post-hoc verification.

### spec-kit: Testing the Specs Before Testing the Code

Spec-kit's most innovative contribution is the `/speckit.checklist` command — "unit tests for requirements." It applies testing methodology to validate that specifications are complete, clear, consistent, and measurable *before any code exists*. This catches an entire class of bugs (ambiguity, missing requirements, inconsistencies) that code-level TDD can't catch.

**Unique insight:** Contract-first test ordering (contract → integration → e2e → unit) inverts the traditional pyramid. The constitution mechanism lets projects declare TDD as a constitutional principle that flows into all subsequent commands.

**Limitation:** Tests are explicitly optional by default. No mechanical enforcement. The gap between the methodology document's "NON-NEGOTIABLE" language and the tasks template's "OPTIONAL" reality undermines the commitment.

### OpenSpec: The Biggest Missed Opportunity

OpenSpec has structured WHEN/THEN scenarios that map naturally to test assertions, a dependency DAG that could include test artifacts, and a customizable schema system that could support TDD. But none of these capabilities are connected to testing. The `/opsx:verify` command uses heuristic AI analysis, not actual test execution.

**Unique insight:** The three-dimensional verification model (Completeness / Correctness / Coherence) with severity levels is a good mental model even if the implementation is heuristic. The "actions not phases" iteration model is also compatible with TDD's learning-as-you-go nature.

**Limitation:** Zero TDD despite having the infrastructure to support it.

---

## What the Broader Research Tells Us

The AI-assisted TDD research (50 sources, 2024-2026) reveals a clear consensus:

### TDD is experiencing a renaissance driven by AI tools

The practice that developers found tedious for human-only workflows is now *the* recommended discipline for AI-assisted development. The 2025 DORA Report confirms AI amplifies existing good practices — making TDD more critical, not less.

### The fundamental division of labor

**Humans define "what" through tests/specs. AI handles "how" through implementation.** This is the emerging consensus across all sources.

### The #1 anti-pattern: AI modifying tests to make them pass

This is the most dangerous failure mode. AI agents optimize for the fastest path from red to green. Changing assertions costs less than rewriting implementation code. Multiple sources (PactKit, DEV Community, etc.) document this as the primary threat.

**Solution: Three-tier authority hierarchy** — Specifications are immutable → pre-existing tests are read-only → only implementation code is mutable.

### Context isolation matters

When one context window contains both test-writing and implementation, the LLM designs tests around anticipated implementation (circular validation). AI-generated tests from this pattern achieve only **20% mutation scores** — meaning 80% of bugs escape. Context-isolated subagents for TDD phases prevent this bleeding.

### Tests as session continuity

Tests are the most reliable continuity mechanism between sessions because they are executable, self-verifying, and context-efficient. They should be positioned as the primary handoff artifact.

---

## The Gaps Every Repo Shares

Despite different approaches, all four repos share these gaps:

### 1. No Mechanical TDD Enforcement

Every repo relies on the LLM agent reading and following instructions. None have hooks that:
- Block file writes if no test file exists
- Verify a test actually fails before implementation proceeds
- Prevent modification of existing test assertions

**This is the #1 gap.** The broader research identifies tools like TDD Guard (hook-based enforcement) and PactKit (prompt architecture preventing test manipulation) that address this.

### 2. No Test Pyramid Strategy

None provide guidance on the right balance of unit / integration / e2e tests. Superpowers defaults to unit. GSD classifies post-hoc (TDD/E2E/Skip). Spec-kit inverts the pyramid (contract-first). OpenSpec has nothing. None discuss ratios, trade-offs, or when to use which level.

### 3. No Mutation Testing or Test Quality Verification

All repos assume tests are good if they pass. None use mutation testing, which Meta's research shows is the real quality metric. AI-generated tests that achieve 100% code coverage may still only catch 20% of actual bugs.

### 4. No Test Maintenance Strategy

None address what happens when:
- Tests become slow (test suite grows past fast-feedback threshold)
- Tests become flaky (timing, external dependencies)
- Tests test implementation details (break on refactoring)
- Test data becomes complex (fixtures, factories, seeds)

### 5. No Property-Based Testing

All testing is example-based. Property-based testing (defining invariants, framework generates test cases) achieves 23-37% better results than standard TDD with LLMs, per recent research. Properties are harder for AI to game than specific examples.

### 6. No Continuous Test Runner Concept

None integrate a `--watch` mode or continuous test feedback loop during development. GSD explicitly blocks watch-mode commands. But the broader research shows continuous test feedback is one of the highest-value patterns for AI-assisted development.

---

## Cross-Cutting Patterns Worth Adopting

These patterns appear across multiple repos or are strongly supported by the research:

### From superpowers → our framework
1. **Rationalization tables** — Anticipate every excuse to skip discipline, counter explicitly
2. **Verification-before-completion as separate gate** — Evidence before assertions, always
3. **Iron Law framing** — Critical rules as absolutes, not guidelines
4. **Pressure testing documentation** — Use subagents to verify instructions change behavior
5. **Gate functions** — Explicit decision procedures > guidelines

### From GSD → our framework
6. **Nyquist Rule** — Every task gets automated verification, no exceptions
7. **TDD as dedicated execution mode** — Own context budget, own subagent, own plan type
8. **Structural verification** — Grep-based checks that code is wired, not just present
9. **VALIDATION.md contract** — Per-phase validation strategy document
10. **TDD detection heuristic** — Simple "can you write expect() before writing fn?" test

### From spec-kit → our framework
11. **"Unit tests for requirements"** — Test specification quality before code exists
12. **Contract-first test ordering** — Interfaces before implementations
13. **Constitution mechanism** — TDD as constitutional principle flowing into all commands
14. **Cross-artifact validation** — Requirement-to-task coverage analysis

### From OpenSpec → our framework
15. **Structured scenarios as test precursors** — WHEN/THEN format maps to test assertions
16. **Three-dimensional verification** — Completeness / Correctness / Coherence model
17. **Artifact dependency graph** — Tests as a node in the dependency DAG

### From broader research → our framework
18. **Three-tier authority hierarchy** — Specs immutable > tests read-only > code mutable
19. **Context-isolated subagents** — Separate test-writing from implementation
20. **Tests as session continuity** — Tests as the primary handoff artifact between sessions
21. **Hook-based enforcement** — PreToolUse blocks, PostToolUse auto-runs tests
22. **Mutation testing integration** — Real quality metric beyond coverage
23. **Behavioral tests over implementation tests** — Tests that survive refactoring
24. **Small steps, fast feedback** — One test per R-G-R cycle, commit after each green

---

## Answering the Open Question

From `handoff.md`, question #7: **"Should all plans follow test-driven development?"**

### The answer is nuanced: TDD should be default-on with a clear opt-out heuristic.

Based on this research:

1. **Default to TDD** for all plans where the code has testable behavior (GSD's heuristic: "can you write `expect(fn(input)).toBe(output)` before writing `fn`?")

2. **Opt out explicitly** for: UI layout/styling, configuration, glue code, one-off scripts, simple CRUD, exploratory prototypes. The opt-out should be documented in the plan with a reason.

3. **Always require automated verification** regardless of TDD (Nyquist Rule). Even non-TDD tasks get `<verify>` commands. TDD is about test-first; verification is about test-always.

4. **Test specs before testing code** (spec-kit's insight). Use checklists/validation on plans and specs before execution begins.

5. **Budget extra context for TDD** (~40% vs ~50% for standard, per GSD). The R-G-R cycle is inherently context-heavier.

6. **Enforce mechanically, not just linguistically** (the gap every repo shares). Use hooks to block implementation without failing tests, prevent test assertion modification, and auto-run tests after edits.

---

## Implications for Our Framework's TDD Component

### What to build (layered, from most to least critical):

**Layer 1: Verification (always on)**
- Nyquist Rule: every task gets automated verification
- Verification-before-completion gate
- VALIDATION.md contract per phase

**Layer 2: TDD Skill (default on, opt-out available)**
- Vertical-slicing R-G-R cycle (one test at a time)
- Rationalization defense tables
- Iron Law framing: "NO IMPLEMENTATION WITHOUT A FAILING TEST FIRST"
- Context-isolated subagents for test/implementation separation
- TDD detection heuristic for when to apply

**Layer 3: Hook Enforcement (mechanical backstop)**
- PreToolUse: block file writes without corresponding test files
- PostToolUse: auto-run tests after file edits
- Pre-existing test protection (read-only for agents)
- Three-tier authority hierarchy

**Layer 4: Test Quality (periodic, not per-cycle)**
- Mutation testing integration (Stryker/mutmut)
- Coverage ratcheting (thresholds only go up)
- Behavioral test guidelines (test public interfaces, not implementation)

**Layer 5: Spec-Level Testing (before code exists)**
- "Unit tests for requirements" (spec-kit pattern)
- Cross-artifact validation (requirement → task → test coverage)
- Structured scenarios as test precursors

### What NOT to build:
- Exact test code in plans (superpowers does this, but it conflicts with our planning philosophy of intent+constraints, not implementation details)
- Watch-mode integration (not compatible with agent session model)
- Full test infrastructure management (out of scope — that's project-specific)

---
description: Capture learnings from the current session — gotchas, insights, or discoveries worth preserving for future sessions. Use when the pre-compact hook reminds you, when the user asks to save a learning, or when you notice something worth remembering.
---

# Learning Capture

Capture institutional knowledge so future sessions don't repeat mistakes or miss insights.

## When to use

- The pre-compact hook reminds you to capture learnings
- The user says "save a learning", "remember this", "capture this gotcha", or similar
- You notice something surprising, counterintuitive, or hard-won during any session

## How it works

1. **Identify what was learned** — ask the user if it's not obvious. One learning per file.
2. **Pick the type** — gotcha or insight (see formats below).
3. **Choose a filename** — short, kebab-case, descriptive. Example: `hooks-matcher-null.md`, `langgraph-state-immutable.md`.
4. **Write the file** to `.claude/learnings/<filename>.md`.
5. **Append to `.claude/learnings/index.yaml`** — always do both atomically.

## Learning types

### Gotcha

Something went wrong or was counterintuitive. Future sessions should avoid the same mistake.

```yaml
---
title: [Short descriptive title]
type: gotcha
tags: []
severity: low | medium | high
date: YYYY-MM-DD
---

## Problem

[What went wrong or what was discovered]

## Solution

[What fixed it or what the correct approach is]

## Prevention

[How to avoid this in the future]
```

### Insight

Something discovered that's worth knowing — a pattern, a capability, an architectural observation. Not a bug or mistake, just useful knowledge.

```yaml
---
title: [Short descriptive title]
type: insight
tags: []
date: YYYY-MM-DD
---

## Discovery

[What was learned]

## Why it matters

[How this affects future work]

## When to apply

[Situations where this knowledge is relevant]
```

## index.yaml entry

Every learning MUST have a corresponding entry:

```yaml
- file: <filename>.md
  triggers: "keyword1 keyword2 keyword3"
```

Triggers are words that would appear in a user's prompt when this learning is relevant. The retrieval hook matches prompts against these keywords (minimum 2 matches to surface). Choose 4-8 specific, concrete keywords — not generic words like "error" or "fix."

## Guidelines

- **One learning per file.** Don't bundle unrelated things.
- **Be specific.** "Supabase RLS policies don't apply to service role key" is useful. "Be careful with permissions" is not.
- **Include the context that makes it actionable.** A future session reading this learning should know exactly what to do differently.
- **Don't duplicate what's in the code.** If the fix is a one-line change, the learning is about *why* — the gotcha, the misunderstanding, the non-obvious behavior.
- **Severity** (gotchas only): `high` = cost hours or broke production, `medium` = cost significant debugging time, `low` = minor surprise.

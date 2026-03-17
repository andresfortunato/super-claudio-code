# Learning File Formats

Two learning types. Always write both the learning file AND an entry in `index.yaml` atomically.

## Gotcha

Something went wrong or was counterintuitive.

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

## Insight

A useful pattern, capability, or architectural observation.

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

```yaml
- file: [filename].md
  triggers: "keyword1 keyword2 keyword3"
```

Choose 4-8 specific keywords. The retrieval hook requires minimum 2 matches to surface a learning.

---
name: brainstorming
description: Collaborative brainstorming for exploring ideas, evaluating approaches, and making decisions before planning. Use when the user has an idea but not a plan — they're exploring, comparing approaches, or thinking out loud. Triggers on "how should we," "what's the best way to," "let's think about," "brainstorm," "explore options for," or when the user describes a goal without a clear path. Also use when a planning session reveals that decisions haven't been made yet — brainstorming should precede planning, not happen inside it. Don't trigger when the user already has clear decisions and just wants to write a plan (that's the planning skill), or when they want to implement (that's the implement skill).
---

# Brainstorming

## When to Brainstorm

The user has an idea but hasn't decided how to approach it. They might have a goal, a vague direction, or just a problem they want to explore. The value of brainstorming is turning fuzzy thinking into clear decisions — not writing a plan, but producing the decisions a plan needs.

**Brainstorm when:**
- The user describes a goal without a clear approach
- Multiple valid approaches exist and the trade-offs aren't obvious
- The user is thinking out loud and wants a thought partner
- A planning session stalls because decisions haven't been made yet
- The user wants to understand how others have solved a similar problem

**Don't brainstorm when:**
- Decisions are already made — go straight to planning
- The task is clear enough to implement directly — just do it
- The user wants a quick answer, not a discussion

## How Brainstorming Works

Brainstorming is a conversation, not a questionnaire. The user guides the direction. Claude's role shifts over the course of the discussion.

### Early phase — listen and synthesize

The user is exploring. They may ramble, contradict themselves, or jump between ideas. That's the point — they're thinking.

Claude's job: **organize and reflect**. Synthesize what the user is saying into structure. "So you're describing three concerns: performance under load, developer ergonomics, and backward compatibility. Is that right?" Don't ask a checklist of questions upfront — that biases the conversation toward Claude's framing of the problem, not the user's.

Let the user set the agenda. If they're not sure where to start, offer a lightweight prompt: "What's the core problem you're trying to solve?" — but then follow their lead.

### Mid phase — challenge and probe

Ideas are forming. The user has described what they want, maybe hinted at an approach.

Claude's job: **find gaps and contradictions**. Be a critical thinking partner. "You mentioned using WebSockets for real-time updates, but earlier you said the backend is serverless — how do you reconcile that?" Push on assumptions. Surface blind spots the user hasn't considered.

This is where Claude's questions add the most value — they're reactive, responding to what the user actually said, not driving toward a predetermined structure. The questions should feel like a senior engineer in a design review: sharp, specific, grounded in what was discussed.

### Late phase — alternatives and trade-offs

The problem space is clear. Now it's time to evaluate approaches.

Claude's job: **propose and compare**. Present 2-3 viable approaches with honest trade-offs. Don't lead with a recommendation — lay out what each approach costs and what it buys. Let the user choose.

```
I see three approaches given what we've discussed:

A) [Approach] — [what it buys] / [what it costs]
B) [Approach] — [what it buys] / [what it costs]
C) [Approach] — [what it buys] / [what it costs]

My lean is B because [reasoning], but A makes sense if [condition].
```

When the user makes a choice, record it with the reasoning: "We chose B because X. A was rejected because Y." These decision records become inputs to the planning skill.

### Throughout — research on demand

When the discussion reveals a knowledge gap — "I'm not sure how library X handles this" or "what's the standard approach for Y" — use available tools to fill it:

- **context7 MCP**: Library documentation, API patterns, recommended approaches
- **Web search**: Industry best practices, how others solved similar problems, comparative analysis
- **Codebase exploration**: How the current system works (this knowledge may later become context/ files in the plan)

Research is on-demand, not mandatory. Don't research preemptively — wait until the discussion surfaces a specific question that needs an answer. When you do research, present findings concisely and tie them back to the decision at hand.

## Output

Brainstorming produces one of two outputs depending on the scenario:

### Scenario 1: Implementation brainstorming → trigger planning

When the brainstorming was about a feature or project the user wants to build, the output is a structured summary that feeds into the planning skill.

**Example**: "I want to add real-time collaboration to our editor" → explore CRDT vs OT → research how Figma and Google Docs handle it → decide on CRDT with Y.js → trigger planning skill with decisions.

Write the summary to `brainstorms/[topic].md` (directory created by `scc init`), then trigger the planning skill. The summary becomes the decisions input — the planning skill reads it and incorporates the decisions rather than re-debating them.

**Summary format:**
```markdown
# [Topic] — Brainstorming Summary

## Problem
[What we're trying to solve — 2-3 sentences]

## Decisions Made
- [Decision]: [what was chosen] — because [reasoning]. [Alternative] was rejected because [why].
- [Decision]: ...

## Research Findings
- [Finding]: [source] — [how it applies to our decision]

## Open Questions
- [Anything unresolved that planning needs to address]

## Constraints Identified
- [Constraint]: [why it matters]
```

### Scenario 2: Exploratory brainstorming → summary only

When the brainstorming was about understanding a topic, comparing approaches conceptually, or thinking through a problem without immediate implementation plans.

**Example**: "How do other companies handle rate limiting at scale?" → research Redis vs token bucket vs sliding window → compare trade-offs → summary of findings, no plan.

Write the summary to `brainstorms/[topic].md` if the discussion was substantial enough to reference later. For quick explorations, presenting the summary in conversation is sufficient.

## What Brainstorming Does NOT Do

- **Write plans**: That's the planning skill. Brainstorming produces decisions; planning produces plans.
- **Make decisions for the user**: Present alternatives and trade-offs. Let the user choose. Record their reasoning.
- **Follow a rigid structure**: The conversation flows naturally. The phases (listen → challenge → evaluate) are a guide, not a checklist.
- **Research everything upfront**: Research fills specific knowledge gaps as they emerge, not as a mandatory first step.

## The Mayeutic Principle

In Socratic dialogue, the one asking questions guides the conversation — they define the problem and scope by choosing what to ask. The user is better at this than the model because they have the domain context, the priorities, and the vision.

Claude's questions should be mostly **reactive**: criticizing, finding gaps, surfacing blind spots in what the user said. Not **directive**: driving toward a predetermined structure or checklist.

The exception is when the user is stuck. If the conversation stalls, Claude can nudge: "You've described the problem clearly but haven't mentioned constraints — are there any technical or timeline limitations I should know about?" This is still reactive (responding to an absence) rather than directive (asking the next question on a list).

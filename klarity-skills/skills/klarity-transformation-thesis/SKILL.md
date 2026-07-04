---
name: klarity-transformation-thesis
description: Build a deep, evidence-grounded transformation thesis for one Klarity process or value stream — current state, blast radius, pain patterns, and ranked intervention points. Use whenever the user wants to redesign or re-platform a specific process, asks "what breaks if we change/deprecate X", needs a business case for automating a named workflow, or asks for a current-state assessment before a transformation decision. Requires the Klarity MCP connection.
---

# Klarity Transformation Thesis

An under-scoped proposal dies in review: someone asks "did you know payroll depends on this?" and the room moves on. A thesis built from the actual dependency graph and observation record survives that question. This skill produces that thesis for one named target.

## Establish the target

`search` in the user's words → `fetch` the match (or `get_process_details` directly if a key was given). If the user named a value stream rather than a process, resolve it via `get_hierarchy_node_details` and treat its leaf processes as a set, with the same method applied to the 2–3 most central ones.

## Evidence gathering

Work outward from the target in rings:

1. **The target itself** — `get_process_details` with `scope=["tasks","policies","dependencies","linked_artifacts","history"]`. Read the version history as a trendline: what has the team already been trying to fix? A transformation that continues their direction lands easier than one that reverses it.
2. **Context** — `get_hierarchy_node_details` on its hierarchy node: parent value stream, siblings that share systems or patterns.
3. **Reality** — `get_process_observations` across versions, then `get_observation_citation` on 3–5 representative sessions. You are looking for the delta between the documented process and the observed one — that delta is usually where the thesis lives.
4. **Blast radius** — walk `dependencies` both directions. `fetch` every upstream feeder (input quality, root causes) and downstream dependent (who breaks if you change this). For dependents whose behavior shapes your conclusion, go one level deeper: their own observations. Two hops is usually enough; say explicitly where you stopped.
5. **Paper trail** — pull linked artifacts. A `gold_document` SOP tells you the intended design; a `log` artifact gives you measured frequencies; a recording transcript gives you the performer's own words (often the best intervention ideas are already in there).
6. **Siblings** — `fetch` 2–3 sibling processes. Shared patterns mean the thesis should generalize or explicitly scope them out.

Parallelize within each ring. If observations are thin, keep the thesis honest: label sections built on documentation-only evidence.

## Thesis format

```
# Transformation thesis: <target> — <date>
Target: <name> (<resource_key>, <version>) · Evidence: N observations
<date range>, M artifacts, dependency walk to <depth>.

## Current state (observed)
How it actually runs, vs. how it's documented. Cite observations and
timeline blocks. Include the version-history trendline.

## Pain pattern
The core deviation/manual/duplication signal, quantified where possible
(frequency × time × volume). Distinguish measured from estimated.

## Blast radius
Upstream: who feeds this, and what input-quality problems originate there.
Downstream: who consumes this, what breaks under each intervention option.
Siblings: shared patterns in the same value stream.

## Intervention points (ranked)
For each: what to change, expected effect, risk, who's affected, and the
smallest testable first step. Rank by leverage ÷ risk. Include at least one
non-technology option (process edit, policy change, upstream data fix) —
if the ranked list is all software, look again.

## What would change this thesis
Open questions and missing evidence that would strengthen or kill it.
```

Ground rules: separate observed from inferred; cite resource keys and timestamps in evidence lines, not headlines; call out capture gaps plainly. The "what would change this thesis" section is not decoration — a thesis that can't name its own falsifiers isn't ready for the room.

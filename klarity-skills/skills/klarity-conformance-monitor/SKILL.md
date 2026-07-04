---
name: klarity-conformance-monitor
description: Cross-observation conformance analysis for a Klarity process — aggregate deviations across every captured execution, diff reality against the documented version, and flag systemic patterns a single observation can't show. Use whenever the user asks whether a process is being followed, why a process "keeps going wrong", what workarounds a team uses, whether a documented change actually stuck, or for any drift/conformance/deviation question about a Klarity process. Requires the Klarity MCP connection.
---

# Klarity Conformance Monitor

Single observations lie by omission. Klarity's per-session deviation judgments are made in isolation, so a workaround that appears in every session often looks "routine" on each one and `negative_deviations` may even be empty. The signal a team actually needs — *"the same workaround appears in 4 of 5 captures"* — only emerges when you aggregate across the observation set. The Klarity Advisor does this natively; through the MCP, **this skill is that aggregation pass**.

## Inputs

Resolve the target process first:
- If the user named a process, call `search` with their words, refine 2–4 times if sparse, then `fetch` the best match. Confirm the match by name if ambiguous.
- If they gave a resource key, go straight to `get_process_details`.

## Method

Run these stages in order. The MCP is stateless per call — parallelize reads within a stage freely.

### 1. Pin the standard

`get_process_details` with `scope=["tasks","policies","history","linked_artifacts"]`. This is the documented standard you diff against. Note:
- each step, its type (manual/system), and its intent
- each policy (these are the auditable commitments)
- the most recent version changes — a new requirement (e.g. "added comment requirement in v7") is a conformance hypothesis to test downstream

If a `gold_document` SOP is linked, pull it with `get_artifact_content` — SOPs often carry constraints (thresholds, prohibitions) that never made it into the step list. Diff those too.

### 2. Pull the full observation set

`get_process_observations` with `verbosity="summary"` and a generous limit. Include prior versions (don't pass a `version_label` filter) — pre-change observations are your baseline for whether a version change actually changed behavior.

If there are fewer than 3 observations, say so and stop early: report what the sparse evidence shows, flag the capture gap explicitly, and don't extrapolate a "pattern" from one session.

### 3. Aggregate deviations across observations

Build a deviation ledger. For every deviation string (positive and negative) across all observations, cluster near-duplicates ("missing PO, re-keyed from Outlook" ≡ "Outlook search and manual re-key") and count:

| cluster | polarity | occurrences | observations (keys + dates) | versions seen in |

The clusters with high occurrence ratios are your findings. A deviation seen once is an anecdote; the same one across most sessions is a systemic pattern — that distinction is the entire value of this skill.

### 4. Confirm top patterns with primary evidence

For the top 2–3 clusters, drill into representative sessions:
- `get_process_observations` with `verbosity="full"` on the relevant observations for narrative and runtime inputs/outputs
- `get_observation_citation` for the activity timeline — the closest thing to a replay. Cite specific blocks (system + action + time).
- If a system log or recording artifact is linked, corroborate with `search_artifact_text` (e.g. grep the ERP log for the failure code). Independent corroboration upgrades a finding from "reported" to "measured".

### 5. Test version-change adoption

For each recent version change that added or removed a requirement, split observations into before/after by `version_label` and check whether behavior moved. "v7 added a comment requirement; the requirement was skipped in 1 of 3 post-v7 sessions" is exactly the kind of finding a process owner can act on.

## Report format

Lead with the verdict, not the tooling. Use this structure:

```
# Conformance report: <process name> (<resource_key>, <current version>)
Evidence base: N observations, <date range>, versions <list>. [Note if thin.]

## Verdict
One paragraph: is the documented process followed? What is the dominant drift?

## Systemic patterns  (ranked by occurrence ratio)
For each: what happens (observed), how often (n/N sessions + dates), evidence
(observation keys, timeline blocks, artifact lines), cost estimate if derivable
(time per session × frequency), and whether it is drift to FIX, a workaround to
PROMOTE into the documented process, or a doc gap to DOCUMENT.

## Version-change adoption
Change → stuck / partially adopted / ignored, with evidence.

## One-off deviations
Brief list. Explicitly labeled as not (yet) patterns.

## Capture gaps
What the workspace can't answer yet and what to capture next.
```

Throughout: separate **observed** (cite it) from **inferred** (say so). Cite resource keys and timestamps — those are auditable in Klarity — but keep raw keys out of headline sentences; put them in parentheses or evidence lines. Positive deviations deserve equal billing: a good conformance report promotes improvements, it doesn't just police drift.

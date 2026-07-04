---
name: klarity-health-report
description: Generate a state-of-the-team process health report from Klarity — what's running, what changed, what's deviating, and what needs the owner's attention, with evidence. Use whenever the user asks for a process health check, weekly/monthly ops report, "what changed in our processes", a team check-in brief, or wants to onboard someone to how a team actually runs. Requires the Klarity MCP connection.
---

# Klarity Process Health Report

A manager checking in on their processes needs a brief, not a data dump: *N processes, M changed, K deviating, here are the three that need you this week.* This skill turns the Klarity workspace into that brief on demand.

## Scope the report first

- If the user named a team or value stream, find its subtree: `get_process_hierarchy` (workspace root, shallow `max_depth`) to orient, then `get_hierarchy_node_details` on the matching node. The node's children are the process population.
- If no scope was given, default to the whole workspace but say so in the report header.
- Confirm the workspace with `list_accessible_workspaces` if there's any doubt which one is active.

## Gather

1. **Change feed** — `get_recent_process_changes`, filtered to the scoped processes. This is the shortlist of "what moved". Note who is making changes and in what direction (tightening controls? removing review steps? shifting the close calendar?).
2. **Per-process pulse** — for each process in scope (parallelize):
   - `get_process_details` (summary is enough; add `scope=["dependencies"]` for the attention ranking below)
   - `get_process_observations` with `verbosity="summary"` — recent deviation signals
3. **Activity** — `list_sessions` to see capture recency and who's driving it. A team whose last capture is months old has a stale index; that's a finding, not a footnote.
4. **Spot-check** — `get_observation_citation` on the top 2–3 concerning observations so the report's headline items rest on primary evidence, not summaries.

## Rank what needs attention

Score each process on converging signals rather than any single one:
- recent version change **and** deviations in post-change observations (change may not have stuck)
- deviations recurring across multiple observations (systemic, not anecdotal)
- high dependency fan-out (`dependencies` list) — problems here radiate
- SOX/control-flagged attributes with any deviation at all (low tolerance)
- observation gap — heavily-depended-on process with no recent captures

A process with one noisy observation and no dependents ranks below a quiet SOX control with a skipped step. Judgment, not arithmetic — but show your reasoning in one line per item.

## Report format

```
# Process health: <scope> — <date>
Coverage: N processes · M changed in last 30 days · K with recurring deviations
· capture freshness: <newest/oldest observation dates>

## Needs attention (top 3)
For each: what's happening (observed, with observation keys + dates), why it
matters (impact/dependents/control), suggested next step for the owner.

## Changes this period
Table: process · version · date · who · one-line summary · adoption signal if known.

## Steady state
One line each for healthy processes — owners deserve to see what's fine.

## Capture gaps
Processes with stale or missing observations; what to capture next.
```

Keep it under a page of prose before the tables. Cite observation timestamps and version labels so every claim is auditable in Klarity. Separate observed from inferred. If asked to onboard a new joiner instead, invert the frame: same data, but ordered as "here's how this team actually runs" (top processes by dependency weight, then recent changes, then live workarounds they'll encounter on day one).

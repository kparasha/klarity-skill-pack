---
name: klarity-opportunity-scan
description: Scan a Klarity workspace for the highest-leverage automation and AI-agent opportunities — fan out across the process tree, score candidates on evidence, and return a ranked shortlist with ROI signals. Use whenever the user asks where to automate next, where to deploy AI agents, which processes are the most manual or painful, "find transformation opportunities", or wants to prioritize an automation roadmap. Requires the Klarity MCP connection.
---

# Klarity Opportunity Scan

Transformation owners don't need a list of every manual process — they need the three places where an agent or automation pays back fastest, with the evidence to defend the pick. This skill fans out across the process index and returns a ranked, evidence-backed shortlist.

## Build the work queue

1. `list_accessible_workspaces` if workspace identity is in doubt.
2. `get_process_hierarchy` — whole tree, or rooted at the value stream the user named. The leaf processes are the work queue.
3. In parallel, also probe the index for known pain shapes with `search`: "manual re-key", "manual entry", "exception handling", "duplicate", "workaround", "swivel chair", "email follow-up". Every hit is a candidate; `fetch` to confirm the pattern is real and not a name match.

## Score each candidate

For each process in the queue (fan out aggressively — the MCP is stateless per call):
- `get_process_details` with `scope=["tasks","dependencies"]`
- `get_process_observations` with `verbosity="summary"`

Collect per process:

| Signal | Where it comes from | Why it matters |
|---|---|---|
| Manual-step ratio | step `type` fields | Automation surface area |
| Volume / frequency | `attributes` (monthly_volume etc.) | Multiplier on any savings |
| Recurring friction | deviations repeating across observations | Proof the pain is systemic, not anecdotal |
| Handle time | observation durations, attributes | Sizes the prize |
| Dependency position | `dependencies` fan-in/out | Upstream fixes compound downstream |
| Duplication | near-identical siblings (e.g. per-geo variants) | One build, two payoffs |
| Control level | `attributes` | SOX-adjacent automation needs human-in-the-loop design — affects feasibility, not just value |

Missing signals are findings too: a process that looks painful but has no observations gets a "capture first" recommendation, not a rank.

## Confirm before ranking

For the top ~5, do not rank on summaries alone:
- `get_process_observations` with `verbosity="full"` on the strongest evidence
- `get_observation_citation` on one representative session — confirm the manual pattern block-by-block
- corroborate with linked `log` artifacts via `search_artifact_text` where available (e.g. failure-reason counts in an ERP job log turn "analysts complain" into "28% of exceptions are PO_NOT_FOUND")

## Deliverable format

```
# Automation opportunity scan: <scope> — <date>
Scanned N processes across <value streams>; M had observation evidence.

## Ranked shortlist
For each candidate (top 3–5):
- **The pattern** — what humans do today (observed, cited: observation keys,
  timeline blocks, artifact lines)
- **The size** — frequency × time, in hours/month where derivable; show the
  arithmetic and label estimates as estimates
- **The intervention** — smallest change that removes the pain (upstream data
  fix vs. RPA vs. AI agent vs. process edit). Prefer the boring fix when it
  wins: if the root cause is a missing form field, say so before proposing an agent.
- **Blast radius** — dependents affected, from the dependency graph
- **Feasibility notes** — controls, human-in-the-loop needs, systems touched

## Honorable mentions
One line each: real but smaller, or blocked on evidence.

## Capture-first list
Processes that look expensive but lack observations — what to record next.
```

Rank by evidence-weighted value, not by how exciting the intervention sounds. Separate observed from inferred everywhere; a ranked list is only as defensible as its weakest citation.

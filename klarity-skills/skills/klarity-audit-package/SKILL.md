---
name: klarity-audit-package
description: Assemble an audit-ready evidence package for a Klarity process — documented controls, version-change log, execution evidence, and exceptions, with citable resource keys and timestamps. Use whenever the user mentions SOX walkthroughs, control testing, audit prep, "evidence for control X", compliance documentation for a process, or needs to show an auditor how a process actually operates. Requires the Klarity MCP connection.
---

# Klarity Audit Package

Auditors ask three questions: what is the control, did it operate, and can you prove it. Klarity holds all three answers — the documented version (design), the observation record (operation), and timestamps/keys (proof) — but scattered across tools. This skill assembles them into one package, exceptions included. An audit package that hides its exceptions fails at the first sample; surfacing them yourself, with remediation context, is what audit-ready means.

## Scope the package

- A named process → `search` → `fetch` → `get_process_details` with all scopes.
- A named control ID (e.g. "R2R-04") → `search` for it, and grep candidate SOPs via `search_artifact_text` — control IDs usually live in `attributes.control_ids` and in gold-document text.
- "Everything SOX" → walk `get_process_hierarchy` and filter processes whose `attributes` carry a control level; confirm each with `get_process_details`.

## Assemble the evidence

For each in-scope process:

1. **Control design** — current version's `policies` (the auditable commitments), the steps that implement them, and `attributes` (control level, control IDs, system of record). Pull the linked `gold_document` SOP with `get_artifact_content` and quote the control language with line numbers — auditors want the approved wording, not a paraphrase.
2. **Change history** — full version `history`. Flag any change that touches a control: a removed review step, a changed threshold, a new approver. For each, note whether the change is reflected in the SOP (design/practice divergence is a finding). Changes near period-end deserve explicit dates.
3. **Operating evidence** — `get_process_observations` across the audit period. For each policy, look for observations demonstrating it operating (approval routed, comment logged, dual authorization). `get_observation_citation` on representative sessions gives block-level evidence: who did what, in which system, when.
4. **Exceptions** — deviations that contradict a policy, sessions where a required step was skipped, and periods with no captures at all (an evidence gap is an exception for audit purposes). Corroborate with `log` artifacts via `search_artifact_text` where available.

## Package format

```
# Audit package: <process / control> — period <range>
Prepared <date> from Klarity workspace <name>. All resource keys and
timestamps below are auditable in the Klarity workspace.

## 1. Control design
Control-by-control: policy text (quoted, with SOP line refs), implementing
steps, systems, owners.

## 2. Change log for the period
Date · version · author · change · control impact (none / relevant / KEY)
· SOP updated? (yes/no/n.a.)

## 3. Evidence of operation
Per control: supporting observations (keys, dates, performer roles),
representative activity-timeline excerpts.

## 4. Exceptions and gaps
Deviations vs. policy (cited), skipped steps, capture gaps by month.
For each: status/remediation if known, or "requires owner follow-up".

## 5. Reliance notes
What this package can and cannot support. Observation coverage vs. total
population (e.g. 5 captured sessions vs. ~340 monthly executions — captures
are illustrative walkthrough evidence, not a statistical sample).
```

Ground rules: quote, don't paraphrase, anything an auditor will re-read; cite resource keys and timestamps on every evidence line; separate observed from inferred; and never smooth over a gap — "no evidence captured for April" is a required sentence, not a blemish to hide. Use performer roles rather than personal names in the package body where the audience is external.

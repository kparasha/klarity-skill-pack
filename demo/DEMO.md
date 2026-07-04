# 10-minute demo script

Audience: anyone evaluating what persistent skills on top of the Klarity MCP look like. Run from the repo root in Claude Code (`claude`); the mock server auto-registers via `.mcp.json`.

## 0. Frame (30s)

"Klarity's MCP gives assistants read access to how work actually happens. The docs show one-off prompt recipes. I packaged the recipes into skills — repeatable organizational capabilities — and built a mock of the documented server so this demos without a customer workspace."

## 1. The gap the docs name (3 min)

> Run a conformance check on our AP invoice exception handling process.

What to narrate while it runs:
- Per-session deviations are judged in isolation; Klarity docs say cross-observation aggregation is what the client must stitch. This skill is the stitch.
- Expected findings: the missing-PO → Outlook-search → manual re-key pattern in **5 of 5** sessions (~28% of exceptions per the ERP log); the v7 Coupa-comment requirement **skipped** in a post-change session; a covering analyst losing 40 minutes to tribal knowledge; the analyst's personal Excel tracker flagged as a **positive** deviation to promote.
- Point at the citations: observation keys, timeline blocks, log lines — auditable in Klarity.

## 2. The manager's brief (2 min)

> Give me a process health report for Procure-to-Pay.

Expected: N processes, what changed (v7 exception handling, close-calendar shift), needs-attention ranking that catches the accrual-deferral pattern behind the "successful" day-1 AP close.

## 3. The roadmap question (2 min)

> Where should Meridian deploy AI agents first? Scan for automation opportunities.

Expected top candidate: AP exception handling — but watch the recommendation. The root cause is a missing PO field on ~8 recurring vendors' invoices, so the *first* intervention is an upstream data fix, not an agent. A skill that recommends the boring fix over the exciting one is demonstrating product judgment.

## 4. The auditor (1.5 min)

> Build an audit package for control R2R-04 covering June.

Expected: the v12 removal of the second-reviewer sign-off flagged as a control-relevant change dated 2026-06-27, the $18.4k variance chase in the next close as its operating consequence, and the SOP/practice divergence quoted with line numbers.

## 5. Close (1 min)

- Skills are client-side and read-only — nothing touches workspace state; same skills run unchanged against the production server.
- The mock is also a dev-experience artifact: contributors and prospects can feel the MCP before they have a workspace.
- Natural next steps: schedule the health report weekly (cron → Slack), add an eval set per skill, and a conformance → Linear ticket chain via connector chaining.

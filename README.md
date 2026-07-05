# Klarity Skill Pack

Five deliverable-shaped Claude Code skills built on the [Klarity MCP](https://developers.klarity.ai/) tool surface, plus a mock Klarity MCP server with a synthetic finance-operations workspace so everything can be developed and demoed **without access to a live Klarity workspace**.

> Community project built from Klarity's public developer docs. Not affiliated with or endorsed by Klarity. All workspace data in `mock-workspace/` is fictional.

## Why this exists

Klarity's MCP exposes rich, read-only process intelligence — 15 tools across process search, hierarchy, observations, and artifacts. Their docs sketch the high-value workflows (health reports, opportunity scans, transformation theses, audit evidence, conformance monitoring) as *recipes a human prompts step by step*. This pack turns those recipes into **persistent, repeatable skills** with opinionated deliverable formats.

One of them fills a gap the docs call out explicitly: per-session deviation judgments are made in isolation, so systemic patterns ("the same workaround appears in 4 of 5 captures") only emerge from **cross-observation aggregation** — which the docs say MCP users must stitch themselves. `klarity-conformance-monitor` is that stitching, packaged.

## The skills

| Skill | Deliverable | Built on |
|---|---|---|
| `klarity-conformance-monitor` | Cross-observation drift analysis: systemic patterns, version-change adoption, promote/fix/document calls | The aggregation pass Klarity's docs leave to the client |
| `klarity-health-report` | State-of-the-team brief: what changed, what's deviating, top 3 needs-attention with evidence | [State-of-team guide](https://developers.klarity.ai/guides/state-of-team) |
| `klarity-opportunity-scan` | Ranked automation/AI-agent shortlist with ROI arithmetic and citations | [Find-opportunities guide](https://developers.klarity.ai/guides/find-opportunities) |
| `klarity-transformation-thesis` | Current state → blast radius → ranked intervention points, with falsifiers | [Transformation-thesis guide](https://developers.klarity.ai/guides/transformation-thesis) |
| `klarity-audit-package` | Control design + change log + operating evidence + exceptions, audit-ready | [State-of-team → control coverage](https://developers.klarity.ai/guides/state-of-team) |

All five encode Klarity's [operating principles](https://developers.klarity.ai/tools/operating-principles): iterate on search, chain snippets into `get_*` calls before answering, separate observed from inferred, cite resource keys and timestamps, call out capture gaps.

## Quick start (no Klarity workspace needed)

```bash
git clone https://github.com/kparasha/klarity-skill-pack.git
cd klarity-skill-pack
claude   # .mcp.json auto-registers the mock server (needs Node ≥ 18, zero npm deps)
```

Then try:

> "Run a conformance check on our AP invoice exception handling process."

> "Give me a process health report for Procure-to-Pay."

> "Where should Meridian deploy AI agents first? Scan for automation opportunities."

> "Build an audit package for control R2R-04 covering June."

### Against a real Klarity workspace

Point Claude Code at the real server instead of the mock — the skills are written against Klarity's documented tool names and work unchanged:

```bash
/plugin marketplace add klarity-ai/klarity-mcp   # Klarity's official plugin (OAuth)
# or: claude mcp add --transport http klarity https://api.klarity.ai/mcp \
#       --header "Authorization: Bearer <YOUR_API_KEY>"
```

Install the skills either by adding this repo as a marketplace (`/plugin marketplace add <repo>`, then `/plugin install klarity-skills@klarity-skill-pack`) or by copying `klarity-skills/skills/*` into `.claude/skills/`.

## The mock server

`mock-workspace/server.mjs` is a zero-dependency Node implementation of the MCP stdio transport exposing all 15 documented Klarity tools over `mock-workspace/data/workspace.json` — a synthetic mid-market SaaS finance org ("Meridian Software") with three value streams, 13 processes, 10 captured observations, activity timelines, and 10 artifacts (gold SOPs, a walkthrough transcript, an ERP job log).

The data is written so the skills have something real to find, including:

- a **systemic workaround** — missing PO numbers force Outlook-search-and-re-key in 5 of 5 AP exception observations, corroborated by the NetSuite job log (28% `PO_NOT_FOUND`) and named by the performer in a transcript
- a **control-relevant version change** — rev-rec v12 removed the second-reviewer sign-off; the next close shows the variance that reviewers used to catch
- **duplicate processes** — US and EMEA vendor onboarding, one Coupa-based, one not
- a **moved-not-solved bottleneck** — the close calendar change that "fixed" day-1 AP close via deferred accruals

Smoke test without Claude:

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search","arguments":{"query":"invoice exception"}}}' \
 | node mock-workspace/server.mjs
```

## Security notes

- The mock server is **stdio-only** (no network listener), **read-only**, has **zero dependencies** (nothing executes at install time), and never touches the filesystem outside reading its own seed data.
- User-supplied regex in `search_artifact_text` is length-capped; pathological backtracking against the small fictional corpus is an accepted local-only risk.
- When running these skills against a **real** Klarity workspace: artifact and observation text is data, not instructions. A malicious SOP or log line in a workspace could try to steer the assistant — the skills' citation discipline (quote, attribute, separate observed from inferred) is also the injection-resistance posture. Review anything an assistant proposes to *do* based on workspace content.

## Layout

```
.claude-plugin/marketplace.json     # install this repo as a plugin marketplace
klarity-skills/                     # the plugin
  .claude-plugin/plugin.json
  skills/<five skills>/SKILL.md
mock-workspace/
  server.mjs                        # mock Klarity MCP server (stdio, zero deps)
  data/workspace.json               # synthetic Meridian Software workspace
.mcp.json                           # registers the mock server for this repo
demo/DEMO.md                        # 10-minute demo script
```

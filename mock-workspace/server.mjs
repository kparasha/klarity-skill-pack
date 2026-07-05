#!/usr/bin/env node
/**
 * Mock Klarity MCP server (stdio transport, zero dependencies).
 *
 * Implements the tool surface documented at https://developers.klarity.ai/tools/overview
 * against a synthetic workspace (data/workspace.json) so that skills built on the
 * Klarity MCP can be developed and demoed without access to a live workspace.
 *
 * All data is fictional. Not affiliated with Klarity — built from public docs.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "data", "workspace.json"), "utf8")
);

const byKey = (arr, k = "resource_key") => Object.fromEntries(arr.map((x) => [x[k], x]));
const PROC = byKey(DATA.processes);
const NODE = byKey(DATA.hierarchy, "node_key");
const ART = byKey(DATA.artifacts);
const OBS = byKey(DATA.observations);

// --- tiny relevance scoring: tokenize query, score fields ---
const tok = (s) => (s || "").toLowerCase().match(/[a-z0-9]+/g) || [];
function score(queryTokens, text, weight = 1) {
  const t = (text || "").toLowerCase();
  let s = 0;
  for (const q of queryTokens) if (t.includes(q)) s += weight;
  return s;
}
function processScore(qt, p) {
  return (
    score(qt, p.name, 5) +
    score(qt, p.objective, 3) +
    score(qt, p.team, 2) +
    score(qt, p.value_stream, 2) +
    score(qt, JSON.stringify(p.current_version.steps), 1) +
    score(qt, JSON.stringify(p.current_version.policies), 1)
  );
}
const snippet = (p) =>
  `${p.objective} [team: ${p.team}, value stream: ${p.value_stream}, version: ${p.current_version.version_label}]`;

// --- tool implementations ---
const impl = {
  list_accessible_workspaces: () => ({
    workspaces: [{ ...DATA.workspace }],
    active_workspace: DATA.workspace.resource_key,
  }),

  search: ({ query, limit = 8 }) => {
    const qt = tok(query);
    const results = DATA.processes
      .map((p) => ({ p, s: processScore(qt, p) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(({ p }) => ({
        id: p.resource_key,
        title: p.name,
        snippet: snippet(p),
      }));
    return {
      results,
      guidance:
        results.length === 0
          ? "No matches. Refine the query 2-4 times (processes use organization-specific names) or browse with get_process_hierarchy."
          : "Snippets are starting points, not answers. Chain into fetch or get_process_details before answering.",
    };
  },

  fetch: ({ id }) => {
    const p = PROC[id];
    if (!p) throw `Unknown process id '${id}'. Use search or get_process_hierarchy to locate a valid resource key.`;
    return {
      id: p.resource_key,
      name: p.name,
      objective: p.objective,
      team: p.team,
      value_stream: p.value_stream,
      hierarchy_node: p.hierarchy_node,
      attributes: p.attributes,
      current_version: p.current_version,
      dependencies: p.dependencies,
      history: p.history.map(({ version_label, updated_at, updated_by, change_summary }) => ({
        version_label,
        updated_at,
        updated_by,
        change_summary,
      })),
    };
  },

  search_processes: ({ query, limit = 10 }) => {
    const qt = tok(query);
    const procResults = DATA.processes
      .map((p) => ({ kind: "process", key: p.resource_key, name: p.name, snippet: snippet(p), s: processScore(qt, p) }))
      .filter((r) => r.s > 0);
    const nodeResults = DATA.hierarchy
      .filter((n) => n.kind !== "process_node")
      .map((n) => ({
        kind: "hierarchy_node",
        key: n.node_key,
        name: n.name,
        snippet: `${n.kind} with ${n.children.length} children`,
        s: score(qt, n.name, 5) + score(qt, JSON.stringify(n.attributes), 2),
      }))
      .filter((r) => r.s > 0);
    return {
      results: [...procResults, ...nodeResults]
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map(({ s, ...r }) => r),
    };
  },

  get_process_hierarchy: ({ root_node_key = "hn_root", max_depth = 10 }) => {
    const build = (key, depth) => {
      const n = NODE[key];
      if (!n) return null;
      const node = { node_key: n.node_key, name: n.name, kind: n.kind, process: n.process };
      if (depth >= max_depth && n.children.length) {
        node.truncated = true;
        node.next_call = `get_hierarchy_node_details or get_process_hierarchy with root_node_key='${key}'`;
      } else {
        node.children = n.children.map((c) => build(c, depth + 1)).filter(Boolean);
      }
      return node;
    };
    const tree = build(root_node_key, 1);
    if (!tree) throw `Unknown node_key '${root_node_key}'.`;
    return { hierarchy: tree };
  },

  get_hierarchy_node_details: ({ node_key }) => {
    const n = NODE[node_key];
    if (!n) throw `Unknown node_key '${node_key}'.`;
    return {
      node_key: n.node_key,
      name: n.name,
      kind: n.kind,
      parent: n.parent,
      children: n.children.map((c) => ({ node_key: c, name: NODE[c]?.name, kind: NODE[c]?.kind, process: NODE[c]?.process })),
      linked_process: n.process,
      attributes: n.attributes,
    };
  },

  get_process_details: ({ resource_key, scope = [] }) => {
    const p = PROC[resource_key];
    if (!p) throw `Unknown process resource_key '${resource_key}'.`;
    const out = {
      resource_key: p.resource_key,
      name: p.name,
      objective: p.objective,
      team: p.team,
      value_stream: p.value_stream,
      hierarchy_node: p.hierarchy_node,
      attributes: p.attributes,
      current_version: {
        version_label: p.current_version.version_label,
        updated_at: p.current_version.updated_at,
        change_summary: p.current_version.change_summary,
        step_count: p.current_version.steps.length,
        manual_step_count: p.current_version.steps.filter((s) => s.type === "manual").length,
      },
    };
    if (scope.includes("tasks")) out.current_version.steps = p.current_version.steps;
    if (scope.includes("policies")) out.current_version.policies = p.current_version.policies;
    if (scope.includes("linked_artifacts")) out.current_version.linked_artifacts = p.current_version.linked_artifacts;
    if (scope.includes("dependencies")) out.dependencies = p.dependencies;
    if (scope.includes("history")) out.history = p.history;
    if (scope.includes("observations"))
      out.observations = DATA.observations
        .filter((o) => o.process_key === resource_key)
        .map((o) => ({ resource_key: o.resource_key, timestamp: o.timestamp, version_label: o.version_label, rationale: o.rationale }));
    return out;
  },

  get_recent_process_changes: ({ limit = 20 }) => {
    const changes = DATA.processes
      .flatMap((p) =>
        p.history.map((h) => ({
          process_resource_key: p.resource_key,
          process_name: p.name,
          team: p.team,
          value_stream: p.value_stream,
          version_label: h.version_label,
          updated_at: h.updated_at,
          updated_by: h.updated_by,
          change_summary: h.change_summary,
        }))
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, limit);
    return { changes };
  },

  get_process_observations: ({ process_resource_key, verbosity = "summary", limit = 10, version_label }) => {
    if (!PROC[process_resource_key]) throw `Unknown process resource_key '${process_resource_key}'.`;
    let obs = DATA.observations.filter((o) => o.process_key === process_resource_key);
    if (version_label) obs = obs.filter((o) => o.version_label === version_label);
    obs = obs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    return {
      process_resource_key,
      observation_count: obs.length,
      observations: obs.map((o) => {
        const base = {
          resource_key: o.resource_key,
          timestamp: o.timestamp,
          version_label: o.version_label,
          session_ref: o.session_ref,
          rationale: o.rationale,
          windows_time_frame: o.windows_time_frame,
          negative_deviations: o.negative_deviations,
          positive_deviations: o.positive_deviations,
        };
        if (verbosity === "full")
          Object.assign(base, {
            narrative: o.narrative,
            runtime_inputs: o.runtime_inputs,
            runtime_outputs: o.runtime_outputs,
            duration_minutes: o.duration_minutes,
            performer: o.performer,
          });
        return base;
      }),
      note: "Deviations are per-session judgments. Cross-observation patterns require aggregating across the observation set.",
    };
  },

  get_observation_citation: ({ observation_resource_key, verbosity = "medium", activity_block_index }) => {
    const o = OBS[observation_resource_key];
    if (!o) throw `Unknown observation_resource_key '${observation_resource_key}'.`;
    const timeline = DATA.activity_timelines[observation_resource_key];
    if (!timeline)
      return {
        observation_resource_key,
        timestamp: o.timestamp,
        note: "No detailed activity timeline captured for this observation. The summary narrative is the best available evidence.",
        narrative: o.narrative,
      };
    let blocks = timeline;
    if (activity_block_index !== undefined) blocks = timeline.filter((b) => b.index === activity_block_index);
    if (verbosity === "low") blocks = blocks.map(({ index, system, action }) => ({ index, system, action: action.slice(0, 60) }));
    return {
      observation_resource_key,
      process_key: o.process_key,
      version_label: o.version_label,
      timestamp: o.timestamp,
      total_blocks: timeline.length,
      activity_timeline: blocks,
    };
  },

  list_sessions: ({ limit = 10, offset = 0 }) => ({
    sessions: DATA.sessions.slice(offset, offset + limit),
    total: DATA.sessions.length,
  }),

  search_artifacts: ({ query, type, origin, limit = 8 }) => {
    const qt = tok(query);
    let arts = DATA.artifacts;
    if (type) arts = arts.filter((a) => a.type === type);
    if (origin) arts = arts.filter((a) => a.origin === origin);
    const results = arts
      .map((a) => ({ a, s: score(qt, a.name, 5) + score(qt, a.content.join(" "), 2) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(({ a }) => ({
        resource_key: a.resource_key,
        name: a.name,
        type: a.type,
        origin: a.origin,
        snippet: a.content.slice(0, 2).join(" "),
      }));
    return { results };
  },

  get_artifact_details: ({ resource_key }) => {
    const a = ART[resource_key];
    if (!a) throw `Unknown artifact resource_key '${resource_key}'.`;
    const { content, ...rest } = a;
    return { ...rest, line_count: content.length };
  },

  get_artifact_content: ({ resource_key, start_line, end_line }) => {
    const a = ART[resource_key];
    if (!a) throw `Unknown artifact resource_key '${resource_key}'.`;
    const s = start_line ? Math.max(0, start_line - 1) : 0;
    const e = end_line ?? a.content.length;
    return {
      resource_key,
      name: a.name,
      start_line: s + 1,
      end_line: Math.min(e, a.content.length),
      content: a.content.slice(s, e).map((line, i) => `${s + i + 1}: ${line}`).join("\n"),
    };
  },

  search_artifact_text: ({ resource_key, pattern, regex = false }) => {
    const a = ART[resource_key];
    if (!a) throw `Unknown artifact resource_key '${resource_key}'.`;
    if (typeof pattern !== "string" || pattern.length > 200)
      throw "pattern must be a string of at most 200 characters.";
    const re = regex ? new RegExp(pattern, "i") : null;
    const matches = [];
    a.content.forEach((line, i) => {
      const hit = regex ? re.test(line) : line.toLowerCase().includes(pattern.toLowerCase());
      if (hit)
        matches.push({
          line: i + 1,
          text: line,
          context: a.content.slice(Math.max(0, i - 1), i + 2).join(" / "),
        });
    });
    return { resource_key, pattern, match_count: matches.length, matches };
  },
};

// --- MCP tool schemas ---
const str = (description) => ({ type: "string", description });
const num = (description) => ({ type: "number", description });
const TOOLS = [
  { name: "list_accessible_workspaces", description: "List the workspaces you can access and see which one is active.", inputSchema: { type: "object", properties: {} } },
  { name: "search", description: "Semantic search over the process index. The default first call for any process question. Iterate — refine the query 2-4 times if results feel sparse.", inputSchema: { type: "object", properties: { query: str("Search query in the user's words"), limit: num("Max results (default 8)") }, required: ["query"] } },
  { name: "fetch", description: "Pull full details for one process by id returned from search or hierarchy navigation.", inputSchema: { type: "object", properties: { id: str("Process resource key from search results") }, required: ["id"] } },
  { name: "search_processes", description: "Ranked process search combining keyword and semantic matching. Returns mixed hierarchy-node and process results.", inputSchema: { type: "object", properties: { query: str("Search query"), limit: num("Max results (default 10)") }, required: ["query"] } },
  { name: "get_process_hierarchy", description: "Browse the whole process index structure. Cap depth with max_depth; truncated branches are flagged.", inputSchema: { type: "object", properties: { root_node_key: str("Node to root the tree at (default workspace root)"), max_depth: num("Depth cap") } } },
  { name: "get_hierarchy_node_details", description: "Inspect a single hierarchy node — parent, children, linked process, attributes.", inputSchema: { type: "object", properties: { node_key: str("Hierarchy node key") }, required: ["node_key"] } },
  { name: "get_process_details", description: "Rich nested payload for a process. Pass scope to include tasks, observations, dependencies, linked_artifacts, policies, or history.", inputSchema: { type: "object", properties: { resource_key: str("Process resource key"), scope: { type: "array", items: { type: "string", enum: ["tasks", "observations", "dependencies", "linked_artifacts", "policies", "history"] }, description: "Which sections to include beyond the summary" } }, required: ["resource_key"] } },
  { name: "get_recent_process_changes", description: "Workspace-wide version-change feed. 'What has been edited recently?'", inputSchema: { type: "object", properties: { limit: num("Max changes (default 20)") } } },
  { name: "get_process_observations", description: "Observations (captured executions) on a specific process, with deviation signals. verbosity='full' adds runtime inputs/outputs and narrative (heavy — use a small limit).", inputSchema: { type: "object", properties: { process_resource_key: str("Process resource key"), verbosity: { type: "string", enum: ["summary", "full"] }, limit: num("Max observations (default 10)"), version_label: str("Filter to one process version") }, required: ["process_resource_key"] } },
  { name: "get_observation_citation", description: "The activity timeline behind an observation — the most primary-source evidence available. Use verbosity low/medium/high and activity_block_index to page.", inputSchema: { type: "object", properties: { observation_resource_key: str("Observation resource key"), verbosity: { type: "string", enum: ["low", "medium", "high"] }, activity_block_index: num("Return a single block by index") }, required: ["observation_resource_key"] } },
  { name: "list_sessions", description: "Recent workspace sessions, paginated — which processes each session updated, duration, and creator.", inputSchema: { type: "object", properties: { limit: num("Page size (default 10)"), offset: num("Offset") } } },
  { name: "search_artifacts", description: "Hybrid search across artifact text (SOPs, recordings, logs, diagrams). Start here for artifact discovery. Filter by type or origin.", inputSchema: { type: "object", properties: { query: str("Search query"), type: { type: "string", enum: ["video", "audio", "document", "diagram", "log", "image", "folder", "rav_session_data", "session_analysis"] }, origin: { type: "string", enum: ["user_input", "system_input", "ai_generated", "system_processed", "gold_document"] }, limit: num("Max results") }, required: ["query"] } },
  { name: "get_artifact_details", description: "Full metadata for a single artifact — type, status, file info, and linked artifacts.", inputSchema: { type: "object", properties: { resource_key: str("Artifact resource key") }, required: ["resource_key"] } },
  { name: "get_artifact_content", description: "Full or range-mode text extraction for a single artifact. Use start_line/end_line when you need to cite specific lines.", inputSchema: { type: "object", properties: { resource_key: str("Artifact resource key"), start_line: num("1-indexed start line"), end_line: num("1-indexed end line") }, required: ["resource_key"] } },
  { name: "search_artifact_text", description: "Within one artifact, find line-numbered matches with surrounding context. Regex or literal.", inputSchema: { type: "object", properties: { resource_key: str("Artifact resource key"), pattern: str("Literal string or regex"), regex: { type: "boolean", description: "Treat pattern as a regular expression" } }, required: ["resource_key", "pattern"] } },
];

// --- JSON-RPC over stdio (newline-delimited) ---
const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  line = line.trim();
  if (!line) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = req;
  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "klarity-mock", version: "0.1.0" },
          instructions:
            "Mock Klarity MCP server over a synthetic finance-operations workspace (Meridian Software). Read-only. All data is fictional. Follow the Klarity operating principles: iterate on search, chain search results into fetch/get_* calls, separate observed from inferred, cite resource keys and timestamps.",
        },
      });
    } else if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    } else if (method === "tools/call") {
      const { name, arguments: args = {} } = params;
      if (!impl[name]) throw `Unknown tool '${name}'.`;
      const result = impl[name](args);
      send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
    } else if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
    } else if (id !== undefined) {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
    // notifications (no id) are ignored
  } catch (e) {
    if (id !== undefined)
      send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: String(e) }], isError: true } });
  }
});

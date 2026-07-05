#!/usr/bin/env node
/**
 * QA suite for the klarity-skill-pack. Zero dependencies; exits non-zero on failure.
 *
 * Checks:
 *  1. Mock server handshake + all 15 documented tools return non-error results.
 *  2. Data ground truth the demo depends on (missing-PO pattern in 5/5 AP observations).
 *  3. Every SKILL.md has valid frontmatter and only references tools the server exposes.
 *  4. All JSON manifests parse (marketplace, plugin, .mcp.json, workspace data).
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

// --- 1 & 2: exercise the server over stdio ---
const calls = [
  ["list_accessible_workspaces", {}],
  ["search", { query: "invoice exception" }],
  ["fetch", { id: "proc_ap_invoice_exceptions" }],
  ["search_processes", { query: "close" }],
  ["get_process_hierarchy", { max_depth: 3 }],
  ["get_hierarchy_node_details", { node_key: "hn_p2p" }],
  ["get_process_details", { resource_key: "proc_revenue_recognition", scope: ["tasks", "policies", "history", "dependencies", "observations", "linked_artifacts"] }],
  ["get_recent_process_changes", { limit: 10 }],
  ["get_process_observations", { process_resource_key: "proc_ap_invoice_exceptions", verbosity: "full", limit: 10 }],
  ["get_observation_citation", { observation_resource_key: "obs_apex_001", verbosity: "high" }],
  ["list_sessions", { limit: 10 }],
  ["search_artifacts", { query: "SOP", origin: "gold_document" }],
  ["get_artifact_details", { resource_key: "art_ap_walkthrough_video" }],
  ["get_artifact_content", { resource_key: "art_revrec_gold_sop", start_line: 14, end_line: 18 }],
  ["search_artifact_text", { resource_key: "art_netsuite_import_log", pattern: "PO_NOT_FOUND" }],
];
const reqs = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "qa", version: "0" } } },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ...calls.map(([name, args], i) => ({ jsonrpc: "2.0", id: 10 + i, method: "tools/call", params: { name, arguments: args } })),
];

const server = spawn("node", [join(ROOT, "mock-workspace", "server.mjs")], { stdio: ["pipe", "pipe", "inherit"] });
let stdout = "";
server.stdout.on("data", (d) => (stdout += d));
server.stdin.write(reqs.map((r) => JSON.stringify(r)).join("\n") + "\n");
server.stdin.end();
await new Promise((res) => server.on("close", res));

const byId = Object.fromEntries(stdout.trim().split("\n").map((l) => JSON.parse(l)).map((m) => [m.id, m]));
const tools = (byId[2]?.result?.tools ?? []).map((t) => t.name);
check("server exposes 15 documented tools", tools.length === 15, `${tools.length}`);
const failed = calls.filter(([n], i) => byId[10 + i]?.result?.isError || !byId[10 + i]?.result);
check("all 15 tools return non-error results", failed.length === 0, failed.map(([n]) => n).join(","));

const obs = JSON.parse(byId[18].result.content[0].text);
const withPO = obs.observations.filter((o) => o.negative_deviations.some((d) => d.includes("PO")));
check("ground truth: missing-PO deviation in 5/5 AP observations", withPO.length === 5 && obs.observations.length === 5, `${withPO.length}/${obs.observations.length}`);

// --- 3: skills reference only real tools ---
const skillsDir = join(ROOT, "klarity-skills", "skills");
const skillDirs = readdirSync(skillsDir);
check("five skills present", skillDirs.length === 5, `${skillDirs.length}`);
const toolSet = new Set(tools);
for (const d of skillDirs) {
  const txt = readFileSync(join(skillsDir, d, "SKILL.md"), "utf8");
  const fm = txt.match(/^---\nname: (\S+)\ndescription: .+?\n---\n/s);
  check(`frontmatter valid: ${d}`, Boolean(fm) && fm[1] === d);
  const refs = [...txt.matchAll(/`([a-z][a-z_]{3,})`/g)].map((m) => m[1]);
  const unknown = refs.filter((r) => (r.startsWith("get_") || r.startsWith("search") || r.startsWith("list_") || r === "fetch") && !toolSet.has(r));
  check(`tool refs valid: ${d}`, unknown.length === 0, unknown.join(","));
}

// --- 4: manifests parse ---
for (const f of [".claude-plugin/marketplace.json", "klarity-skills/.claude-plugin/plugin.json", ".mcp.json", "mock-workspace/data/workspace.json"]) {
  try {
    JSON.parse(readFileSync(join(ROOT, f), "utf8"));
    check(`json parses: ${f}`, true);
  } catch (e) {
    check(`json parses: ${f}`, false, String(e));
  }
}

// --- report ---
let pass = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  if (r.ok) pass++;
}
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAccess, getClientIp } from "../governance/access.js";
import { info, audit, error as logError } from "../governance/logger.js";
import {
  analyzeArchitecture,
  analyzeTool,
  analyzeServer,
} from "../engine/rules.js";
import type { AgentArchitecture, ToolDefinition, ServerDefinition } from "../engine/rules.js";
import {
  getTechnique,
  getMitigation,
  searchTechniques,
  searchMitigations,
  getTechniquesBySeverity,
  getTechniquesByTactic,
  getThreatProfile,
  getFrameworkStats,
} from "../engine/analyze.js";
import type { Severity } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env["PORT"] ?? "3002", 10);
const HOST = process.env["HOST"] ?? "127.0.0.1";

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(data);
}

async function readBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as unknown;
}

function parseUrl(raw: string | undefined): { path: string; params: URLSearchParams } {
  const full = new URL(raw ?? "/", "http://localhost");
  return { path: full.pathname, params: full.searchParams };
}

const httpServer = createServer(async (req, res) => {
  const clientIp = getClientIp(req);
  const start = performance.now();

  // CORS preflight
  if (req.method === "OPTIONS") {
    json(res, 204, "");
    return;
  }

  const { path, params } = parseUrl(req.url);

  // Health / version (no auth)
  if (req.method === "GET" && (path === "/health" || path === "/v1/health")) {
    json(res, 200, { status: "ok", name: "safe-mcp-skill", version: "1.0.0", apiVersion: "v1" });
    return;
  }
  if (req.method === "GET" && path === "/version") {
    json(res, 200, { name: "safe-mcp-skill", version: "1.0.0", apiVersion: "v1", framework: "SAFE-MCP" });
    return;
  }
  if (req.method === "GET" && path === "/v1/openapi.json") {
    const spec = readFileSync(resolve(__dirname, "openapi.json"), "utf-8");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(spec);
    return;
  }

  // Access control for all other endpoints
  const access = checkAccess(req);
  if (!access.allowed) {
    json(res, 403, { error: access.reason });
    return;
  }

  try {
    // ── Analysis endpoints ──────────────────────────────────────
    if (req.method === "POST" && path === "/v1/analyze/architecture") {
      const body = await readBody(req) as AgentArchitecture;
      json(res, 200, analyzeArchitecture(body));
      audit("rest_call", { clientIp, toolName: "analyze_architecture", duration: Math.round(performance.now() - start) });
      return;
    }
    if (req.method === "POST" && path === "/v1/analyze/tool") {
      const body = await readBody(req) as ToolDefinition;
      json(res, 200, analyzeTool(body));
      audit("rest_call", { clientIp, toolName: "analyze_tool", duration: Math.round(performance.now() - start) });
      return;
    }
    if (req.method === "POST" && path === "/v1/analyze/server") {
      const body = await readBody(req) as ServerDefinition;
      json(res, 200, analyzeServer(body));
      audit("rest_call", { clientIp, toolName: "analyze_server", duration: Math.round(performance.now() - start) });
      return;
    }

    // ── Lookup endpoints ────────────────────────────────────────
    const techniqueMatch = path.match(/^\/v1\/techniques\/(.+)$/);
    if (req.method === "GET" && techniqueMatch) {
      const id = decodeURIComponent(techniqueMatch[1]!);
      const t = getTechnique(id);
      if (!t) { json(res, 404, { error: `Technique ${id} not found` }); return; }
      json(res, 200, t);
      return;
    }
    const mitigationMatch = path.match(/^\/v1\/mitigations\/(.+)$/);
    if (req.method === "GET" && mitigationMatch) {
      const id = decodeURIComponent(mitigationMatch[1]!);
      const m = getMitigation(id);
      if (!m) { json(res, 404, { error: `Mitigation ${id} not found` }); return; }
      json(res, 200, m);
      return;
    }

    // ── Search endpoints ────────────────────────────────────────
    if (req.method === "GET" && path === "/v1/techniques") {
      const q = params.get("q");
      const severity = params.get("severity") as Severity | null;
      const tactic = params.get("tactic");
      let results = q ? searchTechniques(q) : [];
      if (severity && !q) results = getTechniquesBySeverity(severity);
      if (tactic && !q) results = getTechniquesByTactic(tactic);
      if (severity && q) results = results.filter((t) => t.severity === severity);
      if (tactic && q) results = results.filter((t) => t.tactic === tactic);
      json(res, 200, results.map((t) => ({ id: t.id, name: t.name, severity: t.severity, tactic: t.tacticName })));
      return;
    }
    if (req.method === "GET" && path === "/v1/mitigations") {
      const q = params.get("q") ?? "";
      const results = searchMitigations(q);
      json(res, 200, results.map((m) => ({ id: m.id, name: m.name, category: m.category, effectiveness: m.effectiveness })));
      return;
    }

    // ── Profile / Stats ─────────────────────────────────────────
    if (req.method === "GET" && path === "/v1/threat-profile") {
      json(res, 200, getThreatProfile());
      return;
    }
    if (req.method === "GET" && path === "/v1/framework/stats") {
      json(res, 200, getFrameworkStats());
      return;
    }

    json(res, 404, { error: "Not found", docs: "/v1/openapi.json" });
  } catch (err) {
    logError("rest_error", { clientIp, detail: err instanceof Error ? err.message : String(err) });
    json(res, 500, { error: "Internal server error" });
  }
});

httpServer.listen(PORT, HOST, () => {
  info("rest_server_started", { detail: { host: HOST, port: PORT } });
  console.error(`SAFE-MCP REST API listening on http://${HOST}:${PORT}`);
  console.error(`OpenAPI spec: http://${HOST}:${PORT}/v1/openapi.json`);
  console.error(`Health: http://${HOST}:${PORT}/health`);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import {
  analyzeArchitecture,
  analyzeTool,
  analyzeServer,
} from "./engine/rules.js";
import {
  getTechnique,
  getMitigation,
  getThreatProfile,
  searchTechniques,
  searchMitigations,
  getMitigationsForTechnique,
  getTechniquesForMitigation,
  getUnmitigatedTechniques,
  rankMitigationsByImpact,
  getFrameworkStats,
} from "./engine/analyze.js";

// ── Server ──────────────────────────────────────────────────────────

export const server = new McpServer({
  name: "safe-mcp-skill",
  version: "1.0.0",
});

// ── Zod Schemas ─────────────────────────────────────────────────────

const ToolDefinitionSchema = z.object({
  name: z.string().describe("Tool name"),
  description: z.string().describe("Tool description text"),
  inputSchema: z.record(z.string(), z.unknown()).optional().describe("Tool input JSON schema"),
  annotations: z.record(z.string(), z.unknown()).optional().describe("Tool annotations"),
  parameters: z.record(z.string(), z.unknown()).optional().describe("Tool parameters"),
});

const OAuthConfigSchema = z.object({
  scopes: z.array(z.string()).optional(),
  callbackUrls: z.array(z.string()).optional(),
  authorizationServer: z.string().optional(),
});

const ServerDefinitionSchema = z.object({
  name: z.string().describe("Server name"),
  transport: z.string().optional().describe("Transport type: stdio, sse, http, websocket"),
  authentication: z.string().optional().describe("Authentication method"),
  tools: z.array(ToolDefinitionSchema).optional().describe("Tools exposed by this server"),
  permissions: z.array(z.string()).optional(),
  exposedEndpoints: z.array(z.string()).optional(),
  oauthConfig: OAuthConfigSchema.optional(),
});

const ArchitectureSchema = z.object({
  name: z.string().optional().describe("Architecture name"),
  servers: z.array(ServerDefinitionSchema).optional().describe("MCP servers"),
  tools: z.array(ToolDefinitionSchema).optional().describe("Standalone tools"),
  multiAgent: z.boolean().optional().describe("Multi-agent architecture"),
  sharedMemory: z.boolean().optional().describe("Shared memory between agents"),
  vectorStore: z.boolean().optional().describe("Uses vector store"),
  ragPipeline: z.boolean().optional().describe("Uses RAG pipeline"),
  multimodal: z.boolean().optional().describe("Processes images/audio"),
  cliAccess: z.boolean().optional().describe("Has CLI access"),
  fileSystemAccess: z.boolean().optional().describe("Has file system access"),
  networkAccess: z.boolean().optional().describe("Has outbound network access"),
  oauthFlows: z.boolean().optional().describe("Uses OAuth flows"),
});

// ── Tools ───────────────────────────────────────────────────────────

server.registerTool(
  "analyze_architecture",
  {
    title: "Analyze Agent Architecture",
    description:
      "Run a full SAFE-MCP security analysis on an agent architecture definition. Returns risk summary, findings (matched techniques), and recommended mitigations.",
    inputSchema: { architecture: ArchitectureSchema },
  },
  async ({ architecture }) => ({
    content: [{ type: "text", text: JSON.stringify(analyzeArchitecture(architecture), null, 2) }],
  }),
);

server.registerTool(
  "analyze_tool",
  {
    title: "Analyze MCP Tool",
    description:
      "Analyze a single MCP tool definition for SAFE-MCP security risks.",
    inputSchema: { tool: ToolDefinitionSchema },
  },
  async ({ tool }) => ({
    content: [{ type: "text", text: JSON.stringify(analyzeTool(tool), null, 2) }],
  }),
);

server.registerTool(
  "analyze_server",
  {
    title: "Analyze MCP Server",
    description:
      "Analyze an MCP server definition (with its tools) for security risks.",
    inputSchema: { server: ServerDefinitionSchema },
  },
  async ({ server: srv }) => ({
    content: [{ type: "text", text: JSON.stringify(analyzeServer(srv), null, 2) }],
  }),
);

server.registerTool(
  "get_technique",
  {
    title: "Get Technique Details",
    description:
      "Retrieve full details for a SAFE-MCP technique by ID (e.g., SAFE-T1001).",
    inputSchema: { id: z.string().describe("Technique ID such as SAFE-T1001") },
  },
  async ({ id }) => {
    const technique = getTechnique(id);
    if (!technique) {
      return { content: [{ type: "text", text: `Technique ${id} not found` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(technique, null, 2) }] };
  },
);

server.registerTool(
  "get_mitigation",
  {
    title: "Get Mitigation Details",
    description:
      "Retrieve full details for a SAFE-MCP mitigation by ID (e.g., SAFE-M-1).",
    inputSchema: { id: z.string().describe("Mitigation ID such as SAFE-M-1") },
  },
  async ({ id }) => {
    const mitigation = getMitigation(id);
    if (!mitigation) {
      return { content: [{ type: "text", text: `Mitigation ${id} not found` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(mitigation, null, 2) }] };
  },
);

server.registerTool(
  "search_techniques",
  {
    title: "Search Techniques",
    description:
      "Search SAFE-MCP techniques by keyword (matches ID, name, description).",
    inputSchema: { query: z.string().describe("Search keyword") },
  },
  async ({ query }) => {
    const results = searchTechniques(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            results.map((t) => ({ id: t.id, name: t.name, severity: t.severity, tactic: t.tacticName })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "search_mitigations",
  {
    title: "Search Mitigations",
    description:
      "Search SAFE-MCP mitigations by keyword (matches ID, name, description).",
    inputSchema: { query: z.string().describe("Search keyword") },
  },
  async ({ query }) => {
    const results = searchMitigations(query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            results.map((m) => ({ id: m.id, name: m.name, category: m.category, effectiveness: m.effectiveness })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "get_mitigations_for_technique",
  {
    title: "Get Mitigations for Technique",
    description:
      "Given a technique ID, return all mitigations that address it.",
    inputSchema: { techniqueId: z.string().describe("Technique ID") },
  },
  async ({ techniqueId }) => {
    const mitigations = getMitigationsForTechnique(techniqueId);
    return { content: [{ type: "text", text: JSON.stringify(mitigations, null, 2) }] };
  },
);

server.registerTool(
  "get_techniques_for_mitigation",
  {
    title: "Get Techniques for Mitigation",
    description:
      "Given a mitigation ID, return all techniques it addresses.",
    inputSchema: { mitigationId: z.string().describe("Mitigation ID") },
  },
  async ({ mitigationId }) => {
    const techniques = getTechniquesForMitigation(mitigationId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            techniques.map((t) => ({ id: t.id, name: t.name, severity: t.severity })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "get_threat_profile",
  {
    title: "Get Threat Profile",
    description:
      "Return a high-level SAFE-MCP threat profile: severity distribution, unmitigated techniques, critical techniques, and overall mitigation coverage.",
    inputSchema: {},
  },
  async () => {
    const profile = getThreatProfile();
    return { content: [{ type: "text", text: JSON.stringify(profile, null, 2) }] };
  },
);

server.registerTool(
  "get_unmitigated_techniques",
  {
    title: "Get Unmitigated Techniques",
    description:
      "List all SAFE-MCP techniques that currently have no known mitigations.",
    inputSchema: {},
  },
  async () => {
    const techniques = getUnmitigatedTechniques();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            techniques.map((t) => ({ id: t.id, name: t.name, severity: t.severity, tactic: t.tacticName })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "rank_mitigations",
  {
    title: "Rank Mitigations by Impact",
    description:
      "Rank all mitigations by the number and severity of techniques they address.",
    inputSchema: {},
  },
  async () => {
    const ranked = rankMitigationsByImpact().slice(0, 20);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            ranked.map((r) => ({
              id: r.mitigation.id,
              name: r.mitigation.name,
              techniquesAddressed: r.techniquesAddressed,
              coversSeverities: r.coversSeverities,
              effectiveness: r.mitigation.effectiveness,
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "get_framework_stats",
  {
    title: "Get Framework Statistics",
    description:
      "Return SAFE-MCP framework metadata: totals, tactic distribution, mitigation category distribution, and implementation guidance.",
    inputSchema: {},
  },
  async () => {
    const stats = getFrameworkStats();
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  },
);

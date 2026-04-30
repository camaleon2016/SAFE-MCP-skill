import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";

// Re-export the OpenAI adapter so consumers can:
//   import { openAiFunctions, dispatch } from "safe-mcp-skill"
export { openAiFunctions, dispatch } from "./openai.js";

// Re-export engine for direct use
export {
  analyzeArchitecture,
  analyzeTool,
  analyzeServer,
} from "./engine/rules.js";
export type {
  ToolDefinition,
  ServerDefinition,
  AgentArchitecture,
  AnalysisResult,
  Finding,
  RiskSummary,
} from "./engine/rules.js";

// Re-export mappings for direct use
export { getMappings, getCoverage, STRIDE_LABELS } from "./mappings/index.js";
export type {
  FrameworkMappings,
  FrameworkCoverage,
  StrideCategory,
  AtlasRef,
  OwaspLlmRef,
  NistAiRmfRef,
} from "./mappings/index.js";

// Re-export discovery for direct use
export {
  discoverAndAnalyzeStdio,
  discoverAndAnalyzeHttp,
  discoverAndAnalyzeConfig,
} from "./discovery.js";
export type {
  StdioDiscoveryInput,
  HttpDiscoveryInput,
  ConfigDiscoveryInput,
  DiscoveryResult,
  ConfigDiscoveryResult,
} from "./discovery.js";

// Default: start MCP stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

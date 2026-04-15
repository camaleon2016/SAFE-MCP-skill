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

// Default: start MCP stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

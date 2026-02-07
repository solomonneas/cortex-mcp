import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { CortexClient } from "./client.js";
import { registerAnalyzerTools } from "./tools/analyzers.js";
import { registerJobTools } from "./tools/jobs.js";
import { registerResponderTools } from "./tools/responders.js";
import { registerBulkTools } from "./tools/bulk.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const server = new McpServer({
  name: "cortex-mcp",
  version: "1.0.0",
  description:
    "MCP server for Cortex observable analysis and response engine",
});

const config = getConfig();
const client = new CortexClient(config);

registerAnalyzerTools(server, client);
registerJobTools(server, client);
registerResponderTools(server, client);
registerBulkTools(server, client);
registerResources(server, client);
registerPrompts(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

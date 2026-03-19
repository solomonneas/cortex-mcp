import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { CortexClient } from "./client.js";
import { registerAnalyzerTools } from "./tools/analyzers.js";
import { registerJobTools } from "./tools/jobs.js";
import { registerResponderTools } from "./tools/responders.js";
import { registerBulkTools } from "./tools/bulk.js";
import { registerStatusTools } from "./tools/status.js";
import { registerOrganizationTools } from "./tools/organizations.js";
import { registerUserTools } from "./tools/users.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

async function main(): Promise<void> {
  const config = getConfig();

  if (!config.verifySsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const server = new McpServer({
    name: "cortex-mcp",
    version: "1.0.0",
    description:
      "MCP server for Cortex - observable analysis and active response engine by StrangeBee/TheHive Project",
  });

  const client = new CortexClient(config);

  registerAnalyzerTools(server, client);
  registerJobTools(server, client);
  registerResponderTools(server, client);
  registerBulkTools(server, client);
  registerStatusTools(server, client);
  registerOrganizationTools(server, client);
  registerUserTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

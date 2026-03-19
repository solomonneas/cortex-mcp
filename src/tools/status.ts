import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

export function registerStatusTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_get_status",
    "Get Cortex instance health status, version info, and configuration",
    {},
    async () => {
      try {
        const status = await client.getStatus();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  healthy: true,
                  version: status.versions.Cortex,
                  versions: status.versions,
                  authTypes: status.config.authType,
                  capabilities: status.config.capabilities,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  healthy: false,
                  error:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  );
}

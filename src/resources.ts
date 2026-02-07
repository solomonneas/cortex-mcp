import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "./client.js";

export function registerResources(
  server: McpServer,
  client: CortexClient,
): void {
  server.resource(
    "analyzers",
    "cortex://analyzers",
    {
      description: "List of all enabled Cortex analyzers with their capabilities and supported data types",
      mimeType: "application/json",
    },
    async () => {
      const analyzers = await client.listAnalyzers();
      const summary = analyzers.map((a) => ({
        id: a.id,
        name: a.name,
        version: a.version,
        description: a.description,
        dataTypes: a.dataTypeList,
      }));
      return {
        contents: [
          {
            uri: "cortex://analyzers",
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "recent-jobs",
    "cortex://jobs/recent",
    {
      description: "Recent Cortex analysis jobs (last 50)",
      mimeType: "application/json",
    },
    async () => {
      const jobs = await client.searchJobs({
        query: { _field: "status", _value: "*" },
        range: "0-50",
        sort: ["-createdAt"],
      });
      const summary = jobs.map((j) => ({
        id: j.id,
        analyzerName: j.analyzerName,
        dataType: j.dataType,
        data: j.data,
        status: j.status,
        startDate: j.startDate
          ? new Date(j.startDate).toISOString()
          : undefined,
        endDate: j.endDate
          ? new Date(j.endDate).toISOString()
          : undefined,
      }));
      return {
        contents: [
          {
            uri: "cortex://jobs/recent",
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );
}

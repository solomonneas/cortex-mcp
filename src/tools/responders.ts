import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

export function registerResponderTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_list_responders",
    "List all enabled responders, optionally filtered by data type",
    {
      dataType: z
        .string()
        .optional()
        .describe("Filter by supported data type"),
    },
    async ({ dataType }) => {
      try {
        let responders = await client.listResponders();

        if (dataType) {
          responders = responders.filter((r) =>
            r.dataTypeList.includes(dataType),
          );
        }

        const summary = responders.map((r) => ({
          id: r.id,
          name: r.name,
          version: r.version,
          description: r.description,
          dataTypes: r.dataTypeList,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing responders: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_run_responder",
    "Execute a responder action against a TheHive entity (case, task, artifact, alert)",
    {
      responderId: z.string().describe("The responder ID to execute"),
      objectType: z
        .enum(["case", "case_task", "case_artifact", "alert"])
        .describe("The type of TheHive entity to act on"),
      objectId: z
        .string()
        .describe("The ID of the entity from TheHive"),
      parameters: z
        .record(z.unknown())
        .optional()
        .describe("Optional responder-specific parameters"),
    },
    async ({ responderId, objectType, objectId, parameters }) => {
      try {
        const actionJob = await client.runResponder(responderId, {
          objectType,
          objectId,
          parameters,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  actionJobId: actionJob.id,
                  status: actionJob.status,
                  responderId: actionJob.responderId,
                  responderName: actionJob.responderName,
                  message: `Responder action submitted. Job ID: "${actionJob.id}"`,
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
              text: `Error running responder: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

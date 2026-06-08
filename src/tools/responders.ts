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
    "Execute a responder action against a TheHive entity (case, task, artifact, alert). DESTRUCTIVE: responders perform real-world side effects (blocking IPs, sending mail, isolating hosts). Gated behind the CORTEX_ALLOW_DESTRUCTIVE env var AND confirm=true.",
    {
      responderId: z.string().describe("The responder ID to execute"),
      objectType: z
        .enum(["case", "case_task", "case_artifact", "alert"])
        .describe("The type of TheHive entity to act on"),
      objectId: z
        .string()
        .describe("The ID of the entity from TheHive"),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional responder-specific parameters"),
      confirm: z
        .boolean()
        .default(false)
        .describe(
          "Must be set to true to actually run the responder. Defaults to false as a safety guard against accidental side effects.",
        ),
    },
    async ({ responderId, objectType, objectId, parameters, confirm }) => {
      try {
        if (!client.settings.allowDestructive) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Running responders is disabled. Responders cause real-world side effects, so this is gated behind CORTEX_ALLOW_DESTRUCTIVE=1 (set it in the server environment to enable).",
              },
            ],
            isError: true,
          };
        }

        if (!confirm) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Responder NOT run. This is a destructive action (real-world side effects). Re-call with confirm=true to execute responder "${responderId}" against ${objectType} "${objectId}".`,
              },
            ],
            isError: true,
          };
        }

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

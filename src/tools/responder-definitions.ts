import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

export function registerResponderDefinitionTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_list_responder_definitions",
    "List all available responder definitions (installed but not necessarily enabled). Filter by data type or find responders that require no API keys.",
    {
      dataType: z
        .string()
        .optional()
        .describe("Filter by supported data type (case, case_task, case_artifact, alert, etc.)"),
      freeOnly: z
        .boolean()
        .optional()
        .describe("If true, only return responders that require no configuration/API keys"),
      search: z
        .string()
        .optional()
        .describe("Search responder names and descriptions (case-insensitive)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(50)
        .describe("Maximum results to return (default: 50)"),
    },
    async ({ dataType, freeOnly, search, limit }) => {
      try {
        let defs = await client.listResponderDefinitions();

        if (dataType) {
          defs = defs.filter((d) => d.dataTypeList.includes(dataType));
        }

        if (freeOnly) {
          defs = defs.filter(
            (d) => !d.configurationItems.some((c) => c.required),
          );
        }

        if (search) {
          const q = search.toLowerCase();
          defs = defs.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.description.toLowerCase().includes(q),
          );
        }

        const total = defs.length;
        defs = defs.slice(0, limit);

        const summary = defs.map((d) => ({
          id: d.id,
          name: d.name,
          version: d.version,
          description: d.description,
          dataTypes: d.dataTypeList,
          author: d.author,
          requiresConfig: d.configurationItems.some((c) => c.required),
          configFields: d.configurationItems.map((c) => ({
            name: c.name,
            required: c.required,
            type: c.type,
            description: c.description,
          })),
          dockerImage: d.dockerImage,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  total,
                  returned: summary.length,
                  definitions: summary,
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
              text: `Error listing responder definitions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_enable_responder",
    "Enable a responder definition in the current organization. Provide configuration values for any required fields.",
    {
      definitionId: z
        .string()
        .describe("The responder definition ID (e.g., 'Mailer_1_0')"),
      configuration: z
        .record(z.string(), z.unknown())
        .default({})
        .describe("Configuration key-value pairs. Check cortex_list_responder_definitions for required fields."),
      rate: z
        .number()
        .int()
        .min(0)
        .default(100)
        .describe("Rate limit: max executions per rate unit (default: 100)"),
      rateUnit: z
        .enum(["Day", "Hour", "Minute"])
        .default("Day")
        .describe("Rate limit unit (default: Day)"),
    },
    async ({ definitionId, configuration, rate, rateUnit }) => {
      try {
        const responder = await client.enableResponder({
          name: definitionId,
          configuration,
          rate,
          rateUnit,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: responder.id,
                  name: responder.name,
                  version: responder.version,
                  dataTypes: responder.dataTypeList,
                  message: `Responder "${responder.name}" enabled successfully. It can act on: ${responder.dataTypeList.join(", ")}`,
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
              text: `Error enabling responder: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_disable_responder",
    "Disable (remove) an enabled responder from the current organization",
    {
      responderId: z
        .string()
        .describe("The enabled responder's ID (the internal ID from cortex_list_responders, not the definition ID)"),
    },
    async ({ responderId }) => {
      try {
        await client.deleteResponder(responderId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Responder "${responderId}" has been disabled and removed from the organization.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error disabling responder: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

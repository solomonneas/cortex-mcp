import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

export function registerOrganizationTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_list_organizations",
    "List all organizations (requires superadmin API key via CORTEX_SUPERADMIN_KEY)",
    {},
    async () => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Organization management requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const orgs = await client.listOrganizations();
        const summary = orgs.map((o) => ({
          id: o.id,
          name: o.name,
          description: o.description,
          status: o.status,
          createdAt: o.createdAt
            ? new Date(o.createdAt).toISOString()
            : undefined,
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
              text: `Error listing organizations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_get_organization",
    "Get details about a specific organization (requires superadmin API key)",
    {
      orgId: z.string().describe("The organization ID or name"),
    },
    async ({ orgId }) => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Organization management requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const org = await client.getOrganization(orgId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(org, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting organization: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_create_organization",
    "Create a new organization in Cortex (requires superadmin API key)",
    {
      name: z
        .string()
        .describe("Organization name (used as ID, no spaces recommended)"),
      description: z.string().describe("Organization description"),
    },
    async ({ name, description }) => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Organization management requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const org = await client.createOrganization({ name, description });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: org.id,
                  name: org.name,
                  description: org.description,
                  status: org.status,
                  message: `Organization "${org.name}" created successfully.`,
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
              text: `Error creating organization: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_update_organization",
    "Update an organization's description or status (requires superadmin API key)",
    {
      orgId: z.string().describe("The organization ID or name"),
      description: z
        .string()
        .optional()
        .describe("New description for the organization"),
      status: z
        .enum(["Active", "Locked"])
        .optional()
        .describe('New status: "Active" or "Locked"'),
    },
    async ({ orgId, description, status }) => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Organization management requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const updates: Record<string, string> = {};
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;

        if (Object.keys(updates).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No updates provided. Specify at least description or status.",
              },
            ],
            isError: true,
          };
        }

        const org = await client.updateOrganization(orgId, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: org.id,
                  name: org.name,
                  description: org.description,
                  status: org.status,
                  message: `Organization "${org.name}" updated successfully.`,
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
              text: `Error updating organization: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

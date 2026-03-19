import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

export function registerUserTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_list_users",
    "List all users across organizations (requires superadmin API key via CORTEX_SUPERADMIN_KEY)",
    {},
    async () => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "User listing across organizations requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const users = await client.listUsers();
        const summary = users.map((u) => ({
          id: u.id,
          name: u.name,
          organization: u.organization,
          roles: u.roles,
          status: u.status,
          hasKey: u.hasKey,
          hasPassword: u.hasPassword,
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
              text: `Error listing users: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_get_user",
    "Get details about a specific user (requires superadmin API key)",
    {
      userId: z.string().describe("The user login/ID"),
    },
    async ({ userId }) => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "User management requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const user = await client.getUser(userId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_create_user",
    "Create a new user in an organization (requires superadmin API key)",
    {
      login: z.string().describe("User login (used as ID)"),
      name: z.string().describe("User display name"),
      organization: z.string().describe("Organization to assign the user to"),
      roles: z
        .array(z.string())
        .describe(
          'User roles: "read", "analyze", "orgadmin", or "superadmin"',
        ),
      password: z.string().optional().describe("Optional initial password"),
    },
    async ({ login, name, organization, roles, password }) => {
      try {
        if (!client.superadminAvailable) {
          return {
            content: [
              {
                type: "text" as const,
                text: "User creation requires CORTEX_SUPERADMIN_KEY environment variable to be set.",
              },
            ],
            isError: true,
          };
        }

        const user = await client.createUser({
          login,
          name,
          roles,
          organization,
          password,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: user.id,
                  name: user.name,
                  organization: user.organization,
                  roles: user.roles,
                  status: user.status,
                  message: `User "${user.name}" (${user.id}) created in org "${user.organization}".`,
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
              text: `Error creating user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";

const DATA_TYPES = [
  "ip",
  "domain",
  "url",
  "fqdn",
  "hash",
  "mail",
  "filename",
  "registry",
  "regexp",
  "other",
] as const;

export function registerAnalyzerTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_list_analyzers",
    "List all enabled analyzers, optionally filtered by data type",
    {
      dataType: z
        .string()
        .optional()
        .describe(
          "Filter by supported data type (ip, domain, hash, url, file, mail, fqdn, etc.)",
        ),
    },
    async ({ dataType }) => {
      try {
        let analyzers = await client.listAnalyzers();

        if (dataType) {
          analyzers = analyzers.filter((a) =>
            a.dataTypeList.includes(dataType),
          );
        }

        const summary = analyzers.map((a) => ({
          id: a.id,
          name: a.name,
          version: a.version,
          description: a.description,
          dataTypes: a.dataTypeList,
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
              text: `Error listing analyzers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_get_analyzer",
    "Get details about a specific analyzer by ID",
    {
      analyzerId: z.string().describe("The analyzer ID"),
    },
    async ({ analyzerId }) => {
      try {
        const analyzer = await client.getAnalyzer(analyzerId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analyzer, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting analyzer: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_run_analyzer",
    "Submit an observable to a specific analyzer for analysis",
    {
      analyzerId: z.string().describe("The analyzer ID to run"),
      dataType: z.enum(DATA_TYPES).describe("The observable data type"),
      data: z
        .string()
        .describe("The observable value (IP, domain, hash, URL, etc.)"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .describe(
          "Traffic Light Protocol level (0=WHITE, 1=GREEN, 2=AMBER, 3=RED)",
        ),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .describe("Permissible Actions Protocol level (0-3)"),
      message: z
        .string()
        .optional()
        .describe("Optional context message for the analysis"),
    },
    async ({ analyzerId, dataType, data, tlp, pap, message }) => {
      try {
        const job = await client.runAnalyzer(analyzerId, {
          data,
          dataType,
          tlp,
          pap,
          message,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  jobId: job.id,
                  status: job.status,
                  analyzerId: job.analyzerId,
                  message: `Analysis job submitted. Use cortex_get_job or cortex_wait_and_get_report with jobId "${job.id}" to get results.`,
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
              text: `Error running analyzer: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_run_analyzer_by_name",
    "Run an analyzer by name instead of ID (convenience wrapper)",
    {
      analyzerName: z.string().describe("The analyzer name to search for"),
      dataType: z.enum(DATA_TYPES).describe("The observable data type"),
      data: z.string().describe("The observable value"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Traffic Light Protocol level (default: 2/AMBER)"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Permissible Actions Protocol level (default: 2)"),
    },
    async ({ analyzerName, dataType, data, tlp, pap }) => {
      try {
        const analyzers = await client.listAnalyzers();
        const match = analyzers.find(
          (a) =>
            a.name.toLowerCase().includes(analyzerName.toLowerCase()) &&
            a.dataTypeList.includes(dataType),
        );

        if (!match) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No analyzer found matching "${analyzerName}" that supports data type "${dataType}". Use cortex_list_analyzers to see available analyzers.`,
              },
            ],
            isError: true,
          };
        }

        const job = await client.runAnalyzer(match.id, {
          data,
          dataType,
          tlp,
          pap,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  jobId: job.id,
                  status: job.status,
                  analyzerUsed: { id: match.id, name: match.name },
                  message: `Analysis job submitted to "${match.name}". Use cortex_wait_and_get_report with jobId "${job.id}" to get results.`,
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
              text: `Error running analyzer by name: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "cortex_run_analyzer_file",
    "Submit a file to a specific analyzer for analysis. Provide a file path or base64-encoded content.",
    {
      analyzerId: z.string().describe("The analyzer ID to run"),
      filePath: z
        .string()
        .optional()
        .describe("Path to the file to analyze (local filesystem)"),
      fileBase64: z
        .string()
        .optional()
        .describe("Base64-encoded file content (alternative to filePath)"),
      filename: z
        .string()
        .optional()
        .describe("Filename (required with fileBase64, auto-detected from filePath)"),
      contentType: z
        .string()
        .default("application/octet-stream")
        .describe("MIME type of the file (default: application/octet-stream)"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Traffic Light Protocol level (0=WHITE, 1=GREEN, 2=AMBER, 3=RED)"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Permissible Actions Protocol level (0-3)"),
      message: z
        .string()
        .optional()
        .describe("Optional context message for the analysis"),
    },
    async ({ analyzerId, filePath, fileBase64, filename, contentType, tlp, pap, message }) => {
      try {
        let content: Buffer;
        let name: string;

        if (filePath) {
          content = await readFile(filePath);
          name = filename ?? basename(filePath);
        } else if (fileBase64) {
          if (!filename) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "filename is required when using fileBase64.",
                },
              ],
              isError: true,
            };
          }
          content = Buffer.from(fileBase64, "base64");
          name = filename;
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: "Provide either filePath or fileBase64 to submit a file for analysis.",
              },
            ],
            isError: true,
          };
        }

        const job = await client.runAnalyzerWithFile(
          analyzerId,
          { content, filename: name, contentType },
          { tlp, pap, message },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  jobId: job.id,
                  status: job.status,
                  analyzerId: job.analyzerId,
                  filename: name,
                  fileSize: content.length,
                  message: `File analysis job submitted. Use cortex_wait_and_get_report with jobId "${job.id}" to get results.`,
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
              text: `Error running file analysis: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

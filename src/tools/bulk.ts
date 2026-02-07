import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";
import type { JobReport, Taxonomy } from "../types.js";

export function registerBulkTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_analyze_observable",
    "Run ALL applicable analyzers against an observable and collect aggregated results with taxonomy summary",
    {
      dataType: z
        .string()
        .describe("The observable data type (ip, domain, hash, url, etc.)"),
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
      timeout: z
        .number()
        .int()
        .min(1)
        .max(3600)
        .default(300)
        .describe("Timeout in seconds per analyzer (default: 300)"),
    },
    async ({ dataType, data, tlp, pap, timeout }) => {
      try {
        // Step 1: Find all analyzers that support this data type
        const allAnalyzers = await client.listAnalyzers();
        const applicable = allAnalyzers.filter((a) =>
          a.dataTypeList.includes(dataType),
        );

        if (applicable.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No analyzers found that support data type "${dataType}".`,
              },
            ],
          };
        }

        // Step 2: Submit observable to each analyzer
        const submissions = await Promise.allSettled(
          applicable.map(async (analyzer) => {
            const job = await client.runAnalyzer(analyzer.id, {
              data,
              dataType,
              tlp,
              pap,
            });
            return { analyzer: analyzer.name, jobId: job.id };
          }),
        );

        const submitted = submissions
          .filter(
            (r): r is PromiseFulfilledResult<{ analyzer: string; jobId: string }> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        const failed = submissions
          .filter(
            (r): r is PromiseRejectedResult => r.status === "rejected",
          )
          .map((r, i) => ({
            analyzer: applicable[i].name,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          }));

        // Step 3: Wait for all jobs to complete
        const reports = await Promise.allSettled(
          submitted.map(async ({ analyzer, jobId }) => {
            const report = await client.waitAndGetReport(jobId, timeout);
            return { analyzer, report };
          }),
        );

        // Step 4: Aggregate results
        const allTaxonomies: Array<Taxonomy & { analyzer: string }> = [];
        const results: Array<{
          analyzer: string;
          status: string;
          taxonomies: string[];
        }> = [];

        for (const result of reports) {
          if (result.status === "fulfilled") {
            const { analyzer, report } = result.value;
            const taxonomies = report.report?.summary?.taxonomies ?? [];
            taxonomies.forEach((t) =>
              allTaxonomies.push({ ...t, analyzer }),
            );
            results.push({
              analyzer,
              status: report.status,
              taxonomies: taxonomies.map(
                (t) =>
                  `[${t.level}] ${t.namespace}:${t.predicate} = ${t.value}`,
              ),
            });
          } else {
            results.push({
              analyzer:
                submitted[reports.indexOf(result)]?.analyzer ?? "unknown",
              status: "Error",
              taxonomies: [
                `Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
              ],
            });
          }
        }

        // Summary by taxonomy level
        const levelCounts = {
          malicious: allTaxonomies.filter((t) => t.level === "malicious")
            .length,
          suspicious: allTaxonomies.filter((t) => t.level === "suspicious")
            .length,
          info: allTaxonomies.filter((t) => t.level === "info").length,
          safe: allTaxonomies.filter((t) => t.level === "safe").length,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  observable: { dataType, data },
                  analyzersRun: submitted.length,
                  analyzersFailed: failed.length,
                  summary: levelCounts,
                  results,
                  submissionErrors:
                    failed.length > 0 ? failed : undefined,
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
              text: `Error analyzing observable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

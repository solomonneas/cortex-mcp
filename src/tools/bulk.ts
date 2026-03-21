import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CortexClient } from "../client.js";
import type { JobReport, Taxonomy } from "../types.js";

/**
 * Auto-detect the data type of an observable value.
 */
function detectDataType(value: string): string | null {
  const trimmed = value.trim();

  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(trimmed)) return "ip";

  // IPv6 (simplified check)
  if (/^[0-9a-fA-F:]{2,39}(\/\d{1,3})?$/.test(trimmed) && trimmed.includes(":")) return "ip";

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "mail";

  // URL
  if (/^https?:\/\//i.test(trimmed)) return "url";

  // MD5
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return "hash";

  // SHA1
  if (/^[a-fA-F0-9]{40}$/.test(trimmed)) return "hash";

  // SHA256
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return "hash";

  // SHA512
  if (/^[a-fA-F0-9]{128}$/.test(trimmed)) return "hash";

  // CVE
  if (/^CVE-\d{4}-\d{4,}$/i.test(trimmed)) return "other";

  // Domain/FQDN (has dots, no spaces, no protocol)
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(trimmed)) {
    return "domain";
  }

  return null;
}

export function registerBulkTools(
  server: McpServer,
  client: CortexClient,
): void {
  server.tool(
    "cortex_analyze_observable",
    "Run ALL applicable analyzers against an observable and collect aggregated results with taxonomy summary. Can auto-detect data type from the value.",
    {
      data: z.string().describe("The observable value (IP, domain, hash, URL, email, etc.)"),
      dataType: z
        .string()
        .optional()
        .describe("The observable data type. If omitted, will be auto-detected from the value."),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Traffic Light Protocol level (0=WHITE, 1=GREEN, 2=AMBER, 3=RED). Default: 2/AMBER"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(2)
        .describe("Permissible Actions Protocol level (0-3). Default: 2"),
      timeout: z
        .number()
        .int()
        .min(1)
        .max(3600)
        .default(300)
        .describe("Timeout in seconds per analyzer (default: 300)"),
    },
    async ({ data, dataType: explicitType, tlp, pap, timeout }) => {
      try {
        // Auto-detect data type if not provided
        let dataType = explicitType;
        let autoDetected = false;
        if (!dataType) {
          const detected = detectDataType(data);
          if (!detected) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Could not auto-detect data type for "${data}". Please specify dataType explicitly (ip, domain, url, hash, mail, fqdn, filename, registry, other).`,
                },
              ],
              isError: true,
            };
          }
          dataType = detected;
          autoDetected = true;
        }

        // Step 1: Find all analyzers that support this data type
        const allAnalyzers = await client.listAnalyzers();
        const applicable = allAnalyzers.filter((a) =>
          a.dataTypeList.includes(dataType!),
        );

        if (applicable.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    observable: { dataType, data, autoDetected },
                    analyzersRun: 0,
                    message: `No enabled analyzers support data type "${dataType}". Use cortex_list_analyzer_definitions to find analyzers to enable.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Step 2: Submit observable to each analyzer
        const submissions = await Promise.allSettled(
          applicable.map(async (analyzer) => {
            const job = await client.runAnalyzer(analyzer.id, {
              data,
              dataType: dataType!,
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
          malicious: allTaxonomies.filter((t) => t.level === "malicious").length,
          suspicious: allTaxonomies.filter((t) => t.level === "suspicious").length,
          info: allTaxonomies.filter((t) => t.level === "info").length,
          safe: allTaxonomies.filter((t) => t.level === "safe").length,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  observable: { dataType, data, autoDetected },
                  analyzersRun: submitted.length,
                  analyzersFailed: failed.length,
                  summary: levelCounts,
                  results,
                  submissionErrors: failed.length > 0 ? failed : undefined,
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

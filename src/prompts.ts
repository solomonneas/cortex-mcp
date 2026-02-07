import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "analyze-observable",
    "Guided workflow for analyzing an observable through Cortex analyzers",
    {
      observable: z
        .string()
        .describe("The observable value to analyze (IP, domain, hash, URL, etc.)"),
      context: z
        .string()
        .optional()
        .describe("Optional context about where this observable was found"),
    },
    ({ observable, context }) => {
      const contextLine = context
        ? `\nContext: ${context}\n`
        : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyze the following observable using Cortex:

Observable: ${observable}${contextLine}

Please follow these steps:
1. First, determine the data type of this observable (ip, domain, url, hash, mail, fqdn, etc.)
2. Use cortex_list_analyzers to find all analyzers that support this data type
3. Use cortex_analyze_observable to submit it to all applicable analyzers
4. Review the taxonomy results and provide a summary:
   - List any MALICIOUS findings with the analyzer name and details
   - List any SUSPICIOUS findings
   - Summarize INFO and SAFE results
   - Provide an overall risk assessment based on the combined results
5. If any analyzers extracted additional artifacts, list those as potential follow-up IOCs`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "investigate-ioc",
    "Deep investigation workflow for a suspicious indicator of compromise",
    {
      ioc: z.string().describe("The IOC value to investigate"),
      iocType: z
        .string()
        .describe("The IOC type (ip, domain, url, hash, mail, fqdn)"),
    },
    ({ ioc, iocType }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Perform a deep investigation of the following IOC using Cortex:

IOC: ${ioc}
Type: ${iocType}

Investigation steps:
1. Use cortex_analyze_observable to run all applicable analyzers against this IOC
2. For each analyzer result:
   - Note the taxonomy level (malicious/suspicious/info/safe)
   - Record specific findings (detection names, scores, categories)
3. Use cortex_get_job_artifacts on each completed job to find related IOCs
4. Cross-reference findings across analyzers:
   - Do multiple analyzers flag this as malicious?
   - Are there consistent detection patterns?
   - What categories/families are identified?
5. For any extracted artifacts (related IPs, domains, hashes):
   - List them as potential pivot points for further investigation
6. Provide a final assessment:
   - Confidence level (high/medium/low) based on analyzer consensus
   - Recommended response actions
   - Suggested responder actions if applicable (use cortex_list_responders to check)`,
            },
          },
        ],
      };
    },
  );
}

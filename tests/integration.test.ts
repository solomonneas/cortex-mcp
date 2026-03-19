/**
 * Integration tests against a live Cortex instance.
 * Run with: CORTEX_URL=http://... CORTEX_API_KEY=... CORTEX_SUPERADMIN_KEY=... npx vitest run tests/integration.test.ts
 *
 * These tests are skipped when CORTEX_URL is not set.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { CortexClient } from "../src/client.js";
import type { CortexConfig } from "../src/config.js";

const CORTEX_URL = process.env.CORTEX_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;
const CORTEX_SUPERADMIN_KEY = process.env.CORTEX_SUPERADMIN_KEY;

const shouldRun = !!CORTEX_URL && !!CORTEX_API_KEY;

describe.skipIf(!shouldRun)("Integration: Live Cortex Instance", () => {
  let client: CortexClient;
  let superadminClient: CortexClient;

  beforeAll(() => {
    const config: CortexConfig = {
      url: CORTEX_URL!,
      apiKey: CORTEX_API_KEY!,
      superadminKey: CORTEX_SUPERADMIN_KEY,
      verifySsl: false,
      timeout: 30000,
    };
    client = new CortexClient(config);

    const superConfig: CortexConfig = {
      ...config,
      superadminKey: CORTEX_SUPERADMIN_KEY,
    };
    superadminClient = new CortexClient(superConfig);
  });

  describe("Status", () => {
    it("should return Cortex version and health info", async () => {
      const status = await client.getStatus();

      expect(status.versions).toBeDefined();
      expect(status.versions.Cortex).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.config.authType).toContain("key");

      console.log(`Cortex version: ${status.versions.Cortex}`);
      console.log(`Auth types: ${status.config.authType.join(", ")}`);
      console.log(`Capabilities: ${status.config.capabilities.join(", ")}`);
    });
  });

  describe("Analyzers", () => {
    it("should list analyzers (may be empty on fresh install)", async () => {
      const analyzers = await client.listAnalyzers();

      expect(Array.isArray(analyzers)).toBe(true);
      console.log(`Available analyzers: ${analyzers.length}`);

      if (analyzers.length > 0) {
        for (const a of analyzers.slice(0, 5)) {
          console.log(`  - ${a.name} (${a.version}): ${a.dataTypeList.join(", ")}`);
        }
      } else {
        console.log("  No analyzers enabled (fresh install). This is expected.");
      }
    });
  });

  describe("Responders", () => {
    it("should list responders (may be empty on fresh install)", async () => {
      const responders = await client.listResponders();

      expect(Array.isArray(responders)).toBe(true);
      console.log(`Available responders: ${responders.length}`);

      if (responders.length > 0) {
        for (const r of responders.slice(0, 5)) {
          console.log(`  - ${r.name} (${r.version}): ${r.dataTypeList.join(", ")}`);
        }
      } else {
        console.log("  No responders enabled (fresh install). This is expected.");
      }
    });
  });

  describe("Jobs", () => {
    it("should search jobs (may return empty on fresh install)", async () => {
      const jobs = await client.searchJobs({
        query: { _field: "status", _value: "*" },
        range: "0-10",
        sort: ["-createdAt"],
      });

      expect(Array.isArray(jobs)).toBe(true);
      console.log(`Recent jobs: ${jobs.length}`);
    });
  });

  describe.skipIf(!CORTEX_SUPERADMIN_KEY)("Organizations (superadmin)", () => {
    it("should list organizations", async () => {
      const orgs = await superadminClient.listOrganizations();

      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs.length).toBeGreaterThan(0);

      console.log(`Organizations: ${orgs.length}`);
      for (const org of orgs) {
        console.log(`  - ${org.name}: ${org.description} [${org.status}]`);
      }
    });

    it("should get a specific organization", async () => {
      const orgs = await superadminClient.listOrganizations();
      expect(orgs.length).toBeGreaterThan(0);

      const org = await superadminClient.getOrganization(orgs[0].id);
      expect(org.id).toBe(orgs[0].id);
      expect(org.name).toBeDefined();
    });
  });

  describe.skipIf(!CORTEX_SUPERADMIN_KEY)("Users (superadmin)", () => {
    it("should list users", async () => {
      const users = await superadminClient.listUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      console.log(`Users: ${users.length}`);
      for (const user of users) {
        console.log(`  - ${user.id} (${user.name}): ${user.roles.join(", ")} [${user.organization}]`);
      }
    });
  });

  describe("Error handling", () => {
    it("should reject invalid API key", async () => {
      const badConfig: CortexConfig = {
        url: CORTEX_URL!,
        apiKey: "invalid-key-12345",
        verifySsl: false,
        timeout: 10000,
      };
      const badClient = new CortexClient(badConfig);

      await expect(badClient.listAnalyzers()).rejects.toThrow(/unauthorized|forbidden/i);
    });
  });
});

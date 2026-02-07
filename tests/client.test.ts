import { describe, it, expect, vi, beforeEach } from "vitest";
import { CortexClient } from "../src/client.js";
import type { CortexConfig } from "../src/config.js";
import type {
  Analyzer,
  Job,
  JobReport,
  Artifact,
  Responder,
  ActionJob,
} from "../src/types.js";

// Mock data
const mockAnalyzer: Analyzer = {
  id: "VirusTotal_GetReport_3_1",
  name: "VirusTotal_GetReport",
  version: "3.1",
  description: "Get a report from VirusTotal for an observable",
  dataTypeList: ["hash", "ip", "domain", "url"],
};

const mockJob: Job = {
  id: "AWl2d8x1kDx6FO7wxPBn",
  analyzerId: "VirusTotal_GetReport_3_1",
  analyzerName: "VirusTotal_GetReport",
  status: "Success",
  data: "8.8.8.8",
  dataType: "ip",
  tlp: 2,
  pap: 2,
  startDate: 1706745600000,
  endDate: 1706745615000,
  createdAt: 1706745600000,
};

const mockJobReport: JobReport = {
  ...mockJob,
  report: {
    summary: {
      taxonomies: [
        {
          level: "info",
          namespace: "VT",
          predicate: "GetReport",
          value: "0/87",
        },
      ],
    },
    full: {
      positives: 0,
      total: 87,
      scan_date: "2024-01-31",
    },
    success: true,
  },
};

const mockArtifact: Artifact = {
  dataType: "domain",
  data: "dns.google",
  message: "Related domain found",
  tlp: 2,
  tags: ["dns"],
};

const mockResponder: Responder = {
  id: "Mailer_1_0",
  name: "Mailer",
  version: "1.0",
  description: "Send an email notification",
  dataTypeList: ["case", "case_artifact", "alert"],
};

const mockActionJob: ActionJob = {
  id: "action_123",
  responderId: "Mailer_1_0",
  responderName: "Mailer",
  status: "Success",
  objectType: "case_artifact",
  objectId: "artifact_456",
};

const config: CortexConfig = {
  url: "https://cortex.example.com:9001",
  apiKey: "test-api-key-123",
  verifySsl: true,
  timeout: 30000,
};

describe("CortexClient", () => {
  let client: CortexClient;

  beforeEach(() => {
    client = new CortexClient(config);
    vi.restoreAllMocks();
  });

  describe("listAnalyzers", () => {
    it("should fetch all analyzers", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([mockAnalyzer]), { status: 200 }),
      );

      const result = await client.listAnalyzers();

      expect(result).toEqual([mockAnalyzer]);
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/analyzer",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key-123",
          }),
        }),
      );
    });
  });

  describe("getAnalyzer", () => {
    it("should fetch a specific analyzer", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockAnalyzer), { status: 200 }),
      );

      const result = await client.getAnalyzer("VirusTotal_GetReport_3_1");

      expect(result).toEqual(mockAnalyzer);
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/analyzer/VirusTotal_GetReport_3_1",
        expect.anything(),
      );
    });
  });

  describe("runAnalyzer", () => {
    it("should submit an observable for analysis", async () => {
      const submittedJob: Job = { ...mockJob, status: "Waiting" };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(submittedJob), { status: 200 }),
      );

      const result = await client.runAnalyzer("VirusTotal_GetReport_3_1", {
        data: "8.8.8.8",
        dataType: "ip",
        tlp: 2,
        pap: 2,
      });

      expect(result.status).toBe("Waiting");
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/analyzer/VirusTotal_GetReport_3_1/run",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            data: "8.8.8.8",
            dataType: "ip",
            tlp: 2,
            pap: 2,
          }),
        }),
      );
    });

    it("should include optional message in request body", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockJob), { status: 200 }),
      );

      await client.runAnalyzer("VirusTotal_GetReport_3_1", {
        data: "8.8.8.8",
        dataType: "ip",
        tlp: 2,
        pap: 2,
        message: "Check this suspicious IP",
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.message).toBe("Check this suspicious IP");
    });
  });

  describe("getJob", () => {
    it("should fetch job status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockJob), { status: 200 }),
      );

      const result = await client.getJob("AWl2d8x1kDx6FO7wxPBn");

      expect(result.status).toBe("Success");
      expect(result.id).toBe("AWl2d8x1kDx6FO7wxPBn");
    });
  });

  describe("getJobReport", () => {
    it("should fetch full job report with taxonomies", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockJobReport), { status: 200 }),
      );

      const result = await client.getJobReport("AWl2d8x1kDx6FO7wxPBn");

      expect(result.report?.summary?.taxonomies).toHaveLength(1);
      expect(result.report?.summary?.taxonomies?.[0].level).toBe("info");
      expect(result.report?.full).toBeDefined();
    });
  });

  describe("waitAndGetReport", () => {
    it("should call waitreport endpoint with timeout", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockJobReport), { status: 200 }),
      );

      const result = await client.waitAndGetReport("AWl2d8x1kDx6FO7wxPBn", 120);

      expect(result.status).toBe("Success");
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/job/AWl2d8x1kDx6FO7wxPBn/waitreport?atMost=120second",
        expect.anything(),
      );
    });

    it("should use default 300 second timeout", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockJobReport), { status: 200 }),
      );

      await client.waitAndGetReport("AWl2d8x1kDx6FO7wxPBn");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("atMost=300second"),
        expect.anything(),
      );
    });
  });

  describe("searchJobs", () => {
    it("should search jobs with query", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([mockJob]), { status: 200 }),
      );

      const result = await client.searchJobs({
        query: { _field: "dataType", _value: "ip" },
        range: "0-10",
        sort: ["-createdAt"],
      });

      expect(result).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/job/_search",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("getJobArtifacts", () => {
    it("should fetch extracted artifacts", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([mockArtifact]), { status: 200 }),
      );

      const result = await client.getJobArtifacts("AWl2d8x1kDx6FO7wxPBn");

      expect(result).toHaveLength(1);
      expect(result[0].dataType).toBe("domain");
      expect(result[0].data).toBe("dns.google");
    });
  });

  describe("listResponders", () => {
    it("should fetch all responders", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([mockResponder]), { status: 200 }),
      );

      const result = await client.listResponders();

      expect(result).toEqual([mockResponder]);
    });
  });

  describe("runResponder", () => {
    it("should execute a responder action", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockActionJob), { status: 200 }),
      );

      const result = await client.runResponder("Mailer_1_0", {
        objectType: "case_artifact",
        objectId: "artifact_456",
      });

      expect(result.status).toBe("Success");
      expect(fetch).toHaveBeenCalledWith(
        "https://cortex.example.com:9001/api/responder/Mailer_1_0/run",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should throw on 401 unauthorized", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      await expect(client.listAnalyzers()).rejects.toThrow(
        "Invalid API key or unauthorized access",
      );
    });

    it("should throw on 404 not found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Not Found", { status: 404 }),
      );

      await expect(client.getAnalyzer("nonexistent")).rejects.toThrow(
        "Resource not found",
      );
    });

    it("should throw on 500 server error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 }),
      );

      await expect(client.listAnalyzers()).rejects.toThrow(
        "Cortex internal server error",
      );
    });

    it("should throw on 429 rate limit", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Too Many Requests", { status: 429 }),
      );

      await expect(client.listAnalyzers()).rejects.toThrow(
        "Rate limit exceeded",
      );
    });

    it("should include response body in error message", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response('{"message":"analyzer disabled"}', { status: 400 }),
      );

      await expect(client.listAnalyzers()).rejects.toThrow(
        'analyzer disabled',
      );
    });
  });
});

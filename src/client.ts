import type { CortexConfig } from "./config.js";
import type {
  Analyzer,
  Artifact,
  Job,
  JobReport,
  JobSearchQuery,
  Responder,
  ActionJob,
  RunAnalyzerRequest,
  RunResponderRequest,
} from "./types.js";

export class CortexClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(private config: CortexConfig) {
    this.baseUrl = `${config.url}/api`;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
    this.timeout = config.timeout;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const messages: Record<number, string> = {
          401: "Invalid API key or unauthorized access",
          403: "Forbidden - insufficient permissions",
          404: "Resource not found",
          429: "Rate limit exceeded",
          500: "Cortex internal server error",
        };
        const msg =
          messages[response.status] ??
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Cortex API error: ${msg}${body ? ` - ${body}` : ""}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Cortex API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Analyzer methods

  async listAnalyzers(): Promise<Analyzer[]> {
    return this.request<Analyzer[]>("/analyzer");
  }

  async getAnalyzer(analyzerId: string): Promise<Analyzer> {
    return this.request<Analyzer>(`/analyzer/${encodeURIComponent(analyzerId)}`);
  }

  async runAnalyzer(
    analyzerId: string,
    data: RunAnalyzerRequest,
  ): Promise<Job> {
    return this.request<Job>(
      `/analyzer/${encodeURIComponent(analyzerId)}/run`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  // Job methods

  async getJob(jobId: string): Promise<Job> {
    return this.request<Job>(`/job/${encodeURIComponent(jobId)}`);
  }

  async getJobReport(jobId: string): Promise<JobReport> {
    return this.request<JobReport>(
      `/job/${encodeURIComponent(jobId)}/report`,
    );
  }

  async waitAndGetReport(
    jobId: string,
    timeoutSeconds: number = 300,
  ): Promise<JobReport> {
    return this.request<JobReport>(
      `/job/${encodeURIComponent(jobId)}/waitreport?atMost=${timeoutSeconds}second`,
    );
  }

  async searchJobs(query: JobSearchQuery): Promise<Job[]> {
    return this.request<Job[]>("/job/_search", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  async getJobArtifacts(jobId: string): Promise<Artifact[]> {
    return this.request<Artifact[]>(
      `/job/${encodeURIComponent(jobId)}/artifacts`,
    );
  }

  // Responder methods

  async listResponders(): Promise<Responder[]> {
    return this.request<Responder[]>("/responder");
  }

  async runResponder(
    responderId: string,
    data: RunResponderRequest,
  ): Promise<ActionJob> {
    return this.request<ActionJob>(
      `/responder/${encodeURIComponent(responderId)}/run`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }
}

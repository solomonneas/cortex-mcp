import type { CortexConfig } from "./config.js";
import type {
  Analyzer,
  AnalyzerDefinition,
  Artifact,
  Job,
  JobReport,
  JobSearchQuery,
  Responder,
  ResponderDefinition,
  ActionJob,
  RunAnalyzerRequest,
  RunResponderRequest,
  EnableWorkerRequest,
  CortexStatus,
  Organization,
  CortexUser,
} from "./types.js";

export class CortexClient {
  private baseUrl: string;
  private timeout: number;

  constructor(private config: CortexConfig) {
    this.baseUrl = `${config.url}/api`;
    this.timeout = config.timeout;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    useSuperadmin = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const authKey = useSuperadmin
      ? (this.config.superadminKey ?? this.config.apiKey)
      : this.config.apiKey;

    // Cortex (Play Framework) rejects Content-Type: application/json on GET
    // requests with no body. Only include it when there's a request body.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${authKey}`,
    };
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
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

      // Some DELETE endpoints return empty body
      const text = await response.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Cortex API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Raw text request for endpoints that return plain text (e.g. key renewal)
  private async requestText(
    path: string,
    options: RequestInit = {},
    useSuperadmin = false,
  ): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const authKey = useSuperadmin
      ? (this.config.superadminKey ?? this.config.apiKey)
      : this.config.apiKey;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${authKey}`,
    };
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Cortex API error: HTTP ${response.status}${body ? ` - ${body}` : ""}`);
      }

      return response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Cortex API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Status ──

  async getStatus(): Promise<CortexStatus> {
    return this.request<CortexStatus>("/status");
  }

  // ── Analyzer methods ──

  async listAnalyzers(): Promise<Analyzer[]> {
    return this.request<Analyzer[]>("/analyzer");
  }

  async getAnalyzer(analyzerId: string): Promise<Analyzer> {
    return this.request<Analyzer>(`/analyzer/${encodeURIComponent(analyzerId)}`);
  }

  async deleteAnalyzer(analyzerId: string): Promise<void> {
    await this.request<void>(
      `/analyzer/${encodeURIComponent(analyzerId)}`,
      { method: "DELETE" },
    );
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

  // ── Analyzer Definition methods ──

  async listAnalyzerDefinitions(): Promise<AnalyzerDefinition[]> {
    return this.request<AnalyzerDefinition[]>("/analyzerdefinition", {}, true);
  }

  async getAnalyzerDefinition(defId: string): Promise<AnalyzerDefinition> {
    return this.request<AnalyzerDefinition>(
      `/analyzerdefinition/${encodeURIComponent(defId)}`,
      {},
      true,
    );
  }

  async enableAnalyzer(data: EnableWorkerRequest): Promise<Analyzer> {
    return this.request<Analyzer>(
      `/organization/analyzer/${encodeURIComponent(data.name)}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          configuration: data.configuration,
          rate: data.rate ?? 100,
          rateUnit: data.rateUnit ?? "Day",
          jobCache: data.jobCache ?? 10,
        }),
      },
    );
  }

  // ── Responder Definition methods ──

  async listResponderDefinitions(): Promise<ResponderDefinition[]> {
    return this.request<ResponderDefinition[]>("/responderdefinition", {}, true);
  }

  async enableResponder(data: EnableWorkerRequest): Promise<Responder> {
    return this.request<Responder>(
      `/organization/responder/${encodeURIComponent(data.name)}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          configuration: data.configuration,
          rate: data.rate ?? 100,
          rateUnit: data.rateUnit ?? "Day",
        }),
      },
    );
  }

  async deleteResponder(responderId: string): Promise<void> {
    await this.request<void>(
      `/responder/${encodeURIComponent(responderId)}`,
      { method: "DELETE" },
    );
  }

  // ── Job methods ──

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

  async deleteJob(jobId: string): Promise<void> {
    await this.request<void>(
      `/job/${encodeURIComponent(jobId)}`,
      { method: "DELETE" },
    );
  }

  // ── Responder methods ──

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

  // ── Organization methods (superadmin) ──

  get superadminAvailable(): boolean {
    return !!this.config.superadminKey;
  }

  async listOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>("/organization", {}, true);
  }

  async getOrganization(orgId: string): Promise<Organization> {
    return this.request<Organization>(
      `/organization/${encodeURIComponent(orgId)}`,
      {},
      true,
    );
  }

  async createOrganization(data: {
    name: string;
    description: string;
    status?: string;
  }): Promise<Organization> {
    return this.request<Organization>(
      "/organization",
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          status: data.status ?? "Active",
        }),
      },
      true,
    );
  }

  async updateOrganization(
    orgId: string,
    data: { description?: string; status?: string },
  ): Promise<Organization> {
    return this.request<Organization>(
      `/organization/${encodeURIComponent(orgId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  // ── User methods (superadmin for cross-org, org admin for own org) ──

  async listUsers(): Promise<CortexUser[]> {
    return this.request<CortexUser[]>("/user", {}, true);
  }

  async getUser(userId: string): Promise<CortexUser> {
    return this.request<CortexUser>(
      `/user/${encodeURIComponent(userId)}`,
      {},
      true,
    );
  }

  async createUser(data: {
    login: string;
    name: string;
    roles: string[];
    organization: string;
    password?: string;
  }): Promise<CortexUser> {
    return this.request<CortexUser>(
      "/user",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true,
    );
  }

  async renewUserKey(userId: string): Promise<string> {
    return this.requestText(
      `/user/${encodeURIComponent(userId)}/key/renew`,
      { method: "POST" },
      true,
    );
  }

  async getUserKey(userId: string): Promise<string> {
    return this.requestText(
      `/user/${encodeURIComponent(userId)}/key`,
      {},
      true,
    );
  }
}

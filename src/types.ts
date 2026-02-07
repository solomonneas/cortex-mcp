export interface Analyzer {
  id: string;
  name: string;
  version: string;
  description: string;
  dataTypeList: string[];
  cortexIds?: string[];
  rate?: number;
  rateUnit?: string;
  maxTlp?: number;
  maxPap?: number;
  createdBy?: string;
  createdAt?: number;
  updatedBy?: string;
  updatedAt?: number;
}

export interface Job {
  id: string;
  analyzerId?: string;
  analyzerName?: string;
  analyzerDefinition?: string;
  status: "Waiting" | "InProgress" | "Success" | "Failure" | "Deleted";
  data?: string;
  dataType?: string;
  tlp?: number;
  pap?: number;
  message?: string;
  startDate?: number;
  endDate?: number;
  createdAt?: number;
  createdBy?: string;
  organization?: string;
  parameters?: string;
}

export interface Taxonomy {
  level: "info" | "safe" | "suspicious" | "malicious";
  namespace: string;
  predicate: string;
  value: string;
}

export interface ReportSummary {
  taxonomies?: Taxonomy[];
}

export interface JobReport extends Job {
  report?: {
    summary?: ReportSummary;
    full?: Record<string, unknown>;
    success?: boolean;
    artifacts?: Artifact[];
  };
}

export interface Artifact {
  dataType: string;
  data?: string;
  message?: string;
  tlp?: number;
  tags?: string[];
  createdAt?: number;
  createdBy?: string;
}

export interface Responder {
  id: string;
  name: string;
  version: string;
  description: string;
  dataTypeList: string[];
  maxTlp?: number;
  maxPap?: number;
  cortexIds?: string[];
}

export interface ActionJob {
  id: string;
  responderId: string;
  responderName?: string;
  responderDefinition?: string;
  status: "Waiting" | "InProgress" | "Success" | "Failure" | "Deleted";
  objectType?: string;
  objectId?: string;
  startDate?: number;
  endDate?: number;
  operations?: string;
}

export interface RunAnalyzerRequest {
  data: string;
  dataType: string;
  tlp: number;
  pap: number;
  message?: string;
}

export interface RunResponderRequest {
  objectType: string;
  objectId: string;
  parameters?: Record<string, unknown>;
}

export interface JobSearchQuery {
  query?: Record<string, unknown>;
  range?: string;
  sort?: string[];
}

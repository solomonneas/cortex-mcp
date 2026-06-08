export interface CortexConfig {
  url: string;
  apiKey: string;
  superadminKey?: string;
  verifySsl: boolean;
  timeout: number;
  /**
   * Absolute base directory that `cortex_run_analyzer_file` is confined to when
   * reading files from `filePath`. Undefined disables filesystem file reads
   * entirely (base64 submission still works).
   */
  fileBaseDir?: string;
  /**
   * When true, destructive tools (run responder, delete job, disable analyzer)
   * are permitted. Defaults to false (secure). Set CORTEX_ALLOW_DESTRUCTIVE=1.
   */
  allowDestructive: boolean;
  /**
   * Maximum number of analyzers `cortex_analyze_observable` may fan out to in a
   * single call. Defaults to 10.
   */
  maxFanout: number;
}

export function getConfig(): CortexConfig {
  const url = process.env.CORTEX_URL;
  if (!url) {
    throw new Error("CORTEX_URL environment variable is required");
  }

  const apiKey = process.env.CORTEX_API_KEY;
  if (!apiKey) {
    throw new Error("CORTEX_API_KEY environment variable is required");
  }

  const superadminKey = process.env.CORTEX_SUPERADMIN_KEY || undefined;
  const verifySsl = process.env.CORTEX_VERIFY_SSL !== "false";
  const timeout = parseInt(process.env.CORTEX_TIMEOUT ?? "30", 10) * 1000;

  const fileBaseDirRaw = process.env.CORTEX_FILE_BASE_DIR?.trim();
  const fileBaseDir =
    fileBaseDirRaw && fileBaseDirRaw.length > 0 ? fileBaseDirRaw : undefined;

  const allowDestructive =
    process.env.CORTEX_ALLOW_DESTRUCTIVE === "1" ||
    process.env.CORTEX_ALLOW_DESTRUCTIVE === "true";

  const maxFanoutRaw = parseInt(process.env.CORTEX_MAX_FANOUT ?? "10", 10);
  const maxFanout =
    Number.isFinite(maxFanoutRaw) && maxFanoutRaw > 0 ? maxFanoutRaw : 10;

  return {
    url: url.replace(/\/+$/, ""),
    apiKey,
    superadminKey,
    verifySsl,
    timeout,
    fileBaseDir,
    allowDestructive,
    maxFanout,
  };
}

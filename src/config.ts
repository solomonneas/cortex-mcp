export interface CortexConfig {
  url: string;
  apiKey: string;
  verifySsl: boolean;
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

  const verifySsl = process.env.CORTEX_VERIFY_SSL !== "false";

  return {
    url: url.replace(/\/+$/, ""),
    apiKey,
    verifySsl,
  };
}

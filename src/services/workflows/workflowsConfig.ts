/** Prototype org id (matches sample data). Hackathon default is 12345. */
export const WORKFLOWS_ORG_ID = Number(
  import.meta.env.VITE_WORKFLOWS_ORG_ID ?? "100200",
);

export type WorkflowDataMode = "live" | "mock" | "auto";

export function getConfiguredDataMode(): WorkflowDataMode {
  const raw = import.meta.env.VITE_WORKFLOW_DATA_MODE ?? "auto";
  if (raw === "live" || raw === "mock" || raw === "auto") return raw;
  return "auto";
}

export function getRcWorkflowsBaseUrl(): string {
  return import.meta.env.VITE_WORKFLOWS_API_BASE_URL ?? "http://localhost:3000";
}

export function getRcWorkflowsBearer(): string {
  return import.meta.env.VITE_WORKFLOWS_BEARER ?? "dev-token";
}

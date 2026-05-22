import type { WorkflowTemplateDefinition } from "../../features/workflowManagement/types.js";
import { getRcWorkflowsBaseUrl, getRcWorkflowsBearer, WORKFLOWS_ORG_ID } from "./workflowsConfig.js";

export interface CreateTemplatePayload {
  name: string;
  service: string;
  version: number;
  definition: WorkflowTemplateDefinition;
}

export interface CreatedTemplateResult {
  id: number;
  version: number;
  name: string;
  service: string;
  definition: WorkflowTemplateDefinition;
}

export async function isRcWorkflowsReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${getRcWorkflowsBaseUrl()}/doc`, { method: "GET", signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createWorkflowTemplate(payload: CreateTemplatePayload): Promise<CreatedTemplateResult> {
  const res = await fetch(`${getRcWorkflowsBaseUrl()}/v1/orgs/${WORKFLOWS_ORG_ID}/workflow_templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getRcWorkflowsBearer()}` },
    body: JSON.stringify({ data: { type: "workflow_templates", attributes: payload } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`rc-workflows POST failed: ${res.status} ${text}`);
  }
  type Attrs = Partial<CreatedTemplateResult> & { version?: number | string };
  const json = (await res.json()) as { id?: string | number; attributes?: Attrs; data?: { id?: string | number; attributes?: Attrs } };
  let resourceId: string | number | undefined;
  let attrs: Attrs | undefined;
  if (json.attributes) { resourceId = json.id; attrs = json.attributes; }
  else if (json.data?.attributes) { resourceId = json.data.id; attrs = json.data.attributes; }
  const result: Partial<CreatedTemplateResult> = attrs ? { ...attrs, id: Number(resourceId), version: Number(attrs.version) } : (json as Partial<CreatedTemplateResult>);
  if (!Number.isFinite(result.id) || !Number.isFinite(result.version) || !result.definition || !result.name || !result.service) {
    throw new Error("rc-workflows returned an unexpected response shape");
  }
  return result as CreatedTemplateResult;
}

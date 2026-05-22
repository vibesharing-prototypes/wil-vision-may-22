/** Maps Object Library objectType to workflow template key + WF consumer service. */

export interface ObjectWorkflowBinding {
  templateKey: string;
  service: string;
  displayName: string;
}

export const OBJECT_WORKFLOW_BINDINGS: Record<string, ObjectWorkflowBinding> = {
  risk: {
    templateKey: "risk",
    service: "risk-manager",
    displayName: "Risk lifecycle",
  },
  findings: {
    templateKey: "findings",
    service: "audit-findings",
    displayName: "Audit finding workflow",
  },
};

export function getBindingForObjectType(
  objectType: string | undefined,
): ObjectWorkflowBinding | null {
  if (!objectType) return null;
  return OBJECT_WORKFLOW_BINDINGS[objectType] ?? null;
}

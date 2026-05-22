import type { WorkflowInstance } from "./types.js";

/**
 * Counts instances still in progress for a template (terminal "done" state excluded).
 * Used to decide whether a template can be removed from the prototype catalog.
 */
export function countActiveWorkflowInstances(
  instances: WorkflowInstance[],
  workflowTemplateId: string,
): number {
  return instances.filter(
    (i) => i.workflow_templates_id === workflowTemplateId && i.state !== "done",
  ).length;
}

import type { WorkflowTemplate } from "./types.js";

/** Number of FSM states in the API-shaped template definition. */
export function countDefinitionStates(template: WorkflowTemplate): number {
  return Object.keys(template.definition.states ?? {}).length;
}

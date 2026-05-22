import type { WorkflowTemplate, WorkflowTemplateDefinition } from "./types.js";
import { WORKFLOWS_ORG_ID } from "../../services/workflows/workflowsConfig.js";

/** Audit finding FSM from hackathon seed-template.ts (simplified positions). */
export const AUDIT_FINDING_DEFINITION: WorkflowTemplateDefinition = {
  initial: "draft",
  states: {
    draft: {
      on: {
        submit: { target: "in_review" },
        discard: { target: "discarded" },
      },
    },
    in_review: {
      on: {
        approve: { target: "to_be_published" },
        decline: { target: "draft" },
        discard: { target: "discarded" },
      },
    },
    to_be_published: {
      on: { publish: { target: "pending_acceptance" } },
    },
    pending_acceptance: {
      on: { accept: { target: "remediation_planning" } },
    },
    remediation_planning: {
      on: { initiate: { target: "in_remediation" } },
    },
    in_remediation: {
      on: { complete: { target: "to_be_approved" } },
    },
    to_be_approved: {
      on: { approve_close: { target: "closed" } },
    },
    closed: {},
    discarded: {},
  },
};

export const AUDIT_FINDING_TEMPLATE: WorkflowTemplate = {
  id: "wft-audit-findings-001",
  name: "Audit Finding Workflow",
  version: 1,
  service: "audit-findings",
  org_id: WORKFLOWS_ORG_ID,
  created_at: "2026-04-01T09:00:00Z",
  latest: true,
  definition: AUDIT_FINDING_DEFINITION,
};

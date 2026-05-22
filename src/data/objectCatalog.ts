import type { AttributeDefinition, ObjectSchema } from "../types/attribute.js";
import type { AuditLogEntry } from "../features/schemaManagement/types.js";
import {
  riskSchema,
  initialCustomAttributes,
  initialAuditLog,
} from "../features/schemaViewer/sampleData.js";

/**
 * Risk Manager Object Library catalog.
 *
 * Object set sourced from Risk Manager domain modeling and the Object Library
 * integration documentation:
 *  - Risks (owned by Risk Manager)
 *  - Controls (shared with Audit)
 *  - Processes (shared with Audit)
 *  - Objectives (Risk Manager only)
 *  - Risk event assessments (child of Risk)
 *  - Risk mitigation plans (child of Risk)
 *  - Control assessments (owned by Internal Controls; Risk Manager consumes)
 *  - Key risk indicators / KRIs (future object type in Object Library)
 *
 * Only `risk` carries rich sample data — the others render schema management
 * in its empty state. In production all schemas would come from the Object
 * Library API.
 */

export const controlSchema: ObjectSchema = {
  objectType: "control",
  objectName: "Control",
  objectDescription:
    "A safeguard, procedure, or mechanism designed to reduce the likelihood or impact of risks. Shared between Risk Manager and Audit.",
  attributes: [],
  sections: [],
};

export const processSchema: ObjectSchema = {
  objectType: "process",
  objectName: "Process",
  objectDescription:
    "A structured sequence of activities the organization follows to achieve a defined outcome. Shared between Risk Manager and Audit.",
  attributes: [],
  sections: [],
};

export const objectiveSchema: ObjectSchema = {
  objectType: "objective",
  objectName: "Objective",
  objectDescription:
    "A measurable goal the organization is pursuing. Risks are assessed against the objectives they may threaten or support.",
  attributes: [],
  sections: [],
};

export const riskEventAssessmentSchema: ObjectSchema = {
  objectType: "risk_event_assessment",
  objectName: "Risk event assessment",
  objectDescription:
    "Periodic assessment of a specific risk event — its likelihood, impact, and the effectiveness of associated controls. A child of Risk.",
  attributes: [],
  sections: [],
};

export const riskMitigationPlanSchema: ObjectSchema = {
  objectType: "risk_mitigation_plan",
  objectName: "Risk mitigation plan",
  objectDescription:
    "Planned actions, owners, and target dates for reducing a risk to an acceptable level. A child of Risk.",
  attributes: [],
  sections: [],
};

export const controlAssessmentSchema: ObjectSchema = {
  objectType: "control_assessment",
  objectName: "Control assessment",
  objectDescription:
    "Evaluation of whether a control is designed and operating effectively. Ownership is shifting toward Internal Controls; Risk Manager consumes these records for risk context.",
  attributes: [],
  sections: [],
};

export const findingsSchema: ObjectSchema = {
  objectType: "findings",
  objectName: "Audit findings",
  objectDescription:
    "Issues and audit findings tracked through remediation. Workflow uses consumer service audit-findings.",
  attributes: [],
  sections: [],
};

export const keyRiskIndicatorSchema: ObjectSchema = {
  objectType: "key_risk_indicator",
  objectName: "Key risk indicator (KRI)",
  objectDescription:
    "A measurable signal that risk exposure may be changing. Planned as a first-class Object Library type managed by Risk Manager; prototype shows placement ahead of full delivery.",
  attributes: [],
  sections: [],
};

/** Ordered list of all object types shown in the Object Library. */
export const OBJECT_CATALOG: ObjectSchema[] = [
  riskSchema,
  findingsSchema,
  controlSchema,
  processSchema,
  objectiveSchema,
  riskEventAssessmentSchema,
  riskMitigationPlanSchema,
  controlAssessmentSchema,
  keyRiskIndicatorSchema,
];

/** Fast lookup by objectType key. */
export const OBJECT_CATALOG_MAP: Record<string, ObjectSchema> =
  Object.fromEntries(OBJECT_CATALOG.map((s) => [s.objectType, s]));

/**
 * Prototype-only mock record counts shown on the Object Library cards.
 * In production these would come from the host app's API.
 */
export const MOCK_RECORD_COUNTS: Record<string, number> = {
  risk: 142,
  findings: 56,
  control: 318,
  process: 47,
  objective: 23,
  risk_event_assessment: 86,
  risk_mitigation_plan: 64,
  control_assessment: 205,
  key_risk_indicator: 12,
};

/** Initial custom attributes keyed by objectType. Only Risk has sample data. */
export const INITIAL_CUSTOM_ATTRIBUTES_BY_TYPE: Record<
  string,
  AttributeDefinition[]
> = {
  risk: initialCustomAttributes,
};

/** Initial audit log entries keyed by objectType. Only Risk has sample data. */
export const INITIAL_AUDIT_LOG_BY_TYPE: Record<string, AuditLogEntry[]> = {
  risk: initialAuditLog,
};

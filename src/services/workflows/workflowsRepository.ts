import type { WorkflowGraphLayout } from "../../features/workflowManagement/draftTypes.js";
import type { WorkflowTemplate, WorkflowTemplateDefinition } from "../../features/workflowManagement/types.js";
import type { WorkflowInstance } from "../../features/workflowManagement/types.js";
import {
  AUDIT_FINDING_TEMPLATE,
} from "../../features/workflowManagement/auditFindingTemplate.js";
import {
  ISSUE_TRIAGE_TEMPLATE,
  MOCK_WORKFLOW_TEMPLATES_INITIAL,
  RISK_LIFECYCLE_INSTANCES,
  RISK_LIFECYCLE_TEMPLATE,
} from "../../features/workflowManagement/sampleData.js";
import { getConfiguredDataMode, WORKFLOWS_ORG_ID } from "./workflowsConfig.js";
import { createWorkflowTemplate, isRcWorkflowsReachable } from "./rcWorkflowsClient.js";
import { getResolvedDataSource, resolveDataSource } from "./dataSource.js";
import {
  deleteDraft,
  getDraft,
  getLatestMirror,
  insertMirror,
  listLatestMirrors,
  removeMirrorsByTemplateId,
  saveDraft,
  seedMirrorIfEmpty,
  type DraftRow,
  type MirrorRow,
} from "./templateMirror.js";

export type { ResolvedDataSource } from "./dataSource.js";

export interface SaveDraftInput {
  templateKey: string;
  name: string;
  service: string;
  definition: WorkflowTemplateDefinition;
  basedOnVersion: number | null;
  graphLayout?: WorkflowGraphLayout;
}


function templateKeyForTemplate(t: WorkflowTemplate): string {
  if (t.service === "audit-findings") return "findings";
  if (t.id === ISSUE_TRIAGE_TEMPLATE.id) return "issue-triage";
  return "risk";
}

function mirrorToTemplate(row: MirrorRow): WorkflowTemplate {
  return {
    id: row.templateId,
    name: row.name,
    version: row.version,
    service: row.service,
    org_id: WORKFLOWS_ORG_ID,
    created_at: row.createdAt,
    latest: true,
    definition: row.definition,
  };
}

function seedInitialMirrors(): void {
  const rows: MirrorRow[] = [
    ...MOCK_WORKFLOW_TEMPLATES_INITIAL,
    AUDIT_FINDING_TEMPLATE,
  ].map((t) => ({
    templateKey: templateKeyForTemplate(t),
    templateId: t.id,
    version: t.version,
    name: t.name,
    service: t.service,
    definition: t.definition,
    createdAt: t.created_at,
  }));
  seedMirrorIfEmpty(rows);
}

export async function ensureWorkflowsDataSource(): Promise<"live" | "demo"> {
  seedInitialMirrors();
  return resolveDataSource(isRcWorkflowsReachable, getConfiguredDataMode());
}

export function listTemplatesFromStore(): WorkflowTemplate[] {
  seedInitialMirrors();
  const source = getResolvedDataSource();
  if (source === "demo") {
    return [...MOCK_WORKFLOW_TEMPLATES_INITIAL, AUDIT_FINDING_TEMPLATE];
  }
  return listLatestMirrors().map(mirrorToTemplate);
}

export function getTemplateById(templateId: string): WorkflowTemplate | null {
  return listTemplatesFromStore().find((t) => t.id === templateId) ?? null;
}

export function listInstancesForTemplate(templateId: string): WorkflowInstance[] {
  return RISK_LIFECYCLE_INSTANCES.filter((i) => i.workflow_templates_id === templateId);
}

export function listAllInstances(): WorkflowInstance[] {
  return RISK_LIFECYCLE_INSTANCES;
}

export function saveTemplateDraft(input: SaveDraftInput): void {
  const row: DraftRow = {
    templateKey: input.templateKey,
    name: input.name,
    service: input.service,
    basedOnVersion: input.basedOnVersion,
    definition: input.definition,
    graphLayout: input.graphLayout,
    updatedAt: new Date().toISOString(),
  };
  saveDraft(row);
}

export function getTemplateDraft(templateKey: string): DraftRow | null {
  return getDraft(templateKey);
}

export function discardTemplateDraft(templateKey: string): void {
  deleteDraft(templateKey);
}

export async function publishTemplate(input: SaveDraftInput): Promise<WorkflowTemplate> {
  const latest = getLatestMirror(input.templateKey);
  const nextVersion = (latest?.version ?? 0) + 1;
  const source = await ensureWorkflowsDataSource();

  if (source === "live") {
    try {
      const created = await createWorkflowTemplate({
        name: input.name,
        service: input.service,
        version: nextVersion,
        definition: input.definition,
      });
      const templateId = `${input.templateKey}-${created.id}`;
      const row: MirrorRow = {
        templateKey: input.templateKey,
        templateId,
        version: created.version,
        name: created.name,
        service: created.service,
        definition: input.definition,
        graphLayout: input.graphLayout,
        createdAt: new Date().toISOString(),
      };
      insertMirror(row);
      deleteDraft(input.templateKey);
      return mirrorToTemplate(row);
    } catch (err) {
      throw err;
    }
  }

  const templateId = `local-${input.templateKey}-${nextVersion}`;
  const row: MirrorRow = {
    templateKey: input.templateKey,
    templateId,
    version: nextVersion,
    name: input.name,
    service: input.service,
    definition: input.definition,
    graphLayout: input.graphLayout,
    createdAt: new Date().toISOString(),
  };
  insertMirror(row);
  deleteDraft(input.templateKey);
  return mirrorToTemplate(row);
}

export function deleteTemplateFromStore(templateId: string): void {
  removeMirrorsByTemplateId(templateId);
}

export function getLatestTemplateForKey(templateKey: string): WorkflowTemplate | null {
  const mirror = getLatestMirror(templateKey);
  if (mirror) return mirrorToTemplate(mirror);
  if (templateKey === "risk") return RISK_LIFECYCLE_TEMPLATE;
  if (templateKey === "findings") return AUDIT_FINDING_TEMPLATE;
  return null;
}

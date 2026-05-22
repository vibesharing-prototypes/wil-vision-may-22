import type { WorkflowGraphLayout } from "../../features/workflowManagement/draftTypes.js";
import type { WorkflowTemplateDefinition } from "../../features/workflowManagement/types.js";
import { WORKFLOWS_ORG_ID } from "./workflowsConfig.js";

const STORAGE_KEY = `workflows-mirror-v1-org-${WORKFLOWS_ORG_ID}`;

export interface MirrorRow {
  templateKey: string;
  templateId: string;
  version: number;
  name: string;
  service: string;
  definition: WorkflowTemplateDefinition;
  /** Prototype-only React Flow node positions keyed by state name. */
  graphLayout?: WorkflowGraphLayout;
  createdAt: string;
}

export interface DraftRow {
  templateKey: string;
  name: string;
  service: string;
  basedOnVersion: number | null;
  definition: WorkflowTemplateDefinition;
  /** Prototype-only React Flow node positions keyed by state name. */
  graphLayout?: WorkflowGraphLayout;
  updatedAt: string;
}

interface MirrorStore {
  mirrors: MirrorRow[];
  drafts: DraftRow[];
}

function loadStore(): MirrorStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mirrors: [], drafts: [] };
    return JSON.parse(raw) as MirrorStore;
  } catch {
    return { mirrors: [], drafts: [] };
  }
}

function saveStore(store: MirrorStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function seedMirrorIfEmpty(rows: MirrorRow[]): void {
  const store = loadStore();
  if (store.mirrors.length > 0) return;
  store.mirrors = rows;
  saveStore(store);
}

export function listLatestMirrors(): MirrorRow[] {
  const byKey = new Map<string, MirrorRow>();
  for (const row of loadStore().mirrors) {
    const prev = byKey.get(row.templateKey);
    if (!prev || row.version > prev.version) byKey.set(row.templateKey, row);
  }
  return [...byKey.values()];
}

export function getLatestMirror(templateKey: string): MirrorRow | null {
  const rows = loadStore()
    .mirrors.filter((m) => m.templateKey === templateKey)
    .sort((a, b) => b.version - a.version);
  return rows[0] ?? null;
}

export function insertMirror(row: MirrorRow): void {
  const store = loadStore();
  store.mirrors.push(row);
  saveStore(store);
}

export function removeMirrorsByTemplateId(templateId: string): void {
  const store = loadStore();
  store.mirrors = store.mirrors.filter((m) => m.templateId !== templateId);
  saveStore(store);
}

export function getDraft(templateKey: string): DraftRow | null {
  return loadStore().drafts.find((d) => d.templateKey === templateKey) ?? null;
}

export function saveDraft(row: DraftRow): void {
  const store = loadStore();
  const idx = store.drafts.findIndex((d) => d.templateKey === row.templateKey);
  if (idx >= 0) store.drafts[idx] = row;
  else store.drafts.push(row);
  saveStore(store);
}

export function deleteDraft(templateKey: string): void {
  const store = loadStore();
  store.drafts = store.drafts.filter((d) => d.templateKey !== templateKey);
  saveStore(store);
}

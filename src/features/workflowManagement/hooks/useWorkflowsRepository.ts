import { useCallback, useEffect, useState } from "react";
import type { WorkflowInstance, WorkflowTemplate } from "../types.js";
import {
  ensureWorkflowsDataSource,
  listAllInstances,
  listTemplatesFromStore,
  shouldShowFallbackNotice,
  type ResolvedDataSource,
} from "../../../services/workflows/index.js";

export interface UseWorkflowsRepositoryResult {
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];
  dataSource: ResolvedDataSource | null;
  loading: boolean;
  showFallbackNotice: boolean;
  refresh: () => void;
}

export function useWorkflowsRepository(): UseWorkflowsRepositoryResult {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [dataSource, setDataSource] = useState<ResolvedDataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);

  const refresh = useCallback(() => {
    setTemplates(listTemplatesFromStore());
    setInstances(listAllInstances());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const source = await ensureWorkflowsDataSource();
      if (cancelled) return;
      setDataSource(source);
      setTemplates(listTemplatesFromStore());
      setInstances(listAllInstances());
      setShowFallbackNotice(shouldShowFallbackNotice());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return {
    templates,
    instances,
    dataSource,
    loading,
    showFallbackNotice,
    refresh,
  };
}

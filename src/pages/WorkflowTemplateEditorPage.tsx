import type { FC } from "react";
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PageHeader } from "@diligentcorp/atlas-react-bundle";
import ArrowLeftIcon from "@diligentcorp/atlas-react-bundle/icons/ArrowLeft";
import MoreIcon from "@diligentcorp/atlas-react-bundle/icons/More";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import PageLayout from "../components/PageLayout.js";
import WorkflowGraphCanvas, {
  WORKFLOW_GRAPH_STATE_NODE_MIN_HEIGHT,
  WORKFLOW_GRAPH_STATE_NODE_WIDTH,
} from "../features/workflowManagement/WorkflowGraphCanvas.js";
import WorkflowInstanceTable from "../features/workflowManagement/WorkflowInstanceTable.js";
import WorkflowStateSheet from "../features/workflowManagement/WorkflowStateSheet.js";
import WorkflowTransitionSheet from "../features/workflowManagement/WorkflowTransitionSheet.js";
import { useWorkflowTemplateEditor } from "../features/workflowManagement/useWorkflowTemplateEditor.js";
import { countActiveWorkflowInstances } from "../features/workflowManagement/countActiveWorkflowInstances.js";
import {
  WorkflowTemplateDeleteBlockedDialog,
  WorkflowTemplateDeleteConfirmDialog,
} from "../features/workflowManagement/WorkflowTemplateDeletionDialogs.js";
import { ISSUE_TRIAGE_TEMPLATE, RISK_LIFECYCLE_STATE_VIEW_MODELS, RISK_LIFECYCLE_TEMPLATE } from "../features/workflowManagement/sampleData.js";
import { WorkflowDataSourceChip } from "../features/workflowManagement/WorkflowDataSourceChip.js";
import { useWorkflowsRepository } from "../features/workflowManagement/hooks/useWorkflowsRepository.js";
import {
  getTemplateDraft,
  listInstancesForTemplate,
  publishTemplate,
  saveTemplateDraft,
} from "../services/workflows/workflowsRepository.js";
import { getLatestMirror } from "../services/workflows/templateMirror.js";
import type { CanvasItemSelection } from "../features/workflowManagement/canvasSelection.js";
import type { WorkflowTemplate } from "../features/workflowManagement/types.js";
import {
  extractGraphLayout,
  type StatusIndicatorColor,
  type WorkflowDraft,
} from "../features/workflowManagement/draftTypes.js";
import type { Guard, Action } from "../features/workflowManagement/types.js";
import { atlasToastAlertSurfaceSx } from "../utils/atlasToastLayout.js";
import { STR } from "../utils/i18n.js";
import { uiDividerDefaultBorderColor } from "../utils/uiDividerBorder.js";
import type { Connection, Edge } from "@xyflow/react";

const D = STR.workflowManagement.templateDeletion;

function cloneWorkflowDraft(d: WorkflowDraft): WorkflowDraft {
  return JSON.parse(JSON.stringify(d)) as WorkflowDraft;
}

// ─── Location state ───────────────────────────────────────────────────────────

interface EditorLocationState {
  mode: "new" | "edit";
  template?: WorkflowTemplate;
  /** Stable key for mirror/draft (risk, findings, issue-triage). */
  templateKey?: string;
  /** Browse vs edit — default for existing templates from list is readonly via explicit navigation. */
  interaction?: "readonly" | "edit";
}

function resolveTemplateKey(
  locationState: EditorLocationState | null | undefined,
  template: WorkflowTemplate | undefined,
  draftService: string,
): string {
  if (locationState?.templateKey) return locationState.templateKey;
  const service = draftService || template?.service || "";
  if (service === "audit-findings") return "findings";
  if (template?.id === ISSUE_TRIAGE_TEMPLATE.id) return "issue-triage";
  return "risk";
}

// ─── Template meta form ───────────────────────────────────────────────────────

interface TemplateMetaFormProps {
  name: string;
  version: number;
  service: string;
  readOnly?: boolean;
  onNameChange: (v: string) => void;
  onVersionChange: (v: number) => void;
  onServiceChange: (v: string) => void;
}

const TemplateMetaForm: FC<TemplateMetaFormProps> = ({
  name,
  version,
  service,
  readOnly,
  onNameChange,
  onVersionChange,
  onServiceChange,
}) => (
  <Box
    sx={({ tokens }) => ({
      border: "1px solid",
      borderColor: uiDividerDefaultBorderColor(tokens),
      borderRadius: 2,
      p: 2.5,
      backgroundColor: "var(--lens-semantic-color-surface-subtle, #fafafa)",
    })}
  >
    <Stack gap={2}>
      <Typography variant="subtitle2" fontWeight={600}>
        {STR.workflowEditor.templateMetaSectionTitle}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField
          label={STR.workflowEditor.templateNameLabel}
          helperText={STR.workflowEditor.templateNameHint}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          size="small"
          sx={{ flex: 2 }}
          disabled={readOnly}
        />
        <TextField
          label={STR.workflowEditor.templateVersionLabel}
          value={version}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n > 0) onVersionChange(n);
          }}
          size="small"
          type="number"
          inputProps={{ min: 1 }}
          sx={{ flex: 0.5, minWidth: 90 }}
          disabled={readOnly}
        />
        <TextField
          label={STR.workflowEditor.templateServiceLabel}
          helperText={STR.workflowEditor.templateServiceHint}
          value={service}
          onChange={(e) => onServiceChange(e.target.value)}
          size="small"
          sx={{ flex: 2 }}
          inputProps={{ style: { fontFamily: "monospace" } }}
          disabled={readOnly}
        />
      </Stack>
    </Stack>
  </Box>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Workflow Template Editor — graph canvas only (linear layout removed).
 *
 * navigate('/workflows/template/edit', {
 *   state: {
 *     mode: 'new' | 'edit',
 *     template?,
 *     interaction?: 'readonly' | 'edit',
 *   },
 * })
 */
const WorkflowTemplateEditorPage: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as EditorLocationState | null;
  const { instances, dataSource } = useWorkflowsRepository();

  const editor = useWorkflowTemplateEditor();
  const [selectedItem, setSelectedItem] = useState<CanvasItemSelection | null>(null);
  const [pendingNewStateId, setPendingNewStateId] = useState<string | null>(null);

  const viewportCenterFlowGetterRef = useRef<(() => { x: number; y: number } | null) | null>(null);

  const getGraphPlacementForNewState = useCallback((): { x: number; y: number } | undefined => {
    const fn = viewportCenterFlowGetterRef.current;
    if (!fn) return undefined;
    const center = fn();
    if (!center) return undefined;
    return {
      x: center.x - WORKFLOW_GRAPH_STATE_NODE_WIDTH / 2,
      y: center.y - WORKFLOW_GRAPH_STATE_NODE_MIN_HEIGHT / 2,
    };
  }, []);

  const isNewMode = locationState?.mode !== "edit";
  const isReadOnly =
    locationState?.mode === "edit" && locationState.interaction === "readonly";

  const persistedTemplateId = locationState?.mode === "edit" ? locationState.template?.id : undefined;
  const templateKey = useMemo(
    () =>
      resolveTemplateKey(
        locationState,
        locationState?.template,
        editor.draft.service,
      ),
    [locationState, editor.draft.service],
  );
  const showEditorOverflowMenu = Boolean(persistedTemplateId);

  // ── Undo-delete toast (states and transitions) ──
  const [undoToastOpen, setUndoToastOpen] = useState(false);
  const [undoToastMessage, setUndoToastMessage] = useState("");
  const [draftSnapshot, setDraftSnapshot] = useState<WorkflowDraft | null>(null);

  const [editorMenuAnchor, setEditorMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteBlockedCount, setDeleteBlockedCount] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [saveSnackOpen, setSaveSnackOpen] = useState(false);
  const [publishSnackOpen, setPublishSnackOpen] = useState(false);
  const [publishErrorOpen, setPublishErrorOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState<WorkflowDraft | null>(null);

  const prevReadOnlyRef = useRef(isReadOnly);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const handleEnterEdit = useCallback(() => {
    if (!locationState || locationState.mode !== "edit") return;
    navigate(".", {
      replace: true,
      state: { ...locationState, interaction: "edit" },
    });
  }, [locationState, navigate]);

  const handleExitReadOnly = useCallback(() => {
    if (!locationState || locationState.mode !== "edit") return;
    navigate(".", {
      replace: true,
      state: { ...locationState, interaction: "readonly" },
    });
  }, [locationState, navigate]);

  const closeEditorMenu = useCallback(() => setEditorMenuAnchor(null), []);

  const handleRequestDeleteTemplate = useCallback(() => {
    if (!persistedTemplateId) return;
    const n = countActiveWorkflowInstances(instances, persistedTemplateId);
    if (n > 0) setDeleteBlockedCount(n);
    else setConfirmDeleteOpen(true);
    closeEditorMenu();
  }, [persistedTemplateId, closeEditorMenu, instances]);

  const handleConfirmDeleteFromEditor = useCallback(() => {
    if (persistedTemplateId) {
      navigate("/workflows", { state: { deletedTemplateId: persistedTemplateId } });
    } else {
      navigate("/workflows");
    }
    setConfirmDeleteOpen(false);
  }, [navigate, persistedTemplateId]);

  useEffect(() => {
    if (locationState?.mode === "edit" && locationState.template) {
      const key = resolveTemplateKey(
        locationState,
        locationState.template,
        locationState.template.service,
      );
      const savedDraft = getTemplateDraft(key);
      const mirror = getLatestMirror(key);
      const graphLayout = savedDraft?.graphLayout ?? mirror?.graphLayout;
      if (savedDraft) {
        const mergedTemplate: WorkflowTemplate = {
          ...locationState.template,
          name: savedDraft.name,
          service: savedDraft.service,
          definition: savedDraft.definition,
        };
        editor.initFromTemplate(mergedTemplate, graphLayout);
      } else {
        editor.initFromTemplate(locationState.template, graphLayout);
      }
    } else {
      editor.initEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSavedBaseline(cloneWorkflowDraft(editorRef.current.draft));
    }, 0);
    return () => window.clearTimeout(id);
    // Baseline after init effect runs; editorRef reads latest draft after re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevReadOnlyRef.current && !isReadOnly) {
      setSavedBaseline(cloneWorkflowDraft(editorRef.current.draft));
    }
    prevReadOnlyRef.current = isReadOnly;
  }, [isReadOnly, editor.draft]);

  useEffect(() => {
    if (pendingNewStateId) {
      setSelectedItem({ type: "state", stateDraftId: pendingNewStateId });
      setPendingNewStateId(null);
    }
  }, [pendingNewStateId, editor.draft.states]);

  const handleSelectState = useCallback((stateDraftId: string) => {
    setSelectedItem((prev) =>
      prev?.type === "state" && prev.stateDraftId === stateDraftId
        ? null
        : { type: "state", stateDraftId },
    );
  }, []);

  const handleSelectTransition = useCallback((stateDraftId: string, transitionDraftId: string) => {
    setSelectedItem((prev) => {
      const isSame =
        prev?.type === "transition" &&
        prev.stateDraftId === stateDraftId &&
        prev.transitionDraftId === transitionDraftId;
      return isSame ? null : { type: "transition", stateDraftId, transitionDraftId };
    });
  }, []);

  const handleAddNextStage = useCallback(
    (afterStateDraftId: string) => {
      if (isReadOnly) return;
      const pos = getGraphPlacementForNewState();
      const newStateId = editor.addStateAfter(afterStateDraftId, pos);
      setPendingNewStateId(newStateId);
    },
    [editor, isReadOnly, getGraphPlacementForNewState],
  );

  const handleRemoveState = useCallback(
    (draftId: string) => {
      if (isReadOnly) return;
      const stateToDelete = editor.draft.states.find((s) => s.draftId === draftId);
      const snapshot: WorkflowDraft = JSON.parse(JSON.stringify(editor.draft));
      const name = stateToDelete?.name.trim() ?? "";

      editor.removeState(draftId);
      setSelectedItem((prev) =>
        prev?.type === "state" && prev.stateDraftId === draftId ? null : prev,
      );

      setDraftSnapshot(snapshot);
      setUndoToastMessage(STR.workflowEditor.stateRemovedToast(name));
      setUndoToastOpen(true);
    },
    [editor, isReadOnly],
  );

  /** Remove a state without undo toast (e.g. abandoning an unnamed new node when the sheet closes). */
  const handleDiscardEmptyState = useCallback(
    (draftId: string) => {
      if (isReadOnly) return;
      editor.removeState(draftId);
      setSelectedItem((prev) =>
        prev?.type === "state" && prev.stateDraftId === draftId ? null : prev,
      );
    },
    [editor, isReadOnly],
  );

  const handleUndoDelete = useCallback(() => {
    if (draftSnapshot) {
      editor.restoreDraft(draftSnapshot);
      setDraftSnapshot(null);
    }
    setUndoToastOpen(false);
  }, [draftSnapshot, editor]);

  const handleUndoToastClose = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") return;
      setUndoToastOpen(false);
      setDraftSnapshot(null);
    },
    [],
  );

  const handleSaveTemplate = useCallback(() => {
    saveTemplateDraft({
      templateKey,
      name: editor.draft.name.trim() || "Untitled template",
      service: editor.draft.service,
      definition: editor.toDraftPreview(),
      basedOnVersion: locationState?.template?.version ?? null,
      graphLayout: extractGraphLayout(editor.draft),
    });
    setSavedBaseline(cloneWorkflowDraft(editor.draft));
    setSaveSnackOpen(true);
  }, [editor, templateKey, locationState?.template?.version]);

  const handlePublishTemplate = useCallback(async () => {
    setPublishBusy(true);
    try {
      const graphLayout = extractGraphLayout(editor.draft);
      const published = await publishTemplate({
        templateKey,
        name: editor.draft.name.trim() || "Untitled template",
        service: editor.draft.service,
        definition: editor.toDraftPreview(),
        basedOnVersion: locationState?.template?.version ?? null,
        graphLayout,
      });
      setSavedBaseline(cloneWorkflowDraft(editor.draft));
      navigate(".", {
        replace: true,
        state: {
          mode: "edit",
          template: published,
          interaction: "edit",
          templateKey,
        },
      });
      editor.initFromTemplate(published, graphLayout);
      setPublishSnackOpen(true);
    } catch {
      setPublishErrorOpen(true);
    } finally {
      setPublishBusy(false);
    }
  }, [editor, templateKey, locationState?.template?.version, navigate]);

  const handleSaveSnackClose = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") return;
      setSaveSnackOpen(false);
    },
    [],
  );

  const handleDiscardConfirm = useCallback(() => {
    if (savedBaseline) {
      editor.restoreDraft(cloneWorkflowDraft(savedBaseline));
    }
    setSelectedItem(null);
    setDiscardDialogOpen(false);
    closeEditorMenu();
  }, [editor, closeEditorMenu, savedBaseline]);

  const handleUpdateStatePosition = useCallback(
    (stateDraftId: string, position: { x: number; y: number }) => {
      if (isReadOnly) return;
      editor.updateStatePosition(stateDraftId, position);
    },
    [editor, isReadOnly],
  );

  const handleAddTransition = useCallback(
    (sourceStateId: string, targetStateId: string): string => {
      const sourceState = editor.draft.states.find((s) => s.draftId === sourceStateId);
      const existing = sourceState?.transitions.find((t) => t.targetDraftId === targetStateId);
      if (existing) {
        setSelectedItem({
          type: "transition",
          stateDraftId: sourceStateId,
          transitionDraftId: existing.draftId,
        });
        return existing.draftId;
      }
      const newTransitionId = editor.addTransition(sourceStateId, targetStateId);
      setSelectedItem({ type: "transition", stateDraftId: sourceStateId, transitionDraftId: newTransitionId });
      return newTransitionId;
    },
    [editor],
  );

  const handleReconnectTransition = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (isReadOnly) return;
      if (!newConnection.source || !newConnection.target) return;
      const transitionDraftId = oldEdge.id;
      const newSourceDraftId = newConnection.source;
      const newTargetDraftId = newConnection.target;

      const newSourceState = editor.draft.states.find((s) => s.draftId === newSourceDraftId);
      if (!newSourceState) return;

      const duplicate = newSourceState.transitions.some(
        (t) => t.targetDraftId === newTargetDraftId && t.draftId !== transitionDraftId,
      );
      if (duplicate) return;

      editor.reconnectTransition(transitionDraftId, newSourceDraftId, newTargetDraftId);
      setSelectedItem((prev) =>
        prev?.type === "transition" && prev.transitionDraftId === transitionDraftId
          ? { type: "transition", stateDraftId: newSourceDraftId, transitionDraftId }
          : prev,
      );
    },
    [editor, isReadOnly],
  );

  const handleRemoveTransition = useCallback(
    (stateDraftId: string, transitionDraftId: string) => {
      if (isReadOnly) return;
      const sourceState = editor.draft.states.find((s) => s.draftId === stateDraftId);
      const transition = sourceState?.transitions.find((t) => t.draftId === transitionDraftId);
      const targetState = transition
        ? editor.draft.states.find((s) => s.draftId === transition.targetDraftId)
        : undefined;
      const snapshot = cloneWorkflowDraft(editor.draft);
      const sourceName = sourceState?.name.trim() || STR.workflowEditor.unnamedState;
      const targetName = targetState?.name.trim() || STR.workflowEditor.unnamedState;
      const eventName = transition?.eventName.trim() ?? "";
      const toastMessage = eventName
        ? STR.workflowEditor.transitionRemovedToastNamed(eventName, sourceName, targetName)
        : STR.workflowEditor.transitionRemovedToast(sourceName, targetName);

      editor.removeTransition(stateDraftId, transitionDraftId);
      setSelectedItem((prev) =>
        prev?.type === "transition" &&
        prev.stateDraftId === stateDraftId &&
        prev.transitionDraftId === transitionDraftId
          ? null
          : prev,
      );

      setDraftSnapshot(snapshot);
      setUndoToastMessage(toastMessage);
      setUndoToastOpen(true);
    },
    [editor, isReadOnly],
  );

  const handleAddIsolatedState = useCallback(() => {
    if (isReadOnly) return;
    const pos = getGraphPlacementForNewState();
    const newId = editor.addIsolatedState(pos);
    setPendingNewStateId(newId);
  }, [editor, isReadOnly, getGraphPlacementForNewState]);

  const selectedStateId = selectedItem?.type === "state" ? selectedItem.stateDraftId : null;
  const selectedState = selectedStateId
    ? (editor.draft.states.find((s) => s.draftId === selectedStateId) ?? null)
    : null;
  const selectedStateIndex = selectedState
    ? editor.draft.states.indexOf(selectedState)
    : -1;

  const handleSaveState = useCallback(
    (draftId: string, updates: { name: string; description: string; color: StatusIndicatorColor }) => {
      editor.updateState(draftId, updates);
    },
    [editor],
  );

  const handleAddNextStageFromSheet = useCallback(
    (afterStateDraftId: string): string => {
      const pos = getGraphPlacementForNewState();
      const newId = editor.addStateAfter(afterStateDraftId, pos);
      setPendingNewStateId(newId);
      return newId;
    },
    [editor, getGraphPlacementForNewState],
  );

  const selectedTransition =
    selectedItem?.type === "transition"
      ? (() => {
          const state = editor.draft.states.find(
            (s) => s.draftId === selectedItem.stateDraftId,
          );
          return state?.transitions.find((t) => t.draftId === selectedItem.transitionDraftId) ?? null;
        })()
      : null;

  const transitionSourceState =
    selectedItem?.type === "transition"
      ? (editor.draft.states.find((s) => s.draftId === selectedItem.stateDraftId) ?? null)
      : null;

  const transitionTargetState = selectedTransition
    ? (editor.draft.states.find((s) => s.draftId === selectedTransition.targetDraftId) ?? null)
    : null;

  const handleSaveTransition = useCallback(
    (
      stateDraftId: string,
      transitionDraftId: string,
      updates: { eventName: string; targetDraftId: string; guards: Guard[]; actions: Action[] },
    ) => {
      editor.updateTransition(stateDraftId, transitionDraftId, {
        eventName: updates.eventName,
        targetDraftId: updates.targetDraftId,
      });
      const state = editor.draft.states.find((s) => s.draftId === stateDraftId);
      const transition = state?.transitions.find((t) => t.draftId === transitionDraftId);
      if (transition) {
        for (const g of transition.guards) {
          editor.removeGuard(stateDraftId, transitionDraftId, g.name);
        }
        for (const g of updates.guards) {
          if (g.name.trim()) editor.addGuard(stateDraftId, transitionDraftId, g);
        }
        for (const a of transition.actions) {
          editor.removeAction(stateDraftId, transitionDraftId, a.name);
        }
        for (const a of updates.actions) {
          if (a.name.trim()) editor.addAction(stateDraftId, transitionDraftId, a);
        }
      }
    },
    [editor],
  );

  const pageTitle = (() => {
    if (isNewMode) return STR.workflowEditor.newTemplatePageTitle;
    const name = editor.draft.name.trim() || locationState?.template?.name?.trim() || "";
    return name || STR.workflowEditor.pageTitle;
  })();
  const pageSubtitle = isReadOnly ? STR.workflowEditor.readOnlyPageSubtitle : STR.workflowEditor.pageSubtitle;

  const hasUnsavedChanges = useMemo(() => {
    if (isReadOnly || savedBaseline === null) return false;
    return JSON.stringify(editor.draft) !== JSON.stringify(savedBaseline);
  }, [isReadOnly, savedBaseline, editor.draft]);

  const handleDiscardClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
    } else {
      handleExitReadOnly();
    }
  }, [hasUnsavedChanges, handleExitReadOnly]);

  const canvasSectionTitle = isReadOnly
    ? STR.workflowManagement.templateSectionTitle
    : STR.workflowEditor.canvasSectionEditTitle;

  const readonlyInstanceRows =
    isReadOnly && persistedTemplateId
      ? listInstancesForTemplate(persistedTemplateId)
      : [];
  const readonlyInstanceStateModels =
    persistedTemplateId === RISK_LIFECYCLE_TEMPLATE.id ? RISK_LIFECYCLE_STATE_VIEW_MODELS : [];

  return (
    <PageLayout>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Button
          variant="text"
          size="small"
          startIcon={<ArrowLeftIcon />}
          onClick={() =>
            navigate("/workflows", {
              state: {
                colorOverrides: Object.fromEntries(
                  editor.draft.states
                    .filter((s) => s.name.trim())
                    .map((s) => [s.name.trim(), s.color]),
                ),
              },
            })
          }
          sx={{ color: "text.secondary", textTransform: "none", ml: -1 }}
        >
          {STR.workflowsStub.title}
        </Button>
      </Stack>

      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
          <PageHeader pageTitle={pageTitle} pageSubtitle={pageSubtitle} />
        </Box>
        <Stack direction="row" alignItems="center" gap={1} flexShrink={0} flexWrap="wrap">
          <WorkflowDataSourceChip dataSource={dataSource} />
          {!isReadOnly && (
            <>
              <Button variant="outlined" size="small" onClick={handleDiscardClick}>
                {STR.workflowEditor.discardChangesButton}
              </Button>
              <Button variant="outlined" size="small" onClick={handleSaveTemplate}>
                {STR.workflowEditor.saveDraftButton}
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => void handlePublishTemplate()}
                disabled={publishBusy}
              >
                {STR.workflowEditor.publishTemplateButton}
              </Button>
            </>
          )}
          {showEditorOverflowMenu && (
            <>
              <IconButton
                size="small"
                aria-label={D.editorMoreAria}
                aria-haspopup="true"
                onClick={(e) => setEditorMenuAnchor(e.currentTarget)}
              >
                <MoreIcon aria-hidden />
              </IconButton>
              <Menu anchorEl={editorMenuAnchor} open={Boolean(editorMenuAnchor)} onClose={closeEditorMenu}>
                <MenuItem onClick={handleRequestDeleteTemplate} sx={{ color: "error.main" }}>
                  <ListItemIcon sx={{ color: "inherit" }}>
                    <TrashIcon fontSize="small" aria-hidden />
                  </ListItemIcon>
                  {D.templatesMenuDelete}
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      <Stack gap={4}>
        {(isReadOnly || isNewMode) && (
          <TemplateMetaForm
            name={editor.draft.name}
            version={editor.draft.version}
            service={editor.draft.service}
            readOnly={isReadOnly}
            onNameChange={(v) => editor.updateTemplateMeta({ name: v })}
            onVersionChange={(v) => editor.updateTemplateMeta({ version: v })}
            onServiceChange={(v) => editor.updateTemplateMeta({ service: v })}
          />
        )}

        <Stack gap={1.5}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="nowrap"
            gap={2}
          >
            <Stack gap={0.25} sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h2" variant="h4" sx={{ fontWeight: 600 }}>
                {canvasSectionTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {STR.workflowEditor.graphCanvasHint}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" gap={1.5} flexShrink={0} flexWrap="nowrap">
              {editor.draft.states.length > 0 && (
                <Chip
                  label={`${editor.draft.states.length} state${editor.draft.states.length === 1 ? "" : "s"}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {isReadOnly && (
                <Button variant="contained" size="small" onClick={handleEnterEdit}>
                  {STR.workflowEditor.switchToEditButton}
                </Button>
              )}
            </Stack>
          </Stack>

          <WorkflowGraphCanvas
            draft={editor.draft}
            selectedItem={selectedItem}
            onSelectState={handleSelectState}
            onSelectTransition={handleSelectTransition}
            onAddTransition={handleAddTransition}
            onReconnectTransition={handleReconnectTransition}
            onRemoveTransition={handleRemoveTransition}
            onRemoveState={handleRemoveState}
            onUpdateStatePosition={handleUpdateStatePosition}
            onAddStateAfter={handleAddNextStage}
            readOnly={isReadOnly}
            onAddIsolatedState={isReadOnly ? undefined : handleAddIsolatedState}
            viewportCenterFlowGetterRef={viewportCenterFlowGetterRef}
          />
        </Stack>

        {isReadOnly && persistedTemplateId && (
          <WorkflowInstanceTable
            instances={readonlyInstanceRows}
            stateViewModels={readonlyInstanceStateModels}
            tableAriaLabel={STR.workflowManagement.instancesTableAriaForTemplate(editor.draft.name)}
          />
        )}
      </Stack>

      <WorkflowTemplateDeleteBlockedDialog
        open={deleteBlockedCount !== null}
        templateName={editor.draft.name}
        activeInstanceCount={deleteBlockedCount ?? 0}
        onClose={() => setDeleteBlockedCount(null)}
      />

      <WorkflowTemplateDeleteConfirmDialog
        open={confirmDeleteOpen}
        templateName={editor.draft.name}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDeleteFromEditor}
      />

      <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{STR.workflowEditor.discardChangesDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {STR.workflowEditor.discardChangesDialogBody}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDiscardDialogOpen(false)}>
            {STR.workflowEditor.discardChangesCancel}
          </Button>
          <Button variant="contained" color="warning" onClick={handleDiscardConfirm}>
            {STR.workflowEditor.discardChangesConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={undoToastOpen}
        autoHideDuration={5000}
        onClose={handleUndoToastClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ top: "88px !important", right: "24px !important" }}
      >
        <Alert
          severity="success"
          aria-live="polite"
          onClose={handleUndoToastClose}
          sx={atlasToastAlertSurfaceSx}
        >
          {undoToastMessage}
          {" "}
          <Link
            component="button"
            type="button"
            underline="always"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUndoDelete();
            }}
            sx={{ verticalAlign: "baseline", cursor: "pointer" }}
          >
            {STR.workflowEditor.undoButton}
          </Link>
        </Alert>
      </Snackbar>

      <Snackbar
        open={publishSnackOpen}
        autoHideDuration={4000}
        onClose={() => setPublishSnackOpen(false)}
        message={STR.workflowEditor.publishSuccess}
        sx={atlasToastAlertSurfaceSx}
      />
      <Snackbar
        open={publishErrorOpen}
        autoHideDuration={6000}
        onClose={() => setPublishErrorOpen(false)}
        message={STR.workflowEditor.publishError}
        sx={atlasToastAlertSurfaceSx}
      />
      <Snackbar
        open={saveSnackOpen}
        autoHideDuration={4000}
        onClose={handleSaveSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ top: "88px !important", right: "24px !important" }}
      >
        <Alert
          severity="success"
          aria-live="polite"
          onClose={handleSaveSnackClose}
          sx={atlasToastAlertSurfaceSx}
        >
          {STR.workflowEditor.templateSavedToast}
        </Alert>
      </Snackbar>

      <WorkflowStateSheet
        state={selectedState}
        isInitialState={selectedStateIndex === 0}
        totalStates={editor.draft.states.length}
        onSave={handleSaveState}
        onClose={() => setSelectedItem(null)}
        onDiscardIfEmpty={handleDiscardEmptyState}
        onAddNextStage={handleAddNextStageFromSheet}
        onRemoveState={handleRemoveState}
        readOnly={isReadOnly}
      />

      <WorkflowTransitionSheet
        sourceState={transitionSourceState}
        targetState={transitionTargetState}
        transition={selectedTransition}
        allStates={editor.draft.states}
        onSave={handleSaveTransition}
        onClose={() => setSelectedItem(null)}
        onRemoveTransition={isReadOnly ? undefined : handleRemoveTransition}
        readOnly={isReadOnly}
      />
    </PageLayout>
  );
};

export default WorkflowTemplateEditorPage;

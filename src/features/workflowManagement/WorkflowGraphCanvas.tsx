/**
 * WorkflowGraphCanvas
 *
 * Full graph-based view of a WorkflowDraft using @xyflow/react.
 * Supports all FSM topologies: linear, circular, forks, and loops.
 *
 * Interactions:
 * - Click node → opens WorkflowStateSheet
 * - Click edge path or trigger chip → opens WorkflowTransitionSheet (chip mirrors linear canvas)
 * - Drag from a node handle → draws a new transition (onConnect)
 * - Drag an existing edge’s **source or target end** (near the handle) → reconnect to another state; draft + transition sheet stay in sync
 * - Reciprocal A↔B edges use different `getSmoothStepPath` offset / stepPosition so paths do not sit on top of each other
 * - If state T already has T → S, a new return S → T cannot land on T’s left target handle (use top/bottom only)
 * - Drag a node to reposition → position persisted to draft via onUpdateStatePosition
 * - Delete key on selected edge → removes that transition
 * - Delete key on selected node → removes that state
 * - "+" on node when it has no outgoing transition → add connected next stage (opens state sheet)
 * - "Add next stage" outlined button for a free-standing state → page header beside view toggle (graph view).
 */
import type { FC, MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Connection,
  Edge,
  EdgeChange,
  EdgeProps,
  EdgeTypes,
  IsValidConnection,
  Node,
  NodeChange,
  NodeTypes,
  OnNodeDrag,
} from "@xyflow/react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import LockedIcon from "@diligentcorp/atlas-react-bundle/icons/Locked";
import type { WorkflowDraft, WorkflowStateDraft } from "./draftTypes.js";
import {
  STATUS_INDICATOR_ACCENT_FG,
  STATUS_INDICATOR_BG,
  STATUS_INDICATOR_RING,
} from "./draftTypes.js";
import type { CanvasItemSelection } from "./canvasSelection.js";
import { STR } from "../../utils/i18n.js";

// ─── Handle ids (named handles for routing + reciprocal A↔B edges) ───────────

const H = {
  sr: "sr",
  st: "st",
  sb: "sb",
  tl: "tl",
  tt: "tt",
  tb: "tb",
} as const;

/** `getSmoothStepPath` defaults (see @xyflow/system `GetSmoothStepPathParams`). */
const SMOOTH_BORDER_RADIUS = 14;
const SMOOTH_OFFSET_DEFAULT = 28;
const SMOOTH_STEP_DEFAULT = 0.5;
/** When both A→B and B→A exist: nudge the forward leg (sr→tl) off the default rail. */
const SMOOTH_RECIP_FORWARD = { offset: 50, stepPosition: 0.44 } as const;
/** Return leg (sb→tt): larger offset + earlier bend so the path separates from the forward edge. */
const SMOOTH_RECIP_RETURN = { offset: 92, stepPosition: 0.26 } as const;

/** Marker on the graph pane for `screenToFlowPosition` centering. */
const GRAPH_VIEWPORT_DATA_ATTR = "data-workflow-graph-viewport";

/** State card size on the graph — export so the editor page can center newly placed nodes. */
export const WORKFLOW_GRAPH_STATE_NODE_WIDTH = 212;
export const WORKFLOW_GRAPH_STATE_NODE_MIN_HEIGHT = 104;

const HANDLE_HIT = 32;
const HANDLE_DOT = 12;

function GraphHandleDot({
  type,
  position,
  id,
  ring,
}: {
  type: "source" | "target";
  position: Position;
  id: string;
  ring: string;
}) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        width: HANDLE_HIT,
        height: HANDLE_HIT,
        border: "none",
        background: "transparent",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        className="wf-handle-dot"
        sx={{
          width: HANDLE_DOT,
          height: HANDLE_DOT,
          borderRadius: "50%",
          bgcolor: ring,
          pointerEvents: "none",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}
      />
    </Handle>
  );
}

// ─── Node data type ───────────────────────────────────────────────────────────

/** On-canvas "+" after the node when there is no outgoing transition yet (right handle unused). */
type GraphAddNextMode = "always" | "none";

/** Hover affordance on the graph — selection styling still takes precedence. */
type NodeHighlightRole = "none" | "hovered" | "connected";

interface StateNodeData {
  state: WorkflowStateDraft;
  isInitial: boolean;
  isSelected: boolean;
  highlightRole: NodeHighlightRole;
  onSelect: (draftId: string) => void;
  addNextMode: GraphAddNextMode;
  onAddAfter: (sourceDraftId: string) => void;
  readOnly: boolean;
}

// ─── Custom node component ────────────────────────────────────────────────────

const WorkflowStateNode: FC<{ data: StateNodeData }> = ({ data }) => {
  const { state, isInitial, isSelected, highlightRole, onSelect, addNextMode, onAddAfter, readOnly } =
    data;
  const isEmpty = !state.name.trim();
  const hasGuardedTransitions = state.transitions.some((t) => t.guards.length > 0);
  const bg = STATUS_INDICATOR_BG[state.color];
  const ring = STATUS_INDICATOR_RING[state.color];
  const accentFg = STATUS_INDICATOR_ACCENT_FG[state.color];
  const showAddControl = !readOnly && addNextMode !== "none";

  const borderColor = (() => {
    if (isSelected) return "primary.main";
    if (highlightRole === "hovered") return ring;
    if (highlightRole === "connected") return `${ring}bb`;
    return `${ring}99`;
  })();

  const boxShadow = (() => {
    if (isSelected) return 4;
    if (highlightRole === "hovered") return 4;
    if (highlightRole === "connected") return 2;
    return 1;
  })();

  return (
    <Box
      className="wf-graph-state-root"
      sx={{
        position: "relative",
        width: WORKFLOW_GRAPH_STATE_NODE_WIDTH,
      }}
    >
      <GraphHandleDot type="target" position={Position.Left} id={H.tl} ring={ring} />
      <GraphHandleDot type="target" position={Position.Top} id={H.tt} ring={ring} />
      <GraphHandleDot type="target" position={Position.Bottom} id={H.tb} ring={ring} />

      <Box
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={
          isEmpty
            ? STR.workflowEditor.emptyStateAriaLabel
            : `${STR.workflowEditor.stateNodeAriaLabel}: ${state.name}`
        }
        onClick={() => onSelect(state.draftId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(state.draftId);
          }
        }}
        sx={{
          width: WORKFLOW_GRAPH_STATE_NODE_WIDTH,
          minHeight: WORKFLOW_GRAPH_STATE_NODE_MIN_HEIGHT,
          borderRadius: 2,
          border: "2px solid",
          borderColor,
          backgroundColor: isEmpty ? STATUS_INDICATOR_BG["subtle"] : bg,
          boxShadow,
          p: 2,
          cursor: "pointer",
          outline: "none",
          transition: "box-shadow 150ms, border-color 150ms, background-color 150ms",
          ...(highlightRole === "connected" && {
            backgroundColor: isEmpty
              ? STATUS_INDICATOR_BG["subtle"]
              : `color-mix(in srgb, ${bg} 88%, ${ring} 12%)`,
          }),
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
      >
        <Stack gap={0.75} height="100%">
          {isInitial && (
            <Chip
              label={STR.workflowEditor.initialStateBadge}
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                alignSelf: "flex-start",
                fontSize: "0.6rem",
                height: 16,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}

          {isEmpty ? (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ fontStyle: "italic", fontSize: "0.75rem" }}
            >
              {STR.workflowEditor.emptyStatePlaceholder}
            </Typography>
          ) : (
            <Chip
              label={state.name}
              size="small"
              sx={{
                alignSelf: "flex-start",
                height: 24,
                maxWidth: "100%",
                fontWeight: 600,
                fontSize: "0.75rem",
                backgroundColor: ring,
                color: accentFg,
                "& .MuiChip-label": {
                  px: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          )}

          {state.description && !isEmpty && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize: "0.65rem",
              }}
            >
              {state.description}
            </Typography>
          )}

          {hasGuardedTransitions && (
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: "auto" }}>
              <LockedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontStyle: "italic", fontSize: "0.6rem" }}
              >
                {STR.workflowManagement.protectedStep}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      <GraphHandleDot type="source" position={Position.Right} id={H.sr} ring={ring} />
      <GraphHandleDot type="source" position={Position.Top} id={H.st} ring={ring} />
      <GraphHandleDot type="source" position={Position.Bottom} id={H.sb} ring={ring} />

      {showAddControl && (
        <Tooltip title={STR.workflowEditor.addNextStageTooltip} placement="top">
          <IconButton
            className="nodrag nopan wf-graph-add-next"
            size="small"
            aria-label={STR.workflowEditor.addNextStageAriaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onAddAfter(state.draftId);
            }}
            sx={{
              position: "absolute",
              left: "100%",
              top: "50%",
              transform: "translate(8px, -50%)",
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              width: 36,
              height: 36,
              opacity: addNextMode === "always" ? 1 : 0,
              pointerEvents: addNextMode === "always" ? "auto" : "none",
              transition: "opacity 120ms ease, border-color 150ms, color 150ms",
              backgroundColor: "background.paper",
              boxShadow: 1,
              zIndex: 1,
              "&:hover": { borderColor: "primary.main", color: "primary.main" },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// ─── Custom transition edge (trigger chip, same i18n / styling as linear canvas) ─

type WorkflowTransitionEdgeData = {
  sourceStateDraftId: string;
  eventName: string;
  guardCount: number;
  actionCount: number;
  onSelectTransition: (sourceStateDraftId: string, transitionDraftId: string) => void;
  /** Passed to `getSmoothStepPath` so reciprocal legs do not overlap (see XY Flow smooth-step params). */
  smoothPath: { offset: number; stepPosition: number };
};

type WorkflowGraphTransitionEdge = Edge<WorkflowTransitionEdgeData, "workflowTransitionEdge">;

const WorkflowTransitionEdge: FC<EdgeProps<WorkflowGraphTransitionEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}) => {
  const pathTuning = data?.smoothPath ?? { offset: SMOOTH_OFFSET_DEFAULT, stepPosition: SMOOTH_STEP_DEFAULT };
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: SMOOTH_BORDER_RADIUS,
    offset: pathTuning.offset,
    stepPosition: pathTuning.stepPosition,
  });

  const eventName = data?.eventName ?? "";
  const isEmpty = !eventName.trim();
  const sourceStateDraftId = data?.sourceStateDraftId ?? "";
  const guardCount = data?.guardCount ?? 0;
  const actionCount = data?.actionCount ?? 0;
  const hasMeta = guardCount > 0 || actionCount > 0;

  const openTransition = () => {
    data?.onSelectTransition(sourceStateDraftId, id);
  };

  const chipTooltip = (() => {
    if (isEmpty) {
      const base = STR.workflowEditor.connectionEmptyTooltip;
      if (!hasMeta) return base;
      return `${base} ${STR.workflowEditor.transitionTriggerTooltipMeta(guardCount, actionCount)}`;
    }
    const base = STR.workflowEditor.connectionClickTooltip;
    if (!hasMeta) return base;
    return `${base} ${STR.workflowEditor.transitionTriggerTooltipMeta(guardCount, actionCount)}`;
  })();

  const chipAriaLabel = (() => {
    if (isEmpty && !hasMeta) return STR.workflowEditor.connectionEmptyAriaLabel;
    if (isEmpty && hasMeta) return STR.workflowEditor.transitionUnnamedWithMetaChipAria(guardCount, actionCount);
    if (!hasMeta) return `${STR.workflowEditor.connectionAriaLabel}: ${eventName}`;
    return STR.workflowEditor.transitionTriggerChipAria(eventName, guardCount, actionCount);
  })();

  const triggerPrimaryText = isEmpty ? STR.workflowEditor.connectionEmptyLabel : eventName;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} interactionWidth={28} />
      <EdgeLabelRenderer>
        <Box
          className="nodrag nopan"
          sx={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: 1,
            maxWidth: 320,
          }}
        >
          <Tooltip title={chipTooltip} placement="top">
            <Box
              role="button"
              tabIndex={0}
              aria-label={chipAriaLabel}
              aria-pressed={selected}
              onClick={(e) => {
                e.stopPropagation();
                openTransition();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  openTransition();
                }
              }}
              sx={({ palette }) => ({
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 0.75,
                p: "4px",
                borderRadius: 1,
                cursor: "pointer",
                outline: "none",
                border: "1px solid",
                borderColor: selected ? palette.primary.main : "divider",
                // `palette.background.paper` is often a CSS var (Atlas tokens); MUI `alpha()` cannot parse those.
                bgcolor: `color-mix(in srgb, ${palette.background.paper} 80%, transparent)`,
                boxShadow: selected ? 2 : 1,
                transition: "box-shadow 120ms ease, border-color 120ms ease",
                "&:hover": { boxShadow: 3 },
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              })}
            >
              <Chip
                label={
                  <Typography
                    component="span"
                    variant="inherit"
                    sx={{
                      fontFamily: isEmpty ? "inherit" : "monospace",
                      fontSize: isEmpty ? "0.65rem" : "0.75rem",
                      fontWeight: isEmpty ? 400 : 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {triggerPrimaryText}
                  </Typography>
                }
                size="small"
                variant={selected ? "filled" : "outlined"}
                color={selected ? "primary" : "default"}
                sx={{
                  border: isEmpty ? "1px dashed" : undefined,
                  borderColor: isEmpty ? "divider" : undefined,
                  color: isEmpty ? "text.disabled" : undefined,
                  height: "auto",
                  minHeight: 26,
                  py: 0.25,
                  "& .MuiChip-label": { px: 1, py: 0, display: "block" },
                }}
              />
              {(guardCount > 0 || actionCount > 0) && (
                <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" useFlexGap>
                  {guardCount > 0 && (
                    <Chip
                      label={STR.workflowEditor.transitionGuardsCountChip(guardCount)}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  )}
                  {actionCount > 0 && (
                    <Chip
                      label={STR.workflowEditor.transitionActionsCountChip(actionCount)}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Tooltip>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};

function ViewportCenterRegistrar({
  getterRef,
}: {
  getterRef: MutableRefObject<(() => { x: number; y: number } | null) | null>;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    getterRef.current = () => {
      const el = document.querySelector(`[${GRAPH_VIEWPORT_DATA_ATTR}]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };
    return () => {
      getterRef.current = null;
    };
  }, [getterRef, rf]);
  return null;
}

// ─── Canvas props ─────────────────────────────────────────────────────────────

export interface WorkflowGraphCanvasProps {
  draft: WorkflowDraft;
  selectedItem: CanvasItemSelection | null;
  onSelectState: (stateDraftId: string) => void;
  onSelectTransition: (stateDraftId: string, transitionDraftId: string) => void;
  onAddTransition: (sourceStateId: string, targetStateId: string) => void;
  /** After the user reconnects an edge on the canvas — update source/target in the draft. */
  onReconnectTransition?: (oldEdge: Edge, newConnection: Connection) => void;
  onRemoveTransition: (stateDraftId: string, transitionDraftId: string) => void;
  onRemoveState: (stateDraftId: string) => void;
  onUpdateStatePosition: (stateDraftId: string, position: { x: number; y: number }) => void;
  /** Same as linear canvas: append a new state connected from this source (opens state sheet). */
  onAddStateAfter: (sourceStateDraftId: string) => void;
  /** When true, pan/zoom and inspect sheets only — no graph edits. */
  readOnly?: boolean;
  /** Add a free-standing state (shown as a control inside the canvas when provided). */
  onAddIsolatedState?: () => void;
  /**
   * When the graph mounts, this ref is assigned a function that maps the visible graph pane center
   * to flow coordinates (or null). Used by the parent to place newly added states in view.
   */
  viewportCenterFlowGetterRef?: MutableRefObject<(() => { x: number; y: number } | null) | null>;
}

// ─── Node types registry (stable reference — must be outside the component) ───

const NODE_TYPES: NodeTypes = {
  workflowStateNode: WorkflowStateNode as unknown as NodeTypes[string],
};

const EDGE_TYPES: EdgeTypes = {
  workflowTransitionEdge: WorkflowTransitionEdge as unknown as EdgeTypes[string],
};

// ─── Default position from array index ───────────────────────────────────────

function defaultPosition(index: number): { x: number; y: number } {
  // 480px centers = +80 vs legacy 400 (≈40px extra gap on each side between nodes) for wider edge labels.
  return { x: index * 480, y: 200 };
}

/** Show "+" on the source (right) side when this state has no outgoing transition yet. */
function addNextControlMode(state: WorkflowStateDraft): GraphAddNextMode {
  return state.transitions.length === 0 ? "always" : "none";
}

// ─── Handle routing (avoid left target when connecting “back” from the next state) ─

function hasDirectedTransition(draft: WorkflowDraft, fromDraftId: string, toDraftId: string): boolean {
  const from = draft.states.find((s) => s.draftId === fromDraftId);
  return Boolean(from?.transitions.some((t) => t.targetDraftId === toDraftId));
}

function templateStateIndex(draft: WorkflowDraft, stateDraftId: string): number {
  return draft.states.findIndex((s) => s.draftId === stateDraftId);
}

/**
 * When `target → source` already exists, `source` is the “next” node relative to that link.
 * The return edge `source → target` must not attach to `target`’s left handle — only top/bottom.
 * When both directions exist, template order picks which leg keeps the default (sr → tl).
 */
function handlesForDirectedEdge(
  draft: WorkflowDraft,
  sourceDraftId: string,
  targetDraftId: string,
): { sourceHandle: string; targetHandle: string } {
  if (sourceDraftId === targetDraftId) return { sourceHandle: H.sr, targetHandle: H.tl };

  const reverseExists = hasDirectedTransition(draft, targetDraftId, sourceDraftId);
  if (!reverseExists) {
    return { sourceHandle: H.sr, targetHandle: H.tl };
  }

  const forwardExists = hasDirectedTransition(draft, sourceDraftId, targetDraftId);
  if (forwardExists) {
    const iS = templateStateIndex(draft, sourceDraftId);
    const iT = templateStateIndex(draft, targetDraftId);
    if (iS >= 0 && iT >= 0 && iS < iT) {
      return { sourceHandle: H.sr, targetHandle: H.tl };
    }
  }

  return { sourceHandle: H.sb, targetHandle: H.tt };
}

/** True if the target’s left handle must not be used for `source → target`. */
function forbidsLeftTargetHandle(draft: WorkflowDraft, sourceDraftId: string, targetDraftId: string): boolean {
  if (sourceDraftId === targetDraftId) return false;
  if (!hasDirectedTransition(draft, targetDraftId, sourceDraftId)) return false;
  if (hasDirectedTransition(draft, sourceDraftId, targetDraftId)) {
    const iS = templateStateIndex(draft, sourceDraftId);
    const iT = templateStateIndex(draft, targetDraftId);
    if (iS < 0 || iT < 0) return false;
    return iS > iT;
  }
  return true;
}

/**
 * When two states are linked both ways, vary `getSmoothStepPath` `offset` and `stepPosition`
 * so the two smooth-step paths do not overlap (XY Flow does not auto-route parallel edges).
 */
function smoothPathTuningForEdge(
  draft: WorkflowDraft,
  sourceDraftId: string,
  targetDraftId: string,
  sourceHandle: string,
  targetHandle: string,
): { offset: number; stepPosition: number } {
  const reciprocalPair =
    hasDirectedTransition(draft, sourceDraftId, targetDraftId) &&
    hasDirectedTransition(draft, targetDraftId, sourceDraftId);
  if (!reciprocalPair) {
    return { offset: SMOOTH_OFFSET_DEFAULT, stepPosition: SMOOTH_STEP_DEFAULT };
  }
  if (sourceHandle === H.sb && targetHandle === H.tt) {
    return { offset: SMOOTH_RECIP_RETURN.offset, stepPosition: SMOOTH_RECIP_RETURN.stepPosition };
  }
  return { offset: SMOOTH_RECIP_FORWARD.offset, stepPosition: SMOOTH_RECIP_FORWARD.stepPosition };
}

// ─── Build helpers ────────────────────────────────────────────────────────────

const EDGE_STROKE_DEFAULT = "#9e9e9e";
const EDGE_WIDTH_DEFAULT = 1.5;
const EDGE_WIDTH_HOVER = 3;
const EDGE_WIDTH_SELECTED = 2.5;

/** States linked to `nodeId` by any incoming or outgoing transition. */
function neighborStateIds(draft: WorkflowDraft, nodeId: string): Set<string> {
  const neighbors = new Set<string>();
  for (const state of draft.states) {
    if (state.draftId === nodeId) {
      for (const t of state.transitions) {
        neighbors.add(t.targetDraftId);
      }
      continue;
    }
    for (const t of state.transitions) {
      if (t.targetDraftId === nodeId) {
        neighbors.add(state.draftId);
      }
    }
  }
  return neighbors;
}

function nodeHighlightRole(
  stateDraftId: string,
  hoveredNodeId: string | null,
  neighbors: Set<string>,
): NodeHighlightRole {
  if (!hoveredNodeId) return "none";
  if (stateDraftId === hoveredNodeId) return "hovered";
  if (neighbors.has(stateDraftId)) return "connected";
  return "none";
}

/** React Flow node wrapper — used to ignore leave when the pointer moves to another node. */
const REACT_FLOW_NODE_SELECTOR = ".react-flow__node";

function buildNodes(
  draft: WorkflowDraft,
  selectedItem: CanvasItemSelection | null,
  onSelectState: (id: string) => void,
  onAddAfter: (sourceDraftId: string) => void,
  readOnly: boolean,
): Node[] {
  return draft.states.map((state, index) => ({
    id: state.draftId,
    type: "workflowStateNode" as const,
    // Use the persisted position if available, otherwise derive from index
    position: state.position ?? defaultPosition(index),
    data: {
      state,
      isInitial: index === 0,
      isSelected:
        selectedItem?.type === "state" && selectedItem.stateDraftId === state.draftId,
      highlightRole: "none",
      onSelect: onSelectState,
      addNextMode: addNextControlMode(state),
      onAddAfter,
      readOnly,
    } satisfies StateNodeData,
  }));
}

function patchNodesHover(
  nodes: Node[],
  draft: WorkflowDraft,
  hoveredNodeId: string | null,
): Node[] {
  const neighbors = hoveredNodeId ? neighborStateIds(draft, hoveredNodeId) : new Set<string>();
  return nodes.map((node) => {
    const prev = node.data as StateNodeData;
    const highlightRole = nodeHighlightRole(node.id, hoveredNodeId, neighbors);
    if (prev.highlightRole === highlightRole) return node;
    return { ...node, data: { ...prev, highlightRole } };
  });
}

function edgeStrokeStyle(
  edge: WorkflowGraphTransitionEdge,
  hoveredNodeId: string | null,
): Pick<NonNullable<WorkflowGraphTransitionEdge["style"]>, "strokeWidth" | "zIndex"> {
  const isSelected = Boolean(edge.selected);
  const isHoveredPath =
    Boolean(hoveredNodeId) && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);
  const reciprocalZ = edge.sourceHandle === H.sb && edge.targetHandle === H.tt ? 2 : 0;
  return {
    strokeWidth: isSelected
      ? EDGE_WIDTH_SELECTED
      : isHoveredPath
        ? EDGE_WIDTH_HOVER
        : EDGE_WIDTH_DEFAULT,
    zIndex: isHoveredPath ? reciprocalZ + 4 : reciprocalZ,
  };
}

function patchEdgesHover(
  edges: WorkflowGraphTransitionEdge[],
  hoveredNodeId: string | null,
): WorkflowGraphTransitionEdge[] {
  return edges.map((edge) => {
    const { strokeWidth, zIndex } = edgeStrokeStyle(edge, hoveredNodeId);
    const prev = edge.style ?? {};
    if (prev.strokeWidth === strokeWidth && prev.zIndex === zIndex) return edge;
    return { ...edge, style: { ...prev, strokeWidth, zIndex } };
  });
}

function buildEdges(
  draft: WorkflowDraft,
  selectedItem: CanvasItemSelection | null,
  hoveredNodeId: string | null,
  onSelectTransition: (stateDraftId: string, transitionDraftId: string) => void,
  readOnly: boolean,
): Edge[] {
  const edges: WorkflowGraphTransitionEdge[] = [];
  for (const state of draft.states) {
    for (const t of state.transitions) {
      const isSelected =
        selectedItem?.type === "transition" &&
        selectedItem.stateDraftId === state.draftId &&
        selectedItem.transitionDraftId === t.draftId;

      const { sourceHandle, targetHandle } = handlesForDirectedEdge(draft, state.draftId, t.targetDraftId);
      const smoothPath = smoothPathTuningForEdge(draft, state.draftId, t.targetDraftId, sourceHandle, targetHandle);
      const strokeExtras = edgeStrokeStyle(
        {
          source: state.draftId,
          target: t.targetDraftId,
          sourceHandle,
          targetHandle,
          selected: isSelected,
        } as WorkflowGraphTransitionEdge,
        hoveredNodeId,
      );

      edges.push({
        id: t.draftId,
        type: "workflowTransitionEdge",
        source: state.draftId,
        target: t.targetDraftId,
        sourceHandle,
        targetHandle,
        animated: t.actions.length > 0,
        selected: isSelected,
        reconnectable: !readOnly,
        style: {
          stroke: isSelected ? "var(--mui-palette-primary-main, #1976d2)" : EDGE_STROKE_DEFAULT,
          strokeWidth: strokeExtras.strokeWidth,
          strokeDasharray: !t.eventName.trim() ? "5 4" : undefined,
          zIndex: strokeExtras.zIndex,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          sourceStateDraftId: state.draftId,
          eventName: t.eventName,
          guardCount: t.guards.length,
          actionCount: t.actions.length,
          onSelectTransition,
          smoothPath,
        },
      });
    }
  }
  return edges;
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

const WorkflowGraphCanvas: FC<WorkflowGraphCanvasProps> = ({
  draft,
  selectedItem,
  onSelectState,
  onSelectTransition,
  onAddTransition,
  onReconnectTransition,
  onRemoveTransition,
  onRemoveState,
  onUpdateStatePosition,
  onAddStateAfter,
  readOnly = false,
  onAddIsolatedState,
  viewportCenterFlowGetterRef,
}) => {
  const noopGetterRef = useRef<(() => { x: number; y: number } | null) | null>(null);
  const centerGetterRef = viewportCenterFlowGetterRef ?? noopGetterRef;
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  hoveredNodeIdRef.current = hoveredNodeId;

  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(draft, selectedItem, onSelectState, onAddStateAfter, readOnly),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildEdges(draft, selectedItem, null, onSelectTransition, readOnly),
  );

  // Rebuild graph when draft or selection changes (not on hover — avoids React Flow flicker).
  const prevDraftRef = useRef(draft);
  useEffect(() => {
    prevDraftRef.current = draft;
    const builtNodes = buildNodes(draft, selectedItem, onSelectState, onAddStateAfter, readOnly);
    const builtEdges = buildEdges(draft, selectedItem, hoveredNodeIdRef.current, onSelectTransition, readOnly);
    setNodes(patchNodesHover(builtNodes, draft, hoveredNodeIdRef.current));
    setEdges(patchEdgesHover(builtEdges, hoveredNodeIdRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, selectedItem, onSelectState, onAddStateAfter, onSelectTransition, readOnly]);

  // Patch highlight only — keeps node/edge instances stable while hovering.
  useEffect(() => {
    setNodes((nds) => patchNodesHover(nds, draft, hoveredNodeId));
    setEdges((eds) => patchEdgesHover(eds as WorkflowGraphTransitionEdge[], hoveredNodeId));
    // Draft updates are handled by the rebuild effect above; this only reacts to hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, setNodes, setEdges]);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId((prev) => (prev === node.id ? prev : node.id));
  }, []);

  const handleNodeMouseLeave = useCallback((event: React.MouseEvent) => {
    const related = event.relatedTarget;
    if (related instanceof Element && related.closest(REACT_FLOW_NODE_SELECTOR)) {
      return;
    }
    setHoveredNodeId((prev) => (prev === null ? prev : null));
  }, []);

  const handlePaneMouseLeave = useCallback(() => {
    setHoveredNodeId((prev) => (prev === null ? prev : null));
  }, []);

  // Handle node deletions via keyboard (Delete key)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (readOnly) return;
      for (const change of changes) {
        if (change.type === "remove") {
          onRemoveState(change.id);
        }
      }
    },
    [onNodesChange, onRemoveState, readOnly],
  );

  // Handle edge deletions via keyboard (Delete key)
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (readOnly) return;
      for (const change of changes) {
        if (change.type === "remove") {
          for (const state of draft.states) {
            const match = state.transitions.find((t) => t.draftId === change.id);
            if (match) {
              onRemoveTransition(state.draftId, match.draftId);
              break;
            }
          }
        }
      }
    },
    [onEdgesChange, draft.states, onRemoveTransition, readOnly],
  );

  // Persist position to draft on drag end (fires once per drag, not per pixel)
  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      if (readOnly) return;
      onUpdateStatePosition(node.id, node.position);
    },
    [onUpdateStatePosition, readOnly],
  );

  // New connection drawn by user → add transition + auto-open sheet (draft drives edges on next render)
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target) return;
      onAddTransition(connection.source, connection.target);
    },
    [onAddTransition, readOnly],
  );

  const handleReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (readOnly) return;
      onReconnectTransition?.(oldEdge, newConnection);
    },
    [readOnly, onReconnectTransition],
  );

  const isValidConnection = useCallback<IsValidConnection<WorkflowGraphTransitionEdge>>(
    (edgeOrConn) => {
      if (readOnly) return false;
      const c = edgeOrConn as Connection & { id?: string };
      if (!c.source || !c.target) return false;

      const ignoreTransitionId = typeof c.id === "string" ? c.id : undefined;
      const sourceState = draft.states.find((s) => s.draftId === c.source);
      if (
        sourceState?.transitions.some(
          (t) => t.targetDraftId === c.target && t.draftId !== ignoreTransitionId,
        )
      ) {
        return false;
      }

      if (forbidsLeftTargetHandle(draft, c.source, c.target)) {
        return c.targetHandle === H.tt || c.targetHandle === H.tb;
      }

      return true;
    },
    [draft, readOnly],
  );

  // Click on edge → select that transition
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string; source: string }) => {
      onSelectTransition(edge.source, edge.id);
    },
    [onSelectTransition],
  );

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        {...{ [GRAPH_VIEWPORT_DATA_ATTR]: "" }}
        sx={(theme) => ({
          height: 560,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          backgroundColor: "var(--lens-semantic-color-surface-subtle, #fafafa)",
          "& .react-flow__handle.connectingto .wf-handle-dot": {
            transform: "scale(1.35)",
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}`,
          },
          "& .react-flow__handle.connectingto.valid .wf-handle-dot": {
            transform: "scale(1.45)",
            boxShadow: `0 0 0 4px ${theme.palette.primary.main}`,
          },
          "& .react-flow__handle.connectingfrom .wf-handle-dot": {
            transform: "scale(1.2)",
          },
        })}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={readOnly ? undefined : handleConnect}
          onReconnect={readOnly || !onReconnectTransition ? undefined : handleReconnect}
          edgesReconnectable={!readOnly && Boolean(onReconnectTransition)}
          isValidConnection={readOnly ? undefined : isValidConnection}
          onEdgeClick={handleEdgeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onPaneMouseLeave={handlePaneMouseLeave}
          onNodeDragStop={handleNodeDragStop}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={readOnly ? null : "Delete"}
          minZoom={0.3}
          maxZoom={2}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionRadius={36}
          reconnectRadius={28}
        >
          <ViewportCenterRegistrar getterRef={centerGetterRef} />
          {!readOnly && onAddIsolatedState && (
            <Panel position="top-left">
              <Tooltip title={STR.workflowEditor.addNextStageTooltip} placement="right">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={onAddIsolatedState}
                  aria-label={STR.workflowEditor.addNextStageAriaLabel}
                  className="nodrag nopan"
                >
                  {STR.workflowEditor.addNextStageButton}
                </Button>
              </Tooltip>
            </Panel>
          )}
          <Background gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const state = draft.states.find((s) => s.draftId === n.id);
              return state ? STATUS_INDICATOR_RING[state.color] : "#9e9e9e";
            }}
            maskColor="rgba(255,255,255,0.7)"
            style={{ borderRadius: 8 }}
          />
        </ReactFlow>
      </Box>
    </Box>
  );
};

export default WorkflowGraphCanvas;

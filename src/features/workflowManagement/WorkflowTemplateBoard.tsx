import { Fragment, useState } from "react";
import type { FC } from "react";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import LockedIcon from "@diligentcorp/atlas-react-bundle/icons/Locked";
import type { StateViewModel, WorkflowTemplate } from "./types.js";
import type { StatusIndicatorColor } from "./draftTypes.js";
import { STATUS_INDICATOR_ACCENT_FG, STATUS_INDICATOR_RING } from "./draftTypes.js";
import WorkflowDetailDrawer from "./WorkflowDetailDrawer.js";
import { STR } from "../../utils/i18n.js";

// ─── Color maps ───────────────────────────────────────────────────────────────

/**
 * Maps the editor's StatusIndicatorColor to the board's StateViewModel color.
 * The board uses MUI Chip color names; the editor uses Atlas StatusIndicator names.
 */
const EDITOR_TO_BOARD_COLOR: Record<StatusIndicatorColor, StateViewModel["color"]> = {
  subtle: "default",
  information: "info",
  warning: "warning",
  success: "success",
  error: "default", // no direct error variant on the board
  generic: "default",
};

const STATUS_BG: Record<StateViewModel["color"], string> = {
  default: "var(--lens-semantic-color-surface-subtle, #f5f5f5)",
  info: "var(--lens-semantic-color-status-info-subtle, #e8f4fd)",
  warning: "var(--lens-semantic-color-status-warning-subtle, #fff8e1)",
  success: "var(--lens-semantic-color-status-success-subtle, #e8f5e9)",
};

const STATUS_BORDER: Record<StateViewModel["color"], string> = {
  default: "#bdbdbd",
  info: "#64b5f6",
  warning: "#ffb74d",
  success: "#81c784",
};

/** Accent pill on board cards — matches graph node state-name badge. */
const BOARD_STATE_LABEL_BG: Record<StateViewModel["color"], string> = {
  default: STATUS_INDICATOR_RING.subtle,
  info: STATUS_INDICATOR_RING.information,
  warning: STATUS_INDICATOR_RING.warning,
  success: STATUS_INDICATOR_RING.success,
};

const BOARD_STATE_LABEL_FG: Record<StateViewModel["color"], string> = {
  default: STATUS_INDICATOR_ACCENT_FG.subtle,
  info: STATUS_INDICATOR_ACCENT_FG.information,
  warning: STATUS_INDICATOR_ACCENT_FG.warning,
  success: STATUS_INDICATOR_ACCENT_FG.success,
};

// ─── State card ───────────────────────────────────────────────────────────────

interface StateCardProps {
  state: StateViewModel;
  isSelected: boolean;
  onClick: () => void;
}

const StateCard: FC<StateCardProps> = ({ state, isSelected, onClick }) => {
  const { tokens } = useTheme() as {
    tokens: Record<string, unknown> & {
      semantic?: {
        color?: {
          type?: {
            default?: { value?: string };
            muted?: { value?: string };
          };
        };
      };
    };
  };

  const isProtected = state.transitions.some(
    (t) => t.guards.length > 0 || t.actions.length > 0,
  );
  const firstTransition = state.transitions[0];
  const isTerminal = state.transitions.length === 0;
  const firstGuardCount = firstTransition?.guards.length ?? 0;
  const firstActionCount = firstTransition?.actions.length ?? 0;
  const firstTransitionMeta = firstGuardCount > 0 || firstActionCount > 0;
  /** Another outgoing transition (not the one summarized on the card) carries guards or actions. */
  const protectedBeyondFirst =
    isProtected &&
    firstTransition &&
    !firstTransitionMeta &&
    state.transitions.slice(1).some((t) => t.guards.length > 0 || t.actions.length > 0);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${state.label} — ${state.summary}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        flexShrink: 0,
        width: 220,
        borderRadius: 2,
        border: "2px solid",
        borderColor: isSelected ? STATUS_BORDER[state.color] : "transparent",
        backgroundColor: STATUS_BG[state.color],
        p: 2,
        cursor: "pointer",
        outline: "none",
        transition: "box-shadow 150ms, border-color 150ms",
        boxShadow: isSelected ? 3 : 1,
        "&:hover": { boxShadow: 3 },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: STATUS_BORDER[state.color],
          outlineOffset: 2,
        },
      }}
    >
      <Stack gap={1}>
        <Chip
          label={state.label}
          size="small"
          sx={{
            alignSelf: "flex-start",
            fontWeight: 600,
            backgroundColor: BOARD_STATE_LABEL_BG[state.color],
            color: BOARD_STATE_LABEL_FG[state.color],
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color:
              (
                tokens?.semantic as {
                  color?: { type?: { default?: { value?: string } } };
                }
              )?.color?.type?.default?.value ?? "text.primary",
            lineHeight: 1.4,
          }}
        >
          {state.summary}
        </Typography>

        {/* Outgoing event name */}
        {!isTerminal && firstTransition && (
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.25 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
              {STR.workflowManagement.eventLabel}
            </Typography>
            <Chip
              label={
                <Stack direction="row" alignItems="baseline" component="span" spacing={0.35} sx={{ py: 0 }}>
                  <Typography
                    component="span"
                    variant="inherit"
                    sx={{ fontFamily: "monospace", fontSize: "0.6rem", fontWeight: 500, lineHeight: 1.2 }}
                  >
                    {firstTransition.eventName}
                  </Typography>
                  {firstTransitionMeta && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.55rem", fontWeight: 500, lineHeight: 1.2, whiteSpace: "nowrap" }}
                    >
                      ·
                      {firstGuardCount > 0 ? ` ${STR.workflowEditor.transitionChipGuardsAbbr(firstGuardCount)}` : ""}
                      {firstActionCount > 0 ? ` ${STR.workflowEditor.transitionChipActionsAbbr(firstActionCount)}` : ""}
                    </Typography>
                  )}
                </Stack>
              }
              size="small"
              variant="outlined"
              aria-label={
                firstTransitionMeta
                  ? STR.workflowEditor.transitionTriggerChipAria(
                      firstTransition.eventName,
                      firstGuardCount,
                      firstActionCount,
                    )
                  : `${STR.workflowEditor.connectionAriaLabel}: ${firstTransition.eventName}`
              }
              sx={{
                height: "auto",
                minHeight: 18,
                py: 0.15,
                "& .MuiChip-label": { px: 0.75, py: 0, display: "block" },
              }}
            />
          </Stack>
        )}

        {/* Protected indicator */}
        {protectedBeyondFirst && (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <LockedIcon
              sx={{
                fontSize: 12,
                color:
                  (
                    tokens?.semantic as {
                      color?: { type?: { muted?: { value?: string } } };
                    }
                  )?.color?.type?.muted?.value ?? "text.secondary",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color:
                  (
                    tokens?.semantic as {
                      color?: { type?: { muted?: { value?: string } } };
                    }
                  )?.color?.type?.muted?.value ?? "text.secondary",
                fontStyle: "italic",
              }}
            >
              {STR.workflowManagement.protectedStep}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

// ─── Arrow ────────────────────────────────────────────────────────────────────

const Arrow: FC = () => (
  <Box
    aria-hidden
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "text.secondary",
      fontSize: "1.5rem",
      px: 0.5,
      mt: "10px",
    }}
  >
    →
  </Box>
);

// ─── Template metadata bar ────────────────────────────────────────────────────

interface TemplateBadgesProps {
  template: WorkflowTemplate;
}

const TemplateBadges: FC<TemplateBadgesProps> = ({ template }) => (
  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
    <Chip
      label={`v${template.version}`}
      size="small"
      variant="outlined"
      color="default"
      sx={{ fontWeight: 600 }}
    />
    <Chip label={template.service} size="small" variant="outlined" color="default" />
    <Typography variant="caption" color="text.secondary">
      {STR.workflowManagement.templateMetaOrg(template.org_id)}
    </Typography>
  </Stack>
);

// ─── Board ────────────────────────────────────────────────────────────────────

interface WorkflowTemplateBoardProps {
  template: WorkflowTemplate;
  states: StateViewModel[];
  /**
   * Optional color overrides keyed by FSM state name (e.g. "in_review").
   * Passed back from the editor via router state so board colors stay in sync
   * after the user edits the template. Values use the editor's StatusIndicatorColor.
   */
  colorOverrides?: Record<string, StatusIndicatorColor>;
}

const WorkflowTemplateBoard: FC<WorkflowTemplateBoardProps> = ({
  template,
  states,
  colorOverrides,
}) => {
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const selectedState = states.find((s) => s.id === selectedStateId) ?? null;

  const handleCardClick = (id: string) => {
    setSelectedStateId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <TemplateBadges template={template} />

      {/* Board */}
      <Box sx={{ overflowX: "auto", pb: 2 }}>
        <Stack direction="row" alignItems="flex-start" gap={0} sx={{ minWidth: "max-content" }}>
          {states.map((state, index) => {
            // Apply editor color overrides when available
            const overrideColor =
              colorOverrides?.[state.id] != null
                ? EDITOR_TO_BOARD_COLOR[colorOverrides[state.id]]
                : undefined;
            const resolvedState: StateViewModel = overrideColor
              ? { ...state, color: overrideColor }
              : state;

            return (
              <Fragment key={state.id}>
                <StateCard
                  state={resolvedState}
                  isSelected={selectedStateId === state.id}
                  onClick={() => handleCardClick(state.id)}
                />
                {index < states.length - 1 && <Arrow />}
              </Fragment>
            );
          })}
        </Stack>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {STR.workflowManagement.boardHint}
      </Typography>

      {/* Detail panel */}
      {selectedState && (
        <WorkflowDetailDrawer
          state={selectedState}
          allStates={states}
          onClose={() => setSelectedStateId(null)}
        />
      )}
    </>
  );
};

export default WorkflowTemplateBoard;

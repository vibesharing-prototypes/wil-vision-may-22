import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@diligentcorp/atlas-react-bundle/icons/Close";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import DeleteIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import type { TransitionDraft, WorkflowStateDraft } from "./draftTypes.js";
import type { Guard, Action } from "./types.js";
import { newDraftId } from "./draftTypes.js";
import { STR } from "../../utils/i18n.js";
import { uiDividerDefaultBorderColor } from "../../utils/uiDividerBorder.js";

interface WorkflowTransitionSheetProps {
  /** Source state of this transition. */
  sourceState: WorkflowStateDraft | null;
  /** Target state of this transition (derived from targetDraftId). */
  targetState: WorkflowStateDraft | null;
  /** The transition being edited, or null when the sheet is closed. */
  transition: TransitionDraft | null;
  /** All states in the draft — used to populate the target-state selector. */
  allStates: WorkflowStateDraft[];
  readOnly?: boolean;
  onSave: (
    stateDraftId: string,
    transitionDraftId: string,
    updates: {
      eventName: string;
      targetDraftId: string;
      guards: Guard[];
      actions: Action[];
    },
  ) => void;
  onClose: () => void;
  /** Called when the user confirms removing this transition. */
  onRemoveTransition?: (stateDraftId: string, transitionDraftId: string) => void;
}

// ─── Guard row ────────────────────────────────────────────────────────────────

interface GuardRowProps {
  guard: Guard;
  onChange: (updated: Guard) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const GuardRow: FC<GuardRowProps> = ({ guard, onChange, onRemove, readOnly }) => (
  <Box
    sx={({ tokens }) => ({
      border: "1px solid",
      borderColor: uiDividerDefaultBorderColor(tokens),
      borderRadius: 2,
      p: 2,
      backgroundColor: "background.paper",
    })}
  >
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Chip
          label={STR.workflowManagement.guardTypeBadge}
          size="small"
          variant="outlined"
          color="warning"
          sx={{ fontSize: "0.65rem", flexShrink: 0 }}
        />
        {!readOnly && (
          <IconButton
            size="small"
            aria-label={STR.workflowEditor.removeGuardAria(guard.name)}
            onClick={onRemove}
            sx={{ ml: "auto", flexShrink: 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <TextField
        label={STR.workflowEditor.guardNameLabel}
        value={guard.name}
        onChange={(e) => onChange({ ...guard, name: e.target.value })}
        size="small"
        fullWidth
        inputProps={{ style: { fontFamily: "monospace" }, readOnly: !!readOnly }}
      />
      <TextField
        label={STR.workflowEditor.guardUrlLabel}
        value={guard.url}
        onChange={(e) => onChange({ ...guard, url: e.target.value })}
        size="small"
        fullWidth
        placeholder="https://your-service/webhooks/guard-name"
        inputProps={{ style: { fontFamily: "monospace", fontSize: "0.75rem" }, readOnly: !!readOnly }}
      />
    </Stack>
  </Box>
);

// ─── Action row ───────────────────────────────────────────────────────────────

interface ActionRowProps {
  action: Action;
  onChange: (updated: Action) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const ActionRow: FC<ActionRowProps> = ({ action, onChange, onRemove, readOnly }) => (
  <Box
    sx={({ tokens }) => ({
      border: "1px solid",
      borderColor: uiDividerDefaultBorderColor(tokens),
      borderRadius: 2,
      p: 2,
      backgroundColor: "background.paper",
    })}
  >
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Chip
          label={STR.workflowManagement.actionTypeBadge}
          size="small"
          variant="outlined"
          color="info"
          sx={{ fontSize: "0.65rem", flexShrink: 0 }}
        />
        {!readOnly && (
          <IconButton
            size="small"
            aria-label={STR.workflowEditor.removeActionAria(action.name)}
            onClick={onRemove}
            sx={{ ml: "auto", flexShrink: 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <TextField
        label={STR.workflowEditor.actionNameLabel}
        value={action.name}
        onChange={(e) => onChange({ ...action, name: e.target.value })}
        size="small"
        fullWidth
        inputProps={{ style: { fontFamily: "monospace" }, readOnly: !!readOnly }}
      />
    </Stack>
  </Box>
);

// ─── Component ────────────────────────────────────────────────────────────────

const WorkflowTransitionSheet: FC<WorkflowTransitionSheetProps> = ({
  sourceState,
  targetState,
  transition,
  allStates,
  readOnly = false,
  onSave,
  onClose,
  onRemoveTransition,
}) => {
  const [eventName, setEventName] = useState("");
  const [targetDraftId, setTargetDraftId] = useState("");
  const [guards, setGuards] = useState<Guard[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    if (transition) {
      setEventName(transition.eventName);
      setTargetDraftId(transition.targetDraftId);
      setGuards(transition.guards);
      setActions(transition.actions);
    }
  }, [transition?.draftId, transition]);

  const isValid = eventName.trim().length > 0 && targetDraftId.length > 0;

  const handleSave = () => {
    if (!transition || !sourceState || !isValid) return;
    onSave(sourceState.draftId, transition.draftId, {
      eventName: eventName.trim(),
      targetDraftId,
      guards,
      actions,
    });
    onClose();
  };

  const handleAddGuard = () => {
    setGuards((prev) => [
      ...prev,
      { name: "", type: "custom_webhook", url: "" },
    ]);
  };

  const handleUpdateGuard = (index: number, updated: Guard) => {
    setGuards((prev) => prev.map((g, i) => (i === index ? updated : g)));
  };

  const handleRemoveGuard = (index: number) => {
    setGuards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    setActions((prev) => [...prev, { name: "", type: "custom" }]);
  };

  const handleUpdateAction = (index: number, updated: Action) => {
    setActions((prev) => prev.map((a, i) => (i === index ? updated : a)));
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveTransition = () => {
    if (!transition || !sourceState || !onRemoveTransition) return;
    onRemoveTransition(sourceState.draftId, transition.draftId);
    onClose();
  };

  const isNewTransition = !eventName.trim();

  // Suppress unused variable warning
  void newDraftId;

  const sourceName = sourceState?.name.trim() || STR.workflowEditor.unnamedState;
  const resolvedTargetName =
    allStates.find((s) => s.draftId === targetDraftId)?.name.trim() ||
    targetState?.name.trim() ||
    STR.workflowEditor.unnamedState;

  return (
    <Drawer
      anchor="right"
      open={transition !== null}
      onClose={onClose}
      PaperProps={{
        role: "dialog",
        "aria-labelledby": "transition-sheet-title",
        "aria-modal": "true",
        sx: { width: { xs: "100%", sm: 480 }, display: "flex", flexDirection: "column" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Stack gap={0.5}>
          <Typography id="transition-sheet-title" variant="h3" component="h2" fontWeight={600}>
            {STR.workflowEditor.transitionSheetTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {STR.workflowEditor.transitionSheetSubtitle(sourceName, resolvedTargetName)}
          </Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={STR.workflowEditor.transitionSheetCloseAria}
          edge="end"
          sx={{ flexShrink: 0, mt: 0.25 }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 3 }}>
        <Stack gap={3}>
          {isNewTransition && !readOnly && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption">{STR.workflowEditor.removeNewTransitionHint}</Typography>
            </Alert>
          )}

          {/* Event name */}
          <TextField
            id="event-name"
            label={STR.workflowEditor.eventNameLabel}
            helperText={STR.workflowEditor.eventNameHint}
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            fullWidth
            required
            autoFocus={!readOnly}
            inputProps={{
              "aria-required": "true",
              style: { fontFamily: "monospace" },
              readOnly,
            }}
          />

          {/* Target state selector */}
          <FormControl fullWidth size="small">
            <InputLabel id="transition-target-label">
              {STR.workflowEditor.transitionTargetLabel}
            </InputLabel>
            <Select
              labelId="transition-target-label"
              id="transition-target"
              value={targetDraftId}
              label={STR.workflowEditor.transitionTargetLabel}
              onChange={(e) => setTargetDraftId(e.target.value)}
              disabled={readOnly}
            >
              {allStates.map((s) => (
                <MenuItem key={s.draftId} value={s.draftId}>
                  {s.name.trim() || `(${STR.workflowEditor.unnamedState})`}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{STR.workflowEditor.transitionTargetHint}</FormHelperText>
          </FormControl>

          <Divider sx={({ tokens }) => ({ borderColor: uiDividerDefaultBorderColor(tokens) })} />

          {/* Guards */}
          <Stack gap={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack gap={0.25}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {STR.workflowManagement.guardsTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {STR.workflowEditor.guardsSectionHint}
                </Typography>
              </Stack>
              {!readOnly && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddGuard}
                  sx={{ flexShrink: 0 }}
                >
                  {STR.workflowEditor.addGuardButton}
                </Button>
              )}
            </Stack>

            {guards.length > 0 && (
              <Stack gap={1}>
                {guards.map((guard, index) => (
                  <GuardRow
                    key={index}
                    guard={guard}
                    readOnly={readOnly}
                    onChange={(updated) => handleUpdateGuard(index, updated)}
                    onRemove={() => handleRemoveGuard(index)}
                  />
                ))}
              </Stack>
            )}

            {guards.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                {STR.workflowEditor.noGuardsPlaceholder}
              </Typography>
            )}
          </Stack>

          <Divider sx={({ tokens }) => ({ borderColor: uiDividerDefaultBorderColor(tokens) })} />

          {/* Actions */}
          <Stack gap={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack gap={0.25}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {STR.workflowManagement.actionsTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {STR.workflowEditor.actionsSectionHint}
                </Typography>
              </Stack>
              {!readOnly && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddAction}
                  sx={{ flexShrink: 0 }}
                >
                  {STR.workflowEditor.addActionButton}
                </Button>
              )}
            </Stack>

            {actions.length > 0 && (
              <>
                <Stack gap={1}>
                  {actions.map((action, index) => (
                    <ActionRow
                      key={index}
                      action={action}
                      readOnly={readOnly}
                      onChange={(updated) => handleUpdateAction(index, updated)}
                      onRemove={() => handleRemoveAction(index)}
                    />
                  ))}
                </Stack>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">
                    {STR.workflowManagement.actionAsyncNote}
                  </Typography>
                </Alert>
              </>
            )}

            {actions.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                {STR.workflowEditor.noActionsPlaceholder}
              </Typography>
            )}
          </Stack>

          {/* Remove transition — always last */}
          {!readOnly && onRemoveTransition && (
            <>
              <Divider sx={({ tokens }) => ({ borderColor: uiDividerDefaultBorderColor(tokens) })} />
              <Stack gap={1}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: "error.main" }}>
                  {STR.workflowEditor.removeTransitionButton}
                </Typography>
                <Typography variant="body1" sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                  {STR.workflowEditor.removeTransitionWarning}
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TrashIcon />}
                    onClick={handleRemoveTransition}
                    sx={({ tokens, palette }) => {
                      const d = tokens?.semantic?.color?.action?.destructive;
                      const fg = d?.default?.value ?? palette.error.main;
                      const border = d?.default?.value ?? palette.error.main;
                      const hoverBorder = d?.hover?.value ?? palette.error.dark;
                      let hoverBg: string;
                      try {
                        hoverBg = alpha(
                          palette.error.main,
                          palette.mode === "dark" ? 0.16 : 0.08,
                        );
                      } catch {
                        hoverBg =
                          palette.mode === "dark"
                            ? "rgba(244, 67, 54, 0.16)"
                            : "rgba(211, 47, 47, 0.08)";
                      }
                      return {
                        borderColor: border,
                        color: fg,
                        "& .MuiButton-startIcon": { color: fg },
                        "&:hover": {
                          borderColor: hoverBorder,
                          backgroundColor: hoverBg,
                          color: fg,
                        },
                        "&:focus-visible": {
                          outline: `2px solid ${tokens?.semantic?.color?.ui?.focusRing?.value ?? palette.primary.main}`,
                          outlineOffset: 1,
                        },
                      };
                    }}
                  >
                    {STR.workflowEditor.removeTransitionButton}
                  </Button>
                </Box>
              </Stack>
            </>
          )}
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Button variant="outlined" onClick={onClose}>
          {readOnly ? STR.workflowEditor.closeSheet : STR.workflowEditor.cancel}
        </Button>
        {!readOnly && (
          <Button variant="contained" onClick={handleSave} disabled={!isValid}>
            {STR.workflowEditor.saveTransition}
          </Button>
        )}
      </Box>
    </Drawer>
  );
};

export default WorkflowTransitionSheet;

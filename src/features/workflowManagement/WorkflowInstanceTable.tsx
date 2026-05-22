import type { FC } from "react";
import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AutomatedLockedIcon from "@diligentcorp/atlas-react-bundle/icons/AutomatedLocked";
import type { WorkflowInstance, StateViewModel } from "./types.js";
import { STR } from "../../utils/i18n.js";
import { uiDividerDefaultBorderColor } from "../../utils/uiDividerBorder.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<
  StateViewModel["color"],
  "default" | "info" | "warning" | "success"
> = {
  default: "default",
  info: "info",
  warning: "warning",
  success: "success",
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkflowInstanceTableProps {
  instances: WorkflowInstance[];
  /** View model map keyed by state id — used to look up chip color and label. */
  stateViewModels: StateViewModel[];
  /**
   * When true, renders a smaller heading and scoped copy for use under each template
   * on the workflows home page.
   */
  nestedUnderTemplate?: boolean;
  /** Optional accessible name for the table (e.g. includes template name when nested). */
  tableAriaLabel?: string;
}

const WorkflowInstanceTable: FC<WorkflowInstanceTableProps> = ({
  instances,
  stateViewModels,
  nestedUnderTemplate = false,
  tableAriaLabel,
}) => {
  const stateMap = new Map(stateViewModels.map((s) => [s.id, s]));
  const lockedCount = instances.filter((i) => i.locked_by !== null).length;

  const resolvedTableAria =
    tableAriaLabel ?? STR.workflowManagement.instancesTableAriaLabel;

  return (
    <Stack gap={2}>
      {/* Section header */}
      <Stack gap={0.5}>
        <Typography
          component={nestedUnderTemplate ? "h3" : "h2"}
          variant={nestedUnderTemplate ? "h6" : "h4"}
          sx={{ fontWeight: 600 }}
        >
          {STR.workflowManagement.instancesTitle}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          {nestedUnderTemplate
            ? STR.workflowManagement.instancesSubtitleNested
            : STR.workflowManagement.instancesSubtitle}
        </Typography>
      </Stack>

      {instances.length === 0 && (
        <Typography variant="body1" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          {STR.workflowManagement.instancesEmptyForTemplate}
        </Typography>
      )}

      {/* Lock warning banner when any instance is locked */}
      {instances.length > 0 && lockedCount > 0 && (
        <Alert severity="warning" icon={<AutomatedLockedIcon fontSize="inherit" />}>
          <Typography variant="body1">
            {STR.workflowManagement.instancesLockBanner(lockedCount)}
          </Typography>
        </Alert>
      )}

      {/* Table */}
      {instances.length > 0 && (
      <TableContainer
        sx={({ tokens }) => ({
          borderRadius: 2,
          border: "1px solid",
          borderColor: uiDividerDefaultBorderColor(tokens),
        })}
      >
        <Table size="small" aria-label={resolvedTableAria}>
          <TableHead>
            <TableRow
              sx={{ backgroundColor: "var(--lens-semantic-color-surface-subtle, #f5f5f5)" }}
            >
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>
                {STR.workflowManagement.instanceColObject}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>
                {STR.workflowManagement.instanceColType}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>
                {STR.workflowManagement.instanceColState}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>
                {STR.workflowManagement.instanceColUpdated}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, width: 40 }} aria-label="Status" />
            </TableRow>
          </TableHead>
          <TableBody>
            {instances.map((instance) => {
              const vm = stateMap.get(instance.state);
              const isLocked = instance.locked_by !== null;

              return (
                <TableRow
                  key={instance.id}
                  sx={{
                    opacity: isLocked ? 0.85 : 1,
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  {/* Object label */}
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: isLocked ? 500 : 400 }}>
                      {instance.objectRef.label}
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
                      {instance.objectRef.id}
                    </Typography>
                  </TableCell>

                  {/* Object type */}
                  <TableCell>
                    <Chip
                      label={instance.objectRef.objectType}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>

                  {/* Current state */}
                  <TableCell>
                    {vm ? (
                      <Chip
                        label={vm.label}
                        size="small"
                        color={STATUS_CHIP_COLOR[vm.color]}
                        variant={vm.color === "default" ? "outlined" : "filled"}
                      />
                    ) : (
                      <Chip
                        label={instance.state}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: "monospace" }}
                      />
                    )}
                  </TableCell>

                  {/* Last updated */}
                  <TableCell>
                    <Tooltip title={new Date(instance.updated_at).toLocaleString()} placement="top">
                      <Typography variant="body1" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                        {formatRelativeDate(instance.updated_at)}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  {/* Lock indicator */}
                  <TableCell>
                    {isLocked && (
                      <Tooltip title={STR.workflowManagement.instanceLockedTooltip}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            color: "warning.main",
                            "& svg, & [slot=icon]": { fontSize: 16, width: 16, height: 16 },
                          }}
                          aria-label={STR.workflowManagement.instanceLockedAriaLabel}
                        >
                          <AutomatedLockedIcon aria-hidden />
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Typography variant="body1" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
        {nestedUnderTemplate
          ? STR.workflowManagement.instancesFootnoteNested
          : STR.workflowManagement.instancesFootnote}
      </Typography>
    </Stack>
  );
};

export default WorkflowInstanceTable;

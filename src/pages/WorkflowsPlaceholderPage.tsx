import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { PageHeader } from "@diligentcorp/atlas-react-bundle";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import EditIcon from "@diligentcorp/atlas-react-bundle/icons/Edit";
import MoreIcon from "@diligentcorp/atlas-react-bundle/icons/More";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import { useNavigate, useLocation } from "react-router";
import PageLayout from "../components/PageLayout.js";
import { countActiveWorkflowInstances } from "../features/workflowManagement/countActiveWorkflowInstances.js";
import { countDefinitionStates } from "../features/workflowManagement/countDefinitionStates.js";
import {
  WorkflowTemplateDeleteBlockedDialog,
  WorkflowTemplateDeleteConfirmDialog,
} from "../features/workflowManagement/WorkflowTemplateDeletionDialogs.js";
import { WorkflowDataSourceChip } from "../features/workflowManagement/WorkflowDataSourceChip.js";
import { useWorkflowsRepository } from "../features/workflowManagement/hooks/useWorkflowsRepository.js";
import type { WorkflowInstance, WorkflowTemplate } from "../features/workflowManagement/types.js";
import { STR } from "../utils/i18n.js";

const D = STR.workflowManagement.templateDeletion;

function instancesForTemplate(
  instances: WorkflowInstance[],
  templateId: string,
): WorkflowInstance[] {
  return instances.filter((i) => i.workflow_templates_id === templateId);
}

function lastUpdatedIsoForTemplate(template: WorkflowTemplate, rows: WorkflowInstance[]): string {
  if (rows.length === 0) return template.created_at;
  return rows.reduce(
    (latest, r) => (new Date(r.updated_at) > new Date(latest) ? r.updated_at : latest),
    rows[0].updated_at,
  );
}

/**
 * Workflows home — compact template list (instance counts, last activity, locks).
 */
interface WorkflowsHomeLocationState {
  deletedTemplateId?: string;
}

const WorkflowsPlaceholderPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    templates,
    instances,
    dataSource,
    loading,
    showFallbackNotice,
    refresh,
  } = useWorkflowsRepository();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(() => {
    if (showFallbackNotice) setFallbackOpen(true);
  }, [showFallbackNotice]);
  const [menuTemplate, setMenuTemplate] = useState<WorkflowTemplate | null>(null);
  const [blockedDialog, setBlockedDialog] = useState<{ name: string; count: number } | null>(null);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    const st = location.state as WorkflowsHomeLocationState | null;
    const id = st?.deletedTemplateId;
    if (!id) return;
    refresh();
    navigate(".", { replace: true, state: {} });
  }, [location.state, navigate, refresh]);

  const openTemplate = useCallback(
    (template: WorkflowTemplate, interaction: "readonly" | "edit") => {
      const templateKey =
        template.service === "audit-findings"
          ? "findings"
          : template.name.toLowerCase().includes("issue")
            ? "issue-triage"
            : "risk";
      navigate("/workflows/template/edit", {
        state: { mode: "edit", template, interaction, templateKey },
      });
    },
    [navigate],
  );

  const handleRowOpen = useCallback(
    (template: WorkflowTemplate) => {
      openTemplate(template, "readonly");
    },
    [openTemplate],
  );

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuTemplate(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: WorkflowTemplate) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuTemplate(template);
  };

  const requestDelete = (template: WorkflowTemplate) => {
    const active = countActiveWorkflowInstances(instances, template.id);
    if (active > 0) {
      setBlockedDialog({ name: template.name, count: active });
    } else {
      setConfirmDeleteTemplate(template);
    }
  };

  const handleMenuEdit = () => {
    if (menuTemplate) openTemplate(menuTemplate, "edit");
    closeMenu();
  };

  const handleMenuDelete = () => {
    if (menuTemplate) requestDelete(menuTemplate);
    closeMenu();
  };

  const confirmDelete = () => {
    if (!confirmDeleteTemplate) return;
    refresh();
    setConfirmDeleteTemplate(null);
  };

  return (
    <PageLayout>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <PageHeader
          pageTitle={STR.workflowManagement.pageTitle}
          pageSubtitle={STR.workflowManagement.pageSubtitle}
        />
        <WorkflowDataSourceChip dataSource={dataSource} />
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 1.5 }}
      >
        <Typography component="h2" variant="h4" sx={{ fontWeight: 600 }}>
          {STR.workflowManagement.templatesListSectionTitle}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => navigate("/workflows/template/edit", { state: { mode: "new" } })}
        >
          {STR.workflowEditor.newTemplateButton}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Table size="small" aria-label={STR.workflowManagement.templatesListSectionTitle}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--lens-semantic-color-surface-subtle, #f5f5f5)" }}>
              <TableCell sx={{ fontWeight: 600 }}>{STR.workflowManagement.templatesListColTemplate}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.workflowManagement.templatesListColStates}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.workflowManagement.templatesListColInstances}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.workflowManagement.templatesListColLastUpdated}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.workflowManagement.templatesListColLocked}</TableCell>
              <TableCell align="right" sx={{ width: 48 }}>
                <Box component="span" sx={visuallyHidden}>
                  {STR.workflowManagement.templatesListColActions}
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body1" color="text.secondary">
                    {STR.workflowManagement.templatesListLoading}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!loading &&
              templates.map((template) => {
              const rows = instancesForTemplate(instances, template.id);
              const instanceCount = rows.length;
              const lockedCount = rows.filter((i) => i.locked_by !== null).length;
              const lastIso = lastUpdatedIsoForTemplate(template, rows);
              const stateCount = countDefinitionStates(template);
              const lastLabel =
                instanceCount === 0
                  ? STR.workflowManagement.templatesListNoInstancesDash
                  : new Date(lastIso).toLocaleDateString(undefined, { dateStyle: "medium" });

              return (
                <TableRow
                  key={template.id}
                  hover
                  onClick={() => handleRowOpen(template)}
                  sx={{ cursor: "pointer" }}
                  aria-label={D.templatesRowOpenAria(template.name)}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {template.name}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Chip
                      size="small"
                      label={STR.workflowManagement.templatesListStateChipLabel(stateCount)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Chip
                      size="small"
                      label={STR.workflowManagement.templatesListInstanceChipLabel(instanceCount)}
                      color={instanceCount > 0 ? "primary" : "default"}
                      variant={instanceCount > 0 ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    {instanceCount > 0 ? (
                      <Tooltip title={new Date(lastIso).toLocaleString()}>
                        <Typography variant="body1" sx={{ color: "text.secondary" }}>
                          {lastLabel}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body1" sx={{ color: "text.secondary" }}>
                        {lastLabel}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {lockedCount > 0 ? (
                      <Typography variant="body1" sx={{ color: "warning.main", fontWeight: 600 }}>
                        {STR.workflowManagement.templatesListLockedSummary(lockedCount)}
                      </Typography>
                    ) : (
                      <Typography variant="body1" sx={{ color: "text.secondary" }}>
                        {STR.workflowManagement.templatesListLockedSummary(0)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      aria-label={D.templatesRowMoreAria(template.name)}
                      aria-haspopup="true"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreIcon aria-hidden />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            handleMenuEdit();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" aria-hidden />
          </ListItemIcon>
          {D.templatesMenuEdit}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuDelete();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <TrashIcon fontSize="small" aria-hidden />
          </ListItemIcon>
          {D.templatesMenuDelete}
        </MenuItem>
      </Menu>

      <WorkflowTemplateDeleteBlockedDialog
        open={blockedDialog !== null}
        templateName={blockedDialog?.name ?? ""}
        activeInstanceCount={blockedDialog?.count ?? 0}
        onClose={() => setBlockedDialog(null)}
      />

      <WorkflowTemplateDeleteConfirmDialog
        open={confirmDeleteTemplate !== null}
        templateName={confirmDeleteTemplate?.name ?? ""}
        onClose={() => setConfirmDeleteTemplate(null)}
        onConfirm={confirmDelete}
      />

      <Snackbar
        open={fallbackOpen}
        autoHideDuration={6000}
        onClose={() => setFallbackOpen(false)}
        message={STR.workflowManagement.fallbackNotice}
      />
    </PageLayout>
  );
};

export default WorkflowsPlaceholderPage;

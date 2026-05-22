import type { FC } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@diligentcorp/atlas-react-bundle/icons/Close";
import WarningIcon from "@diligentcorp/atlas-react-bundle/icons/Warning";
import { STR } from "../../utils/i18n.js";

const D = STR.workflowManagement.templateDeletion;

export interface WorkflowTemplateDeleteBlockedDialogProps {
  open: boolean;
  templateName: string;
  activeInstanceCount: number;
  onClose: () => void;
}

/**
 * Shown when the user tries to delete a template that still has active instances.
 */
export const WorkflowTemplateDeleteBlockedDialog: FC<WorkflowTemplateDeleteBlockedDialogProps> = ({
  open,
  templateName,
  activeInstanceCount,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    aria-labelledby="workflow-template-delete-blocked-title"
    aria-describedby="workflow-template-delete-blocked-description"
    fullWidth
  >
    <DialogTitle
      component="div"
      sx={{
        position: "relative",
        pr: 5,
        pl: 3,
        pt: 2,
        pb: 1,
        boxSizing: "border-box",
      }}
    >
      <IconButton
        aria-label={D.closeBlockedAria}
        onClick={onClose}
        color="inherit"
        size="small"
        sx={{ position: "absolute", right: 8, top: 8 }}
      >
        <CloseIcon aria-hidden />
      </IconButton>
      <Stack direction="row" gap={1.5} alignItems="flex-start" sx={{ pr: 1 }}>
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            color: "warning.main",
            flexShrink: 0,
            mt: 0.25,
            "& svg, & [slot=icon]": { fontSize: 28, width: 28, height: 28 },
          }}
        >
          <WarningIcon />
        </Box>
        <Stack gap={0.5} sx={{ minWidth: 0 }}>
          <Typography
            id="workflow-template-delete-blocked-title"
            component="h2"
            variant="h6"
            sx={{ m: 0, fontWeight: 600 }}
          >
            {D.blockedTitle}
          </Typography>
          <Typography variant="body1" component="p" sx={{ m: 0, fontWeight: 600 }}>
            {templateName}
          </Typography>
        </Stack>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ pt: 0, px: 3, pb: 2, boxSizing: "border-box" }}>
      <Typography
        id="workflow-template-delete-blocked-description"
        variant="body1"
        component="div"
        sx={{ m: 0, color: "text.secondary" }}
      >
        {D.blockedBody(activeInstanceCount)}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, boxSizing: "border-box" }}>
      <Button variant="contained" onClick={onClose} color="primary">
        {D.blockedDismiss}
      </Button>
    </DialogActions>
  </Dialog>
);

export interface WorkflowTemplateDeleteConfirmDialogProps {
  open: boolean;
  templateName: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirms deletion when the template has no active instances (prototype-local removal).
 */
export const WorkflowTemplateDeleteConfirmDialog: FC<WorkflowTemplateDeleteConfirmDialogProps> = ({
  open,
  templateName,
  onClose,
  onConfirm,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="workflow-template-delete-confirm-title"
      aria-describedby="workflow-template-delete-confirm-description"
      fullWidth
    >
      <DialogTitle
        component="div"
        sx={{
          position: "relative",
          pr: 5,
          pl: 3,
          pt: 2,
          pb: 1,
          boxSizing: "border-box",
        }}
      >
        <IconButton
          aria-label={D.closeConfirmAria}
          onClick={onClose}
          color="inherit"
          size="small"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon aria-hidden />
        </IconButton>
        <Stack gap={0.5} sx={{ alignItems: "flex-start", textAlign: "left", pr: 1, width: "100%" }}>
          <Typography
            id="workflow-template-delete-confirm-title"
            component="h2"
            variant="h6"
            sx={{ m: 0, p: 0, width: "100%" }}
          >
            {D.confirmTitle}
          </Typography>
          <Typography component="p" variant="body1" sx={{ m: 0, p: 0, fontWeight: 600, width: "100%" }}>
            {templateName}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 3, pb: 2, boxSizing: "border-box" }}>
        <Stack gap={2} sx={{ alignItems: "stretch", textAlign: "left" }}>
          <Typography
            id="workflow-template-delete-confirm-description"
            variant="body1"
            component="div"
            sx={{ m: 0, color: "text.secondary" }}
          >
            {D.confirmSubtitle}
          </Typography>
          <Typography variant="body1" component="div" sx={{ m: 0, color: "error.main", fontWeight: 600 }}>
            {D.confirmPermanence}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, boxSizing: "border-box" }}>
        <Button variant="outlined" onClick={onClose}>
          {D.confirmCancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          autoFocus
          sx={(theme) => ({
            bgcolor: "error.main",
            color: theme.palette.error.contrastText,
            "&:hover": { bgcolor: "error.dark" },
          })}
        >
          {D.confirmDelete}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

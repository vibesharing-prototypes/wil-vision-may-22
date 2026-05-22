import type { FC } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  ListItemIcon,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import ExpandDownIcon from "@diligentcorp/atlas-react-bundle/icons/ExpandDown";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import AttachIcon from "@diligentcorp/atlas-react-bundle/icons/Attach";
import AutomatedLockedIcon from "@diligentcorp/atlas-react-bundle/icons/AutomatedLocked";
import CalendarIcon from "@diligentcorp/atlas-react-bundle/icons/Calendar";
import CircleLineIcon from "@diligentcorp/atlas-react-bundle/icons/CircleLine";
import DataIcon from "@diligentcorp/atlas-react-bundle/icons/Data";
import DocumentIcon from "@diligentcorp/atlas-react-bundle/icons/Document";
import LockedIcon from "@diligentcorp/atlas-react-bundle/icons/Locked";
import NumberIcon from "@diligentcorp/atlas-react-bundle/icons/Number";
import VisibleIcon from "@diligentcorp/atlas-react-bundle/icons/Visible";
import PageLayout from "../components/PageLayout.js";
import { OBJECT_CATALOG, MOCK_RECORD_COUNTS } from "../data/objectCatalog.js";
import type { ObjectSchema } from "../types/attribute.js";
import { uiDividerDefaultBorderColor } from "../utils/uiDividerBorder.js";
import { STR } from "../utils/i18n.js";

/** Static placeholder timestamp matching the Figma design. */
const PLACEHOLDER_LAST_UPDATED = "DD-MM-YYYY HH:MM";

const ADD_OBJECT_MENU_ICONS: Record<string, typeof DocumentIcon> = {
  risk: CircleLineIcon,
  control: LockedIcon,
  process: DataIcon,
  objective: VisibleIcon,
  risk_event_assessment: CalendarIcon,
  risk_mitigation_plan: AttachIcon,
  control_assessment: AutomatedLockedIcon,
  key_risk_indicator: NumberIcon,
};

function AddObjectMenuLeadingIcon({ objectType }: { objectType: string }) {
  const Icon = ADD_OBJECT_MENU_ICONS[objectType] ?? DocumentIcon;
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "text.secondary",
        "& svg, & [slot=icon]": { width: 20, height: 20 },
      }}
    >
      <Icon slot="icon" aria-hidden />
    </Box>
  );
}

const ObjectCard: FC<{ schema: ObjectSchema }> = ({ schema }) => {
  const navigate = useNavigate();
  const count = MOCK_RECORD_COUNTS[schema.objectType] ?? 0;

  return (
    <ButtonBase
      onClick={() => navigate(`/objects/${schema.objectType}`)}
      sx={({ tokens }) => ({
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: 2,
        border: "1px solid",
        borderColor: uiDividerDefaultBorderColor(tokens),
        backgroundColor: "background.paper",
        p: 2.5,
        transition:
          "border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease",
        "&:hover": {
          borderColor: uiDividerDefaultBorderColor(tokens),
          backgroundColor: "action.hover",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        "&:active": {
          backgroundColor: "action.selected",
        },
      })}
      aria-label={schema.objectName}
    >
      <Typography fontWeight={600} sx={{ mb: 1 }}>
        {schema.objectName}
      </Typography>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2}>
        <Typography
          component="p"
          sx={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}
        >
          {count.toLocaleString()}
        </Typography>
        <Stack
          alignItems="flex-end"
          sx={{ flexShrink: 0, color: "text.secondary", fontSize: "0.75rem" }}
        >
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {STR.objectList.lastUpdated}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {PLACEHOLDER_LAST_UPDATED}
          </Typography>
        </Stack>
      </Stack>
    </ButtonBase>
  );
};

/**
 * Object Library landing page (Risk Manager).
 *
 * Mirrors the Figma "Object library" home: app-context breadcrumb, title, an
 * "Add object" dropdown with Atlas menu-item styling,
 * and a grid of cards summarizing each object type. Card click navigates to the
 * object's own records page.
 */
const ObjectListPage: FC = () => {
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);

  const handleOpenAddMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  return (
    <PageLayout>
      <Breadcrumbs aria-label={STR.objectList.breadcrumbsLabel} sx={{ mb: 1 }}>
        <Typography color="text.secondary">{STR.objectList.appContext}</Typography>
      </Breadcrumbs>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 700 }}>
          {STR.objectList.title}
        </Typography>

        <Box sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            endIcon={<ExpandDownIcon />}
            onClick={handleOpenAddMenu}
            aria-haspopup="menu"
            aria-expanded={addMenuAnchor !== null ? "true" : undefined}
            aria-controls={addMenuAnchor !== null ? "add-object-menu" : undefined}
          >
            {STR.objectList.addObject}
          </Button>
          <Menu
            id="add-object-menu"
            anchorEl={addMenuAnchor}
            open={addMenuAnchor !== null}
            onClose={handleCloseAddMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: ({ tokens, shadows, palette }) => ({
                  mt: 1,
                  py: 0.75,
                  px: 0.75,
                  minWidth: 280,
                  maxWidth: 360,
                  border: "1px solid",
                  borderColor: uiDividerDefaultBorderColor(tokens),
                  boxShadow: shadows[2],
                  backgroundColor:
                    tokens.semantic.color.surface?.default?.value ?? palette.background.paper,
                }),
              },
              list: {
                dense: false,
                sx: {
                  py: 0.5,
                  px: 0.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                },
              },
            }}
          >
            <ListSubheader
              disableSticky
              component="div"
                sx={({ tokens, palette }) => ({
                  typography: "subtitle2",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color: tokens.semantic.color.type?.default?.value ?? "text.primary",
                  px: 1,
                  pt: 0.5,
                  pb: 0.75,
                  mb: 0.25,
                  borderBottom: "1px solid",
                  borderColor: uiDividerDefaultBorderColor(tokens),
                  backgroundColor:
                    tokens.semantic.color.surface?.default?.value ?? palette.background.paper,
                })}
            >
              {STR.objectList.addObject}
            </ListSubheader>
            {OBJECT_CATALOG.map((schema) => (
              <MenuItem
                key={schema.objectType}
                onClick={handleCloseAddMenu}
                sx={{
                  py: 1,
                  px: 1,
                  minHeight: 44,
                  gap: 1.25,
                  borderRadius: 1,
                  transition: "background-color 120ms ease",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 1,
                    backgroundColor: "action.hover",
                  },
                  "&:active": {
                    backgroundColor: "action.selected",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 0,
                    color: "text.secondary",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AddObjectMenuLeadingIcon objectType={schema.objectType} />
                </ListItemIcon>
                <Typography component="span" sx={{ flex: 1, fontWeight: 500 }}>
                  {schema.objectName}
                </Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
        }}
      >
        {OBJECT_CATALOG.map((schema) => (
          <ObjectCard key={schema.objectType} schema={schema} />
        ))}
      </Box>
    </PageLayout>
  );
};

export default ObjectListPage;

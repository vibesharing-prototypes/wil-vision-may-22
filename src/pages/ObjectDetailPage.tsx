import { type FC, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import {
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import ArrowLeftIcon from "@diligentcorp/atlas-react-bundle/icons/ArrowLeft";
import ExpandDownIcon from "@diligentcorp/atlas-react-bundle/icons/ExpandDown";
import SearchIcon from "@diligentcorp/atlas-react-bundle/icons/Search";
import PageLayout from "../components/PageLayout.js";
import { OBJECT_CATALOG_MAP } from "../data/objectCatalog.js";
import { MOCK_RECORDS_BY_OBJECT_TYPE, type MockRecord } from "../data/mockRecords.js";
import { getBindingForObjectType } from "../services/workflows/objectWorkflowBinding.js";
import { getLatestTemplateForKey } from "../services/workflows/workflowsRepository.js";
import { STR } from "../utils/i18n.js";

type Severity = NonNullable<MockRecord["severity"]>;
type Status = MockRecord["status"];

/** Atlas semantic status buckets (see Status indicators with MUI). */
type AtlasStatusSlot = {
  default?: { value?: string };
  textDefault?: { value?: string };
};

/**
 * Maps record status labels to Atlas status indicator semantics
 * (notification / warning / success / generic).
 * @see https://diligentbrands.atlassian.net/wiki/spaces/ATLAS/pages/5819729738/Status+indicators+with+MUI
 */
function statusToAtlasTone(status: Status): "notification" | "warning" | "success" | "generic" {
  switch (status) {
    case "In progress":
      return "notification";
    case "In review":
    case "To be approved":
      return "warning";
    case "Closed":
    case "Approved":
      return "success";
    case "Open":
    case "Draft":
      return "generic";
    default:
      return "generic";
  }
}

function readStatusBuckets(tokens: { semantic?: { color?: { status?: unknown } } } | undefined) {
  return tokens?.semantic?.color?.status as
    | Record<string, AtlasStatusSlot | undefined>
    | undefined;
}

const SEVERITY_DOT_COLOR: Record<Severity, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
  Critical: "#dc2626",
};

const SeverityCell: FC<{ value?: Severity }> = ({ value }) => {
  if (!value) return <Typography color="text.secondary">{STR.noValue}</Typography>;
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box
        component="span"
        sx={{
          width: 10,
          height: 10,
          borderRadius: "2px",
          backgroundColor: SEVERITY_DOT_COLOR[value],
          flexShrink: 0,
        }}
        aria-hidden
      />
      <Typography>{value}</Typography>
    </Stack>
  );
};

const StatusChip: FC<{ value: Status }> = ({ value }) => {
  const tone = statusToAtlasTone(value);
  return (
    <Chip
      label={value}
      size="small"
      sx={({ tokens, palette }) => {
        const st = readStatusBuckets(tokens);
        const pill = {
          fontWeight: 500,
          borderRadius: "999px",
        };

        switch (tone) {
          case "notification": {
            const slot = st?.notification ?? st?.inform;
            return {
              ...pill,
              backgroundColor: slot?.default?.value ?? palette.info.light,
              color: slot?.textDefault?.value ?? palette.info.contrastText,
            };
          }
          case "warning": {
            const slot = st?.warning;
            return {
              ...pill,
              backgroundColor: slot?.default?.value ?? palette.warning.light,
              color: slot?.textDefault?.value ?? palette.warning.contrastText,
            };
          }
          case "success": {
            const slot = st?.success;
            return {
              ...pill,
              backgroundColor: slot?.default?.value ?? palette.success.light,
              color: slot?.textDefault?.value ?? palette.success.contrastText,
            };
          }
          case "generic":
          default: {
            const slot = st?.generic ?? st?.neutral;
            return {
              ...pill,
              backgroundColor: slot?.default?.value ?? palette.grey[200],
              color: slot?.textDefault?.value ?? palette.text.secondary,
            };
          }
        }
      }}
    />
  );
};

const OwnerCell: FC<{ name: string; initials: string }> = ({ name, initials }) => (
  <Stack direction="row" alignItems="center" gap={1}>
    <Avatar
      sx={{ width: 24, height: 24, fontSize: "0.7rem", backgroundColor: "primary.main" }}
    >
      {initials}
    </Avatar>
    <Typography>{name}</Typography>
  </Stack>
);

/**
 * Object detail page — represents the object's records list within a host app.
 *
 * Layout follows the Figma "Audit findings" reference:
 *  - Breadcrumb: Risk Manager › Object library
 *  - Back arrow + title, with secondary "Manage" dropdown and primary "Add" on the right
 *  - Search / Filter / Columns toolbar (placeholders)
 *  - Table of mock records; rows link to a record detail placeholder
 *
 * The "Manage" dropdown (Manage schema / Manage workflow) is the entry point
 * the PM confirmed for accessing schema and workflow management.
 */
const ObjectDetailPage: FC = () => {
  const { objectType = "risk" } = useParams<{ objectType: string }>();
  const schema = OBJECT_CATALOG_MAP[objectType];
  const navigate = useNavigate();

  const [manageMenuAnchor, setManageMenuAnchor] = useState<HTMLElement | null>(null);

  const handleOpenManageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setManageMenuAnchor(event.currentTarget);
  };

  const handleCloseManageMenu = () => {
    setManageMenuAnchor(null);
  };

  const handleManageSchema = () => {
    handleCloseManageMenu();
    navigate(`/objects/${objectType}/schema`);
  };

  const handleManageWorkflow = () => {
    handleCloseManageMenu();
    const binding = getBindingForObjectType(objectType);
    if (binding) {
      const template = getLatestTemplateForKey(binding.templateKey);
      if (template) {
        navigate("/workflows/template/edit", {
          state: {
            mode: "edit",
            template,
            interaction: "readonly",
            templateKey: binding.templateKey,
          },
        });
        return;
      }
    }
    navigate("/workflows");
  };

  if (!schema) {
    return (
      <PageLayout>
        <Typography color="error">
          {STR.objectDetail.unknownObjectType(objectType)}
        </Typography>
      </PageLayout>
    );
  }

  const records = MOCK_RECORDS_BY_OBJECT_TYPE[objectType] ?? [];
  const showSeverity = records.some((r) => r.severity !== undefined);

  return (
    <PageLayout>
      <Breadcrumbs aria-label={STR.objectDetail.breadcrumbsLabel} sx={{ mb: 1 }}>
        <Typography color="text.secondary">{STR.objectList.appContext}</Typography>
        <MuiLink component={RouterLink} to="/" color="inherit" underline="hover">
          {STR.objectList.title}
        </MuiLink>
      </Breadcrumbs>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton
            component={RouterLink}
            to="/"
            aria-label={STR.objectDetail.backToObjectList}
            size="small"
          >
            <ArrowLeftIcon />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {schema.objectName}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" gap={1.5} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            color="primary"
            endIcon={<ExpandDownIcon />}
            onClick={handleOpenManageMenu}
            aria-haspopup="menu"
            aria-expanded={manageMenuAnchor !== null ? "true" : undefined}
            aria-controls={manageMenuAnchor !== null ? `manage-menu-${objectType}` : undefined}
          >
            {STR.objectList.manage}
          </Button>
          <Menu
            id={`manage-menu-${objectType}`}
            anchorEl={manageMenuAnchor}
            open={manageMenuAnchor !== null}
            onClose={handleCloseManageMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleManageSchema}>
              {STR.objectList.manageSchema}
            </MenuItem>
            <MenuItem onClick={handleManageWorkflow}>
              {STR.objectList.manageWorkflow}
            </MenuItem>
          </Menu>

          <Button variant="contained" color="primary" startIcon={<AddIcon />}>
            {STR.objectDetail.add}
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={STR.objectDetail.searchPlaceholder}
          aria-label={STR.objectDetail.searchAriaLabel}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280 }}
        />
        <Button color="inherit" disabled>
          {STR.objectDetail.filter}
        </Button>
        <Button color="inherit" disabled>
          {STR.objectDetail.columns}
        </Button>
      </Stack>

      <TableContainer>
        <Table aria-label={STR.objectDetail.tableAriaLabel(schema.objectName)}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{STR.objectDetail.colId}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.objectDetail.colName}</TableCell>
              {showSeverity && (
                <TableCell sx={{ fontWeight: 600 }}>{STR.objectDetail.colSeverity}</TableCell>
              )}
              <TableCell sx={{ fontWeight: 600 }}>{STR.objectDetail.colStatus}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{STR.objectDetail.colOwner}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSeverity ? 5 : 4} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {STR.objectDetail.emptyState(schema.objectName)}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{record.id}</TableCell>
                  <TableCell>
                    <MuiLink
                      component={RouterLink}
                      to={`/objects/${objectType}/records/${record.id}`}
                      underline="hover"
                      color="primary"
                    >
                      {record.name}
                    </MuiLink>
                  </TableCell>
                  {showSeverity && (
                    <TableCell>
                      <SeverityCell value={record.severity} />
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusChip value={record.status} />
                  </TableCell>
                  <TableCell>
                    <OwnerCell name={record.owner} initials={record.ownerInitials} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </PageLayout>
  );
};

export default ObjectDetailPage;

import type { FC } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Box,
  Breadcrumbs,
  IconButton,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import ArrowLeftIcon from "@diligentcorp/atlas-react-bundle/icons/ArrowLeft";
import PageLayout from "../components/PageLayout.js";
import { OBJECT_CATALOG_MAP } from "../data/objectCatalog.js";
import { MOCK_RECORDS_BY_OBJECT_TYPE } from "../data/mockRecords.js";
import { STR } from "../utils/i18n.js";

/**
 * Record detail placeholder page.
 *
 * Per design direction, the prototype does not implement the full record view;
 * it shows a placeholder confirming where the object's content would appear.
 * The breadcrumb and back arrow link back to the object's list page.
 */
const RecordDetailPage: FC = () => {
  const { objectType = "risk", recordId = "" } = useParams<{
    objectType: string;
    recordId: string;
  }>();

  const schema = OBJECT_CATALOG_MAP[objectType];
  const record = MOCK_RECORDS_BY_OBJECT_TYPE[objectType]?.find((r) => r.id === recordId);

  const objectName = schema?.objectName ?? objectType;
  const recordTitle = record?.name ?? recordId;

  return (
    <PageLayout>
      <Breadcrumbs aria-label={STR.recordDetail.breadcrumbsLabel} sx={{ mb: 1 }}>
        <Typography color="text.secondary">{STR.objectList.appContext}</Typography>
        <MuiLink component={RouterLink} to="/" color="inherit" underline="hover">
          {STR.objectList.title}
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={`/objects/${objectType}`}
          color="inherit"
          underline="hover"
        >
          {objectName}
        </MuiLink>
        <Typography color="text.primary">{recordId}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3 }}>
        <IconButton
          component={RouterLink}
          to={`/objects/${objectType}`}
          aria-label={STR.recordDetail.backToList(objectName)}
          size="small"
        >
          <ArrowLeftIcon />
        </IconButton>
        <Box>
          <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {recordTitle}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            {objectName} · {recordId}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 6,
          textAlign: "center",
        }}
      >
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem", maxWidth: 560, mx: "auto" }}>
          {STR.recordDetail.placeholder(objectName)}
        </Typography>
      </Box>
    </PageLayout>
  );
};

export default RecordDetailPage;

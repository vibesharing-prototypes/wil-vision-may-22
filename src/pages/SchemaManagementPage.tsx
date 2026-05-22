import { Component, type FC, type ReactNode, useCallback, useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import { Alert, Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from "@mui/material";
import { PageHeader } from "@diligentcorp/atlas-react-bundle";
import PageLayout from "../components/PageLayout.js";
import { STR } from "../utils/i18n.js";
import { SchemaManagementView } from "../features/schemaManagement/SchemaManagementView.js";
import { LastSavedIndicator } from "../features/schemaManagement/components/LastSavedIndicator.js";
import {
  OBJECT_CATALOG_MAP,
  INITIAL_CUSTOM_ATTRIBUTES_BY_TYPE,
  INITIAL_AUDIT_LOG_BY_TYPE,
} from "../data/objectCatalog.js";
import { riskSchema } from "../features/schemaViewer/sampleData.js";

class SchemaErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <strong>Render error:</strong> {(this.state.error as Error).message}
            <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap" }}>
              {(this.state.error as Error).stack}
            </pre>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

/**
 * Schema management page (M1).
 * Reads objectType from the URL param to determine which object schema to edit.
 *
 * Permission gate: in production, only users with manage_schema:{object_type} reach this page.
 * In the prototype, access is simulated via navigation — no real auth enforced.
 */
const SchemaManagementPage: FC = () => {
  const { objectType = "risk" } = useParams<{ objectType: string }>();
  const schema = OBJECT_CATALOG_MAP[objectType] ?? riskSchema;
  const initialCustomAttributes = INITIAL_CUSTOM_ATTRIBUTES_BY_TYPE[objectType] ?? [];
  const initialAuditEntries = INITIAL_AUDIT_LOG_BY_TYPE[objectType] ?? [];

  const openGlobalAuditRef = useRef<(() => void) | null>(null);
  const registerOpenGlobalAuditLog = useCallback((open: () => void) => {
    openGlobalAuditRef.current = open;
  }, []);

  const [latestAuditTimestamp, setLatestAuditTimestamp] = useState<string | null>(null);
  const handleLatestAuditTimestampChange = useCallback((ts: string | null) => {
    setLatestAuditTimestamp(ts);
  }, []);

  const handleOpenChangeHistory = useCallback(() => {
    openGlobalAuditRef.current?.();
  }, []);

  return (
    <PageLayout>
      <Breadcrumbs aria-label={STR.schemaManagement.breadcrumbsLabel} sx={{ mb: 1 }}>
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
          {schema.objectName}
        </MuiLink>
        <Typography color="text.primary">{STR.schemaManagement.title}</Typography>
      </Breadcrumbs>

      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PageHeader
            pageTitle={STR.schemaManagement.title}
            pageSubtitle={STR.schemaManagement.subtitleForObject(schema.objectName)}
          />
        </Box>
        <LastSavedIndicator
          latestTimestamp={latestAuditTimestamp}
          onOpenChangeHistory={handleOpenChangeHistory}
        />
      </Stack>

      <SchemaErrorBoundary>
        <SchemaManagementView
          schema={schema}
          initialCustomAttributes={initialCustomAttributes}
          initialAuditEntries={initialAuditEntries}
          showAttributeOrderTools
          onRegisterOpenGlobalAuditLog={registerOpenGlobalAuditLog}
          onLatestAuditTimestampChange={handleLatestAuditTimestampChange}
        />
      </SchemaErrorBoundary>
    </PageLayout>
  );
};

export default SchemaManagementPage;

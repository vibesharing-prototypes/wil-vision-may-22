import type { FC } from "react";
import { Chip, Tooltip } from "@mui/material";
import type { ResolvedDataSource } from "../../services/workflows/dataSource.js";
import { STR } from "../../utils/i18n.js";

interface WorkflowDataSourceChipProps {
  dataSource: ResolvedDataSource | null;
}

export const WorkflowDataSourceChip: FC<WorkflowDataSourceChipProps> = ({ dataSource }) => {
  if (!dataSource) return null;
  const isLive = dataSource === "live";
  const label = isLive
    ? STR.workflowManagement.dataSourceLive
    : STR.workflowManagement.dataSourceDemo;
  const tooltip = isLive
    ? STR.workflowManagement.dataSourceLiveTooltip
    : STR.workflowManagement.dataSourceDemoTooltip;

  return (
    <Tooltip title={tooltip}>
      <Chip
        size="small"
        label={label}
        color={isLive ? "success" : "default"}
        variant={isLive ? "filled" : "outlined"}
      />
    </Tooltip>
  );
};

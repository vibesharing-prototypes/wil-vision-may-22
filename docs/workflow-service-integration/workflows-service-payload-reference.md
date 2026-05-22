# Workflows Service — payload reference

*Living doc for the vision prototype. Revise when `rc-workflows` OpenAPI or the v2 adapter changes.*

**Sources:** [Workflows Service - Usage](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/5945032731), [API definition](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/5944180739), [rc-workflows openapi.yaml](https://github.com/DiligentCorp/rc-workflows/blob/main/packages/openapi-spec/src/openapi.yaml), hackathon [`server/rc-workflows.ts`](https://github.com/DiligentCorp/arc-product-managers/blob/5a145250936bd4ae45cc88a7b5afe3df837de793/tkenez/workflow-editor/server/rc-workflows.ts), v2 [`src/features/workflowManagement/types.ts`](../../src/features/workflowManagement/types.ts).

## Scope

JSON bodies and response fields on Workflows Service HTTP APIs. Does **not** cover Object Library schemas, business-object records, or prototype mirror/draft storage.

## Hackathon usage (minimal)

| Call | When | Sent | Received |
|------|------|------|----------|
| `GET {base}/doc` | Startup health | — | 200 ok / unreachable |
| `POST /v1/orgs/{org_id}/workflow_templates` | Publish | See **Create template** | `201` + template resource |

No other WF endpoints are called in `tkenez/workflow-editor`.

## Create workflow template

`POST /v1/orgs/{org_id}/workflow_templates`

**Request (`data.attributes`):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | e.g. `"Audit Finding Workflow"`, `"Risk lifecycle"` |
| `version` | integer | yes | Append-only; unique per name+service+org |
| `service` | string | yes | Consumer app id: `"audit-findings"`, `"risk-manager"` |
| `definition` | object | yes | FSM; see below |

**`definition`:** `initial`, `states` (each with optional `on`, guards, actions, `event_schema`, `_editor_metadata` for editor layout).

**Response (`201`):** `id`, echoed attributes. Store **sent** definition in local mirror if service strips `_editor_metadata`.

**Errors:** `409` duplicate `(name, version, service, org_id)`.

## Delete workflow template

`DELETE /v1/orgs/{org_id}/workflow_templates` — body: `name`, `version`, `service`. Response `204`.

## Create workflow instance

`POST /v1/orgs/{org_id}/workflow_instances` — body: `workflow_templates_id`. Response: instance `id`, `state`, `locked_by`, timestamps.

*Not used in hackathon or first v2 integration.*

## State transition event

`POST .../state_transition_events` — body: `event`, `payload`. Out of scope for first v2 integration.

## Not on Workflows Service

| Data | Store |
|------|--------|
| Template list / versions | Local mirror |
| Drafts | Consumer / localStorage |
| Object schemas | Object Library |
| Records | Host app / v2 mocks |
| UI labels/colors | `StateViewModel` / draft |

## v2 mapping

| WF concept | v2 |
|------------|-----|
| Template | `WorkflowTemplate` |
| Definition | `WorkflowTemplateDefinition` |
| RM demo | `service: "risk-manager"` |
| Audit demo | `service: "audit-findings"` |

## Auth

| Environment | Auth |
|-------------|------|
| Local rc-workflows | Bearer from env (Node or browser dev only) |
| Production API Gateway | AWS SigV4 — not from public Netlify prototype |

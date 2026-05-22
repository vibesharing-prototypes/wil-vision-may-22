# Vision prototype — workflow architecture

**App:** `custom-attributes-v2` (ARC Core vision). **Branch:** `feature/workflow-service`.

## Routes

| Path | Component | Role |
|------|-----------|------|
| `/` | `ObjectListPage` | Object library home |
| `/objects/:objectType` | `ObjectDetailPage` | Records; Manage → schema / workflow |
| `/workflows` | `WorkflowsPlaceholderPage` | Template list |
| `/workflows/template/edit` | `WorkflowTemplateEditorPage` | Graph editor + instances |

## Module layout

```
src/features/workflowManagement/
├── types.ts                    # API-shaped domain types
├── draftTypes.ts               # Editor draft (positions, colors)
├── sampleData.ts               # Static mocks (RM + issue triage)
├── useWorkflowTemplateEditor.ts
├── WorkflowGraphCanvas.tsx
├── WorkflowStateSheet.tsx
├── WorkflowTransitionSheet.tsx
├── WorkflowInstanceTable.tsx
└── ...

src/services/workflows/         # (integration target)
├── workflowsConfig.ts
├── rcWorkflowsClient.ts
├── templateMirror.ts
├── workflowsRepository.ts
└── objectWorkflowBinding.ts
```

## Data today (pre-integration)

- **No HTTP** to Workflows Service.
- Templates: `MOCK_WORKFLOW_TEMPLATES_INITIAL` in React state.
- Instances: always `RISK_LIFECYCLE_INSTANCES`.
- Save: local baseline only (snackbar).
- Types align with Confluence / WF API; `StateViewModel` is UI-only.

## Object catalog

`src/data/objectCatalog.ts` — Risk Manager types; only `risk` has rich schema. No `findings` type yet. Audit layout on `ObjectDetailPage` is Figma reference only.

## Integration target state

| Concern | Approach |
|---------|----------|
| Read templates | Local mirror (no WF GET) |
| Edit | Existing graph editor + draft |
| Save | Persist draft to mirror/localStorage |
| Publish | POST to rc-workflows when reachable |
| Fallback | `auto` → mock `sampleData` on Netlify or WF down |
| Per-object entry | `objectWorkflowBinding`: `risk` → `risk-manager`, `findings` → `audit-findings` |

## Environment variables (Vite)

| Variable | Purpose |
|----------|---------|
| `VITE_WORKFLOW_DATA_MODE` | `live` \| `mock` \| `auto` |
| `VITE_WORKFLOWS_API_BASE_URL` | rc-workflows base (dev) |
| `VITE_WORKFLOWS_ORG_ID` | Org id (default `100200` in mocks) |
| `VITE_WORKFLOWS_BEARER` | Bearer for local rc-workflows |

## Out of scope (this branch)

- MVP / lab prototypes
- Object Library schema API
- Workflow instance create / transition events
- AWS SigV4 from browser on public deploy

## Related docs

- [Hackathon analysis](./hackathon-workflow-editor-analysis.md)
- [WF payload reference](./workflows-service-payload-reference.md)

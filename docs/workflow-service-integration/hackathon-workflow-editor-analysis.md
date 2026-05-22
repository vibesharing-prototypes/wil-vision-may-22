# Hackathon workflow-editor analysis

**Source:** [DiligentCorp/arc-product-managers](https://github.com/DiligentCorp/arc-product-managers.git) @ `5a145250936bd4ae45cc88a7b5afe3df837de793`, path `tkenez/workflow-editor/`.

## Purpose

Build-day **fake consumer app** for Workflows Service: Object Library home (Audit) → findings list → workflow editor with draft/publish to local `rc-workflows`.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite, React, MUI, custom Atlas tokens (not `@diligentcorp/atlas-react-bundle`) |
| BFF | Hono on port 4000, proxied at `/api` |
| Persistence | SQLite (`.data/`) — mirror + drafts + findings seed |
| WF | `rc-workflows` on port 3000, Bearer auth |

## File map

```
tkenez/workflow-editor/
├── server/
│   ├── index.ts           # Hono app
│   ├── rc-workflows.ts    # POST template + isReachable
│   ├── seed.ts            # Seed mirror + findings
│   ├── seed-template.ts   # AUDIT FSM + SEEDED_FINDINGS
│   └── routes/
│       ├── templates.ts   # draft, publish, versions, revert
│       └── findings.ts    # list/detail (SQLite)
├── src/
│   ├── api/client.ts      # fetch /api/*
│   ├── pages/             # Home, Findings, Workflow*
│   └── workflow/          # WorkflowEditor, WorkflowViewer, React Flow
└── build-day-spec.md
```

## Routes

| Path | Page |
|------|------|
| `/` | Object library home — only **Audit findings** tile links |
| `/findings` | Findings list; Manage → workflow |
| `/findings/workflow` | Editor / viewer |
| `/findings/workflow/versions` | Version history |

`TEMPLATE_KEY = "findings"` everywhere.

## BFF API (frontend → Hono)

| Method | Path | Role |
|--------|------|------|
| GET | `/workflow-templates/:key/latest` | Latest published from mirror |
| GET | `/workflow-templates/:key/draft` | Local draft |
| PUT | `/workflow-templates/:key/draft` | Autosave draft |
| DELETE | `/workflow-templates/:key/draft` | Discard draft |
| POST | `/workflow-templates/:key/publish` | POST to rc-workflows + mirror insert |
| GET | `/workflow-templates/:key/versions` | Mirror history |
| GET | `/findings` | Seeded findings (not WF) |

## rc-workflows integration

- **Only** `POST /v1/orgs/{org_id}/workflow_templates` on publish.
- Env: `RC_WORKFLOWS_URL`, `RC_WORKFLOWS_BEARER`, `RC_WORKFLOWS_ORG_ID` (default `12345`).
- Health: `GET {base}/doc`.
- **No GET templates** — mirror is source of truth for reads.
- On startup unreachable: local-only mirror; publish returns 502.

## Audit-specific constants

From `server/seed-template.ts`:

- `SEED_TEMPLATE_NAME = "Audit Finding Workflow"`
- `SEED_TEMPLATE_SERVICE = "audit-findings"`
- Findings rows: SQLite with hardcoded `current_state` (not workflow instances API).

## What to port into custom-attributes-v2

1. **Mirror + draft** semantics (localStorage or dev Hono).
2. **`rcWorkflowsClient`** POST + reachability check.
3. **Publish** as distinct from **Save draft**.
4. **Audit template** definition + `service: "audit-findings"`.
5. **Object → templateKey/service** binding (`findings` / `audit-findings`).

Do **not** port: custom MUI theme, SQLite findings app, separate repo layout.

## Gaps vs v2 vision

| Hackathon | v2 vision |
|-----------|-----------|
| Single template key | Multiple (risk + findings) |
| No global `/workflows` list | Has workflows home |
| Bearer to localhost | Same for dev; mock on Netlify |
| `_editor_metadata` in definition | Graph positions in draft — align on publish |

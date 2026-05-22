# Custom attributes — Vision prototype

Standalone **Atlas + MUI + Vite** app (repo root). Read [`AGENTS.md`](./AGENTS.md) before UI work.

**Deploy & siblings:** [`PROTOTYPES.md`](./PROTOTYPES.md)

**Product requirements (canonical):** [Confluence folder](https://diligentbrands.atlassian.net/wiki/spaces/RCP/folder/6953959468) · local working copies in [`src/docs/`](./src/docs/)

---

## Prerequisites

- **Node.js** LTS (20.x or 22.x), **npm**
- Network access to `https://atlas.diligent.com` (Atlas bundle + MCP)

## Install and run

```bash
npm install
# If integrity errors on atlas-react-bundle:
npm install --force

npm run dev
npm run build
npm run preview
```

**Postinstall:** `scripts/patch-atlas-prototype-app-key.mjs` aligns Atlas nav with Risk Manager.

## Atlas MCP

Configured in [`.cursor/mcp.json`](./.cursor/mcp.json). Enable Atlas MCP in Cursor; use Confluence/Atlassian MCP when pulling specs from Jira.

## CI

GitHub Actions: **TBD** — add `npm run build` on PR when the team wants automated checks.

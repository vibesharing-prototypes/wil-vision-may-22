> **Note (2026-05):** This file was copied from the `arc-core-wil` monorepo. That setup used one GitHub repo with per-app **base directories**. **This repository is standalone** — link Netlify to this repo with base directory **`.`** (repo root). Replace references to `dil-wrahn/arc-core-wil` with this repo name. Full rewrite TBD.

# Deploy Atlas prototypes (Netlify from Git + VibeSharing)

Guide for **UX designers and prototypers** at Diligent. **Recommended daily path:** push to **GitHub** → **Netlify** builds each Vite app from this **monorepo** using a **per-site base directory** (fast, reliable). Use **VibeSharing** for **feedback, collections, and stakeholder links** (point the prototype at the Netlify URL). **Live hosting** for the org is **Netlify** (`*.netlify.app`).

Use this with any agent that can run terminal commands, edit files, and use the **VibeSharing MCP** when it is configured.

**Related:** [Confluence — Cursor prototype deployment flow](https://diligentbrands.atlassian.net/wiki/spaces/RCP/pages/6705021443/Cursor+Guide+Full+prototype+deployment+flow+for+UX+Designers) · [`PROTOTYPES.md`](./PROTOTYPES.md) (URLs) · [VibeSharing troubleshooting](https://vibesharing.app/DEPLOY-TROUBLESHOOTING.md)

---

## Know this first (30 seconds)

| Topic | Diligent default |
|--------|------------------|
| **Recommended deploy** | **GitHub** (`dil-wrahn/arc-core-wil`, `main`) → **Netlify** (one site per app, **Base directory** = that app’s folder) → optional **VibeSharing** card links to the same Netlify URL |
| **Why not MCP `import_repo` every time?** | It mirrors the **whole monorepo** into VibeSharing’s GitHub org in one burst; **GitHub secondary rate limits** can block that. **Not** needed if Netlify builds from your repo directly. |
| Where the **live site** runs | **Netlify** for Diligent org prototypes |
| Older internal docs | If they say prototypes are hosted on **Vercel** via VibeSharing, treat that as **outdated for Diligent**; expect a **Netlify** URL |
| **Atlas** dependency | `@diligentcorp/atlas-react-bundle` comes from a **mutable URL** (`react-bundle.tgz`). A committed **`package-lock.json`** can break installs when Atlas republishes — see [If install fails](#if-install-fails-eintegrity) |

---

## Path 0 — Netlify from GitHub (recommended)

**Goal:** After every **`git push`**, Netlify rebuilds **only** the app you changed (per site), with no VibeSharing full-repo import.

### One-time setup (Netlify UI or ask your admin)

Create **three Netlify sites** (or match your existing three URLs in [`PROTOTYPES.md`](./PROTOTYPES.md)). For **each** site:

| Setting | MVP | Vision (v2) | Lab |
|--------|-----|---------------|-----|
| **Repository** | `dil-wrahn/arc-core-wil` | same | same |
| **Branch** | `main` | `main` | `main` |
| **Base directory** | `custom-attributes-mvp` | `custom-attributes-v2` | `custom-attributes-lab` |
| **Build command** | `npm run build` (default from `netlify.toml` in that folder) | same | same |
| **Publish directory** | `dist` | `dist` | `dist` |

Each app folder in this repo includes a **`netlify.toml`** with `build`, `publish`, and SPA **`[[redirects]]`** (client-side routing).

**Designer workflow:** commit → push to `main` → Netlify **Deploys** tab shows a new build → share the **`*.netlify.app`** link (and/or your VibeSharing project that points at it).

### VibeSharing with this model

- **Create or edit** a VibeSharing prototype so its **live / external URL** is the **Netlify** URL (stakeholders + feedback stay in VibeSharing; **source of truth** stays GitHub).
- You **do not** need VibeSharing to **re-import** the monorepo on every change if Netlify is already building from GitHub.

### Password / `middleware.js`

These apps ship a root **`middleware.js`** intended as **edge-style** request logic (used on hosts that run it with the **full** deploy context). A standard Netlify flow that **only publishes `dist/`** after `vite build` may **not** execute that file unless your team adds an equivalent (e.g. **Netlify Edge Function**, **password protection** on the site, or **VibeSharing** access rules). Confirm with your org; see also [`ux-designer-setup-guide.md`](../ux-designer-setup-guide.md) Part 6.

---

## Before you deploy (any path)

1. **One deploy target per Vite app.** In this monorepo: `custom-attributes-mvp/`, `custom-attributes-v2/`, `custom-attributes-lab/` each have their own `package.json` and **their own Netlify site** (or VibeSharing prototype + root directory).
2. **Build locally once:** from that folder, `npm install` then `npm run build` must succeed.
3. **Postinstall:** each app runs `scripts/patch-atlas-prototype-app-key.mjs` after install so Atlas shell defaults match Risk Manager in CI/Netlify.

---

## Path A — Deploy from Cursor (VibeSharing MCP) — fallback

Use when Netlify is **not** wired to GitHub yet, or for one-off experiments.

**Caution — `import_repo` on this monorepo:** VibeSharing may try to mirror the **entire** repo into its GitHub org; that can hit **GitHub secondary rate limits**. Prefer **Path 0** for routine updates.

### Prompt — validate then deploy a single folder (MCP file deploy)

```text
We use Vite + Atlas in folder [FOLDER_NAME] (e.g. custom-attributes-v2).

1. Run VibeSharing validate_project on the absolute path to that folder.
2. Run npm install && npm run build in that folder; fix any errors.
3. Deploy to VibeSharing with deploy_prototype: new prototype named "[PROTOTYPE_NAME]",
   collection "[COLLECTION_NAME]" (or use collection_id if known),
   deploy_name "[DEPLOY_SLUG]" (lowercase, hyphens),
   stakeholder summary in one sentence,
   and file_paths for every file under that folder except node_modules, dist, and .git.

4. After deploy: list_versions for the new prototype_id; if the dashboard has no live URL,
   set external_url to the Netlify URL once we have it (or tell me to paste it from VibeSharing).
```

### Prompt — redeploy an existing prototype

```text
Redeploy folder [FOLDER] to VibeSharing prototype_id [ID]: same file_paths rules,
commit message describing the change, keep deploy_name [SLUG] unless we need a new URL.
```

### Prompt — stuck or no preview link

```text
Run VibeSharing diagnose. If the prototype has versions but no Netlify URL on the card,
call send_support_request with subject + description + diagnose output.
If I paste the Netlify URL, call update_prototype with external_url.
```

---

## Path B — Deploy from the VibeSharing website

1. Open [vibesharing.app](https://vibesharing.app) → your collection → **New prototype** (or import).
2. Connect **GitHub** and pick the repo; for a **monorepo**, set **root directory** to the Vite app folder.
3. Install: `npm install` · Build: `npm run build` · Publish directory: **`dist`** (typical for Vite).
4. Copy the **Netlify** URL when shown; add it to team docs / [`PROTOTYPES.md`](./PROTOTYPES.md).

For **routine** updates after Path 0 is set up, prefer **push → Netlify** instead of re-importing the whole repo here.

---

## If install fails (`EINTEGRITY`)

**Symptom:** `npm error code EINTEGRITY`, checksum mismatch for `atlas.diligent.com/react-bundle.tgz`.

**Fix (pick one; ask your agent to do it in that app folder):**

1. **Regenerate lockfile:** delete `node_modules` and `package-lock.json`, run `npm cache clean --force`, then `npm install`, commit the new `package-lock.json`, trigger a Netlify redeploy (or VibeSharing deploy).
2. **No lockfile:** remove `package-lock.json` from the repo that **Netlify** builds (keep `package.json`); redeploy so install matches the current tarball.

**Prevention:** Before a big demo, run a fresh install without an old cache so lockfile integrity matches what the CDN serves.

---

## Quick troubleshooting

| What you see | What to do |
|--------------|------------|
| Netlify build fails | Open **Deploy log**; fix `npm install` / `npm run build` locally in that **base directory**; push again |
| SPA routes 404 on refresh | Confirm **`netlify.toml`** `[[redirects]]` is present in that app folder and **Publish directory** is `dist` |
| VibeSharing **`import_repo`** fails with **secondary rate limit** | Use **Path 0** (Netlify from GitHub); wait before retrying MCP import; do not hammer retries |
| VibeSharing shows **GitHub** but no **live URL** | Wait for build; link **external_url** to Netlify; **diagnose** / support if stuck |
| **Auto-sync** does nothing | Confirm the site that should build is **Netlify → this repo → correct base directory** |
| Monorepo: wrong app or wrong URL | **Separate site per folder**; check **Base directory** |

---

## Record URLs for the team

Update [`PROTOTYPES.md`](./PROTOTYPES.md) (or your Confluence index) whenever a deploy URL changes so MVP vs Vision vs lab stay obvious.

**Example (Diligent custom attributes):**

| Prototype | URL |
|-----------|-----|
| MVP | https://custom-attributes-mvp.netlify.app |
| Vision (v2) | https://custom-attributes-vision.netlify.app |
| Lab | https://custom-attributes-lab.netlify.app |

---

## One-line summary for your agent

> **Recommended:** Netlify **Continuous Deployment** from `dil-wrahn/arc-core-wil` on `main` with **Base directory** per Vite app (`netlify.toml` in each folder). Use VibeSharing for links and feedback. Reserve VibeSharing **`import_repo`** for setups where Netlify cannot build from GitHub, and expect possible **GitHub rate limits** on full monorepo mirrors.

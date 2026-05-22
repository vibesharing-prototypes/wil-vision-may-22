# Deploy checklist (vision)

**GitHub:** [dil-wrahn/x99-vision](https://github.com/dil-wrahn/x99-vision)  
**VibeSharing:** https://vibesharing.app/dashboard/projects/31318a96-b6bd-40db-8aac-4408da2dd2a8

## Netlify

1. Import **x99-vision**, branch `main`, base directory `.`
2. Build: `npm run build` (install: `npm install --force` if needed) → publish `dist`
3. Optional env: `VITE_MVP_PROTOTYPE_URL`, `VITE_DEPLOYMENT_NOTE`
4. Paste live URL into [`PROTOTYPES.md`](./PROTOTYPES.md) and [`STAKEHOLDER_LINKS.md`](./STAKEHOLDER_LINKS.md)

## VibeSharing

Link the project above to the Netlify URL when the build is green.

## Verify routes

`/`, `/objects/:type`, `/objects/:type/schema`, `/roles`, `/workflows`, `/workflows/template/edit`

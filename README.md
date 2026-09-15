# Geotech Tools

Browser-based geotechnical engineering calculators and field tools. Static site deployed via Azure Static Web Apps.

## Structure
- Calculator/tool HTML files at repo root (self-contained, no build step)
- `manifest.json`, `sw.js` — PWA manifest and service worker
- `staticwebapp.config.json` — Azure Static Web Apps routing/config
- `.github/workflows/azure-static-web-apps.yml` — deployment workflow
- `GEOTECH_TOOLS_BUILD_SPEC.md` — build/design reference

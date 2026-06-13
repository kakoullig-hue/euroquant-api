# Deploy Runbook — web/

Two independent surfaces. They deploy differently. Don't confuse them.

| Surface | URL | What it is | How it ships |
|---|---|---|---|
| **Store** | euroquant.io | `web/index.html` — static commerce page, self-contained | **Manual drag-and-drop** of `web/index.html` |
| **Demo** | demo.euroquant.io | Vite-built React Risk Terminal (5-tab synthetic demo) | **Render static site**, builds from this repo |

---

## Demo — Render static site (`euroquant-api` repo, `main` branch)

### Working dashboard settings (source of truth)

Render reads these from the **dashboard**, not from `render.yaml`. `render.yaml`
is kept in sync for reference, but editing it alone changes nothing — edit the
dashboard fields.

| Field | Value |
|---|---|
| **Root Directory** | *(blank)* |
| **Build Command** | `cd web && npm ci && npm run build && cp dist/dashboard.html dist/index.html && cd .. && rm -rf public && cp -r web/dist public` |
| **Publish Directory** | `public` |

Why `public/` at the repo root: Render's publish-path resolution for this
service would not honour a subdirectory — both `web/dist` and (root-dir=web +
`dist`) failed with "Publish directory does not exist" despite a clean build.
Copying the output to a top-level `public/` and ending the build shell at the
repo root makes the path resolve no matter how Render interprets it.

### Deploy an update

1. `git push origin main`
2. Render dashboard → demo service → **Manual Deploy → Clear build cache & deploy**
   - Auto-deploy on push only works once the GitHub repo connection is
     reconnected (Settings → linked repo). Until then, every deploy is manual.

### Demo-only guard (do not remove)

`web/vite.config.js` **hard-fails `vite build` if `VITE_API_KEY` is set**
(shell env or `web/.env*`). The public bundle must never embed a gateway key —
Vite inlines every `VITE_*` var into the shipped JS. `vite dev` with a key is
still allowed for local Track-C testing against the live API.

### Verify after deploy

```bash
curl -sS https://demo.euroquant.io/ | grep -o '<title>[^<]*</title>'
# expect: <title>EuroQuant · Risk Terminal</title>
```

Then open the site, click **VIEW DEMO ANALYSIS**, and confirm all five tabs
(Overview / Companies / Connections / Network / Flags) load with no console
errors. The JS filename is content-hashed, so a matching hash = identical to
the last verified build.

---

## Local

```bash
cd web
npm install          # adds vite + react (devDeps only)
npm run dev          # http://localhost:5173/dashboard.html
npm run build        # production bundle into web/dist
```

Note: `npm ci` prunes anything not in `package.json` (e.g. an ad-hoc Playwright
install used for screenshots) — reinstall such tools after a clean `ci`.

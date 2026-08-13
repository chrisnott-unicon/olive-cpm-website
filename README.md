# Olive CPM

Marketing site and (in progress) native web app for Olive CPM — Unicon
Construction's multi-tenant construction/project management platform,
replacing the internal Google Sites QMS.

- **Marketing site**: `index.html` (root) — the public landing page.
- **App shell**: `app/` — sign-in and dashboard placeholders for the actual
  product. Not wired to a live backend yet.
- **Backend**: Firebase (Auth + Firestore). See `firebase/README.md` for
  setup steps and the data model.

## Tenant model

Two-level hierarchy:

```
tenant (company, e.g. "Unicon", or a future client company)
  └── project (a site/contract under that company)
        └── siteDiaries / fuelOrders / rfis / inspectionRequests / ...
```

Users belong to exactly one tenant and hold a role (`owner`, `admin`,
`manager`, `site`, `client`) via Firebase Auth custom claims. Firestore
Security Rules (`firebase/firestore.rules`) enforce that isolation
server-side — a user can only ever read/write within their own tenant.

## Hosting & domain

Deployed via GitHub Pages from this repo's `main` branch (root).

| Domain | Status |
|---|---|
| `www.olivecpm.com` | **Live.** DNS `CNAME` → `chrisnott-unicon.github.io`, HTTPS working. |
| `olivecpm.com` (apex) | **Not yet configured.** Currently resolves to the registrar's default parking page, not this site. |

### To fix the apex domain

At your domain registrar's DNS settings for `olivecpm.com`, replace
whatever A/parking records exist with GitHub Pages' four apex IPs:

```
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
AAAA  @     2606:50c0:8000::153
AAAA  @     2606:50c0:8001::153
AAAA  @     2606:50c0:8002::153
AAAA  @     2606:50c0:8003::153
```

Leave the existing `CNAME` record for `www` pointing at
`chrisnott-unicon.github.io` as-is. Once DNS propagates, GitHub Pages will
serve the apex domain and (with "Enforce HTTPS" on in the repo's Pages
settings) redirect it to `https://www.olivecpm.com`.

## Local development

Static files only — no build step. Open `index.html` or `app/index.html`
directly, or serve the folder with any static file server.

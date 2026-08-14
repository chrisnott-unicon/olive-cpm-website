# Overnight review — Olive CPM app

Branch: `claude/olive-cpm-app-copy` on `chrisnott-unicon/olive-cpm-website`
Source: a working copy of `chrisnott-unicon/Olive-CPM-by-Unicon` (commit
`a630bff`), copied into `webapp/` here because push access to that repo
wasn't available overnight. Per Chris: `Olive-CPM-by-Unicon` is being made
private and this location (`olive-cpm-website/webapp/`) is now the actual
home going forward — no reconciliation needed.

## Five review passes, one codebase

I ran five parallel reviews (security rules, backend/server, and three
batches of UI components) across the whole app. Full findings are in the
conversation transcript; this is the outcome.

## Fixed tonight

**Critical — Gemini API key was exposed to every visitor.**
`vite.config.ts` baked `GEMINI_API_KEY` directly into the client-side JS
bundle, and 7 call sites across 6 components (TaskManager, WeatherLogger,
BaselineSummary ×2, PDFAnnotator ×2, ProjectCompliance) called the Gemini
SDK straight from the browser with it. Anyone opening dev tools could
extract the key and run up billing on your account. All 7 now go through
authenticated `/api/ai/*` server routes (`src/server/aiRoutes.ts`) —
verified with a production build that no key material reaches the client
bundle anymore (only the public Firebase web key remains, which is
expected and fine).

**Critical — three cross-tenant data exposure holes in the security rules:**
1. `storage.rules` had a stubbed access check that ignored `projectId`
   entirely — any signed-in user, from any company, had full read/write
   on every other tenant's files (contracts, drawings, photos).
2. `firestore.rules`' project-read rule had a stray `|| true`, making
   every project document (client details, contract terms, financials)
   publicly readable by anyone who knew or guessed a project ID, no
   login required.
3. A user could self-update their own `orgId` to an *existing* company's
   ID and grant themselves `Org_Admin`, gaining full access to that
   tenant's data — a direct tenant-takeover path.

All three are fixed; see the "Close three critical cross-tenant..."
commit for exactly what changed and why the fixes don't break the
legitimate flows (invite links, self-serve company signup) that
depended on the old behavior.

**Other real bugs fixed:**
- `ProjectAdminHub.tsx` had a duplicate import that meant the file
  didn't compile at all — anything touching it was broken.
- Every document upload through `GenericDocumentManager.tsx` was
  silently rejected (missing required field), and failures left the
  upload UI spinning forever with no error shown.
- The 3D/BIM model viewer (`IFCViewer.tsx`) leaked a WebGL context on
  every open/close due to a stale-closure bug — browsers cap concurrent
  WebGL contexts, so heavy use would eventually break model viewing
  silently.
- Firestore write failures across the app were either only
  `console.error`'d or re-thrown into nothing — a rejected save looked
  identical to a successful one to the user. Centralized error handling
  now shows a toast.
- An RFI's closure-voting flow could deadlock permanently (the second
  vote hit a status the rules didn't allow non-admins to write).
- Declining a stakeholder invite silently reset it to look like a fresh,
  never-contacted invite, indistinguishable in the admin UI.
- A compliance-item category spelling mismatch ("Labour" vs "Labor")
  meant every AI-generated or UI-added item with that category silently
  failed to save.

**Cloud Run deployment scaffold added** (`Dockerfile`, `.dockerignore`,
`.github/workflows/deploy-olive-cpm-app.yml`, `webapp/DEPLOY.md`) since
this app has a real server and can't run on GitHub Pages. Nothing
deploys automatically — it needs the one-time GCP setup in `DEPLOY.md`
(service accounts, Artifact Registry, three GitHub secrets) done first.

Every commit passed `tsc --noEmit` and a full production build before
being made — I didn't just edit and hope.

## Fixed this morning, after Chris's answers on the open decisions

- **Real Bill of Quantities.** Added `BOQManager.tsx` (manual entry + a
  plain-text CSV paste, no new dependency) writing to `/projects/{id}/boq`,
  with a per-item progress slider. `Valuations.tsx` now computes
  gross/retention/net from real BOQ totals × real progress instead of
  three hardcoded line items, pulls recent site diary entries for the AI
  analysis context, snapshots exact per-item progress into `progressData`
  on each valuation, and labels certificates by actual status
  (Draft/Submitted/Approved) instead of always saying "CERTIFIED."
  Submit/Approve buttons now expose the lifecycle the rules already
  supported but the UI never surfaced.
- **RFI/Site Instruction numbering race fixed** — `getNextSequenceNumber()`
  in `firebase.ts` increments a per-project counter inside a Firestore
  transaction, so two people creating one at the same moment can no
  longer end up with the same reference number.
- **Dependencies patched**: `pdfjs-dist` 5→6 (real CVE, arbitrary JS
  execution from a malicious PDF — relevant since this app takes
  user-uploaded PDFs; the major bump changed `getDocument()`'s API
  shape, fixed both call sites and confirmed clean build), `vite` to
  6.4.3 (dev-server-only advisory), and removed the unused `nodemailer`
  dependency plus its dead SMTP config in `.env.example` (verified
  zero real usage first).

**Left as-is, by choice**: `isValidProject`/`isValidUser` still don't
reject unexpected fields (`hasOnly`) — `CreateProjectModal.tsx` writes
several fields not in the documented schema, and Chris confirmed those
are still evolving, so locking the rule down now would risk breaking
project creation later.

## Still outstanding — lower priority, not blocking

- Several `onSnapshot` listeners across the app have no error callback,
  so a permission-denied failure just stops the listener silently
  (found in Dashboard, ProjectPlanningHub, ProjectResourceHub,
  ProjectCompliance, ProjectBaselineRecords, BaselineSummary, TaskManager,
  StakeholderRegistry).
- A few UI buttons let users attempt actions the rules will reject
  (some RFI/Site-Instruction transition buttons show for people not
  authorized to use them) — the data is safe, but the UX is misleading.
- 8 remaining dependency advisories, all transitive (`websocket-driver`
  via firebase's unused Realtime Database bits, `form-data`, `postcss`,
  `nanoid`, `ws`, gRPC/Firestore client libs) — lower urgency than the
  three already patched.
- A few components still bypass the centralized `handleFirestoreError`
  toast with their own bare `console.error` (Valuations.tsx's remaining
  edge cases, DeliveryLog.tsx, LaborPlantLog.tsx, DocumentManager.tsx's
  unhandled-rejection path).

## What to do next

1. **Review the branch**: `claude/olive-cpm-app-copy` on
   `chrisnott-unicon/olive-cpm-website`. Nothing has been merged to
   `main` — it's sitting there for you to look at first.
2. If it looks good, either merge it or tell me to open a PR.
3. Do the GCP setup in `webapp/DEPLOY.md` if/when you want this actually
   deployed.

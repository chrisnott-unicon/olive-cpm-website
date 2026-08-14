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

## Also cleaned up while Chris was traveling (his go-ahead to "chip away")

- **Cross-tenant listener leak in App.tsx**: the sidebar projects
  listener's unsubscribe was discarded, so switching accounts in the same
  tab without a full reload could leave the previous account's listener
  running and silently repopulate the sidebar with the wrong tenant's
  projects. Tracked and cleaned up properly now; also stopped issuing a
  doomed unfiltered query for a non-admin with no org yet.
- **SiteDiary lifecycle bug**: the textarea/media controls/"Save Draft"
  were only locked once an entry hit `Published`, not `Pending_Approval`
  — the status the rules actually lock non-admin writes at. A user could
  keep editing a submitted entry and get a silent rejection that looked
  like a successful save. Also fixed the Approve button being gated to
  Super_Admin only, when the rules (and the spec) allow Org_Admin too.
- **8 `onSnapshot` listeners** (Dashboard ×2, ProjectPlanningHub,
  ProjectResourceHub, ProjectCompliance, ProjectBaselineRecords,
  BaselineSummary, TaskManager, StakeholderRegistry) now have error
  callbacks — a permission-denied used to just stop the listener with no
  explanation.
- **RFI/Site Instruction action buttons** ("Issue to Internal QC",
  "Publish to Professional Team", "Re-Open for Further Query", "Mark as
  Completed") now only show to whoever the rules would actually let take
  that action, instead of rendering for any viewer and silently failing
  on click.
- **Remaining silent failures surfaced as toasts**: DeliveryLog.tsx and
  LaborPlantLog.tsx's listeners/submits, and a real unhandled-promise-
  rejection bug in DocumentManager.tsx's upload handler that left the
  control stuck spinning forever on any rejected write.
- **LaborPlantLog.tsx**: an empty/partial quantity input could write
  `NaN` into a statutory labour-count record — now clamped to a valid
  non-negative integer.
- **GanttChart.tsx**: an unparseable task date produced `Invalid Date`,
  which passed a bare `filter(Boolean)` and poisoned the whole chart's
  date-range calculation via `Math.min`/`Math.max`, not just the one
  task with the bad date. Now guards on date validity explicitly.
- **ProjectAdminHub.tsx's user listing was reading every user in the
  system**, no org filter — an Org_Admin's "assign personnel" dropdown
  leaked names/emails from unrelated companies. (Also: since the
  tenant-takeover rules fix, that unfiltered query was actually already
  being rejected outright for Org_Admins, so this had quietly gone from
  "leak" to "broken feature" — fixed both by scoping the query to the
  caller's own org.) Also swapped its four remaining bare
  `console.error` catches for the toast pattern.

Every commit in this batch passed `tsc --noEmit` and a full production
build too.

## GUI/menu structure review, then chipped away while Chris was on a flight

Chris asked for a review of the app's overall GUI and navigation structure
against UI/UX best practices. Found a mix of real strengths (the 3-tier
sidebar → project tabs → in-tool hub pattern is consistent and holds up
well; the "Quick Tip" panel per tool is a nice touch) and 10 concrete
problems. He then said to run all the fixes while unreachable, using my
own judgement on anything ambiguous rather than blocking on it.

**Fixed:**
- **Navigation state loss**: re-clicking the project you're already
  viewing from the sidebar unconditionally reset you back to Overview,
  discarding whatever tab you were working in. Now only resets when
  actually switching to a different project.
- **Two different things both called "Resources"**: the sidebar's
  people/plant/material roster and Records' daily labour-and-plant log
  had the same name and were easy to confuse. Renamed the roster to
  "Asset Registry" (sidebar, page header, tool description) and the
  daily log to "Labour & Plant Log," with each one's description now
  pointing at the other for anyone who lands in the wrong place.
- **Unbounded Firestore listeners**: RFIs, compliance items, and
  stakeholders had no `limit()` on their live queries — on a project
  running for years, these would keep growing and getting slower
  forever. Capped at 200/300/500 respectively, matching the caps
  already in place elsewhere in the app.
- **~45 icon-only buttons with no accessible name** across ~20 files —
  close/delete/remove/zoom/toggle controls that relied on hover-only
  `title` tooltips, invisible to screen readers and touch users. All
  now carry `aria-label`s, many naming the specific entity ("Remove
  Jane Doe," not just "Remove").
- **Two buttons that looked functional but silently did nothing**,
  found while fixing the above: StakeholderMindMap's zoom in/out/reset
  buttons now actually drive the d3 zoom instead of being inert, and
  SiteDiary's download-PDF button now regenerates and saves the real
  PDF instead of only building one as a side effect of a different
  (also-silent) action.
- **Buttons with no backing functionality at all** (RFIManager's
  overflow menu and query-edit, Settings' notification toggle and
  regional-format select, ProjectBaselineRecords' and Valuations'
  download buttons) are now disabled and labeled "not yet implemented"
  instead of left clickable with no effect — honest about what's not
  built yet rather than pretending.
- **Settings had a dead, unrendered `theme` state** left over from an
  earlier build — removed. The actual non-functional controls in that
  panel were the notification toggle and regional-format select
  (different bug than originally suspected — corrected course rather
  than fixing the wrong thing).
- **The smallest UI text** (`text-[7px]`, below what's legible on a
  typical phone) bumped to 8px at its most extreme instances.
- **A project-scoped quick search**: a search icon in the sticky
  project header now searches across that project's documents, RFIs,
  site instructions, compliance items, stakeholders, and tasks, with
  click-to-jump straight to the right tool tab (and, for
  Documents/Planning, the right internal sub-view). Deliberately a
  per-project in-memory filter, not cross-project or full-text — that
  would need a real search backend (e.g. Algolia) if wanted later.

**Deliberately not built**, since they're product/design decisions, not
bugs — flagged rather than guessed at:
- Full dark mode.
- Logo/white-label branding for the "OLIVE" sidebar mark.

Every commit in this batch passed `tsc --noEmit` and a full production
build.

## Still outstanding — lower priority, not blocking

- 8 remaining dependency advisories, all transitive (`websocket-driver`
  via firebase's unused Realtime Database bits, `form-data`, `postcss`,
  `nanoid`, `ws`, gRPC/Firestore client libs) — lower urgency than the
  three already patched.
- `isValidProject`/`isValidUser` still don't reject unexpected fields —
  left open on purpose per Chris (`CreateProjectModal.tsx`'s field set is
  still evolving).

## What to do next

1. **Review the branch**: `claude/olive-cpm-app-copy` on
   `chrisnott-unicon/olive-cpm-website`. Nothing has been merged to
   `main` — it's sitting there for you to look at first.
2. If it looks good, either merge it or tell me to open a PR.
3. Do the GCP setup in `webapp/DEPLOY.md` if/when you want this actually
   deployed.

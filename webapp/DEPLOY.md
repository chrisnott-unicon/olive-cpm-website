# Deploying Olive CPM to Cloud Run

This app has a real Express server (`server.ts`) and uses the Firebase
Admin SDK, so it can't run on GitHub Pages (static-only). It deploys to
Google Cloud Run instead, built and pushed automatically by
`.github/workflows/deploy-olive-cpm-app.yml` on every push to `main` that
touches `webapp/`.

## One-time GCP setup

Run these once, replacing `YOUR_PROJECT_ID` with the real GCP project ID
(the same project as `firebase-applet-config.json`'s `projectId` —
`unicon-cpm` — if you want the app and its Firestore/Auth backend in one
project, which is simplest).

```bash
gcloud config set project YOUR_PROJECT_ID

# 1. Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com

# 2. Artifact Registry repo for the built container images
gcloud artifacts repositories create olive-cpm \
  --repository-format=docker --location=europe-west1

# 3. Store the Gemini API key in Secret Manager (never as a plain env var —
#    it's already server-only per src/server/aiRoutes.ts, keep it that way)
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# 4. A dedicated runtime service account for the Cloud Run service itself
gcloud iam service-accounts create olive-cpm-runtime \
  --display-name="Olive CPM Cloud Run runtime"

# Let it read the Gemini key secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:olive-cpm-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Let it act as Firebase Admin (server.ts calls admin.initializeApp() with
# Application Default Credentials — this is what makes that resolve to a
# real identity with Firestore/Auth access on Cloud Run)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:olive-cpm-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:olive-cpm-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebaseauth.admin"
```

## Workload Identity Federation (so GitHub Actions never holds a GCP key)

```bash
gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

gcloud iam service-accounts create olive-cpm-deployer \
  --display-name="GitHub Actions deployer"

# Deployer needs to push images and deploy/update the Cloud Run service —
# NOT the same identity as the runtime service account above.
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:olive-cpm-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:olive-cpm-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
gcloud iam service-accounts add-iam-policy-binding \
  olive-cpm-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/chrisnott-unicon/olive-cpm-website"

# Also grant it permission to impersonate/attach the runtime service account
# when deploying (Cloud Run requires this):
gcloud iam service-accounts add-iam-policy-binding \
  olive-cpm-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:olive-cpm-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## GitHub repository secrets

Add these under Settings → Secrets and variables → Actions, on
`chrisnott-unicon/olive-cpm-website`:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_WIF_PROVIDER` | `projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_DEPLOY_SA_EMAIL` | `olive-cpm-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com` |

The workflow already attaches `olive-cpm-runtime` as the Cloud Run
service's own identity on every deploy — no manual step needed once the
service account and IAM bindings above exist.

## Custom domain (app.olivecpm.com)

```bash
gcloud run domain-mappings create --service=olive-cpm-app \
  --domain=app.olivecpm.com --region=europe-west1
```

This prints a DNS record (a `CNAME` to `ghs.googlehosted.com`, typically)
— add it at your registrar. Once it propagates, Cloud Run provisions a
managed TLS certificate automatically (can take up to ~24h on first setup).

Also add `app.olivecpm.com` to Firebase Auth's authorized domains list
(console.firebase.google.com → Authentication → Settings) — Google/email
sign-in will silently fail on an unauthorized domain.

## Local development

```bash
npm install
cp .env.example .env   # fill in GEMINI_API_KEY for local testing
npm run dev
```

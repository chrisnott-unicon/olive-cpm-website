# Olive CPM — Firebase backend setup

GitHub Pages only serves static files, so all auth, data storage, and
per-tenant access control live in Firebase. This folder holds the pieces
that aren't part of the static site itself.

## 1. Create the Firebase project

1. https://console.firebase.google.com → Add project (e.g. `olive-cpm-prod`).
2. Build → Authentication → Sign-in method → enable **Google** and
   **Email/Password**.
3. Authentication → Settings → Authorized domains → add `www.olivecpm.com`
   (and `olivecpm.com` once the apex domain is pointed at GitHub Pages —
   see the root README).
4. Build → Firestore Database → Create database → production mode, region
   closest to South Africa (e.g. `europe-west1` — Firebase has no `af-`
   region yet).
5. Project settings → General → Your apps → Add app → Web. Copy the config
   object into `app/js/firebase-init.js` (`FIREBASE_CONFIG`), replacing the
   `REPLACE_ME` placeholders.

## 2. Deploy the security rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point it at this project, reuse firebase/firestore.rules
firebase deploy --only firestore:rules
```

## 3. Data model

```
/tenants/{tenantId}
    name, branding: { logoUrl, primaryColor }, createdAt

/tenants/{tenantId}/projects/{projectId}
    name, contractType (JBCC | GCC | FIDIC), gpsCoordinates, status

/tenants/{tenantId}/projects/{projectId}/siteDiaries/{docId}
/tenants/{tenantId}/projects/{projectId}/fuelOrders/{docId}
/tenants/{tenantId}/projects/{projectId}/rfis/{docId}
/tenants/{tenantId}/projects/{projectId}/inspectionRequests/{docId}
```

Every document under a project needs a `createdBy` (uid) field — the rules
in `firestore.rules` require it on create.

## 4. Assigning tenants and roles to users

Firebase Auth doesn't have tenant/role fields natively — they're custom
claims, set server-side. The simplest approach is a Cloud Function
triggered on user creation, or an admin script run manually per invite:

```js
// admin script, run with the Firebase Admin SDK (service account key,
// NEVER commit this key to the repo)
const admin = require('firebase-admin');
admin.initializeApp();

await admin.auth().setCustomUserClaims(uid, {
  tenantId: 'unicon',
  role: 'admin', // owner | admin | manager | site | client
});
```

Claims only take effect after the user's ID token refreshes (next sign-in,
or `getIdToken(true)`).

## 5. Next build steps (not done yet)

- Cloud Function to auto-create a `tenants/{tenantId}` doc + set the first
  user's claims to `owner` on signup, instead of an admin doing it by hand.
- Wire `app/index.html` and `app/dashboard.html` to real Firestore reads
  once a tenant exists.
- Build the four QMS forms (Site Diary, Fuel Order, RFI, Inspection
  Request) as Firestore-backed pages under `app/`, replacing the Google
  Sites versions.

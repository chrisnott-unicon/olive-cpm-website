// Olive CPM — Firebase bootstrap
//
// This file is intentionally checked into the public repo: a Firebase Web SDK
// config (apiKey, projectId, etc.) is a client identifier, not a secret. Access
// control is enforced server-side by Firestore Security Rules (see
// /firebase/firestore.rules) and by custom auth claims, not by hiding this file.
//
// Setup steps (do this once in the Firebase console — https://console.firebase.google.com):
//   1. Create a Firebase project (e.g. "olive-cpm-prod").
//   2. Add a Web App to the project and copy its config into FIREBASE_CONFIG below.
//   3. Authentication -> Sign-in method: enable Google and Email/Password.
//   4. Authentication -> Settings -> Authorized domains: add www.olivecpm.com.
//   5. Firestore Database: create in production mode, then deploy
//      /firebase/firestore.rules (see /firebase/README.md).
//   6. Every user needs custom claims { tenantId, role } set via the Admin SDK
//      (a Cloud Function on user creation, or an admin script) before the
//      tenant-scoped rules in firestore.rules will grant them access.

const FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

const FIREBASE_SDK_VERSION = "10.14.1";

async function loadFirebase() {
  const { initializeApp } = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
  );
  const auth = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
  );
  const firestore = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
  );

  const app = initializeApp(FIREBASE_CONFIG);
  return { app, auth, firestore };
}

export { FIREBASE_CONFIG, loadFirebase };

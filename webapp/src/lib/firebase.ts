import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, runTransaction } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { toast } from 'sonner';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings that can help in unstable environments
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Callers up and down this codebase were catching Firestore errors and only
// console.error-ing them (or catching this function's re-thrown error and
// doing nothing with it) — a permission-denied rejection would silently
// stop a save with no feedback, making a failed write look identical to a
// successful one. This now always surfaces a toast, so that stops being
// possible regardless of what the call site does with the re-thrown error.
function toUserMessage(error: unknown, operationType: OperationType): string {
  const code = (error as any)?.code;
  if (code === 'permission-denied') {
    return "You don't have permission to do that.";
  }
  if (code === 'unavailable') {
    return 'Connection lost — check your network and try again.';
  }
  const verb = { create: 'save', update: 'save', delete: 'delete', list: 'load', get: 'load', write: 'save' }[operationType] || 'complete';
  return `Failed to ${verb}. Please try again.`;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(toUserMessage(error, operationType));
  throw new Error(JSON.stringify(errInfo));
}

// Atomic per-project sequence numbers (RFI-001, SI-001, ...). Replaces the
// old `existingDocs.length + 1` pattern, which reads-then-writes with no
// isolation — two people creating an RFI/SI within the same moment could
// both compute the same count and end up with two documents sharing one
// contractual reference number. A transaction against a dedicated counter
// doc makes the increment atomic regardless of concurrent callers.
export async function getNextSequenceNumber(projectId: string, counterName: string): Promise<number> {
  const counterRef = doc(db, `projects/${projectId}/counters`, counterName);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const next = (snap.exists() ? (snap.data().value as number) : 0) + 1;
    transaction.set(counterRef, { value: next }, { merge: true });
    return next;
  });
}

async function testConnection() {
  try {
    // Attempting a direct server fetch to bypass cache and verify backend reachability
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);
    if (error.code === 'unavailable') {
      console.warn("Firestore backend is currently unavailable. The client will operate in offline mode.");
    }
  }
}

testConnection();

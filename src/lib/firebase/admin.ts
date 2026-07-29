import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

function buildCredential(): ServiceAccount | undefined {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return undefined;
  privateKey = privateKey.replace(/\\n/g, '\n');
  return { projectId, clientEmail, privateKey };
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  const credential = buildCredential();
  if (!credential) {
    // Allow builds without real credentials; runtime API calls will fail clearly.
    adminApp = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo' });
    return adminApp;
  }
  adminApp = initializeApp({ credential: cert(credential) });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function isAdminConfigured(): boolean {
  return Boolean(buildCredential());
}

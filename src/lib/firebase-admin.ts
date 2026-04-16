import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

function decodeCredentials() {
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_B64;
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function adminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const creds = decodeCredentials();
  app = creds
    ? initializeApp({ credential: cert(creds) })
    : initializeApp(); // falls back to ADC on Vercel/GCP
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_ADMIN_CREDENTIALS_B64);
}

/**
 * Dual-mode auth for the integration REST API:
 *   1) Bearer Firebase ID token (end-user web/mobile clients)
 *   2) X-API-Key (server-to-server integrations)
 *
 * When Firebase admin credentials are not configured, a simple in-memory
 * fallback backed by INTEGRATION_API_KEYS env is used so the demo works
 * out of the box on Vercel without any Firebase project.
 */
import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { adminAuth, adminDb, isAdminConfigured } from "./firebase-admin";
import type { ApiScope } from "@/types/domain";

export interface AuthContext {
  orgId: string;
  principal: string;        // uid or "apikey:<label>"
  scopes: ApiScope[];
  mode: "user" | "apikey" | "demo";
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function constantEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function verifyIdToken(token: string): Promise<AuthContext | null> {
  if (!isAdminConfigured()) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const userSnap = await adminDb().doc(`users/${decoded.uid}`).get();
    const user = userSnap.data() as { orgId?: string; roles?: string[] } | undefined;
    if (!user?.orgId) return null;
    const scopes: ApiScope[] = (user.roles ?? []).includes("viewer")
      ? ["waste:read", "voyages:read", "menu:read", "rollups:read"]
      : ["waste:read", "waste:write", "voyages:read", "voyages:write", "menu:read", "menu:write", "rollups:read"];
    return { orgId: user.orgId, principal: decoded.uid, scopes, mode: "user" };
  } catch {
    return null;
  }
}

async function verifyApiKey(key: string): Promise<AuthContext | null> {
  // env-based fallback (format: key_xxx:orgId:scopeA,scopeB)
  const envKeys = (process.env.INTEGRATION_API_KEYS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  for (const entry of envKeys) {
    const [k, orgId = "demo", scopes = "waste:read,waste:write,voyages:read,voyages:write,menu:read,rollups:read"] = entry.split(":");
    if (constantEq(k, key)) {
      return {
        orgId,
        principal: `apikey:env`,
        scopes: scopes.split(",").filter(Boolean) as ApiScope[],
        mode: "apikey"
      };
    }
  }

  if (isAdminConfigured()) {
    const hashed = sha256(key);
    const snap = await adminDb().collectionGroup("apiKeys").where("hashedKey", "==", hashed).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      if (data.revokedAt) return null;
      // record lastUsed (best-effort)
      doc.ref.update({ lastUsedAt: Date.now() }).catch(() => {});
      return {
        orgId: data.orgId,
        principal: `apikey:${doc.id}`,
        scopes: data.scopes ?? [],
        mode: "apikey"
      };
    }
  }
  return null;
}

export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const ctx = await verifyApiKey(apiKey);
    if (ctx) return ctx;
  }
  const authz = req.headers.get("authorization") ?? "";
  if (authz.startsWith("Bearer ")) {
    const ctx = await verifyIdToken(authz.slice(7));
    if (ctx) return ctx;
  }
  // Demo fallback: allow reads when nothing is configured so the dashboard renders.
  if (!isAdminConfigured() && (process.env.INTEGRATION_API_KEYS ?? "").length === 0) {
    return { orgId: "demo", principal: "demo", scopes: ["waste:read", "voyages:read", "menu:read", "rollups:read"], mode: "demo" };
  }
  return null;
}

export function requireScope(ctx: AuthContext, scope: ApiScope): boolean {
  return ctx.scopes.includes(scope);
}

export function hashApiKey(key: string) { return sha256(key); }

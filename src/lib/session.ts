/**
 * Demo-mode session. Reads `role` and `assignedVesselId` cookies.
 * In production this is replaced by Firebase Auth → Firestore `users/{uid}`.
 */
import { cookies } from "next/headers";
import type { UserRole } from "@/types/domain";

export interface Session {
  role: UserRole;
  displayName: string;
  assignedVesselId?: string;        // service manager / crew → single vessel
  canSeeAdvanced: boolean;          // can toggle to advanced dashboard
  canSeeAllVessels: boolean;        // fleet-wide view
  canSeeFinance: boolean;
  canManageConfig: boolean;
  primaryLanding: "/" | "/register"; // crew lands on the register form
}

export const DEFAULT_ROLE: UserRole = "serviceManager";

export function getSession(): Session {
  let role: UserRole = DEFAULT_ROLE;
  let assignedVesselId: string | undefined;
  let displayName = "Anna";

  try {
    const c = cookies();
    const r = c.get("role")?.value as UserRole | undefined;
    if (r) role = r;
    assignedVesselId = c.get("assignedVesselId")?.value || undefined;
    const n = c.get("displayName")?.value;
    if (n) displayName = n;
  } catch { /* outside request scope */ }

  const isAdmin = role === "admin" || role === "orgAdmin";
  const isManager = role === "serviceManager" || role === "chef";
  const isCrew = role === "crew";

  return {
    role,
    displayName,
    assignedVesselId: isAdmin ? undefined : (assignedVesselId ?? "v_germanica"),
    canSeeAdvanced: isAdmin || isManager,
    canSeeAllVessels: isAdmin,
    canSeeFinance: isAdmin || isManager,
    canManageConfig: isAdmin,
    primaryLanding: isCrew ? "/register" : "/"
  };
}

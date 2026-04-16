/**
 * Runtime data access that transparently falls back to mock data
 * when Firebase is not configured (so the app always renders).
 */
import { adminDb, isAdminConfigured } from "./firebase-admin";
import { mockData } from "./mock-data";
import type { Outlet, Vessel, Voyage, WasteEntry } from "@/types/domain";

const ORG_ID = process.env.APP_DEFAULT_ORG_ID ?? "demo";

export async function getVessels(orgId: string = ORG_ID): Promise<Vessel[]> {
  if (!isAdminConfigured()) return mockData.vessels;
  const snap = await adminDb().collection(`orgs/${orgId}/vessels`).get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Vessel, "id">) }));
}

export async function getOutlets(orgId: string = ORG_ID): Promise<Outlet[]> {
  if (!isAdminConfigured()) return mockData.outlets;
  const snap = await adminDb().collection(`orgs/${orgId}/outlets`).get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Outlet, "id">) }));
}

export async function getVoyages(orgId: string = ORG_ID, limit = 200): Promise<Voyage[]> {
  if (!isAdminConfigured()) return mockData.voyages.slice(-limit).reverse();
  const snap = await adminDb()
    .collection(`orgs/${orgId}/voyages`)
    .orderBy("departureAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Voyage, "id">) }));
}

type WasteEntriesOpts = { vesselId?: string; voyageId?: string; sinceMs?: number; limit?: number };

export async function getWasteEntries(
  orgIdOrOpts: string | WasteEntriesOpts = ORG_ID,
  maybeOpts: WasteEntriesOpts = {}
): Promise<WasteEntry[]> {
  const orgId = typeof orgIdOrOpts === "string" ? orgIdOrOpts : ORG_ID;
  const opts: WasteEntriesOpts = typeof orgIdOrOpts === "string" ? maybeOpts : orgIdOrOpts;
  if (!isAdminConfigured()) {
    let rows = mockData.entries;
    if (opts.vesselId) rows = rows.filter(r => r.vesselId === opts.vesselId);
    if (opts.voyageId) rows = rows.filter(r => r.voyageId === opts.voyageId);
    if (opts.sinceMs) rows = rows.filter(r => r.occurredAt >= opts.sinceMs!);
    return rows.slice(-1 * (opts.limit ?? rows.length));
  }
  let q: FirebaseFirestore.Query = adminDb().collection(`orgs/${orgId}/wasteEntries`);
  if (opts.vesselId) q = q.where("vesselId", "==", opts.vesselId);
  if (opts.voyageId) q = q.where("voyageId", "==", opts.voyageId);
  if (opts.sinceMs) q = q.where("occurredAt", ">=", opts.sinceMs);
  q = q.orderBy("occurredAt", "desc").limit(opts.limit ?? 500);
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WasteEntry, "id">) }));
}

export function orgId() { return ORG_ID; }

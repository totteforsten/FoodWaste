import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { WasteEntryInput } from "@/lib/schemas";
import { estimateCo2e, toKg } from "@/lib/taxonomy";
import { getWasteEntries } from "@/lib/data-source";
import type { WasteEntry } from "@/types/domain";

export const runtime = "nodejs";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors() });
  if (!requireScope(ctx, "waste:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors() });

  const { searchParams } = new URL(req.url);
  const vesselId = searchParams.get("vesselId") ?? undefined;
  const voyageId = searchParams.get("voyageId") ?? undefined;
  const sinceMs = searchParams.get("since") ? Number(searchParams.get("since")) : undefined;
  const limit = searchParams.get("limit") ? Math.min(Number(searchParams.get("limit")), 2000) : 500;

  const entries = await getWasteEntries(ctx.orgId, { vesselId, voyageId, sinceMs, limit });
  return NextResponse.json({ data: entries, count: entries.length }, { headers: cors() });
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors() });
  if (!requireScope(ctx, "waste:write")) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors() });

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: cors() }); }

  const parsed = WasteEntryInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400, headers: cors() });
  }
  const input = parsed.data;

  const weightKg = toKg(input.quantity, input.unit, input.portionWeightG);
  const estimatedCo2eKg = estimateCo2e(weightKg);

  const now = Date.now();
  const entry: Omit<WasteEntry, "id"> = {
    orgId: ctx.orgId,
    vesselId: input.vesselId,
    voyageId: input.voyageId,
    outletId: input.outletId,
    menuItemId: input.menuItemId,
    stream: input.stream,
    stage: input.stage,
    destination: input.destination,
    quantity: input.quantity,
    unit: input.unit,
    weightKg: +weightKg.toFixed(3),
    estimatedCost: input.estimatedCost,
    estimatedCo2eKg,
    reason: input.reason,
    photoUrl: input.photoUrl,
    notes: input.notes,
    occurredAt: input.occurredAt ?? now,
    createdAt: now,
    createdBy: ctx.principal,
    source: input.source
  };

  if (isAdminConfigured()) {
    const ref = await adminDb().collection(`orgs/${ctx.orgId}/wasteEntries`).add(entry);
    // Fire-and-forget webhook dispatch
    dispatchWebhook(ctx.orgId, "waste.created", { id: ref.id, ...entry }).catch(() => {});
    return NextResponse.json({ data: { id: ref.id, ...entry } }, { status: 201, headers: cors() });
  }

  // Demo mode: echo back with a generated id
  const id = `demo_${now}`;
  return NextResponse.json({ data: { id, ...entry }, note: "Demo mode — not persisted. Configure Firebase to persist." }, { status: 201, headers: cors() });
}

async function dispatchWebhook(orgId: string, event: "waste.created" | "waste.updated" | "voyage.closed" | "rollup.daily", data: unknown) {
  if (!isAdminConfigured()) return;
  const { deliver } = await import("@/lib/webhooks");
  const hooks = await adminDb().collection(`orgs/${orgId}/webhooks`).where("active", "==", true).get();
  await Promise.all(
    hooks.docs
      .filter(h => (h.data().events as string[]).includes(event))
      .map(h => deliver(h.data().url, h.data().secret, {
        id: `${event}_${Date.now()}`,
        event,
        orgId,
        data,
        createdAt: Date.now()
      }))
  );
}

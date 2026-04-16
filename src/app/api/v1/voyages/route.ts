import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { VoyageInput } from "@/lib/schemas";
import { getVoyages } from "@/lib/data-source";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "voyages:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const voyages = await getVoyages(ctx.orgId, 200);
  return NextResponse.json({ data: voyages, count: voyages.length });
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "voyages:write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = VoyageInput.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  if (!isAdminConfigured()) {
    return NextResponse.json({ data: { id: `demo_${Date.now()}`, orgId: ctx.orgId, ...parsed.data }, note: "Demo mode — not persisted." }, { status: 201 });
  }

  const ref = await adminDb().collection(`orgs/${ctx.orgId}/voyages`).add({ orgId: ctx.orgId, ...parsed.data });
  return NextResponse.json({ data: { id: ref.id, orgId: ctx.orgId, ...parsed.data } }, { status: 201 });
}

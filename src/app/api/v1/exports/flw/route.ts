import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { getOutlets, getVessels, getWasteEntries } from "@/lib/data-source";
import { DESTINATION_LABEL, STAGE_LABEL, STREAM_LABEL } from "@/lib/taxonomy";

export const runtime = "nodejs";

function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "rollups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "90"), 365);
  const since = Date.now() - days * 86400_000;

  const [entries, vessels, outlets] = await Promise.all([
    getWasteEntries(ctx.orgId, { sinceMs: since, limit: 50000 }),
    getVessels(ctx.orgId),
    getOutlets(ctx.orgId)
  ]);
  const vn = Object.fromEntries(vessels.map(v => [v.id, v.name]));
  const on = Object.fromEntries(outlets.map(o => [o.id, o.name]));

  // FLW Standard core fields: Timeframe, Material type, Destination, Quantity, Boundary
  const rows = entries.map(e => ({
    entry_id: e.id,
    timeframe_start_iso: new Date(e.occurredAt).toISOString(),
    vessel: vn[e.vesselId] ?? e.vesselId,
    outlet: on[e.outletId] ?? e.outletId,
    voyage_id: e.voyageId ?? "",
    material_type: STREAM_LABEL[e.stream],
    lifecycle_stage: STAGE_LABEL[e.stage],
    destination: DESTINATION_LABEL[e.destination],
    quantity_kg: e.weightKg,
    estimated_cost: e.estimatedCost ?? "",
    estimated_co2e_kg: e.estimatedCo2eKg ?? "",
    reason: e.reason ?? "",
    notes: e.notes ?? ""
  }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flw-export-${days}d.csv"`
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { getVoyages, getWasteEntries } from "@/lib/data-source";
import { summarize, dailySeries, breakdownByStage, breakdownByStream, breakdownByOutlet } from "@/lib/kpis";
import { getOutlets } from "@/lib/data-source";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "rollups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "30"), 365);
  const vesselId = searchParams.get("vesselId") ?? undefined;
  const since = Date.now() - days * 86400_000;

  const [entries, voyages, outlets] = await Promise.all([
    getWasteEntries(ctx.orgId, { vesselId, sinceMs: since, limit: 20000 }),
    getVoyages(ctx.orgId, 500),
    getOutlets(ctx.orgId)
  ]);
  const covers = voyages.filter(v => v.departureAt >= since && (!vesselId || v.vesselId === vesselId)).reduce((s, v) => s + (v.coversServed ?? 0), 0);
  const outletNames = Object.fromEntries(outlets.map(o => [o.id, o.name]));

  return NextResponse.json({
    period: { days, since },
    summary: summarize(entries, covers),
    trend: dailySeries(entries, days),
    byStage: breakdownByStage(entries),
    byStream: breakdownByStream(entries),
    byOutlet: breakdownByOutlet(entries, outletNames)
  });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { getVoyages, getWasteEntries } from "@/lib/data-source";
import { rollupForDay } from "@/lib/kpis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "rollups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "30"), 365);
  const vesselId = searchParams.get("vesselId") ?? undefined;
  const since = Date.now() - days * 86400_000;

  const [entries, voyages] = await Promise.all([
    getWasteEntries(ctx.orgId, { vesselId, sinceMs: since, limit: 20000 }),
    getVoyages(ctx.orgId, 500)
  ]);

  const byDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const d = new Date(e.occurredAt).toISOString().slice(0, 10);
    const list = byDate.get(d) ?? [];
    list.push(e);
    byDate.set(d, list);
  }

  const rollups = [...byDate.entries()].map(([date, rows]) => {
    const covers = voyages
      .filter(v => new Date(v.departureAt).toISOString().slice(0, 10) === date && (!vesselId || v.vesselId === vesselId))
      .reduce((s, v) => s + (v.coversServed ?? 0), 0);
    return rollupForDay(rows, ctx.orgId, date, vesselId, covers);
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ data: rollups, count: rollups.length });
}

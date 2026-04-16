import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { getOutlets, getVessels, getWasteEntries } from "@/lib/data-source";

export const runtime = "nodejs";

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map(r => headers.map(h => r[h]).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "rollups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "30"), 365);
  const since = Date.now() - days * 86400_000;

  const [entries, vessels, outlets] = await Promise.all([
    getWasteEntries(ctx.orgId, { sinceMs: since, limit: 50000 }),
    getVessels(ctx.orgId),
    getOutlets(ctx.orgId)
  ]);
  const vn = Object.fromEntries(vessels.map(v => [v.id, v.name]));
  const on = Object.fromEntries(outlets.map(o => [o.id, o.name]));

  const agg = new Map<string, { vessel: string; outlet: string; kg: number; cost: number; co2: number; entries: number }>();
  for (const e of entries) {
    const k = `${e.vesselId}|${e.outletId}`;
    const b = agg.get(k) ?? { vessel: vn[e.vesselId] ?? e.vesselId, outlet: on[e.outletId] ?? e.outletId, kg: 0, cost: 0, co2: 0, entries: 0 };
    b.kg += e.weightKg;
    b.cost += e.estimatedCost ?? 0;
    b.co2 += e.estimatedCo2eKg ?? 0;
    b.entries += 1;
    agg.set(k, b);
  }

  const rows = [...agg.values()]
    .sort((a, b) => b.cost - a.cost)
    .map(r => ({
      vessel: r.vessel,
      outlet: r.outlet,
      entries: r.entries,
      total_kg: +r.kg.toFixed(2),
      total_cost_eur: +r.cost.toFixed(2),
      total_co2e_kg: +r.co2.toFixed(2)
    }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-rollup-${days}d.csv"`
    }
  });
}

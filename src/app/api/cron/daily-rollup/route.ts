import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { rollupForDay } from "@/lib/kpis";
import { getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";

export const runtime = "nodejs";

/**
 * Vercel Cron hits this daily (see vercel.json). Aggregates yesterday's
 * entries into daily rollups per vessel.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret && provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ note: "Admin not configured — skipping rollup" });
  }

  const yesterday = new Date(Date.now() - 86400_000);
  const dateIso = yesterday.toISOString().slice(0, 10);
  const dayStart = new Date(`${dateIso}T00:00:00Z`).getTime();
  const dayEnd = dayStart + 86400_000;

  const orgSnap = await adminDb().collection("orgs").get();
  const results: Array<{ orgId: string; vessel: string; count: number }> = [];

  for (const orgDoc of orgSnap.docs) {
    const orgId = orgDoc.id;
    const vessels = await getVessels(orgId);
    const voyages = await getVoyages(orgId, 200);

    for (const vessel of vessels) {
      const entries = (await getWasteEntries(orgId, { vesselId: vessel.id, sinceMs: dayStart, limit: 5000 }))
        .filter(e => e.occurredAt < dayEnd);
      const covers = voyages
        .filter(v => v.vesselId === vessel.id && v.departureAt >= dayStart && v.departureAt < dayEnd)
        .reduce((s, v) => s + (v.coversServed ?? 0), 0);

      const rollup = rollupForDay(entries, orgId, dateIso, vessel.id, covers);
      await adminDb().doc(`orgs/${orgId}/dailyRollups/${rollup.id}`).set(rollup, { merge: true });
      results.push({ orgId, vessel: vessel.name, count: entries.length });
    }
  }

  return NextResponse.json({ ok: true, date: dateIso, rollups: results });
}

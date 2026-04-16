import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireScope } from "@/lib/api-auth";
import { getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { DESTINATION_LABEL } from "@/lib/taxonomy";

export const runtime = "nodejs";

/**
 * MARPOL Annex V Garbage Record Book — Category B (food waste).
 * Required fields per IMO resolution MEPC.295(71):
 *   - Date and time
 *   - Ship position (lat/lon) at start and end of discharge
 *   - Category code (B = food wastes)
 *   - Estimated volume (m³)
 *   - Discharge method (to sea, to reception facility, incineration, accidental loss)
 *   - Officer signature
 *
 * This CSV export is a machine-readable baseline that can be loaded into the
 * ship's electronic GRB or used as an audit companion document.
 */
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

function kgToM3(kg: number) {
  // Food waste bulk density ≈ 600 kg/m³ (compacted) per IMO guidance
  return +(kg / 600).toFixed(4);
}

function discharge(destination: string) {
  switch (destination) {
    case "discharge_at_sea": return "To sea (comminuted, >3 nm or >12 nm depending on area)";
    case "port_reception_facility": return "To reception facility in port";
    case "incineration": return "Incineration on board";
    case "anaerobic_digestion":
    case "composting":
    case "animal_feed":
    case "donation": return "To reception facility (diverted)";
    case "landfill": return "To reception facility (landfill)";
    default: return DESTINATION_LABEL[destination as keyof typeof DESTINATION_LABEL] ?? destination;
  }
}

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireScope(ctx, "rollups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "90"), 365);
  const since = Date.now() - days * 86400_000;

  const [entries, vessels, voyages] = await Promise.all([
    getWasteEntries(ctx.orgId, { sinceMs: since, limit: 50000 }),
    getVessels(ctx.orgId),
    getVoyages(ctx.orgId, 500)
  ]);
  const vn = Object.fromEntries(vessels.map(v => [v.id, { name: v.name, imo: v.imo ?? "" }]));
  const vy = Object.fromEntries(voyages.map(v => [v.id, v]));

  const rows = entries
    .filter(e => e.stream === "food" || e.stream === "inedible") // Category B = food wastes
    .map(e => {
      const v = vn[e.vesselId];
      const voyage = e.voyageId ? vy[e.voyageId] : undefined;
      return {
        date_iso: new Date(e.occurredAt).toISOString().slice(0, 10),
        time_utc: new Date(e.occurredAt).toISOString().slice(11, 16),
        vessel_name: v?.name ?? e.vesselId,
        imo_number: v?.imo ?? "",
        voyage_reference: voyage?.reference ?? "",
        departure_port: voyage?.departurePort ?? "",
        arrival_port: voyage?.arrivalPort ?? "",
        garbage_category: "B", // Food wastes
        estimated_kg: e.weightKg,
        estimated_m3: kgToM3(e.weightKg),
        discharge_method: discharge(e.destination),
        position_lat: "",  // filled from AIS integration (see /integrations)
        position_lon: "",
        officer_signature: "",
        notes: e.notes ?? ""
      };
    });

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="marpol-annex-v-category-b-${days}d.csv"`
    }
  });
}

import { getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { voyageKpis } from "@/lib/kpis";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VoyagesPage() {
  const [vessels, voyages, entries] = await Promise.all([
    getVessels(),
    getVoyages(undefined, 100),
    getWasteEntries({ sinceMs: Date.now() - 60 * 86400_000, limit: 5000 })
  ]);
  const vesselName = Object.fromEntries(vessels.map(v => [v.id, v.name]));

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Voyages</h1>
          <p className="muted">Per-sailing scorecards — the atomic unit for ferry F&amp;B waste reporting.</p>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Vessel</th>
              <th>Route</th>
              <th>Departure</th>
              <th className="right">Pax</th>
              <th className="right">Covers</th>
              <th className="right">Waste</th>
              <th className="right">g/cover</th>
              <th className="right">Cost</th>
              <th className="right">% of revenue</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {voyages.slice(0, 40).map(v => {
              const vEntries = entries.filter(e => e.voyageId === v.id);
              const k = voyageKpis(vEntries, v);
              const gPer = k.wastePerCoverKg ? Math.round(k.wastePerCoverKg * 1000) : 0;
              return (
                <tr key={v.id}>
                  <td className="mono">{v.reference}</td>
                  <td>{vesselName[v.vesselId] ?? v.vesselId}</td>
                  <td className="muted">{v.departurePort}→{v.arrivalPort}</td>
                  <td className="muted">{new Date(v.departureAt).toLocaleDateString()}</td>
                  <td className="right">{v.paxCount?.toLocaleString() ?? "—"}</td>
                  <td className="right">{v.coversServed?.toLocaleString() ?? "—"}</td>
                  <td className="right">{k.totalKg.toFixed(1)} kg</td>
                  <td className="right">
                    {gPer ? <span className={gPer > 115 ? "delta-up" : "delta-down"}>{gPer}</span> : "—"}
                  </td>
                  <td className="right">€{k.totalCost.toFixed(0)}</td>
                  <td className="right">
                    {k.wasteToRevenueRatio != null ? `${k.wasteToRevenueRatio.toFixed(1)}%` : "—"}
                  </td>
                  <td className="right">
                    <Link href={`/voyages/${v.id}`} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

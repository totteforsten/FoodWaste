import { getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { summarize, dailySeries } from "@/lib/kpis";
import { KpiCard } from "@/components/KpiCard";
import { TrendArea } from "@/components/Charts";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [vessels, voyages, entries] = await Promise.all([
    getVessels(),
    getVoyages(undefined, 500),
    getWasteEntries({ sinceMs: Date.now() - 90 * 86400_000, limit: 10000 })
  ]);

  const covers = voyages.reduce((s, v) => s + (v.coversServed ?? 0), 0);
  const summary = summarize(entries, covers);
  const trend = dailySeries(entries, 90);

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Reports &amp; exports</h1>
          <p className="muted">FLW-protocol compatible exports, MARPOL Annex V garbage record book entries, and finance rollups.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Period" value="90 days" tone="navy" />
        <KpiCard label="Total waste" value={`${summary.totalKg.toFixed(0)} kg`} />
        <KpiCard label="Cost" value={`€${summary.totalCost.toFixed(0)}`} tone="red" />
        <KpiCard label="CO₂e" value={`${summary.totalCo2eKg.toFixed(0)} kg`} tone="green" />
      </div>

      <div className="card mb-3">
        <div className="card-header"><h3>90-day trend</h3></div>
        <TrendArea data={trend} dataKey="kg" height={300} />
      </div>

      <div className="grid-3">
        <div className="card">
          <h3>FLW Protocol export</h3>
          <p className="muted tiny">
            CSV aligned with the Food Loss &amp; Waste Accounting and Reporting Standard — timeframe, material type, destination, quantity.
          </p>
          <Link href="/api/v1/exports/flw?days=90" className="btn btn-accent mt-2">Download CSV</Link>
        </div>
        <div className="card">
          <h3>MARPOL Annex V</h3>
          <p className="muted tiny">
            Garbage Record Book Category B (food waste) — date, position, volume m³, discharge method. For vessels ≥400 GT on intl voyages.
          </p>
          <Link href="/api/v1/exports/marpol?days=90" className="btn btn-accent mt-2">Download CSV</Link>
        </div>
        <div className="card">
          <h3>Finance rollup</h3>
          <p className="muted tiny">Per-vessel, per-outlet waste cost for finance and menu-engineering reviews.</p>
          <Link href="/api/v1/exports/finance?days=90" className="btn btn-accent mt-2">Download CSV</Link>
        </div>
      </div>

      <div className="card mt-3">
        <h3>Per-vessel summary</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Vessel</th>
              <th className="right">Entries</th>
              <th className="right">Waste</th>
              <th className="right">Cost</th>
              <th className="right">CO₂e</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map(v => {
              const s = summarize(entries.filter(e => e.vesselId === v.id));
              return (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td className="right">{s.entryCount}</td>
                  <td className="right">{s.totalKg.toFixed(1)} kg</td>
                  <td className="right">€{s.totalCost.toFixed(0)}</td>
                  <td className="right">{s.totalCo2eKg.toFixed(0)} kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

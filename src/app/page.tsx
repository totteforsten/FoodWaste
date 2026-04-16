import { KpiCard } from "@/components/KpiCard";
import { TrendArea, DonutChart, HorizontalBars } from "@/components/Charts";
import {
  getOutlets,
  getVessels,
  getVoyages,
  getWasteEntries
} from "@/lib/data-source";
import {
  summarize,
  dailySeries,
  breakdownByStream,
  breakdownByOutlet,
  breakdownByStage
} from "@/lib/kpis";
import { STAGE_LABEL, STREAM_LABEL } from "@/lib/taxonomy";
import Link from "next/link";
import { AlertTriangle, Plus, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [vessels, outlets, voyages, entries] = await Promise.all([
    getVessels(),
    getOutlets(),
    getVoyages(),
    getWasteEntries({ sinceMs: Date.now() - 30 * 86400_000, limit: 5000 })
  ]);

  const totalCovers = voyages
    .filter(v => v.departureAt >= Date.now() - 30 * 86400_000)
    .reduce((s, v) => s + (v.coversServed ?? 0), 0);

  const summary = summarize(entries, totalCovers);
  const trend = dailySeries(entries, 30);

  const streamBreakdown = breakdownByStream(entries).map(s => ({
    name: STREAM_LABEL[s.stream],
    value: s.kg
  }));

  const stageBreakdown = breakdownByStage(entries).map(s => ({
    name: STAGE_LABEL[s.stage],
    kg: s.kg
  }));

  const outletNames = Object.fromEntries(outlets.map(o => [o.id, o.name]));
  const outletBreakdown = breakdownByOutlet(entries, outletNames).slice(0, 8);

  // Benchmarks (IFWC 2021 HaFS = 115 g/cover)
  const benchmark = 115; // g/cover
  const gPerCover = summary.wastePerCoverKg ? Math.round(summary.wastePerCoverKg * 1000) : 0;
  const deltaPct = benchmark > 0 ? Math.round(((gPerCover - benchmark) / benchmark) * 100) : 0;

  return (
    <>
      <div className="hero">
        <div className="row-between" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "0.8rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fleet overview · last 30 days</div>
            <h1>Food &amp; beverage waste</h1>
            <p>
              Track kitchen, buffet, plate and crew waste across {vessels.length} vessels and {outlets.length} outlets. Built on the Food Loss &amp; Waste Protocol and MARPOL Annex V guidance.
            </p>
          </div>
          <div className="row">
            <Link href="/log" className="btn btn-accent"><Plus size={16} />Log waste</Link>
            <Link href="/reports" className="btn btn-secondary"><Download size={16} />Export</Link>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Total waste"
          value={`${summary.totalKg.toFixed(1)} kg`}
          sub={`${summary.entryCount.toLocaleString()} entries · ${summary.totalCo2eKg.toFixed(0)} kg CO₂e`}
          tone="navy"
        />
        <KpiCard
          label="Waste per cover"
          value={gPerCover ? `${gPerCover} g` : "—"}
          sub={
            gPerCover ? (
              <span>
                vs. IFWC benchmark 115 g{" "}
                <span className={deltaPct > 0 ? "delta-up" : "delta-down"}>
                  {deltaPct > 0 ? "▲" : "▼"} {Math.abs(deltaPct)}%
                </span>
              </span>
            ) : "no covers reported"
          }
        />
        <KpiCard
          label="Cost of waste"
          value={`€${summary.totalCost.toFixed(0)}`}
          sub={summary.wasteCostPerCover != null ? `€${summary.wasteCostPerCover.toFixed(2)} per cover` : ""}
          tone="red"
        />
        <KpiCard
          label="CO₂e avoided"
          value={`${(summary.totalCo2eKg * 0).toFixed(0)} kg`}
          sub={`Target: reduce 25% vs baseline`}
          tone="green"
        />
      </div>

      {summary.wastePerCoverKg && summary.wastePerCoverKg * 1000 > 130 && (
        <div className="alert alert-warn mb-3">
          <AlertTriangle size={18} />
          <div>
            <strong>Above industry benchmark.</strong> Fleet average is {gPerCover} g/cover — IFWC 2021 HaFS average is 115 g/cover.
            Review top-wasting outlets below.
          </div>
        </div>
      )}

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <h3>Daily waste (30 days)</h3>
            <span className="muted tiny">kg per day</span>
          </div>
          <TrendArea data={trend} dataKey="kg" />
        </div>
        <div className="card">
          <div className="card-header">
            <h3>By stream</h3>
            <span className="muted tiny">food vs beverage</span>
          </div>
          <DonutChart data={streamBreakdown} />
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <h3>Where waste happens</h3>
            <span className="muted tiny">by stage · kg</span>
          </div>
          <HorizontalBars data={stageBreakdown.map(s => ({ name: s.name, kg: s.kg }))} />
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Top outlets</h3>
            <span className="muted tiny">kg last 30 days</span>
          </div>
          <HorizontalBars data={outletBreakdown.map(o => ({ name: o.name, kg: o.kg }))} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Vessels</h3>
          <Link href="/vessels" className="btn btn-ghost">Manage</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Vessel</th>
              <th>Route</th>
              <th>IMO</th>
              <th className="right">Outlets</th>
              <th className="right">Waste (30d)</th>
              <th className="right">g / cover</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map(v => {
              const vEntries = entries.filter(e => e.vesselId === v.id);
              const vCovers = voyages.filter(x => x.vesselId === v.id).reduce((s, x) => s + (x.coversServed ?? 0), 0);
              const vKg = vEntries.reduce((s, e) => s + e.weightKg, 0);
              const vOutlets = outlets.filter(o => o.vesselId === v.id).length;
              const gPer = vCovers > 0 ? Math.round((vKg / vCovers) * 1000) : 0;
              return (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td className="muted">{v.route ?? "—"}</td>
                  <td className="mono">{v.imo ?? "—"}</td>
                  <td className="right">{vOutlets}</td>
                  <td className="right">{vKg.toFixed(1)} kg</td>
                  <td className="right">
                    {gPer ? (
                      <span className={gPer > 115 ? "delta-up" : "delta-down"}>{gPer} g</span>
                    ) : "—"}
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

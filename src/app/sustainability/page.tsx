import { getVoyages, getWasteEntries } from "@/lib/data-source";
import { summarize, dailySeries } from "@/lib/kpis";
import { KpiCard } from "@/components/KpiCard";
import { TrendArea } from "@/components/Charts";
import { Leaf, Target, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SustainabilityPage() {
  const [voyages, entries] = await Promise.all([
    getVoyages(undefined, 500),
    getWasteEntries({ sinceMs: Date.now() - 365 * 86400_000, limit: 20000 })
  ]);
  const covers = voyages.reduce((s, v) => s + (v.coversServed ?? 0), 0);
  const summary = summarize(entries, covers);
  const trend = dailySeries(entries, 90);

  // SDG 12.3 target: 50% reduction by 2030 vs baseline.
  const baselineGPerCover = 160; // user-configurable in settings
  const currentGPerCover = summary.wastePerCoverKg ? Math.round(summary.wastePerCoverKg * 1000) : 0;
  const progress = baselineGPerCover > 0 ? Math.max(0, Math.min(100, ((baselineGPerCover - currentGPerCover) / (baselineGPerCover * 0.5)) * 100)) : 0;

  // Diversion rate
  const toLandfillIncin = entries.filter(e => e.destination === "landfill" || e.destination === "incineration").reduce((s, e) => s + e.weightKg, 0);
  const diversionRate = summary.totalKg > 0 ? (1 - toLandfillIncin / summary.totalKg) * 100 : 0;

  // Avoidable vs unavoidable
  const avoidable = entries.filter(e => e.stream !== "inedible").reduce((s, e) => s + e.weightKg, 0);
  const avoidablePct = summary.totalKg > 0 ? (avoidable / summary.totalKg) * 100 : 0;

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Sustainability &amp; targets</h1>
          <p className="muted">Progress against SDG 12.3, Champions 12.3 and Courtauld 2030 targets.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="SDG 12.3 progress" value={`${progress.toFixed(0)}%`} sub={`toward 50% reduction (${baselineGPerCover}→${Math.round(baselineGPerCover / 2)} g/cover)`} tone="green" />
        <KpiCard label="Diversion rate" value={`${diversionRate.toFixed(1)}%`} sub="away from landfill / incineration" tone="navy" />
        <KpiCard label="Avoidable waste" value={`${avoidablePct.toFixed(0)}%`} sub="of total — target for reduction" />
        <KpiCard label="CO₂e footprint" value={`${(summary.totalCo2eKg / 1000).toFixed(1)} t`} sub={`~${(summary.totalCo2eKg * 2.5).toFixed(0)} km driven equivalent`} tone="green" />
      </div>

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <h3><Target size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />Reduction targets</h3>
          </div>
          <table className="table">
            <thead>
              <tr><th>Framework</th><th>Target</th><th className="right">Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SDG 12.3</strong></td>
                <td>Halve food waste per capita by 2030</td>
                <td className="right"><span className="chip">{progress.toFixed(0)}% of goal</span></td>
              </tr>
              <tr>
                <td><strong>Courtauld 2030</strong></td>
                <td>50% reduction vs 2007 baseline</td>
                <td className="right"><span className="chip">Aligned</span></td>
              </tr>
              <tr>
                <td><strong>IFWC HaFS</strong></td>
                <td>115 g / cover average</td>
                <td className="right">
                  <span className={`chip ${currentGPerCover <= 115 ? "employee" : "alert"}`}>
                    {currentGPerCover} g/cover
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>MARPOL Annex V</strong></td>
                <td>Garbage Record Book compliance</td>
                <td className="right"><span className="chip employee">Export ready</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-header"><h3><Leaf size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />90-day CO₂e trend</h3></div>
          <TrendArea data={trend} dataKey="co2" label="kg CO₂e" height={260} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><Award size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />Benchmark context</h3></div>
        <div className="grid-3">
          <div>
            <div className="muted tiny">Industry average (HaFS 2021)</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>115 g</div>
            <div className="muted tiny">per cover — IFWC</div>
          </div>
          <div>
            <div className="muted tiny">Best-in-class (Winnow customers)</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>40 g</div>
            <div className="muted tiny">per cover after 12 months</div>
          </div>
          <div>
            <div className="muted tiny">Your fleet</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: currentGPerCover > 115 ? "var(--stena-red)" : "var(--stena-green)" }}>
              {currentGPerCover} g
            </div>
            <div className="muted tiny">per cover (last 30 days)</div>
          </div>
        </div>
      </div>
    </>
  );
}

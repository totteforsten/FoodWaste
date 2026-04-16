import { getOutlets, getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { voyageKpis, breakdownByOutlet, breakdownByStage, breakdownByStream } from "@/lib/kpis";
import { KpiCard } from "@/components/KpiCard";
import { DonutChart, HorizontalBars } from "@/components/Charts";
import { STAGE_LABEL, STREAM_LABEL, DESTINATION_LABEL } from "@/lib/taxonomy";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VoyageDetail({ params }: { params: { id: string } }) {
  const [vessels, outlets, voyages, entries] = await Promise.all([
    getVessels(),
    getOutlets(),
    getVoyages(undefined, 500),
    getWasteEntries({ limit: 10000 })
  ]);
  const voyage = voyages.find(v => v.id === params.id);
  if (!voyage) notFound();

  const vessel = vessels.find(v => v.id === voyage.vesselId);
  const vEntries = entries.filter(e => e.voyageId === voyage.id);
  const k = voyageKpis(vEntries, voyage);
  const outletNames = Object.fromEntries(outlets.map(o => [o.id, o.name]));

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <Link href="/voyages" className="muted tiny">← All voyages</Link>
          <h1>
            {voyage.reference}{" "}
            <span className="muted" style={{ fontSize: "1rem", fontWeight: 500 }}>
              {vessel?.name} · {voyage.departurePort}→{voyage.arrivalPort}
            </span>
          </h1>
          <p className="muted">{new Date(voyage.departureAt).toLocaleString()} → {new Date(voyage.arrivalAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Waste" value={`${k.totalKg.toFixed(1)} kg`} sub={`${k.entryCount} entries`} tone="navy" />
        <KpiCard label="g/cover" value={k.wastePerCoverKg ? `${Math.round(k.wastePerCoverKg * 1000)} g` : "—"} sub={`vs 115 g benchmark`} />
        <KpiCard label="Cost" value={`€${k.totalCost.toFixed(0)}`} sub={k.wasteToRevenueRatio != null ? `${k.wasteToRevenueRatio.toFixed(2)}% of revenue` : ""} tone="red" />
        <KpiCard label="CO₂e" value={`${k.totalCo2eKg.toFixed(0)} kg`} tone="green" />
      </div>

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header"><h3>By stage</h3></div>
          <HorizontalBars data={breakdownByStage(vEntries).map(s => ({ name: STAGE_LABEL[s.stage], kg: s.kg }))} />
        </div>
        <div className="card">
          <div className="card-header"><h3>By stream</h3></div>
          <DonutChart data={breakdownByStream(vEntries).map(s => ({ name: STREAM_LABEL[s.stream], value: s.kg }))} />
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header"><h3>By outlet</h3></div>
        <HorizontalBars data={breakdownByOutlet(vEntries, outletNames).map(o => ({ name: o.name, kg: o.kg }))} />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Entries ({vEntries.length})</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Outlet</th>
              <th>Stage</th>
              <th>Stream</th>
              <th className="right">Kg</th>
              <th>Reason</th>
              <th>Destination</th>
            </tr>
          </thead>
          <tbody>
            {vEntries.slice(0, 50).map(e => (
              <tr key={e.id}>
                <td className="muted">{new Date(e.occurredAt).toLocaleString()}</td>
                <td>{outletNames[e.outletId] ?? e.outletId}</td>
                <td>{STAGE_LABEL[e.stage]}</td>
                <td>{STREAM_LABEL[e.stream]}</td>
                <td className="right">{e.weightKg.toFixed(2)}</td>
                <td className="muted">{e.reason ?? "—"}</td>
                <td className="muted">{DESTINATION_LABEL[e.destination]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

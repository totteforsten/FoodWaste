import { getOutlets, getVessels } from "@/lib/data-source";
import { OUTLET_LABEL } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function VesselsPage() {
  const [vessels, outlets] = await Promise.all([getVessels(), getOutlets()]);
  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Vessels &amp; outlets</h1>
          <p className="muted">Fleet configuration — each vessel can have multiple F&amp;B outlets (buffet, à la carte, bar, crew mess…).</p>
        </div>
      </div>

      {vessels.map(v => {
        const vOutlets = outlets.filter(o => o.vesselId === v.id);
        return (
          <div key={v.id} className="card mb-3">
            <div className="card-header">
              <div>
                <h3>{v.name}</h3>
                <div className="muted tiny">IMO {v.imo ?? "—"} · {v.route ?? "—"} · {v.paxCapacity?.toLocaleString() ?? "—"} pax capacity</div>
              </div>
              <span className={`chip ${v.active ? "employee" : "alert"}`}>{v.active ? "Active" : "Inactive"}</span>
            </div>
            <table className="table mt-2">
              <thead>
                <tr>
                  <th>Outlet</th><th>Type</th><th>Deck</th><th className="right">Seats</th>
                </tr>
              </thead>
              <tbody>
                {vOutlets.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.name}</strong></td>
                    <td>{OUTLET_LABEL[o.type]}</td>
                    <td className="muted">{o.deck ?? "—"}</td>
                    <td className="right">{o.seats ?? "—"}</td>
                  </tr>
                ))}
                {vOutlets.length === 0 && (
                  <tr><td colSpan={4} className="muted">No outlets configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

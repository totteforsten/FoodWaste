import { getWasteEntries } from "@/lib/data-source";
import { topWastedItems } from "@/lib/kpis";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const entries = await getWasteEntries({ sinceMs: Date.now() - 90 * 86400_000, limit: 10000 });
  const top = topWastedItems(entries, {}, 20);

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Menu items</h1>
          <p className="muted">
            Per-item portion sizes, COGS and emission factors feed menu-engineering, forecasting and procurement decisions.
          </p>
        </div>
      </div>

      <div className="alert alert-info mb-3">
        <div>
          Menu items are linked to waste entries by <code>menuItemId</code>. Connect your POS (Adyen/Shiji/Oracle) via the integration API to auto-populate this table.
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Most wasted items (90d)</h3></div>
        {top.length === 0 ? (
          <div className="muted">No items have been linked to waste entries yet. Attach <code>menuItemId</code> when logging to populate this list.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="right">Wasted (kg)</th>
                <th className="right">Cost (€)</th>
              </tr>
            </thead>
            <tbody>
              {top.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td className="right">{t.kg.toFixed(1)}</td>
                  <td className="right">€{t.cost.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

import { isAdminConfigured } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const configured = isAdminConfigured();
  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Settings</h1>
          <p className="muted">Organization, users, emission factors, baselines, API keys and webhooks.</p>
        </div>
      </div>

      <div className={`alert ${configured ? "alert-success" : "alert-warn"} mb-3`}>
        <div>
          <strong>Firebase status:</strong>{" "}
          {configured ? "Connected — reads/writes are persisted." : "Not configured — the app is running on demo data. Add Firebase credentials to `.env.local` to go live."}
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card" id="org">
          <h3>Organization</h3>
          <div className="form-grid mt-2">
            <div className="form-row"><label>Name</label><input defaultValue={process.env.APP_ORG_NAME ?? "Stena Line"} /></div>
            <div className="form-row"><label>Currency</label><input defaultValue={process.env.APP_DEFAULT_CURRENCY ?? "EUR"} /></div>
            <div className="form-row"><label>Emission factor (kg CO₂e / kg)</label><input type="number" step="0.1" defaultValue={process.env.APP_DEFAULT_EMISSION_FACTOR_KG_CO2E_PER_KG ?? "2.5"} /></div>
            <div className="form-row"><label>Baseline g/cover (for SDG 12.3)</label><input type="number" defaultValue="160" /></div>
          </div>
        </div>
        <div className="card" id="taxonomy">
          <h3>Waste taxonomy</h3>
          <p className="muted tiny">Mapped to the FLW Protocol, WRAP HaFS, Generation Waste buckets and MARPOL Annex V Category B.</p>
          <ul className="tiny muted" style={{ marginTop: 8 }}>
            <li><strong>Kitchen</strong> → pre-consumer prep &amp; spoilage</li>
            <li><strong>Buffet</strong> → pre-consumer overproduction</li>
            <li><strong>Plate</strong> → post-consumer &amp; returned</li>
            <li><strong>Crew</strong> → employee meal</li>
            <li><strong>Beverage</strong> → spill / draft-line purge</li>
          </ul>
        </div>
      </div>

      <div className="card mb-3" id="api-keys">
        <h3>API keys</h3>
        <p className="muted tiny">Generate and rotate keys used for server-to-server integrations. Each key is scoped.</p>
        <table className="table mt-2">
          <thead>
            <tr><th>Label</th><th>Scopes</th><th>Last used</th><th className="right"></th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Demo key (env)</strong></td>
              <td className="mono tiny">waste:* voyages:* menu:read rollups:read</td>
              <td className="muted">—</td>
              <td className="right"><button className="btn btn-ghost">Rotate</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" id="webhooks">
        <h3>Webhooks</h3>
        <p className="muted tiny">Payloads are signed <code>X-FoodWaste-Signature: sha256=…</code> using your webhook secret.</p>
        <div className="form-grid mt-2">
          <div className="form-row"><label>Endpoint URL</label><input placeholder="https://example.com/webhooks/foodwaste" /></div>
          <div className="form-row">
            <label>Events</label>
            <select multiple style={{ minHeight: 100 }}>
              <option>waste.created</option>
              <option>waste.updated</option>
              <option>voyage.closed</option>
              <option>rollup.daily</option>
            </select>
          </div>
        </div>
        <div className="mt-2"><button className="btn btn-accent">Add webhook</button></div>
      </div>
    </>
  );
}

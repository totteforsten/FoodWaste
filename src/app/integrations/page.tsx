import { Webhook, Key, Workflow, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Integrations</h1>
          <p className="muted">
            REST API, webhooks, CSV export. Connect POS, procurement, sustainability and BI systems.
          </p>
        </div>
      </div>

      <div className="grid-3 mb-3">
        <div className="card">
          <h3><Key size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />API keys</h3>
          <p className="muted tiny">Generate scoped API keys for server-to-server integrations. Keys are hashed at rest and can be revoked per-integration.</p>
          <Link href="/settings#api-keys" className="btn btn-accent mt-2">Manage keys</Link>
        </div>
        <div className="card">
          <h3><Webhook size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />Webhooks</h3>
          <p className="muted tiny">Subscribe to <code>waste.created</code>, <code>voyage.closed</code>, <code>rollup.daily</code>. HMAC-SHA256 signed.</p>
          <Link href="/settings#webhooks" className="btn btn-accent mt-2">Manage webhooks</Link>
        </div>
        <div className="card">
          <h3><Zap size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />Connectors</h3>
          <p className="muted tiny">Prebuilt connectors for common ferry F&amp;B systems.</p>
          <ul className="tiny muted" style={{ marginTop: 8, paddingLeft: 16 }}>
            <li>POS: Adyen, Oracle Simphony, Shiji Infrasys</li>
            <li>Procurement: Jaegger, Coupa, Oracle</li>
            <li>BI: Power BI, Looker, Tableau (via API)</li>
            <li>Sustainability: CSRD/GRI 306 export, CDP</li>
            <li>Scales: Mettler Toledo, Bizerba (API ingest)</li>
            <li>Bridge: AIS voyage feeds (NMEA 0183/2000 bridge)</li>
          </ul>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <h3><Workflow size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />Reference: create a waste entry</h3>
        </div>
        <pre className="mono" style={{ whiteSpace: "pre-wrap", padding: 16, background: "var(--surface-muted)", borderRadius: 10, fontSize: "0.82rem" }}>{`POST /api/v1/waste
Content-Type: application/json
X-API-Key: key_demo_rotate_me

{
  "vesselId": "v_germanica",
  "outletId": "o_germ_buffet",
  "voyageId": "voy_v_germanica_0",
  "stream": "food",
  "stage": "pre_consumer_over",
  "destination": "port_reception_facility",
  "quantity": 4.2,
  "unit": "kg",
  "reason": "display_end_of_service"
}`}</pre>
      </div>

      <div className="card">
        <h3>Available endpoints</h3>
        <table className="table">
          <thead>
            <tr><th>Method</th><th>Path</th><th>Description</th><th>Scope</th></tr>
          </thead>
          <tbody>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/waste</td><td>List waste entries</td><td className="mono">waste:read</td></tr>
            <tr><td className="mono">POST</td><td className="mono">/api/v1/waste</td><td>Create waste entry</td><td className="mono">waste:write</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/voyages</td><td>List voyages</td><td className="mono">voyages:read</td></tr>
            <tr><td className="mono">POST</td><td className="mono">/api/v1/voyages</td><td>Create/close voyage</td><td className="mono">voyages:write</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/rollups/daily</td><td>Daily aggregates</td><td className="mono">rollups:read</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/kpis</td><td>Dashboard KPIs</td><td className="mono">rollups:read</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/exports/flw</td><td>FLW Protocol CSV</td><td className="mono">rollups:read</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/exports/marpol</td><td>MARPOL Annex V CSV</td><td className="mono">rollups:read</td></tr>
            <tr><td className="mono">GET</td><td className="mono">/api/v1/exports/finance</td><td>Finance rollup CSV</td><td className="mono">rollups:read</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

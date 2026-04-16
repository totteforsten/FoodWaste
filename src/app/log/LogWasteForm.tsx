"use client";

import { useMemo, useState } from "react";
import type { Outlet, Vessel, Voyage, WasteStage, WasteStream, Unit, Destination } from "@/types/domain";
import {
  DESTINATION_LABEL,
  OUTLET_LABEL,
  REASON_CODES,
  STAGE_LABEL,
  STREAM_LABEL,
  toKg,
  estimateCo2e
} from "@/lib/taxonomy";

const SIMPLE_BUCKETS: Array<{ key: WasteStage; label: string; description: string; tone: string }> = [
  { key: "pre_consumer_prep", label: "Kitchen", description: "Prep, trim, spoilage before service", tone: "kitchen" },
  { key: "pre_consumer_over", label: "Buffet / Overproduction", description: "Cooked but unserved, buffet leftover", tone: "service" },
  { key: "post_consumer_plate", label: "Plate", description: "Returned from guest plates", tone: "guest" },
  { key: "employee_meal", label: "Crew", description: "Employee / crew meal waste", tone: "employee" }
];

const UNITS: Unit[] = ["kg", "g", "l", "ml", "portions", "covers"];

const STREAMS: WasteStream[] = ["food", "beverage", "inedible", "packaging"];

const STAGES: WasteStage[] = [
  "pre_consumer_prep",
  "pre_consumer_spoil",
  "pre_consumer_over",
  "post_consumer_plate",
  "employee_meal",
  "beverage_spill",
  "returned"
];

const DESTINATIONS: Destination[] = [
  "port_reception_facility",
  "anaerobic_digestion",
  "composting",
  "animal_feed",
  "incineration",
  "landfill",
  "donation",
  "discharge_at_sea"
];

export function LogWasteForm({
  vessels,
  outlets,
  voyages
}: {
  vessels: Vessel[];
  outlets: Outlet[];
  voyages: Voyage[];
}) {
  const [vesselId, setVesselId] = useState(vessels[0]?.id ?? "");
  const [outletId, setOutletId] = useState("");
  const [voyageId, setVoyageId] = useState("");
  const [stage, setStage] = useState<WasteStage>("pre_consumer_prep");
  const [stream, setStream] = useState<WasteStream>("food");
  const [destination, setDestination] = useState<Destination>("port_reception_facility");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<Unit>("kg");
  const [portionWeightG, setPortionWeightG] = useState<number>(250);
  const [costPerKg, setCostPerKg] = useState<number>(6);
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; msg: string }>(null);

  const visibleOutlets = useMemo(() => outlets.filter(o => o.vesselId === vesselId), [outlets, vesselId]);
  const visibleVoyages = useMemo(() => voyages.filter(v => v.vesselId === vesselId).slice(0, 12), [voyages, vesselId]);

  const weightKg = toKg(Number(quantity) || 0, unit, portionWeightG);
  const costEst = +(weightKg * (Number(costPerKg) || 0)).toFixed(2);
  const co2Est = estimateCo2e(weightKg);

  function pickBucket(b: typeof SIMPLE_BUCKETS[number]) {
    setStage(b.key);
    if (b.key === "employee_meal") setStream("food");
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    const payload = {
      vesselId, outletId, voyageId: voyageId || undefined,
      stream, stage, destination,
      quantity: Number(quantity), unit,
      portionWeightG: unit === "portions" || unit === "covers" ? portionWeightG : undefined,
      estimatedCost: costEst,
      reason, notes
    };
    try {
      const res = await fetch("/api/v1/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult({ ok: true, msg: `Saved — ${weightKg.toFixed(2)} kg logged.` });
      setQuantity(1); setReason(""); setNotes("");
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  const validReasons = REASON_CODES.filter(r => r.appliesTo.includes(stage));

  return (
    <>
      <div className="card mb-3">
        <h3>1. What kind of waste?</h3>
        <p className="muted tiny mb-2">Pick the operational bucket — matches Generation Waste / WRAP taxonomy.</p>
        <div className="grid-3">
          {SIMPLE_BUCKETS.map(b => (
            <button
              key={b.key}
              type="button"
              onClick={() => pickBucket(b)}
              className="card"
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor: stage === b.key ? "var(--stena-blue)" : "var(--color-border)",
                boxShadow: stage === b.key ? "0 0 0 3px rgba(0,149,219,0.2)" : "var(--shadow-sm)",
                padding: 18
              }}
            >
              <span className={`chip ${b.tone}`}>{b.label}</span>
              <div className="mt-1" style={{ fontSize: "0.9rem" }}>{b.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-3">
        <h3>2. Details</h3>
        <div className="form-grid mt-2">
          <div className="form-row">
            <label>Vessel</label>
            <select value={vesselId} onChange={e => { setVesselId(e.target.value); setOutletId(""); setVoyageId(""); }}>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Outlet</label>
            <select value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">— Select outlet —</option>
              {visibleOutlets.map(o => (
                <option key={o.id} value={o.id}>{o.name} · {OUTLET_LABEL[o.type]}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Voyage / sailing (optional)</label>
            <select value={voyageId} onChange={e => setVoyageId(e.target.value)}>
              <option value="">— Not linked —</option>
              {visibleVoyages.map(v => (
                <option key={v.id} value={v.id}>
                  {v.reference} · {v.departurePort}→{v.arrivalPort} · {new Date(v.departureAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Stream</label>
            <select value={stream} onChange={e => setStream(e.target.value as WasteStream)}>
              {STREAMS.map(s => <option key={s} value={s}>{STREAM_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Detailed stage</label>
            <select value={stage} onChange={e => setStage(e.target.value as WasteStage)}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Destination (MARPOL Cat. B)</label>
            <select value={destination} onChange={e => setDestination(e.target.value as Destination)}>
              {DESTINATIONS.map(d => <option key={d} value={d}>{DESTINATION_LABEL[d]}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <h3>3. Quantity</h3>
        <div className="form-grid mt-2">
          <div className="form-row">
            <label>Amount</label>
            <input type="number" step="0.01" min="0" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </div>
          <div className="form-row">
            <label>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value as Unit)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {(unit === "portions" || unit === "covers") && (
            <div className="form-row">
              <label>Portion weight (g)</label>
              <input type="number" step="1" min="0" value={portionWeightG} onChange={e => setPortionWeightG(Number(e.target.value))} />
            </div>
          )}
          <div className="form-row">
            <label>Est. cost per kg (€)</label>
            <input type="number" step="0.1" min="0" value={costPerKg} onChange={e => setCostPerKg(Number(e.target.value))} />
          </div>
          <div className="form-row">
            <label>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">— Select reason —</option>
              {validReasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="alert alert-info mt-3">
          <div>
            Normalized: <strong>{weightKg.toFixed(2)} kg</strong> · Est. cost: <strong>€{costEst.toFixed(2)}</strong> · CO₂e: <strong>{co2Est.toFixed(2)} kg</strong>
          </div>
        </div>

        <div className="row mt-3">
          <button className="btn btn-accent" disabled={submitting || !outletId} onClick={submit}>
            {submitting ? "Saving…" : "Save waste entry"}
          </button>
          {result && (
            <span className={result.ok ? "chip employee" : "chip alert"}>{result.msg}</span>
          )}
        </div>
      </div>
    </>
  );
}

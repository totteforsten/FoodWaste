"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Outlet, Vessel, Voyage, WasteEntry,
  WasteStage, WasteStream, Unit, Destination, UserRole
} from "@/types/domain";
import {
  REASON_CODES, toKg, estimateCo2e
} from "@/lib/taxonomy";
import type { Locale } from "@/lib/i18n";
import { translator } from "@/lib/i18n";
import {
  ChefHat, Utensils, UserRound, Users, Wine,
  ChevronDown, ChevronUp, Check, Plus, ArrowRight, Camera, Clock
} from "lucide-react";
import clsx from "clsx";

type Bucket = {
  key: "kitchen" | "buffet" | "plate" | "crew" | "beverage";
  stage: WasteStage;
  stream: WasteStream;
  icon: typeof ChefHat;
  labelKey: string;
  descKey: string;
  tone: string;
};

const BUCKETS: Bucket[] = [
  { key: "kitchen",  stage: "pre_consumer_prep", stream: "food", icon: ChefHat,   labelKey: "reg.bucketKitchen",  descKey: "reg.bucketKitchenDesc",  tone: "kitchen" },
  { key: "buffet",   stage: "pre_consumer_over", stream: "food", icon: Utensils,  labelKey: "reg.bucketBuffet",   descKey: "reg.bucketBuffetDesc",   tone: "service" },
  { key: "plate",    stage: "post_consumer_plate", stream: "food", icon: UserRound, labelKey: "reg.bucketPlate", descKey: "reg.bucketPlateDesc",    tone: "guest" },
  { key: "crew",     stage: "employee_meal",     stream: "food", icon: Users,     labelKey: "reg.bucketCrew",     descKey: "reg.bucketCrewDesc",     tone: "employee" },
  { key: "beverage", stage: "beverage_spill",    stream: "beverage", icon: Wine,  labelKey: "reg.bucketBeverage", descKey: "reg.bucketBeverageDesc", tone: "guest" }
];

const QUICK_KG = [0.5, 1, 2, 5, 10];

export function RegisterForm({
  locale, role, vessels, outlets, voyages, recent
}: {
  locale: Locale;
  role: UserRole;
  vessels: Vessel[];
  outlets: Outlet[];
  voyages: Voyage[];
  recent: WasteEntry[];
}) {
  const t = translator(locale);
  const isCrew = role === "crew";

  // Step 1 — bucket
  const [bucket, setBucket] = useState<Bucket | null>(null);

  // Step 2 — amount
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<Unit>("kg");

  // Step 3 — context (defaulted + collapsible)
  const defaultVesselId = vessels[0]?.id ?? "";
  const [vesselId, setVesselId] = useState(defaultVesselId);
  useEffect(() => { setVesselId(defaultVesselId); }, [defaultVesselId]);

  const visibleOutlets = useMemo(() => outlets.filter(o => o.vesselId === vesselId), [outlets, vesselId]);
  const [outletId, setOutletId] = useState<string>("");
  useEffect(() => {
    // Auto-pick outlet matching the bucket (e.g. buffet bucket → buffet outlet)
    if (!bucket || visibleOutlets.length === 0) { setOutletId(""); return; }
    const match = bucket.key === "buffet"
      ? visibleOutlets.find(o => o.type === "buffet")
      : bucket.key === "crew"
        ? visibleOutlets.find(o => o.type === "crew_mess")
        : bucket.key === "beverage"
          ? visibleOutlets.find(o => o.type === "bar")
          : undefined;
    setOutletId((match ?? visibleOutlets[0]).id);
  }, [bucket, visibleOutlets]);

  const visibleVoyages = useMemo(
    () => voyages.filter(v => v.vesselId === vesselId).slice(0, 12),
    [voyages, vesselId]
  );
  const [voyageId, setVoyageId] = useState<string>(() => visibleVoyages[0]?.id ?? "");
  useEffect(() => { setVoyageId(visibleVoyages[0]?.id ?? ""); }, [vesselId]); // eslint-disable-line

  const [destination, setDestination] = useState<Destination>("port_reception_facility");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [costPerKg, setCostPerKg] = useState<number>(6);
  const [portionWeightG, setPortionWeightG] = useState<number>(250);

  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; msg: string; kg?: number }>(null);

  const weightKg = toKg(Number(quantity) || 0, unit, portionWeightG);
  const costEst = +(weightKg * (Number(costPerKg) || 0)).toFixed(2);
  const co2Est = estimateCo2e(weightKg);

  const readyToSubmit = !!bucket && weightKg > 0 && !!outletId;

  function reset() {
    setBucket(null);
    setQuantity(0);
    setUnit("kg");
    setReason("");
    setNotes("");
    setResult(null);
    setShowDetails(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!bucket) return;
    setSubmitting(true);
    setResult(null);
    const payload = {
      vesselId, outletId, voyageId: voyageId || undefined,
      stream: bucket.stream,
      stage: bucket.stage,
      destination,
      quantity: Number(quantity),
      unit,
      portionWeightG: unit === "portions" || unit === "covers" ? portionWeightG : undefined,
      estimatedCost: costEst,
      reason,
      notes
    };
    try {
      const res = await fetch("/api/v1/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult({ ok: true, msg: isCrew ? t("reg.savedCrew") : t("reg.saved", { kg: weightKg.toFixed(2) }), kg: weightKg });
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (result?.ok) {
    return (
      <div className="card success-card">
        <div className="success-check"><Check size={40} strokeWidth={3} /></div>
        <h2 style={{ textAlign: "center" }}>{result.msg}</h2>
        {result.kg !== undefined && (
          <p className="muted" style={{ textAlign: "center", fontSize: "1.1rem" }}>
            {result.kg.toFixed(2)} kg · {estimateCo2e(result.kg).toFixed(2)} kg CO₂e
          </p>
        )}
        <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="btn btn-accent btn-large" onClick={reset}>
            <Plus size={18} />{t("reg.logAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Step 1 — choose bucket */}
      <div className="card mb-3">
        <div className="step-header">
          <span className="step-num">1</span>
          <div>
            <h3 className="mb-0">{t("reg.step1")}</h3>
            <div className="muted tiny">{t("reg.step1sub")}</div>
          </div>
        </div>
        <div className="bucket-grid">
          {BUCKETS.map(b => {
            const Icon = b.icon;
            const active = bucket?.key === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBucket(b)}
                className={clsx("bucket-card", `tone-${b.tone}`, active && "active")}
              >
                <Icon size={32} strokeWidth={1.8} />
                <div className="bucket-label">{t(b.labelKey)}</div>
                <div className="bucket-desc">{t(b.descKey)}</div>
                {active && <div className="bucket-check"><Check size={14} strokeWidth={3} /></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — amount */}
      <div className={clsx("card mb-3", !bucket && "step-dim")}>
        <div className="step-header">
          <span className="step-num">2</span>
          <div>
            <h3 className="mb-0">{t("reg.step2")}</h3>
          </div>
        </div>

        <div className="amount-row">
          <input
            className="amount-input"
            type="number"
            step="0.1"
            min="0"
            placeholder="0"
            value={quantity || ""}
            onChange={e => setQuantity(Number(e.target.value))}
            inputMode="decimal"
          />
          <select className="amount-unit" value={unit} onChange={e => setUnit(e.target.value as Unit)}>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">L</option>
            <option value="ml">mL</option>
            <option value="portions">{locale === "sv" ? "portioner" : "portions"}</option>
            <option value="covers">{locale === "sv" ? "gäster" : "covers"}</option>
          </select>
        </div>

        <div className="quick-picks mt-2">
          <span className="muted tiny">{t("reg.quickAdd")}:</span>
          {QUICK_KG.map(v => (
            <button
              key={v}
              type="button"
              className={clsx("chip-btn", unit === "kg" && quantity === v && "active")}
              onClick={() => { setUnit("kg"); setQuantity(v); }}
            >
              {v} kg
            </button>
          ))}
        </div>

        {weightKg > 0 && (
          <div className="preview-row mt-3">
            <div>
              <div className="tiny muted">{t("reg.normalized")}</div>
              <div className="preview-value">{weightKg.toFixed(2)} kg</div>
            </div>
            <div>
              <div className="tiny muted">CO₂e</div>
              <div className="preview-value">{co2Est.toFixed(2)} kg</div>
            </div>
            <div>
              <div className="tiny muted">{t("reg.estCost")}</div>
              <div className="preview-value">€{costEst.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3 — context (smart defaults) */}
      <div className={clsx("card mb-3", !bucket && "step-dim")}>
        <div className="step-header">
          <span className="step-num">3</span>
          <div style={{ flex: 1 }}>
            <h3 className="mb-0">{t("reg.step3")}</h3>
            <div className="muted tiny">{t("reg.step3sub")}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowDetails(s => !s)}>
            {showDetails ? <><ChevronUp size={14} />{t("reg.hideDetails")}</> : <><ChevronDown size={14} />{t("reg.showDetails")}</>}
          </button>
        </div>

        {/* Essentials — always visible */}
        <div className="form-grid mt-2">
          {vessels.length > 1 && (
            <div className="form-row">
              <label>{t("reg.vessel")}</label>
              <select value={vesselId} onChange={e => setVesselId(e.target.value)}>
                {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <label>{t("reg.outlet")}</label>
            <select value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">{t("reg.selectOutlet")}</option>
              {visibleOutlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>{t("reg.voyage")}</label>
            <select value={voyageId} onChange={e => setVoyageId(e.target.value)}>
              <option value="">{t("reg.noVoyage")}</option>
              {visibleVoyages.map(v => (
                <option key={v.id} value={v.id}>
                  {v.reference} · {v.departurePort}→{v.arrivalPort}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showDetails && bucket && (
          <div className="form-grid mt-3" style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 16 }}>
            <div className="form-row">
              <label>{t("reg.reason")}</label>
              <select value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">{t("reg.selectReason")}</option>
                {REASON_CODES.filter(r => r.appliesTo.includes(bucket.stage)).map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>{t("reg.destination")}</label>
              <select value={destination} onChange={e => setDestination(e.target.value as Destination)}>
                <option value="port_reception_facility">Port reception / Hamn</option>
                <option value="anaerobic_digestion">Anaerobic digestion / Rötning</option>
                <option value="composting">Composting / Kompost</option>
                <option value="animal_feed">Animal feed / Djurfoder</option>
                <option value="incineration">Incineration / Förbränning</option>
                <option value="discharge_at_sea">Discharge at sea / Till havs</option>
              </select>
            </div>
            {(unit === "portions" || unit === "covers") && (
              <div className="form-row">
                <label>Portion (g)</label>
                <input type="number" value={portionWeightG} onChange={e => setPortionWeightG(Number(e.target.value))} />
              </div>
            )}
            <div className="form-row">
              <label>{t("reg.costPerKg")} (€)</label>
              <input type="number" step="0.1" value={costPerKg} onChange={e => setCostPerKg(Number(e.target.value))} />
            </div>
            <div className="form-row" style={{ gridColumn: "1 / -1" }}>
              <label>{t("reg.notes")}</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Sticky submit */}
      <div className="submit-bar">
        <div>
          {!bucket && <span className="muted">{t("reg.step1")}</span>}
          {bucket && weightKg === 0 && <span className="muted">{t("reg.step2")}</span>}
          {bucket && weightKg > 0 && !outletId && <span className="muted">{t("reg.errorMissingOutlet")}</span>}
          {readyToSubmit && (
            <span style={{ fontWeight: 600 }}>
              {t(bucket!.labelKey)} · {weightKg.toFixed(2)} kg
            </span>
          )}
        </div>
        <button className="btn btn-accent btn-large" disabled={!readyToSubmit || submitting} onClick={submit}>
          {submitting ? t("common.saving") : <>{t("reg.submit")}<ArrowRight size={18} /></>}
        </button>
      </div>

      {result && !result.ok && (
        <div className="alert alert-warn mt-2">{result.msg}</div>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <h3><Clock size={16} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />{t("crew.recent")}</h3>
          </div>
          <ul className="recent-list">
            {recent.map(e => {
              const outlet = outlets.find(o => o.id === e.outletId);
              return (
                <li key={e.id} className="recent-item">
                  <div>
                    <strong>{e.weightKg.toFixed(1)} kg</strong>
                    <span className="muted"> · {outlet?.name ?? e.outletId}</span>
                  </div>
                  <div className="muted tiny">
                    {new Date(e.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

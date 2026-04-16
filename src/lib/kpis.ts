/**
 * KPI aggregation helpers. Pure functions over WasteEntry arrays so the
 * same logic runs on server (rollups, API) and client (dashboard filters).
 */
import type {
  DailyRollup,
  Voyage,
  WasteEntry,
  WasteStage,
  WasteStream
} from "@/types/domain";
import { STAGE_GROUP } from "./taxonomy";

export interface KpiSummary {
  totalKg: number;
  totalCost: number;
  totalCo2eKg: number;
  entryCount: number;
  coversServed: number;
  wastePerCoverKg: number | null;
  wasteCostPerCover: number | null;
  // Breakdown by top-level group
  kitchenKg: number;
  serviceKg: number;
  guestKg: number;
  employeeKg: number;
  // Beverage slice of total
  beverageKg: number;
  foodKg: number;
}

export function summarize(entries: WasteEntry[], coversServed = 0): KpiSummary {
  const s: KpiSummary = {
    totalKg: 0, totalCost: 0, totalCo2eKg: 0, entryCount: entries.length,
    coversServed,
    wastePerCoverKg: null, wasteCostPerCover: null,
    kitchenKg: 0, serviceKg: 0, guestKg: 0, employeeKg: 0,
    beverageKg: 0, foodKg: 0
  };

  for (const e of entries) {
    s.totalKg += e.weightKg;
    s.totalCost += e.estimatedCost ?? 0;
    s.totalCo2eKg += e.estimatedCo2eKg ?? 0;

    const g = STAGE_GROUP[e.stage];
    if (g === "kitchen") s.kitchenKg += e.weightKg;
    else if (g === "service") s.serviceKg += e.weightKg;
    else if (g === "guest") s.guestKg += e.weightKg;
    else if (g === "employee") s.employeeKg += e.weightKg;

    if (e.stream === "beverage") s.beverageKg += e.weightKg;
    if (e.stream === "food") s.foodKg += e.weightKg;
  }

  if (coversServed > 0) {
    s.wastePerCoverKg = +(s.totalKg / coversServed).toFixed(3);
    s.wasteCostPerCover = +(s.totalCost / coversServed).toFixed(2);
  }

  s.totalKg = +s.totalKg.toFixed(2);
  s.totalCost = +s.totalCost.toFixed(2);
  s.totalCo2eKg = +s.totalCo2eKg.toFixed(2);
  return s;
}

export function dailySeries(entries: WasteEntry[], days = 30): Array<{ date: string; kg: number; cost: number; co2: number }> {
  const byDay = new Map<string, { kg: number; cost: number; co2: number }>();
  const now = Date.now();
  const cutoff = now - days * 86400_000;

  for (const e of entries) {
    if (e.occurredAt < cutoff) continue;
    const d = new Date(e.occurredAt).toISOString().slice(0, 10);
    const bucket = byDay.get(d) ?? { kg: 0, cost: 0, co2: 0 };
    bucket.kg += e.weightKg;
    bucket.cost += e.estimatedCost ?? 0;
    bucket.co2 += e.estimatedCo2eKg ?? 0;
    byDay.set(d, bucket);
  }

  const out: Array<{ date: string; kg: number; cost: number; co2: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400_000).toISOString().slice(0, 10);
    const b = byDay.get(d) ?? { kg: 0, cost: 0, co2: 0 };
    out.push({ date: d, kg: +b.kg.toFixed(2), cost: +b.cost.toFixed(2), co2: +b.co2.toFixed(2) });
  }
  return out;
}

export function breakdownByStage(entries: WasteEntry[]): Array<{ stage: WasteStage; kg: number }> {
  const map = new Map<WasteStage, number>();
  for (const e of entries) map.set(e.stage, (map.get(e.stage) ?? 0) + e.weightKg);
  return [...map.entries()]
    .map(([stage, kg]) => ({ stage, kg: +kg.toFixed(2) }))
    .sort((a, b) => b.kg - a.kg);
}

export function breakdownByStream(entries: WasteEntry[]): Array<{ stream: WasteStream; kg: number }> {
  const map = new Map<WasteStream, number>();
  for (const e of entries) map.set(e.stream, (map.get(e.stream) ?? 0) + e.weightKg);
  return [...map.entries()]
    .map(([stream, kg]) => ({ stream, kg: +kg.toFixed(2) }))
    .sort((a, b) => b.kg - a.kg);
}

export function breakdownByOutlet(
  entries: WasteEntry[],
  outletNames: Record<string, string>
): Array<{ outletId: string; name: string; kg: number }> {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.outletId, (map.get(e.outletId) ?? 0) + e.weightKg);
  return [...map.entries()]
    .map(([outletId, kg]) => ({ outletId, name: outletNames[outletId] ?? outletId, kg: +kg.toFixed(2) }))
    .sort((a, b) => b.kg - a.kg);
}

export function topWastedItems(entries: WasteEntry[], menuNames: Record<string, string>, limit = 10) {
  const map = new Map<string, { kg: number; cost: number }>();
  for (const e of entries) {
    if (!e.menuItemId) continue;
    const b = map.get(e.menuItemId) ?? { kg: 0, cost: 0 };
    b.kg += e.weightKg;
    b.cost += e.estimatedCost ?? 0;
    map.set(e.menuItemId, b);
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, name: menuNames[id] ?? id, kg: +v.kg.toFixed(2), cost: +v.cost.toFixed(2) }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, limit);
}

export function rollupForDay(
  entries: WasteEntry[],
  orgId: string,
  dateIso: string,
  vesselId?: string,
  coversServed?: number
): DailyRollup {
  const byStage = {} as Record<WasteStage, number>;
  const byStream = {} as Record<WasteStream, number>;
  const byOutlet: Record<string, number> = {};
  let totalWeightKg = 0, totalCost = 0, totalCo2eKg = 0;

  for (const e of entries) {
    totalWeightKg += e.weightKg;
    totalCost += e.estimatedCost ?? 0;
    totalCo2eKg += e.estimatedCo2eKg ?? 0;
    byStage[e.stage] = (byStage[e.stage] ?? 0) + e.weightKg;
    byStream[e.stream] = (byStream[e.stream] ?? 0) + e.weightKg;
    byOutlet[e.outletId] = (byOutlet[e.outletId] ?? 0) + e.weightKg;
  }

  return {
    id: vesselId ? `${vesselId}_${dateIso}` : dateIso,
    orgId,
    vesselId,
    date: dateIso,
    totalWeightKg: +totalWeightKg.toFixed(3),
    totalCost: +totalCost.toFixed(2),
    totalCo2eKg: +totalCo2eKg.toFixed(3),
    byStage, byStream, byOutlet,
    entryCount: entries.length,
    coversServed,
    wastePerCoverKg: coversServed ? +(totalWeightKg / coversServed).toFixed(4) : undefined,
    updatedAt: Date.now()
  };
}

export function voyageKpis(entries: WasteEntry[], voyage: Voyage) {
  const s = summarize(entries, voyage.coversServed ?? 0);
  const wasteToRevenueRatio = voyage.revenue && voyage.revenue > 0
    ? +(s.totalCost / voyage.revenue * 100).toFixed(2)
    : null;
  return { ...s, wasteToRevenueRatio, voyageId: voyage.id };
}

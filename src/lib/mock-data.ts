/**
 * Deterministic demo data used when Firebase is not configured,
 * so the dashboard is always showcase-ready.
 */
import type {
  Outlet,
  Vessel,
  Voyage,
  WasteEntry,
  WasteStage,
  WasteStream
} from "@/types/domain";

const ORG_ID = "demo";

const vessels: Vessel[] = [
  { id: "v_germanica", orgId: ORG_ID, name: "Stena Germanica", imo: "9145176", route: "Gothenburg–Kiel", paxCapacity: 1300, active: true },
  { id: "v_hollandica", orgId: ORG_ID, name: "Stena Hollandica", imo: "9419163", route: "Hoek van Holland–Harwich", paxCapacity: 1200, active: true },
  { id: "v_danica", orgId: ORG_ID, name: "Stena Danica", imo: "8317954", route: "Gothenburg–Frederikshavn", paxCapacity: 2300, active: true }
];

const outlets: Outlet[] = [
  { id: "o_germ_buffet", orgId: ORG_ID, vesselId: "v_germanica", name: "Metropolitan Buffet", type: "buffet", seats: 320 },
  { id: "o_germ_alacarte", orgId: ORG_ID, vesselId: "v_germanica", name: "Taste", type: "a_la_carte", seats: 120 },
  { id: "o_germ_bar", orgId: ORG_ID, vesselId: "v_germanica", name: "Sky Bar", type: "bar" },
  { id: "o_germ_crew", orgId: ORG_ID, vesselId: "v_germanica", name: "Crew Mess", type: "crew_mess" },
  { id: "o_holl_buffet", orgId: ORG_ID, vesselId: "v_hollandica", name: "Food City Buffet", type: "buffet", seats: 380 },
  { id: "o_holl_cafe", orgId: ORG_ID, vesselId: "v_hollandica", name: "Coffee Corner", type: "cafe" },
  { id: "o_dan_quick", orgId: ORG_ID, vesselId: "v_danica", name: "Deli", type: "quick_service" },
  { id: "o_dan_bar", orgId: ORG_ID, vesselId: "v_danica", name: "Lounge Bar", type: "bar" }
];

const voyages: Voyage[] = [];
const entries: WasteEntry[] = [];

const streams: WasteStream[] = ["food", "food", "food", "beverage", "inedible", "packaging"];
const stages: WasteStage[] = [
  "pre_consumer_prep",
  "pre_consumer_over",
  "post_consumer_plate",
  "pre_consumer_spoil",
  "employee_meal",
  "beverage_spill",
  "returned"
];

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Generate last 60 days of data, ~12–25 entries per day across outlets.
const rand = seededRand(42);
const now = Date.now();
const DAY = 86400_000;

for (let d = 60; d >= 0; d--) {
  const dayStart = now - d * DAY;

  for (const vessel of vessels) {
    const voyageId = `voy_${vessel.id}_${d}`;
    const pax = 400 + Math.floor(rand() * 800);
    const covers = Math.floor(pax * (0.55 + rand() * 0.25));
    voyages.push({
      id: voyageId,
      orgId: ORG_ID,
      vesselId: vessel.id,
      reference: `${vessel.name.split(" ")[1].slice(0, 3).toUpperCase()}-${1000 + d}`,
      departurePort: vessel.route?.split("–")[0] ?? "",
      arrivalPort: vessel.route?.split("–")[1] ?? "",
      departureAt: dayStart,
      arrivalAt: dayStart + 7 * 3600_000,
      paxCount: pax,
      coversServed: covers,
      revenue: Math.round(covers * (12 + rand() * 8)),
      closed: d > 0
    });

    const vesselOutlets = outlets.filter(o => o.vesselId === vessel.id);
    const n = 8 + Math.floor(rand() * 12);
    for (let i = 0; i < n; i++) {
      const outlet = vesselOutlets[Math.floor(rand() * vesselOutlets.length)];
      const stream = streams[Math.floor(rand() * streams.length)];
      const stage = stages[Math.floor(rand() * stages.length)];
      const weightKg = +(0.2 + rand() * 6).toFixed(2);
      entries.push({
        id: `e_${vessel.id}_${d}_${i}`,
        orgId: ORG_ID,
        vesselId: vessel.id,
        voyageId,
        outletId: outlet.id,
        stream,
        stage,
        destination: rand() < 0.6 ? "port_reception_facility" : rand() < 0.8 ? "anaerobic_digestion" : "composting",
        quantity: weightKg,
        unit: "kg",
        weightKg,
        estimatedCost: +(weightKg * (4 + rand() * 6)).toFixed(2),
        estimatedCo2eKg: +(weightKg * 2.5).toFixed(2),
        occurredAt: dayStart + Math.floor(rand() * DAY),
        createdAt: dayStart + Math.floor(rand() * DAY),
        createdBy: "demo",
        source: "web"
      });
    }
  }
}

export const mockData = {
  orgId: ORG_ID,
  vessels,
  outlets,
  voyages,
  entries
};

/**
 * Human-readable labels and conversions for the waste taxonomy.
 * Labels mirror WRAP / FLW Protocol / UNEP Food Waste Index conventions,
 * adapted to the hospitality / ferry context.
 */
import type {
  Destination,
  OutletType,
  Unit,
  WasteStage,
  WasteStream
} from "@/types/domain";

export const STREAM_LABEL: Record<WasteStream, string> = {
  food: "Food",
  beverage: "Beverage",
  packaging: "Packaging",
  inedible: "Inedible parts"
};

export const STAGE_LABEL: Record<WasteStage, string> = {
  pre_consumer_prep: "Kitchen prep (trim / over-prep)",
  pre_consumer_spoil: "Spoilage / expired",
  pre_consumer_over: "Overproduction / buffet leftover",
  post_consumer_plate: "Guest plate waste",
  employee_meal: "Crew / employee meal waste",
  beverage_spill: "Beverage spill / line purge",
  returned: "Returned to kitchen"
};

export const STAGE_GROUP: Record<WasteStage, "kitchen" | "service" | "guest" | "employee"> = {
  pre_consumer_prep: "kitchen",
  pre_consumer_spoil: "kitchen",
  pre_consumer_over: "service",
  post_consumer_plate: "guest",
  employee_meal: "employee",
  beverage_spill: "service",
  returned: "guest"
};

export const DESTINATION_LABEL: Record<Destination, string> = {
  landfill: "Landfill",
  incineration: "Incineration",
  anaerobic_digestion: "Anaerobic digestion",
  composting: "Composting",
  animal_feed: "Animal feed",
  donation: "Donation",
  discharge_at_sea: "Discharge at sea (MARPOL Annex V)",
  port_reception_facility: "Port reception facility"
};

export const OUTLET_LABEL: Record<OutletType, string> = {
  buffet: "Buffet",
  a_la_carte: "À la carte",
  quick_service: "Quick service",
  bar: "Bar",
  cafe: "Café",
  room_service: "Room service",
  crew_mess: "Crew mess",
  kiosk: "Kiosk",
  vending: "Vending"
};

/**
 * Reason codes — standardized so data is aggregable across vessels.
 * Inspired by Winnow / Leanpath taxonomies.
 */
export const REASON_CODES: Array<{ code: string; label: string; appliesTo: WasteStage[] }> = [
  { code: "over_prep", label: "Over-prepared", appliesTo: ["pre_consumer_prep", "pre_consumer_over"] },
  { code: "trim", label: "Trim / peel", appliesTo: ["pre_consumer_prep"] },
  { code: "expired", label: "Expired / past date", appliesTo: ["pre_consumer_spoil"] },
  { code: "contaminated", label: "Contaminated / unsafe", appliesTo: ["pre_consumer_spoil"] },
  { code: "temperature_abuse", label: "Temperature abuse", appliesTo: ["pre_consumer_spoil"] },
  { code: "cooking_error", label: "Cooking error / burned", appliesTo: ["pre_consumer_prep"] },
  { code: "display_end_of_service", label: "End of service display", appliesTo: ["pre_consumer_over"] },
  { code: "portion_too_large", label: "Portion too large", appliesTo: ["post_consumer_plate"] },
  { code: "guest_dislike", label: "Guest disliked", appliesTo: ["post_consumer_plate", "returned"] },
  { code: "draft_line_purge", label: "Draft line purge", appliesTo: ["beverage_spill"] },
  { code: "spill", label: "Spill / breakage", appliesTo: ["beverage_spill"] },
  { code: "menu_change", label: "Menu change", appliesTo: ["pre_consumer_spoil"] }
];

/**
 * Convert a quantity+unit into normalized kilograms.
 * Beverages are approximated at water density (1 l = 1 kg).
 */
export function toKg(quantity: number, unit: Unit, portionWeightG?: number): number {
  switch (unit) {
    case "kg": return quantity;
    case "g": return quantity / 1000;
    case "l": return quantity;
    case "ml": return quantity / 1000;
    case "portions":
    case "covers":
      return (portionWeightG ?? 250) * quantity / 1000;
  }
}

/**
 * Default emission factor (kg CO2e per kg food waste) per UNEP / WRAP estimates.
 * Ferries should override with their audited figure.
 */
export const DEFAULT_EMISSION_FACTOR = 2.5;

export function estimateCo2e(weightKg: number, factor = DEFAULT_EMISSION_FACTOR): number {
  return +(weightKg * factor).toFixed(3);
}

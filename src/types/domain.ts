/**
 * Core domain types for ferry food & beverage waste tracking.
 * Aligned with the FLW (Food Loss & Waste) Protocol and WRAP/Champions 12.3 conventions.
 */

export type WasteStream =
  | "food"        // edible food waste
  | "beverage"    // beer, wine, spirits, soft drinks, coffee
  | "packaging"   // secondary: packaging disposed with food
  | "inedible";   // bones, peels, shells, coffee grounds

export type WasteStage =
  | "pre_consumer_prep"   // trim, over-prep, cooking errors (kitchen prep waste)
  | "pre_consumer_spoil"  // spoilage, expired, storage loss
  | "pre_consumer_over"   // overproduction / buffet leftovers
  | "post_consumer_plate" // customer plate waste
  | "employee_meal"       // crew/employee meal waste
  | "beverage_spill"      // dispensed but not served (draft-line purge, spillage)
  | "returned";           // returned to kitchen by guest

export type Destination =
  | "landfill"
  | "incineration"
  | "anaerobic_digestion"
  | "composting"
  | "animal_feed"
  | "donation"
  | "discharge_at_sea"        // MARPOL Annex V — comminuted/ground outside territorial waters
  | "port_reception_facility"; // Garbage Record Book entry

export type OutletType =
  | "buffet"
  | "a_la_carte"
  | "quick_service"
  | "bar"
  | "cafe"
  | "room_service"
  | "crew_mess"
  | "kiosk"
  | "vending";

export type Unit = "kg" | "g" | "l" | "ml" | "portions" | "covers";

export type UserRole =
  | "admin"
  | "orgAdmin"
  | "serviceManager"  // per-vessel operational manager
  | "chef"            // head chef / galley manager
  | "crew"            // register-first, minimal dashboard
  | "viewer"
  | "integration";

export interface Org {
  id: string;
  name: string;
  currency: string;           // ISO 4217
  emissionFactor: number;     // kg CO2e per kg food waste (default ~2.5)
  createdAt: number;
}

export interface Vessel {
  id: string;
  orgId: string;
  name: string;
  imo?: string;
  route?: string;
  paxCapacity?: number;
  active: boolean;
}

export interface Outlet {
  id: string;
  orgId: string;
  vesselId: string;
  name: string;
  type: OutletType;
  deck?: string;
  seats?: number;
}

export interface Voyage {
  id: string;
  orgId: string;
  vesselId: string;
  reference: string;
  departurePort: string;
  arrivalPort: string;
  departureAt: number;
  arrivalAt: number;
  paxCount?: number;
  coversServed?: number;
  revenue?: number;
  closed: boolean;
}

export interface MenuItem {
  id: string;
  orgId: string;
  name: string;
  category: string;
  portionWeightG?: number;
  costPerPortion?: number;
  pricePerPortion?: number;
  emissionFactor?: number;
}

export interface WasteEntry {
  id: string;
  orgId: string;
  vesselId: string;
  voyageId?: string;
  outletId: string;
  menuItemId?: string;

  stream: WasteStream;
  stage: WasteStage;
  destination: Destination;

  quantity: number;
  unit: Unit;
  weightKg: number;

  estimatedCost?: number;
  estimatedCo2eKg?: number;

  reason?: string;
  photoUrl?: string;
  notes?: string;

  occurredAt: number;
  createdAt: number;
  createdBy: string;
  source: "web" | "mobile" | "scale" | "api";
}

export interface DailyRollup {
  id: string;
  orgId: string;
  vesselId?: string;
  date: string;
  totalWeightKg: number;
  totalCost: number;
  totalCo2eKg: number;
  byStage: Record<WasteStage, number>;
  byStream: Record<WasteStream, number>;
  byOutlet: Record<string, number>;
  entryCount: number;
  coversServed?: number;
  wastePerCoverKg?: number;
  updatedAt: number;
}

export interface ApiKey {
  id: string;
  orgId: string;
  label: string;
  hashedKey: string;
  scopes: ApiScope[];
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
}

export type ApiScope =
  | "waste:read"
  | "waste:write"
  | "voyages:read"
  | "voyages:write"
  | "menu:read"
  | "menu:write"
  | "rollups:read";

export interface Webhook {
  id: string;
  orgId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: number;
}

export type WebhookEvent =
  | "waste.created"
  | "waste.updated"
  | "voyage.closed"
  | "rollup.daily";

export interface User {
  id: string;
  orgId: string;
  email: string;
  displayName?: string;
  roles: UserRole[];
  assignedVesselIds?: string[];
}

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

export type UserRole = "admin" | "orgAdmin" | "chef" | "crew" | "viewer" | "integration";

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
  name: string;               // e.g. "Stena Germanica"
  imo?: string;               // IMO number
  route?: string;             // e.g. "Gothenburg–Kiel"
  paxCapacity?: number;
  active: boolean;
}

export interface Outlet {
  id: string;
  orgId: string;
  vesselId: string;
  name: string;               // e.g. "Metropolitan Buffet"
  type: OutletType;
  deck?: string;
  seats?: number;
}

export interface Voyage {
  id: string;
  orgId: string;
  vesselId: string;
  reference: string;          // voyage/sailing number
  departurePort: string;      // UN/LOCODE preferred
  arrivalPort: string;
  departureAt: number;        // unix ms
  arrivalAt: number;
  paxCount?: number;          // actual passengers
  coversServed?: number;      // meals served across all outlets
  revenue?: number;           // F&B revenue on voyage
  closed: boolean;
}

export interface MenuItem {
  id: string;
  orgId: string;
  name: string;
  category: string;           // starter / main / dessert / beverage / side
  portionWeightG?: number;    // standard portion size
  costPerPortion?: number;    // COGS
  pricePerPortion?: number;
  emissionFactor?: number;    // kg CO2e per portion (optional override)
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
  weightKg: number;           // normalized

  estimatedCost?: number;
  estimatedCo2eKg?: number;

  reason?: string;            // free text or taxonomy code
  photoUrl?: string;
  notes?: string;

  occurredAt: number;
  createdAt: number;
  createdBy: string;          // uid
  source: "web" | "mobile" | "scale" | "api";
}

export interface DailyRollup {
  id: string;                 // YYYY-MM-DD
  orgId: string;
  vesselId?: string;
  date: string;               // YYYY-MM-DD (ship-local)
  totalWeightKg: number;
  totalCost: number;
  totalCo2eKg: number;
  byStage: Record<WasteStage, number>;    // kg
  byStream: Record<WasteStream, number>;  // kg
  byOutlet: Record<string, number>;       // outletId -> kg
  entryCount: number;
  coversServed?: number;
  wastePerCoverKg?: number;
  updatedAt: number;
}

export interface ApiKey {
  id: string;
  orgId: string;
  label: string;
  hashedKey: string;          // SHA-256 of token
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
  secret: string;              // HMAC signing
  active: boolean;
  createdAt: number;
}

export type WebhookEvent =
  | "waste.created"
  | "waste.updated"
  | "voyage.closed"
  | "rollup.daily";

export interface User {
  id: string;                  // Firebase uid
  orgId: string;
  email: string;
  displayName?: string;
  roles: UserRole[];
  assignedVesselIds?: string[];
}

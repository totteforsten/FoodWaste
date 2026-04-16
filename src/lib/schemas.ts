/**
 * Zod schemas for API input validation and type inference.
 */
import { z } from "zod";

export const WasteEntryInput = z.object({
  vesselId: z.string().min(1),
  voyageId: z.string().optional(),
  outletId: z.string().min(1),
  menuItemId: z.string().optional(),

  stream: z.enum(["food", "beverage", "packaging", "inedible"]),
  stage: z.enum([
    "pre_consumer_prep",
    "pre_consumer_spoil",
    "pre_consumer_over",
    "post_consumer_plate",
    "employee_meal",
    "beverage_spill",
    "returned"
  ]),
  destination: z.enum([
    "landfill",
    "incineration",
    "anaerobic_digestion",
    "composting",
    "animal_feed",
    "donation",
    "discharge_at_sea",
    "port_reception_facility"
  ]),

  quantity: z.number().positive(),
  unit: z.enum(["kg", "g", "l", "ml", "portions", "covers"]),
  portionWeightG: z.number().positive().optional(),

  estimatedCost: z.number().nonnegative().optional(),
  reason: z.string().max(240).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),

  occurredAt: z.number().int().positive().optional(),
  source: z.enum(["web", "mobile", "scale", "api"]).default("api")
});

export type WasteEntryInputT = z.infer<typeof WasteEntryInput>;

export const VoyageInput = z.object({
  vesselId: z.string().min(1),
  reference: z.string().min(1),
  departurePort: z.string().min(1),
  arrivalPort: z.string().min(1),
  departureAt: z.number().int().positive(),
  arrivalAt: z.number().int().positive(),
  paxCount: z.number().int().nonnegative().optional(),
  coversServed: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  closed: z.boolean().default(false)
});
export type VoyageInputT = z.infer<typeof VoyageInput>;

export const MenuItemInput = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  portionWeightG: z.number().positive().optional(),
  costPerPortion: z.number().nonnegative().optional(),
  pricePerPortion: z.number().nonnegative().optional(),
  emissionFactor: z.number().nonnegative().optional()
});
export type MenuItemInputT = z.infer<typeof MenuItemInput>;

export const WebhookInput = z.object({
  url: z.string().url(),
  events: z.array(z.enum(["waste.created", "waste.updated", "voyage.closed", "rollup.daily"])).min(1),
  active: z.boolean().default(true)
});
export type WebhookInputT = z.infer<typeof WebhookInput>;
